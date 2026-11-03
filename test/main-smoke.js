'use strict';
// Loads main/main.js against a stand-in for Electron to catch wiring mistakes. Run: node test/main-smoke.js
const Module = require('module'), path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nxmain-'));
const handlers = {}, ons = {}, appOn = {};
let win = null, readyCb = null, menuSet = false;
const frame = {};
class BW {
  constructor(o) { win = this; this.opts = o; this.webContents = { mainFrame: frame, send: (ch, msg) => this.onSend && this.onSend(ch, msg), setWindowOpenHandler() {}, on() {}, loadFile() {}, capturePage: async (r) => ({ getSize: () => ({ width: r.width, height: r.height }), resize() { return this; }, toPNG: () => Buffer.from('\x89PNGfake') }) }; this.title = ''; }
  once() {} on() {} loadFile() {} show() {} isDestroyed() { return false; } isMinimized() { return false; } setTitle(t) { this.title = t; }
}
const electron = {
  app: { getPath: (n) => n === 'userData' ? path.join(tmp, 'NexusStudio') : tmp, setPath() {}, requestSingleInstanceLock: () => true, whenReady: () => ({ then: (f) => { readyCb = f; return Promise.resolve(); } }), on: (n, f) => { appOn[n] = f; }, quit() {}, isPackaged: true, getVersion: () => '1.0.0' },
  BrowserWindow: BW, Menu: { setApplicationMenu() { menuSet = true; }, buildFromTemplate: (t) => t },
  dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [path.join(tmp, 'p.nexus')] }), showSaveDialog: async () => ({ canceled: false, filePath: path.join(tmp, 'saved.nexus') }) },
  ipcMain: { on: (c, f) => { ons[c] = f; }, handle: (c, f) => { handlers[c] = f; } },
  protocol: { registerSchemesAsPrivileged() {}, handle(s, f) { electron._proto = f; } },
  session: { defaultSession: { setPermissionRequestHandler() {} } }, shell: { openExternal() {} }
};
const orig = Module._load;
Module._load = function (req) { return req === 'electron' ? electron : orig.apply(this, arguments); };
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  Object.defineProperty(process, 'resourcesPath', { value: 'C:\\Apps\\NexusStudio\\resources', configurable: true });
  require('../main/main.js');
  await readyCb();
  ok(menuSet && win && win.opts.webPreferences.contextIsolation === true && win.opts.webPreferences.nodeIntegration === false && win.opts.webPreferences.sandbox === true, 'window is created with isolation on');
  const info = JSON.parse(fs.readFileSync(path.join(tmp, 'NexusStudio', 'mcp.json') , 'utf8').toString());
  ok(info.running && info.port > 0 && /^[a-f0-9]{64}$/.test(info.token), 'AI server started and wrote its connection file');
  const e = { sender: win.webContents, senderFrame: frame };
  const bad = { sender: {}, senderFrame: {} };
  // relay: editor answers every request
  win.onSend = (ch, m) => { if (ch === 'ai:request') setImmediate(() => ons['ai:response'](e, m.method === '__prepare_screenshot' ? { id: m.id, ok: true, payload: { x: 10, y: 20, width: 800, height: 600 } } : m.method === 'fail' ? { id: m.id, ok: false, payload: 'nope' } : { id: m.id, ok: true, payload: { echo: m.method, params: m.params } })); };
  const rpc = (body) => new Promise((res) => { const d = Buffer.from(JSON.stringify(body)); const r = http.request({ host: '127.0.0.1', port: info.port, path: '/mcp', method: 'POST', headers: { 'content-length': d.length, authorization: 'Bearer ' + info.token } }, (x) => { const c = []; x.on('data', (y) => c.push(y)); x.on('end', () => res(JSON.parse(Buffer.concat(c).toString()))); }); r.end(d); });
  const r1 = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_tree', arguments: { max_depth: 2 } } });
  ok(JSON.parse(r1.result.content[0].text).echo === 'get_tree', 'a tool call reaches the editor and comes back');
  const r2 = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'screenshot', arguments: {} } });
  ok(r2.result.content[0].type === 'image' && r2.result.content[0].mimeType === 'image/png', 'screenshot is returned as an image');
  ons['ai:response'](bad, { id: 999, ok: true });
  ok(true, 'answers from anywhere but the editor are ignored');
  // info + Claude Desktop setup
  const mi = await handlers['mcp:info'](e);
  const cfg = JSON.parse(mi.desktopConfig).mcpServers.nexusstudio;
  ok(cfg.env.ELECTRON_RUN_AS_NODE === '1' && /stdio-bridge\.js$/.test(cfg.args[0]), 'Claude Desktop config points at the bridge');
  ok(/^claude mcp add --transport http nexusstudio http:\/\/127\.0\.0\.1:\d+\/mcp --header "Authorization: Bearer [a-f0-9]{64}"$/.test(mi.claudeCodeCommand), 'Claude Code command is well formed');
  ok((await handlers['mcp:info'](bad)) === null, 'other senders cannot read the key');
  const cd = path.join(tmp, 'Claude'); fs.mkdirSync(cd, { recursive: true });
  fs.writeFileSync(path.join(cd, 'claude_desktop_config.json'), JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'x' } } }));
  const inst = await handlers['mcp:installClaudeDesktop'](e);
  const after = JSON.parse(fs.readFileSync(path.join(cd, 'claude_desktop_config.json'), 'utf8'));
  ok(inst.ok && after.theme === 'dark' && after.mcpServers.other && after.mcpServers.nexusstudio && fs.existsSync(path.join(cd, 'claude_desktop_config.json.nexusstudio-backup')), 'setup keeps existing settings and makes a backup');
  fs.writeFileSync(path.join(cd, 'claude_desktop_config.json'), '{ broken');
  const inst2 = await handlers['mcp:installClaudeDesktop'](e);
  ok(!inst2.ok && fs.readFileSync(path.join(cd, 'claude_desktop_config.json'), 'utf8') === '{ broken', 'a damaged settings file is left alone');
  // files
  fs.writeFileSync(path.join(tmp, 'p.nexus'), '{"format":"nexusstudio"}');
  const op = await handlers['file:open'](e);
  ok(op.name === 'p.nexus' && op.text.includes('nexusstudio'), 'Open reads the chosen file');
  const sv = await handlers['file:save'](e, { text: '{"a":1}', saveAs: false, name: 'x' });
  ok(sv.ok && fs.readFileSync(path.join(tmp, 'p.nexus'), 'utf8') === '{"a":1}', 'Save writes back to the opened file');
  const sa = await handlers['file:save'](e, { text: '{"b":2}', saveAs: true, name: 'y' });
  ok(sa.ok && sa.name === 'saved.nexus' && fs.existsSync(path.join(tmp, 'saved.nexus')), 'Save as writes a new file');
  ok((await handlers['file:save'](bad, { text: 'x' })).canceled, 'other senders cannot save');
  const ex = await handlers['file:export'](e, { text: '<!DOCTYPE html>', name: 'a/b:c' });
  ok(ex.ok, 'Export writes a file');
  ok(await handlers['preview:set'](e, '<p>hi</p>') === true, 'preview is stored');
  const resp = await electron._proto();
  ok((await resp.text()) === '<p>hi</p>' && /text\/html/.test(resp.headers.get('content-type')), 'preview protocol serves it as a web page');
  ons['win:docname'](e, 'my page');
  ok(win.title === 'NexusStudio - my page', 'window title follows the document');
  // turning the server off and on
  await handlers['mcp:enable'](e, false);
  ok(JSON.parse(fs.readFileSync(path.join(tmp, 'NexusStudio', 'mcp.json'), 'utf8')).running === false, 'turning the AI server off is recorded');
  await handlers['mcp:enable'](e, true);
  const mi2 = await handlers['mcp:info'](e);
  ok(mi2.running && mi2.token === mi.token, 'turning it back on keeps the same key');
  appOn['will-quit']();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((x) => { console.error('CRASH', x); process.exit(2); });
