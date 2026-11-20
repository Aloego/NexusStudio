'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, session, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { createMcp } = require('./mcp-server');

const APP_NAME = 'NexusStudio';
const MAX_FILE = 30 * 1024 * 1024;

// One data folder, shared with the stdio bridge: %APPDATA%\NexusStudio
app.setPath('userData', path.join(app.getPath('appData'), APP_NAME));
const dataDir = app.getPath('userData');
const settingsFile = path.join(dataDir, 'settings.json');

protocol.registerSchemesAsPrivileged([
  { scheme: 'nx-preview', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win = null;
let mcp = null;
let currentFile = null;
let previewHtml = '<!doctype html><title>Preview</title>';
let seq = 0;
const pending = new Map();

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile, 'utf8')) || {}; } catch (e) { return {}; }
}
function writeSettings(s) {
  try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2)); } catch (e) { /* ignore */ }
}

/* ---------- talking to the editor window ---------- */
function callRenderer(method, params) {
  return new Promise(function (resolve, reject) {
    if (!win || win.isDestroyed()) return reject(new Error('The editor window is not open.'));
    const id = ++seq;
    const timer = setTimeout(function () { pending.delete(id); reject(new Error('The editor did not answer in time.')); }, 25000);
    pending.set(id, { resolve: resolve, reject: reject, timer: timer });
    win.webContents.send('ai:request', { id: id, method: method, params: params || {} });
  });
}
function fromEditor(e) {
  return win && !win.isDestroyed() && e.sender === win.webContents && e.senderFrame === win.webContents.mainFrame;
}
ipcMain.on('ai:response', function (e, m) {
  if (!fromEditor(e) || !m) return;
  const p = pending.get(m.id);
  if (!p) return;
  pending.delete(m.id);
  clearTimeout(p.timer);
  if (m.ok) p.resolve(m.payload); else p.reject(new Error(typeof m.payload === 'string' ? m.payload : 'The editor reported an error.'));
});

async function screenshot(args) {
  if (!win || win.isDestroyed()) throw new Error('The editor window is not open.');
  if (win.isMinimized()) win.restore();
  const r = await callRenderer('__prepare_screenshot', { element_id: args.element_id, hide_selection: args.hide_selection !== false });
  try {
    const rect = { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.max(1, Math.round(r.width)), height: Math.max(1, Math.round(r.height)) };
    let img = await win.webContents.capturePage(rect);
    let size = img.getSize();
    if (size.width > 1400) { img = img.resize({ width: 1400 }); size = img.getSize(); }
    return { data: img.toPNG().toString('base64'), mimeType: 'image/png', width: size.width, height: size.height };
  } finally {
    callRenderer('__after_screenshot', {}).catch(function () {});
  }
}

/* ---------- AI server ---------- */
function bridgeCommand() {
  if (app.isPackaged) {
    return { command: process.execPath, args: [path.join(process.resourcesPath, 'stdio-bridge.js')], env: { ELECTRON_RUN_AS_NODE: '1' } };
  }
  return { command: 'node', args: [path.join(__dirname, '..', 'mcp', 'stdio-bridge.js')], env: {} };
}
function describeMcp() {
  const i = mcp.info();
  const b = bridgeCommand();
  const desktopEntry = { command: b.command, args: b.args };
  if (Object.keys(b.env).length) desktopEntry.env = b.env;
  return {
    running: i.running, port: i.port, url: i.url, token: i.token, tools: i.tools,
    desktopConfig: JSON.stringify({ mcpServers: { nexusstudio: desktopEntry } }, null, 2),
    claudeCodeCommand: 'claude mcp add --transport http nexusstudio ' + i.url + ' --header "Authorization: Bearer ' + i.token + '"'
  };
}
function claudeDesktopConfigPath() {
  return path.join(app.getPath('appData'), 'Claude', 'claude_desktop_config.json');
}
async function installClaudeDesktop() {
  const file = claudeDesktopConfigPath();
  let cfg = {};
  if (fs.existsSync(file)) {
    try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch (e) {
      return { ok: false, message: 'Claude Desktop\'s settings file could not be read, so nothing was changed. Use "Copy config" and add it by hand.' };
    }
    try { fs.copyFileSync(file, file + '.nexusstudio-backup'); } catch (e) { /* best effort */ }
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  if (!cfg.mcpServers || typeof cfg.mcpServers !== 'object') cfg.mcpServers = {};
  cfg.mcpServers.nexusstudio = JSON.parse(describeMcp().desktopConfig).mcpServers.nexusstudio;
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
  return { ok: true, message: 'Added to Claude Desktop. Close Claude Desktop completely and open it again.', file: file };
}

ipcMain.handle('mcp:info', function (e) { if (!fromEditor(e)) return null; return describeMcp(); });
ipcMain.handle('mcp:enable', async function (e, on) {
  if (!fromEditor(e)) return null;
  if (on) await mcp.start(); else await mcp.stop();
  const s = readSettings(); s.aiEnabled = !!on; writeSettings(s);
  return describeMcp();
});
ipcMain.handle('mcp:installClaudeDesktop', async function (e) {
  if (!fromEditor(e)) return null;
  try { return await installClaudeDesktop(); } catch (err) { return { ok: false, message: 'Could not update Claude Desktop: ' + err.message }; }
});

/* ---------- files ---------- */
function docLabel(name) { return name ? APP_NAME + ' - ' + name : APP_NAME; }
ipcMain.on('win:docname', function (e, name) {
  if (!fromEditor(e)) return;
  win.setTitle(docLabel(String(name || '').slice(0, 120)));
});
ipcMain.handle('preview:set', function (e, html) {
  if (!fromEditor(e) || typeof html !== 'string' || html.length > MAX_FILE) return false;
  previewHtml = html; return true;
});
async function readLimited(file) {
  const st = await fs.promises.stat(file);
  if (st.size > MAX_FILE) throw new Error('That file is larger than 30 MB.');
  return fs.promises.readFile(file, 'utf8');
}
ipcMain.handle('file:new', function (e) { if (!fromEditor(e)) return; currentFile = null; });
// Opening and saving use NexusStudio's own folder chooser (shown inside the app) instead of the Windows file
// windows, which could be taller than the screen. The editor can only list folders and read or write
// files with a fixed set of extensions; every path is checked here.
const FB_KINDS = { project: ['.nexus', '.json'], html: ['.html', '.htm'] };
function fbSafeName(n, kind) {
  const ext = FB_KINDS[kind] && FB_KINDS[kind][0];
  if (!ext) return null;
  n = String(n || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/^\.+/, '').trim().slice(0, 80);
  if (!n) return null;
  if (!FB_KINDS[kind].some(function (x) { return n.toLowerCase().endsWith(x); })) n += ext;
  return n;
}
function fbDir(d) { return typeof d === 'string' && path.isAbsolute(d) && isDir(d) ? path.resolve(d) : null; }
function fbRoots() {
  if (process.platform === 'win32') {
    const out = [];
    for (let c = 67; c <= 90; c++) { const r = String.fromCharCode(c) + ':\\'; if (isDir(r)) out.push({ name: r, path: r }); }
    return out;
  }
  return [{ name: '/', path: '/' }];
}
ipcMain.handle('file:open', function (e) { return fromEditor(e) ? { needLocation: true } : { canceled: true }; });
ipcMain.handle('file:importHtml', function (e) { return fromEditor(e) ? { needLocation: true } : { canceled: true }; });
ipcMain.handle('file:export', function (e) { return fromEditor(e) ? { needLocation: true } : { canceled: true }; });
ipcMain.handle('file:exportPages', function (e) { return fromEditor(e) ? { needLocation: true } : { canceled: true }; });
ipcMain.handle('file:save', async function (e, a) {
  if (!fromEditor(e) || !a || typeof a.text !== 'string') return { canceled: true };
  if (!currentFile || a.saveAs) return { needLocation: true };
  try {
    await fs.promises.writeFile(currentFile, a.text, 'utf8');
    return { ok: true, name: path.basename(currentFile) };
  } catch (err) { return { error: 'Could not save: ' + err.message }; }
});
ipcMain.handle('fb:places', function (e) {
  if (!fromEditor(e)) return null;
  const home = app.getPath('home'), places = [];
  [['Documents', 'documents'], ['Desktop', 'desktop'], ['Downloads', 'downloads']].forEach(function (p) { try { const d = app.getPath(p[1]); if (isDir(d)) places.push({ name: p[0], path: d }); } catch (err) { /* not available */ } });
  places.push({ name: 'Home', path: home });
  const last = readSettings().lastDir;
  return { start: (last && isDir(last)) ? last : (places[0] ? places[0].path : home), places: places, roots: fbRoots() };
});
ipcMain.handle('fb:list', function (e, a) {
  if (!fromEditor(e) || !a) return { error: 'Not allowed.' };
  if (a.dir === '') return { dir: '', parent: null, entries: fbRoots().map(function (r) { return { name: r.path, dir: true }; }) };
  const dir = fbDir(a.dir);
  if (!dir) return { error: 'That folder does not exist.' };
  const exts = FB_KINDS[a.kind] || [];
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (err) { return { error: 'This folder cannot be opened.' }; }
  const out = [];
  for (const ent of ents) {
    if (ent.name.startsWith('.')) continue;
    if (ent.isDirectory()) out.push({ name: ent.name, dir: true });
    else if (ent.isFile() && exts.some(function (x) { return ent.name.toLowerCase().endsWith(x); })) out.push({ name: ent.name, dir: false });
  }
  out.sort(function (x, y) { return (y.dir - x.dir) || x.name.toLowerCase().localeCompare(y.name.toLowerCase()); });
  const parent = path.dirname(dir) !== dir ? path.dirname(dir) : (process.platform === 'win32' ? '' : null);
  return { dir: dir, parent: parent, entries: out.slice(0, 600) };
});
ipcMain.handle('fb:mkdir', function (e, a) {
  if (!fromEditor(e) || !a) return { error: 'Not allowed.' };
  const dir = fbDir(a.dir);
  const name = String(a.name || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/^\.+/, '').trim().slice(0, 80);
  if (!dir) return { error: 'That folder does not exist.' };
  if (!name) return { error: 'Type a folder name.' };
  const target = path.join(dir, name);
  try { if (!fs.existsSync(target)) fs.mkdirSync(target); else if (!isDir(target)) return { error: 'A file with that name already exists.' }; }
  catch (err) { return { error: 'Could not create the folder: ' + err.message }; }
  const s = readSettings(); s.lastDir = target; writeSettings(s);
  return { ok: true, dir: target };
});
async function fbWrite(a, kind, write) {
  const dir = fbDir(a && a.dir), name = fbSafeName(a && a.name, kind);
  if (!dir || !name) return { error: 'Choose a folder and a file name.' };
  const target = path.join(dir, name);
  if (fs.existsSync(target) && !a.overwrite) return { exists: true, name: name };
  try { await write(target, dir, name); } catch (err) { return { error: 'Could not save: ' + err.message }; }
  const s = readSettings(); s.lastDir = dir; writeSettings(s);
  return { ok: true, name: name, folder: dir };
}
ipcMain.handle('fb:saveProject', function (e, a) {
  if (!fromEditor(e) || !a || typeof a.text !== 'string' || a.text.length > MAX_FILE) return { canceled: true };
  return fbWrite(a, 'project', async function (target) { await fs.promises.writeFile(target, a.text, 'utf8'); currentFile = target; });
});
ipcMain.handle('fb:exportHtml', function (e, a) {
  if (!fromEditor(e) || !a || typeof a.text !== 'string' || a.text.length > MAX_FILE) return { canceled: true };
  return fbWrite(a, 'html', async function (target) { await fs.promises.writeFile(target, a.text, 'utf8'); });
});
ipcMain.handle('fb:exportPages', function (e, a) {
  if (!fromEditor(e) || !a || !Array.isArray(a.files) || !a.files.length || a.files.length > 30) return { canceled: true };
  const files = a.files.filter(function (f) { return f && typeof f.text === 'string' && f.text.length <= MAX_FILE; });
  if (!files.length) return { canceled: true };
  let count = 0;
  return fbWrite(a, 'html', async function (target, dir, name) {
    const stem = name.replace(/\.html?$/i, '');
    for (let i = 0; i < files.length; i++) {
      let t = target;
      if (i > 0) {
        const slug = String(files[i].name || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
        t = path.join(dir, stem + '-' + slug + '.html');
        let k = 2;
        while (fs.existsSync(t)) { t = path.join(dir, stem + '-' + slug + '-' + k + '.html'); k++; }
      }
      await fs.promises.writeFile(t, files[i].text, 'utf8');
      count++;
    }
  }).then(function (r) { if (r.ok) r.count = count; return r; });
});
ipcMain.handle('fb:read', async function (e, a) {
  if (!fromEditor(e) || !a || !FB_KINDS[a.kind]) return { canceled: true };
  const dir = fbDir(a.dir), name = String(a.name || '');
  if (!dir || name !== path.basename(name) || !FB_KINDS[a.kind].some(function (x) { return name.toLowerCase().endsWith(x); })) return { error: 'Choose a file.' };
  const target = path.join(dir, name);
  try {
    const text = await readLimited(target);
    if (a.kind === 'project') currentFile = target;
    const s = readSettings(); s.lastDir = dir; writeSettings(s);
    return { text: text, name: name };
  } catch (err) { return { error: err.message }; }
});

/* ---------- element documentation ---------- */
const TAG_OK = /^[a-z][a-z0-9]{0,15}$/;
function mdnUrl(tag) {
  if (/^h[1-6]$/.test(tag)) tag = 'h1';
  return tag === 'svg' ? 'https://developer.mozilla.org/en-US/docs/Web/SVG/Element/svg' : 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/' + tag;
}
function w3Url(tag) {
  return tag === 'svg' ? 'https://www.w3schools.com/graphics/svg_intro.asp' : 'https://www.w3schools.com/tags/tag_' + tag + '.asp';
}
// Is this Electron running inside WSL (a Linux layer on Windows)? Then Windows programs are reached through cmd.exe.
function inWsl() {
  if (process.platform !== 'linux') return false;
  try { return /microsoft|wsl/i.test(fs.readFileSync('/proc/version', 'utf8')); } catch (e) { return false; }
}
function spawnQuiet(exe, args) {
  return new Promise(function (resolve) {
    const { spawn } = require('child_process');
    let done = false;
    function end(ok) { if (!done) { done = true; resolve(ok); } }
    try {
      const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
      child.on('error', function () { end(false); });
      child.on('exit', function (code) { if (code) end(false); });
      child.unref();
      setTimeout(function () { end(true); }, 500);
    } catch (e) { end(false); }
  });
}
// Opens a web address in the default browser. Returns which method was used so a failure can be explained.
async function openUrl(url) {
  if (inWsl()) {
    if (await spawnQuiet('wslview', [url])) return 'wslview';
    if (await spawnQuiet('cmd.exe', ['/c', 'start', '', url])) return 'cmd.exe start';
  }
  await shell.openExternal(url);
  return 'system default';
}

// Zeal (offline documentation browser). No file dialog is ever shown: Zeal is found by looking at the Start Menu
// shortcuts and the usual install places; the user can also paste a path as a last resort.
function isFile(p) { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } }
function walk(root, depth, test, cap) {
  const queue = [{ d: root, n: 0 }]; let seen = 0;
  while (queue.length && seen < (cap || 15000)) {
    const cur = queue.shift(); let ents;
    try { ents = fs.readdirSync(cur.d, { withFileTypes: true }); } catch (e) { continue; }
    for (const ent of ents) {
      seen++;
      const full = path.join(cur.d, ent.name);
      if (ent.isDirectory()) { if (cur.n < depth && !/^(node_modules|\.git|temp|cache)$/i.test(ent.name)) queue.push({ d: full, n: cur.n + 1 }); }
      else if (test(ent.name)) return full;
    }
  }
  return null;
}
const ZEAL_EXE = /^zeal(-portable)?\.exe$/i;
function resolveShortcut(file) {
  try { const t = shell.readShortcutLink(file).target; return t && ZEAL_EXE.test(path.basename(t)) && isFile(t) ? t : null; } catch (e) { return null; }
}
function findZeal() {
  const env = process.env, found = [];
  const saved = readSettings().zealPath;
  if (saved && isFile(saved)) found.push(saved);
  if (process.platform === 'win32') {
    const menus = [env.APPDATA && path.join(env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'), env.ProgramData && path.join(env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      env.USERPROFILE && path.join(env.USERPROFILE, 'Desktop'), env.PUBLIC && path.join(env.PUBLIC, 'Desktop'), env.OneDrive && path.join(env.OneDrive, 'Desktop')];
    menus.forEach(function (m) { if (!m || !isDir(m)) return; const l = walk(m, 3, function (n) { return /^zeal.*\.lnk$/i.test(n); }); const t = l && resolveShortcut(l); if (t) found.push(t); });
    [env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramW6432, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs'), env.LOCALAPPDATA, env.USERPROFILE && path.join(env.USERPROFILE, 'scoop', 'apps'), 'C:\\Zeal'].forEach(function (b) {
      if (!b || !isDir(b)) return; const f = walk(b, 3, function (n) { return ZEAL_EXE.test(n); }, 8000); if (f) found.push(f);
    });
    ['Downloads', 'Desktop', 'Documents'].forEach(function (d) { const b = env.USERPROFILE && path.join(env.USERPROFILE, d); if (b && isDir(b)) { const f = walk(b, 3, function (n) { return ZEAL_EXE.test(n); }, 8000); if (f) found.push(f); } });
  } else if (inWsl()) {
    ['/mnt/c/Program Files', '/mnt/c/Program Files (x86)', '/mnt/c/Zeal'].forEach(function (b) { if (isDir(b)) { const f = walk(b, 3, function (n) { return ZEAL_EXE.test(n); }, 8000); if (f) found.push(f); } });
    if (isDir('/mnt/c/Users')) { try { fs.readdirSync('/mnt/c/Users').forEach(function (u) { [['AppData', 'Local', 'Programs'], ['AppData', 'Local'], ['Downloads'], ['Desktop']].forEach(function (parts) { const b = path.join('/mnt/c/Users', u, ...parts); if (isDir(b)) { const f = walk(b, 3, function (n) { return ZEAL_EXE.test(n); }, 5000); if (f) found.push(f); } }); }); } catch (e) { /* ignore */ } }
  } else if (process.platform === 'linux') {
    ['/usr/bin/zeal', '/usr/local/bin/zeal', '/snap/bin/zeal', '/var/lib/flatpak/exports/bin/org.zealdocs.Zeal'].forEach(function (p) { if (isFile(p)) found.push(p); });
  }
  return found.filter(function (p, i) { return found.indexOf(p) === i; });
}
ipcMain.handle('docs:openOnline', async function (e, tag, site) {
  if (!fromEditor(e) || typeof tag !== 'string' || !TAG_OK.test(tag)) return { error: 'No documentation for that element.' };
  const url = site === 'w3schools' ? w3Url(tag) : mdnUrl(tag);
  try { const method = await openUrl(url); return { ok: true, url: url, method: method, platform: process.platform + (inWsl() ? ' (WSL)' : '') }; }
  catch (err) { return { error: 'Could not open your browser: ' + err.message, url: url }; }
});
ipcMain.handle('docs:openZeal', async function (e, tag) {
  if (!fromEditor(e) || typeof tag !== 'string' || !TAG_OK.test(tag)) return { error: 'No documentation for that element.' };
  const query = (tag === 'svg' ? 'svg:' : 'html:') + tag;
  for (const exe of findZeal()) { if (await spawnQuiet(exe, [query])) return { ok: true, method: exe }; }
  if (process.platform === 'linux' && !inWsl() && await spawnQuiet('zeal', [query])) return { ok: true, method: 'zeal' };
  try { await shell.openExternal('dash://' + query); return { ok: true, method: 'dash:// address' }; } catch (err) { /* fall through */ }
  return { needPath: true, error: 'Zeal was not found on this computer.' };
});
ipcMain.handle('docs:setZealPath', function (e, p) {
  if (!fromEditor(e) || typeof p !== 'string') return { error: 'That path is not valid.' };
  p = p.trim().replace(/^"(.*)"$/, '$1');
  if (!path.isAbsolute(p) && !/^[a-z]:[\\/]/i.test(p)) return { error: 'Type the full path, starting with a drive letter such as C:\\' };
  if (inWsl() && /^[a-z]:[\\/]/i.test(p)) p = '/mnt/' + p[0].toLowerCase() + p.slice(2).replace(/\\/g, '/');
  let exe = null;
  if (/\.lnk$/i.test(p) && process.platform === 'win32' && isFile(p)) exe = resolveShortcut(p);
  else if (isFile(p) && ZEAL_EXE.test(path.basename(p))) exe = p;
  else if (isDir(p)) { const f = walk(p, 2, function (n) { return ZEAL_EXE.test(n); }, 4000); if (f) exe = f; }
  if (!exe) return { error: 'No zeal.exe was found at that path. Paste the folder where Zeal is installed, or the full path of zeal.exe.' };
  const s = readSettings(); s.zealPath = exe; writeSettings(s);
  return { ok: true, exe: exe };
});

/* ---------- window ---------- */
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Calculate window size that fits within the screen, leaving room for taskbar
  const maxWidth = Math.min(1480, Math.floor(screenWidth * 0.95));
  const maxHeight = Math.min(920, Math.floor(screenHeight * 0.95));
  const width = Math.max(980, maxWidth);
  const height = Math.max(640, maxHeight);

  win = new BrowserWindow({
    width: width, height: height, minWidth: 980, minHeight: 640, show: false, backgroundColor: '#0e0e11', title: APP_NAME,
    icon: path.join(__dirname, '..', 'build', 'icon.png'), autoHideMenuBar: true,
    center: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  win.once('ready-to-show', function () { win.show(); });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(function (d) {
    if (/^https:\/\//i.test(d.url)) shell.openExternal(d.url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', function (e) { e.preventDefault(); });
  win.on('closed', function () {
    win = null;
    pending.forEach(function (p) { clearTimeout(p.timer); p.reject(new Error('The editor window was closed.')); });
    pending.clear();
  });
}

app.on('second-instance', function () {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.on('window-all-closed', function () { app.quit(); });
app.on('will-quit', function () { if (mcp) mcp.stop(); });

app.whenReady().then(async function () {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'toggleDevTools' }] }
  ]));
  session.defaultSession.setPermissionRequestHandler(function (wc, perm, cb) { cb(false); });
  protocol.handle('nx-preview', function () {
    return new Response(previewHtml, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  });
  mcp = createMcp({
      dataDir: dataDir, version: app.getVersion(), callRenderer: callRenderer, screenshot: screenshot,
      getWindowState: function () {
        if (!win || win.isDestroyed()) return { error: 'The editor window is not open.' };
        const b = win.getBounds();
        return {
          bounds: { x: b.x, y: b.y, width: b.width, height: b.height },
          focused: win.isFocused(),
          visible: win.isVisible(),
          minimized: win.isMinimized(),
          maximized: win.isMaximized(),
          fullscreen: win.isFullScreen(),
          title: win.getTitle()
        };
      },
      getAppState: function () {
        return {
          electron: process.versions.electron,
          chrome: process.versions.chrome,
          node: process.versions.node,
          platform: process.platform,
          arch: process.arch,
          uptime: Math.round(process.uptime()),
          memory: process.memoryUsage(),
          aiServerRunning: !!(mcp && mcp.info().running),
          aiServerPort: mcp ? mcp.info().port : null
        };
      },
      getProcessInfo: function () {
        const mem = process.memoryUsage();
        return {
          pid: process.pid,
          memory: {
            rss: mem.rss,
            heapTotal: mem.heapTotal,
            heapUsed: mem.heapUsed,
            external: mem.external,
            arrayBuffers: mem.arrayBuffers
          },
          uptime: Math.round(process.uptime()),
          cpuUsage: process.cpuUsage()
        };
      },
      onActivity: function (name) { if (win && !win.isDestroyed()) win.webContents.send('ai:activity', { tool: name }); }
    });
  if (readSettings().aiEnabled !== false) {
    try { await mcp.start(); } catch (e) { console.error('AI server did not start:', e.message); }
  }
  createWindow();
});
