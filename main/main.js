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
ipcMain.handle('file:open', async function (e) {
  if (!fromEditor(e)) return { canceled: true };
  const r = await dialog.showOpenDialog(win, { title: 'Open project', properties: ['openFile'], filters: [{ name: 'NexusStudio project', extensions: ['nexus', 'json'] }] });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  try {
    const text = await readLimited(r.filePaths[0]);
    currentFile = r.filePaths[0];
    return { text: text, name: path.basename(currentFile) };
  } catch (err) { return { error: err.message }; }
});
ipcMain.handle('file:save', async function (e, a) {
  if (!fromEditor(e) || !a || typeof a.text !== 'string') return { canceled: true };
  try {
    let target = currentFile;
    if (!target || a.saveAs) {
      const base = String(a.name || 'untitled').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
      const r = await dialog.showSaveDialog(win, { title: 'Save project', defaultPath: base + '.nexus', filters: [{ name: 'NexusStudio project', extensions: ['nexus'] }] });
      if (r.canceled || !r.filePath) return { canceled: true };
      target = r.filePath;
    }
    await fs.promises.writeFile(target, a.text, 'utf8');
    currentFile = target;
    return { ok: true, name: path.basename(target) };
  } catch (err) { return { error: 'Could not save: ' + err.message }; }
});
ipcMain.handle('file:export', async function (e, a) {
  if (!fromEditor(e) || !a || typeof a.text !== 'string') return { canceled: true };
  try {
    const base = String(a.name || 'index').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
    const r = await dialog.showSaveDialog(win, { title: 'Export HTML', defaultPath: base + '.html', filters: [{ name: 'Web page', extensions: ['html'] }] });
    if (r.canceled || !r.filePath) return { canceled: true };
    await fs.promises.writeFile(r.filePath, a.text, 'utf8');
    return { ok: true, name: path.basename(r.filePath) };
  } catch (err) { return { error: 'Could not export: ' + err.message }; }
});
ipcMain.handle('file:importHtml', async function (e) {
  if (!fromEditor(e)) return { canceled: true };
  const r = await dialog.showOpenDialog(win, { title: 'Import HTML file', properties: ['openFile'], filters: [{ name: 'Web page', extensions: ['html', 'htm'] }] });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  try { return { text: await readLimited(r.filePaths[0]), name: path.basename(r.filePaths[0]) }; } catch (err) { return { error: err.message }; }
});

/* ---------- element documentation ---------- */
const TAG_OK = /^[a-z][a-z0-9]{0,15}$/;
function mdnUrl(tag) {
  if (/^h[1-6]$/.test(tag)) tag = 'h1';
  return tag === 'svg' ? 'https://developer.mozilla.org/en-US/docs/Web/SVG/Element/svg' : 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/' + tag;
}
// Zeal (offline documentation browser). We never show a file dialog: we look in the usual install places,
// then on the PATH, then try Zeal's dash:// address. If Zeal still cannot be found the user pastes its path.
function zealCandidates() {
  const env = process.env, list = [];
  const saved = readSettings().zealPath;
  if (saved) list.push(saved);
  if (process.platform === 'win32') {
    [env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramW6432, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs')].forEach(function (b) { if (b) list.push(path.join(b, 'Zeal', 'zeal.exe')); });
    if (env.LOCALAPPDATA) list.push(path.join(env.LOCALAPPDATA, 'Zeal', 'zeal.exe'));
    if (env.USERPROFILE) { list.push(path.join(env.USERPROFILE, 'scoop', 'apps', 'zeal', 'current', 'zeal.exe')); list.push(path.join(env.USERPROFILE, 'scoop', 'apps', 'zeal', 'current', 'zeal-portable', 'zeal.exe')); }
    list.push('C:\\Zeal\\zeal.exe');
  } else if (process.platform === 'linux') {
    list.push('/usr/bin/zeal', '/usr/local/bin/zeal', '/var/lib/flatpak/exports/bin/org.zealdocs.Zeal', '/snap/bin/zeal');
  }
  return list.filter(function (p) { try { return fs.statSync(p).isFile(); } catch (e) { return false; } });
}
function runZeal(exe, query) {
  return new Promise(function (resolve) {
    const { spawn } = require('child_process');
    let done = false;
    function end(ok) { if (!done) { done = true; resolve(ok); } }
    try {
      const child = spawn(exe, [query], { detached: true, stdio: 'ignore', windowsHide: false });
      child.on('error', function () { end(false); });
      child.unref();
      setTimeout(function () { end(true); }, 400);
    } catch (e) { end(false); }
  });
}
ipcMain.handle('docs:openOnline', async function (e, tag) {
  if (!fromEditor(e) || typeof tag !== 'string' || !TAG_OK.test(tag)) return { error: 'No documentation for that element.' };
  try { await shell.openExternal(mdnUrl(tag)); return { ok: true }; } catch (err) { return { error: 'Could not open your browser: ' + err.message }; }
});
ipcMain.handle('docs:openZeal', async function (e, tag) {
  if (!fromEditor(e) || typeof tag !== 'string' || !TAG_OK.test(tag)) return { error: 'No documentation for that element.' };
  const query = (tag === 'svg' ? 'svg:' : 'html:') + tag;
  const found = zealCandidates();
  for (const exe of found) { if (await runZeal(exe, query)) return { ok: true }; }
  if (process.platform === 'linux' && await runZeal('zeal', query)) return { ok: true };
  try { if (await shell.openExternal('dash://' + query)) return { ok: true }; } catch (err) { /* fall through */ }
  return { needPath: true, error: 'Zeal was not found on this computer.' };
});
ipcMain.handle('docs:setZealPath', function (e, p) {
  if (!fromEditor(e) || typeof p !== 'string') return { error: 'That path is not valid.' };
  p = p.trim().replace(/^"(.*)"$/, '$1');
  if (!path.isAbsolute(p) || !/^zeal(\.exe)?$/i.test(path.basename(p))) return { error: 'Type the full path of zeal.exe, for example C:\\Program Files\\Zeal\\zeal.exe' };
  try { if (!fs.statSync(p).isFile()) throw new Error('x'); } catch (err) { return { error: 'No file was found at that path.' }; }
  const s = readSettings(); s.zealPath = p; writeSettings(s);
  return { ok: true };
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
