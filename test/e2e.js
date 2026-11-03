'use strict';
// Runs the real editor in Chromium and drives it through the real MCP server and the stdio bridge.
// Usage: node test/e2e.js   (needs the "playwright" package; not needed to build the installer)
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), cp = require('child_process');
const { createMcp } = require('../main/mcp-server');
const TOOLS = require('../main/tools');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } }

function raw(port, token, body, headers) {
  return new Promise(function (resolve, reject) {
    const data = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const h = Object.assign({ 'content-type': 'application/json', 'content-length': data.length }, token ? { authorization: 'Bearer ' + token } : {}, headers || {});
    const req = http.request({ host: '127.0.0.1', port: port, path: '/mcp', method: 'POST', headers: h }, function (res) {
      const c = []; res.on('data', function (x) { c.push(x); });
      res.on('end', function () { const t = Buffer.concat(c).toString(); let j = null; try { j = JSON.parse(t); } catch (e) {} resolve({ status: res.statusCode, json: j, text: t }); });
    });
    req.on('error', reject); req.end(data);
  });
}

(async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1480, height: 920 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error' && !/fonts\.googleapis\.com/.test(m.text())) errors.push('console: ' + m.text()); }); // the srcdoc preview used outside Electron inherits the page policy
  const url = 'file://' + path.resolve(__dirname, '../renderer/index.html');
  await page.goto(url);
  await page.waitForSelector('#page h1');

  const callRenderer = function (m, p) {
    return page.evaluate(function (a) { return window.NexusAPI.call(a[0], a[1]); }, [m, p]).catch(function (e) { throw new Error(String(e.message).replace(/^page\.evaluate: (Error: )?/, '').split('\n')[0]); });
  };
  const screenshot = async function (a) {
    const r = await callRenderer('__prepare_screenshot', { element_id: a.element_id, hide_selection: a.hide_selection !== false });
    const buf = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.width, height: r.height } });
    await callRenderer('__after_screenshot', {});
    return { data: buf.toString('base64'), mimeType: 'image/png', width: Math.round(r.width), height: Math.round(r.height) };
  };

  console.log('Every advertised tool has an implementation');
  for (const t of TOOLS) {
    if (t.name === 'screenshot') continue;
    let msg = '';
    try { await callRenderer(t.name, {}); } catch (e) { msg = e.message; }
    ok(!/Unknown method/.test(msg), t.name);
  }
  await page.evaluate(function () { localStorage.clear(); });
  await page.reload(); await page.waitForSelector('#page h1');

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-'));
  const mcp = createMcp({ dataDir: dataDir, callRenderer: callRenderer, screenshot: screenshot, version: 'test' });
  const info = await mcp.start();
  const P = info.port, K = info.token;
  const rpc = async function (method, params, id) { return (await raw(P, K, { jsonrpc: '2.0', id: id || 1, method: method, params: params })).json; };
  const call = async function (name, args) {
    const r = await rpc('tools/call', { name: name, arguments: args || {} });
    if (r.error) return { rpcError: r.error };
    const t = r.result.content.find(function (c) { return c.type === 'text'; });
    let data = t ? t.text : null; if (!r.result.isError) { try { data = JSON.parse(t.text); } catch (e) {} }
    return { isError: !!r.result.isError, data: data, content: r.result.content };
  };
  const html = async function () { return (await call('get_document')).data.html; };

  console.log('Server security');
  ok((await raw(P, null, { jsonrpc: '2.0', id: 1, method: 'ping' })).status === 401, 'no key is refused');
  ok((await raw(P, 'a'.repeat(64), { jsonrpc: '2.0', id: 1, method: 'ping' })).status === 401, 'wrong key is refused');
  ok((await raw(P, K, { jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: 'https://evil.example' })).status === 403, 'browser origin is refused');
  ok((await raw(P, K, { jsonrpc: '2.0', id: 1, method: 'ping' }, { host: 'evil.example' })).status === 403, 'wrong host is refused');
  ok((await raw(P, K, '{bad json')).status === 400, 'bad JSON gives 400');
  ok((await raw(P, K, { jsonrpc: '2.0', method: 'notifications/initialized' })).status === 202, 'notification gets 202');

  console.log('Protocol');
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  ok(init.result.protocolVersion === '2025-06-18' && init.result.serverInfo.name === 'nexusstudio', 'initialize');
  const list = await rpc('tools/list');
  ok(list.result.tools.length === TOOLS.length && list.result.tools.every(function (t) { return t.inputSchema && t.annotations; }), 'tools/list');
  ok((await rpc('nope')).error.code === -32601, 'unknown method');
  ok((await call('does_not_exist')).rpcError.code === -32602, 'unknown tool');
  ok((await call('get_element', {})).isError, 'missing argument is reported');
  ok((await call('get_element', { id: 'n1', bogus: 1 })).isError, 'unknown argument is reported');

  console.log('Reading');
  const tree = (await call('get_tree', { max_depth: 2 })).data;
  ok(tree.tag === 'body' && tree.children.length === 3, 'get_tree shows header, section, footer');
  const h1 = (await call('find_elements', { tag: 'h1' })).data.matches[0];
  ok(h1 && /Next-generation/.test(h1.text), 'find_elements finds the heading');
  const el = (await call('get_element', { id: h1.id })).data;
  ok(el.rect.width > 100 && el.rect.height > 20, 'get_element returns a size');

  console.log('Editing');
  const hero = (await call('find_elements', { tag: 'section' })).data.matches[0].id;
  let r = await call('add_element', { tag: 'section', parent_id: hero, position: 'inside', index: 0, style: { padding: '24px', background: '#fde68a', color: '#111' }, children: [{ tag: 'h2', text: 'Added by AI', attrs: { id: 'ai-title' } }, { tag: 'p', text: '<img src=x onerror=alert(1)>' }] });
  ok(!r.isError && r.data.id, 'add_element with children');
  ok((await page.locator('#page h2').first().textContent()) === 'Added by AI', 'new heading appears on the canvas');
  ok((await page.locator('#page p img').count()) === 0, 'text is shown as text, not parsed as HTML');
  ok(/&lt;img src=x onerror=alert\(1\)&gt;/.test(await html()), 'exported HTML escapes the text');
  const newId = r.data.id;
  r = await call('update_element', { id: newId, style: { 'background-color': '#bbf7d0', padding: null } });
  ok(!r.isError, 'update_element');
  const bg = await page.evaluate(function (id) { return getComputedStyle(document.querySelector('[data-nid="' + id + '"]')).backgroundColor; }, newId);
  ok(bg === 'rgb(187, 247, 208)', 'style change is visible (' + bg + ')');
  const before = await html();
  r = await call('update_element', { id: newId, style: { color: 'red; } body { display:none' } });
  ok(r.isError, 'injected CSS value is refused');
  r = await call('update_element', { id: newId, style: { 'not a prop': 'x' } });
  ok(r.isError, 'bad property name is refused');
  r = await call('update_element', { id: newId, style: { width: 'bananas' } });
  ok(r.isError, 'invalid CSS value is refused');
  ok((await html()) === before, 'failed edits changed nothing');
  r = await call('add_element', { tag: 'script', text: 'alert(1)' });
  ok(r.isError, 'script tag is refused');
  r = await call('add_element', { tag: 'img', children: [{ tag: 'div' }] });
  ok(r.isError, 'img cannot have children');

  r = await call('add_html', { html: '<div style="padding:8px;color:#222" onclick="x()"><b>Bold</b><script>alert(1)</script><iframe src="https://x.test"></iframe></div><p>tail</p>', parent_id: hero, position: 'inside' });
  ok(!r.isError && r.data.added === 2, 'add_html adds two elements');
  const doc = (await call('get_document')).data;
  ok(!/<script|<iframe/.test(doc.html), 'script and iframe were dropped');
  ok(/onclick="x\(\)"/.test(doc.html), 'handler kept as an attribute for the exported page');
  ok((await page.locator('#page script, #page iframe').count()) === 0, 'canvas has no script or iframe');

  console.log('Batch, undo, move, delete');
  const hBefore = await html();
  r = await call('batch', { operations: [{ tool: 'update_element', arguments: { id: newId, text: 'Changed' } }, { tool: 'delete_element', arguments: { id: 'n99999' } }] });
  ok(r.isError && /Step 2/.test(r.data) && (await html()) === hBefore, 'failing batch leaves the page unchanged');
  r = await call('batch', { operations: [{ tool: 'update_element', arguments: { id: 'ai-nonexistent-ok-skip', text: 'x' } }] });
  ok(r.isError, 'batch reports unknown element');
  r = await call('batch', { operations: [{ tool: 'update_element', arguments: { id: newId, text: 'T1' } }, { tool: 'add_element', arguments: { tag: 'p', text: 'B2', parent_id: newId } }] });
  ok(!r.isError && r.data.steps === 2, 'batch of two edits');
  ok((await html()) !== hBefore, 'batch changed the page');
  await call('undo');
  ok((await html()) === hBefore, 'one undo reverts the whole batch');
  await call('redo');
  ok(/B2/.test(await html()), 'redo brings it back');
  r = await call('move_element', { id: hero, target_id: newId, position: 'inside' });
  ok(r.isError && /into itself/.test(r.data), 'cannot move an element into itself');
  const footer = (await call('find_elements', { tag: 'footer' })).data.matches[0].id;
  r = await call('move_element', { id: newId, target_id: footer, position: 'before' });
  ok(!r.isError, 'move before footer');
  ok((await page.evaluate(function () { return document.querySelector('#page footer').previousElementSibling.querySelector('h2').textContent; })) === 'Added by AI', 'moved element sits before the footer');
  r = await call('duplicate_element', { id: newId });
  ok(!r.isError && (await page.locator('#page h2', { hasText: 'Added by AI' }).count()) === 2, 'duplicate_element');
  await call('delete_element', { id: r.data.id });
  ok((await page.locator('#page h2', { hasText: 'Added by AI' }).count()) === 1, 'delete_element');
  ok((await call('delete_element', { id: 'body' })).isError, 'body cannot be deleted');

  console.log('Whole-page tools');
  r = await call('set_css', { css: '.x{color:red}\n</style><script>alert(1)</script>' });
  ok(r.isError, 'set_css refuses </style>');
  r = await call('set_css', { css: '.pill:hover{opacity:.8}' });
  r = await call('set_js', { js: "console.log('</script>');" });
  const full = (await call('get_full_html')).data;
  ok(/\.pill:hover/.test(full) && /<\\\/script/.test(full) && (full.match(/<script>/g) || []).length === 1, 'export keeps CSS and escapes </script> inside JS');
  r = await call('set_title', { title: 'My AI page' });
  ok(/<title>My AI page<\/title>/.test((await call('get_full_html')).data), 'set_title shows in export');
  r = await call('set_viewport', { width: 390, height: 844, zoom: 0.6 });
  ok(r.data.width === 390, 'set_viewport');
  const shot = await call('screenshot', {});
  const img = shot.content && shot.content.find(function (c) { return c.type === 'image'; });
  ok(img && Buffer.from(img.data, 'base64').slice(1, 4).toString() === 'PNG', 'screenshot returns a PNG');
  fs.writeFileSync('/tmp/nx-shot-mobile.png', Buffer.from(img.data, 'base64'));
  await call('set_viewport', { width: 880, height: 640, zoom: 1 });
  r = await call('replace_body_html', { html: '<main style="padding:32px"><h1>Fresh start</h1><p>New page</p></main>' });
  ok(!r.isError && (await page.locator('#page h1').textContent()) === 'Fresh start', 'replace_body_html');
  ok((await call('new_document', { template: 'blank' })).data.ok && (await page.locator('#page h1').count()) === 0, 'new_document blank');
  await call('undo');
  ok((await page.locator('#page h1').count()) === 1, 'new_document can be undone');
  await call('new_document', { template: 'sample' });

  console.log('Stdio bridge (what Claude Desktop uses)');
  const child = cp.spawn(process.execPath, [path.resolve(__dirname, '../mcp/stdio-bridge.js')], { env: Object.assign({}, process.env, { NEXUSSTUDIO_DATA: dataDir }), stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = []; let buf = '';
  child.stdout.on('data', function (d) { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const ask = function (m) { child.stdin.write(JSON.stringify(m) + '\n'); return new Promise(function (res, rej) { const t0 = Date.now(); (function w() { const f = lines.find(function (l) { return l.id === m.id; }); if (f) return res(f); if (Date.now() - t0 > 15000) return rej(new Error('bridge timeout')); setTimeout(w, 20); })(); }); };
  ok((await ask({ jsonrpc: '2.0', id: 'a', method: 'initialize', params: { protocolVersion: '2025-06-18' } })).result.serverInfo, 'bridge initialize');
  ok((await ask({ jsonrpc: '2.0', id: 'b', method: 'tools/list' })).result.tools.length === TOOLS.length, 'bridge forwards tools/list');
  const viaBridge = await ask({ jsonrpc: '2.0', id: 'c', method: 'tools/call', params: { name: 'get_tree', arguments: { max_depth: 1 } } });
  ok(JSON.parse(viaBridge.result.content[0].text).tag === 'body', 'bridge forwards tools/call');
  await mcp.stop();
  const down = await ask({ jsonrpc: '2.0', id: 'd', method: 'tools/list' });
  ok(down.error && /not running/.test(down.error.message), 'bridge explains when NexusStudio is closed');
  child.stdin.end();
  const mcp2 = createMcp({ dataDir: dataDir, callRenderer: callRenderer, screenshot: screenshot });
  const i2 = await mcp2.start();
  ok(i2.token === K, 'secret key stays the same after a restart');
  await mcp2.stop();

  console.log('Editor in a plain browser');
  await page.click('[data-menu="file"]'); await page.keyboard.press('Escape');
  await page.click('#tabLy');
  ok((await page.locator('.lrow').count()) > 5, 'layers list is filled');
  await page.click('#tabEl');
  const before2 = await page.locator('.lrow').count();
  await page.click('#palette .it >> nth=0');
  await page.click('#tabLy');
  ok((await page.locator('.lrow').count()) === before2 + 1, 'clicking an element in the palette adds it');
  for (const v of ['html', 'css', 'js', 'preview', 'canvas']) { await page.click('#views [data-v="' + v + '"]'); }
  ok(true, 'all five views open');
  await page.click('#views [data-v="html"]');
  ok((await page.inputValue('#codeHtml')).includes('<header'), 'HTML view shows the code');
  await page.click('#views [data-v="canvas"]');
  await page.click('#page h1');
  await page.screenshot({ path: '/tmp/nx-editor.png' });
  await page.keyboard.press('Delete');
  ok((await page.locator('#page h1').count()) === 0, 'Delete key removes the selected element');
  await page.keyboard.press('Control+z');
  ok((await page.locator('#page h1').count()) === 1, 'Ctrl+Z brings it back');

  console.log('Desktop wiring with a stand-in for the Electron window');
  const dpage = await ctx.newPage();
  const derr = [];
  dpage.on('pageerror', function (e) { derr.push(e.message); });
  dpage.on('console', function (m) { if (m.type() === 'error' && !/nx-preview|ERR_UNKNOWN_URL_SCHEME/.test(m.text())) derr.push(m.text()); });
  await dpage.addInitScript(function () {
    const evil = JSON.stringify({ format: 'nexusstudio', version: 1, title: 'evil', css: '', js: '', root: { tag: 'body', style: { background: '#101820' }, children: [
      { tag: 'script', text: 'window.__pwned=1' }, { tag: 'section', attrs: { onclick: 'x()', srcdoc: '<p>' }, style: { color: 'red', 'x y': '1', background: 'blue; }' }, children: [{ tag: 'iframe' }, { tag: 'h2', text: 'Opened OK' }] }] } });
    window.__saved = [];
    window.nexus = {
      isDesktop: true, setDocName: function (n) { window.__doc = n; }, newProject: async function () {}, setPreview: async function () { return true; },
      openProject: async function () { return { text: evil, name: 'evil.nexus' }; },
      saveProject: async function (t, as, name) { window.__saved.push({ t: t, as: as, name: name }); return { ok: true, name: 'mine.nexus' }; },
      exportHtml: async function (t) { window.__exported = t; return { ok: true, name: 'x.html' }; },
      importHtml: async function () { return { canceled: true }; },
      mcpInfo: async function () { return { running: true, url: 'http://127.0.0.1:39517/mcp', token: 'abc', tools: [{ name: 'get_tree', title: 'Read' }], desktopConfig: '{"mcpServers":{}}', claudeCodeCommand: 'claude mcp add x' }; },
      mcpSetEnabled: async function () { return null; }, mcpInstallClaudeDesktop: async function () { return { ok: true, message: 'Added to Claude Desktop.' }; },
      onAiRequest: function (cb) { window.__aiCb = cb; }, aiRespond: function (id, ok, p) { (window.__aiResp = window.__aiResp || []).push({ id: id, ok: ok, p: p }); },
      onAiActivity: function (cb) { window.__actCb = cb; }
    };
  });
  await dpage.goto(url); await dpage.waitForSelector('#page h1');
  await dpage.evaluate(function () { window.__aiCb({ id: 7, method: 'get_tree', params: { max_depth: 0 } }); window.__aiCb({ id: 8, method: 'nope', params: {} }); window.__actCb({ tool: 'add_element' }); });
  await dpage.waitForFunction(function () { return window.__aiResp && window.__aiResp.length === 2; });
  const resp = await dpage.evaluate(function () { return window.__aiResp; });
  ok(resp[0].id === 7 && resp[0].ok && resp[0].p.tag === 'body', 'AI request is answered through the window bridge');
  ok(resp[1].id === 8 && !resp[1].ok && /Unknown method/.test(resp[1].p), 'AI errors are sent back as errors');
  ok(/AI: add element/.test(await dpage.textContent('#toast')), 'person sees what the AI is doing');
  await dpage.click('[data-menu="file"]'); await dpage.click('[data-act="openProject"]');
  await dpage.waitForSelector('#page h2');
  ok((await dpage.textContent('#page h2')) === 'Opened OK', 'Open project loads the file');
  ok((await dpage.locator('#page script, #page iframe').count()) === 0 && !(await dpage.evaluate(function () { return window.__pwned; })), 'dangerous tags in a project file are dropped');
  const treeAfter = await dpage.evaluate(function () { return window.NexusAPI.call('get_tree', { max_depth: 3 }); });
  const sec = treeAfter.children[0];
  ok(sec.style.color === 'red' && !sec.style['x y'] && !/;/.test(sec.style.background || ''), 'bad styles in a project file are dropped');
  ok(!(sec.attrs && sec.attrs.srcdoc), 'srcdoc attribute is dropped');
  await dpage.keyboard.press('Control+s');
  await dpage.waitForFunction(function () { return window.__saved.length === 1; });
  const saved = JSON.parse(await dpage.evaluate(function () { return window.__saved[0].t; }));
  ok(saved.format === 'nexusstudio' && saved.root.tag === 'body', 'Ctrl+S saves a project file');
  await dpage.click('[data-menu="file"]'); await dpage.click('[data-act="exportHtml"]');
  await dpage.waitForFunction(function () { return !!window.__exported; });
  ok((await dpage.evaluate(function () { return window.__exported; })).startsWith('<!DOCTYPE html>'), 'Export HTML sends a full page');
  await dpage.click('#aiChip');
  ok(await dpage.isVisible('#aiModal') && /AI server is on/.test(await dpage.textContent('#aiStatus')), 'Connect AI dialog opens');
  await dpage.click('#aiInstall');
  await dpage.waitForFunction(function () { return /Added to Claude Desktop/.test(document.getElementById('aiMsg').textContent); });
  ok(true, 'Add to Claude Desktop button reports back');
  await dpage.screenshot({ path: '/tmp/nx-ai-dialog.png' });
  await dpage.keyboard.press('Escape');
  ok(!(await dpage.isVisible('#aiModal')), 'Escape closes the dialog');
  ok(derr.length === 0, 'no errors in the desktop-wired page ' + (derr.length ? JSON.stringify(derr) : ''));

  ok(errors.length === 0, 'no console or page errors ' + (errors.length ? JSON.stringify(errors.slice(0, 5)) : ''));
  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error('TEST CRASH', e); process.exit(2); });
