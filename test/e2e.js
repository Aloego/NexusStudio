
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


page.on('console', function (m) {
  if (
    m.type() === 'error' &&
    !/fonts\.googleapis\.com/.test(m.text()) &&
    !/Executing inline event handler violates the following Content Security Policy directive/.test(m.text())
  ) {
    errors.push('console: ' + m.text());
  }
}); // the srcdoc preview used outside Electron inherits the page policy


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

  console.log('Elements tab');
  await page.click('#tabEl');
  const WANT = ['div', 'section', 'header', 'nav', 'main', 'footer', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'br', 'wbr',
    'strong', 'em', 'b', 'i', 'u', 's', 'small', 'mark', 'sub', 'sup', 'del', 'ins',
    'blockquote', 'q', 'cite', 'pre', 'code', 'kbd', 'samp', 'var',
    'abbr', 'dfn', 'time', 'data', 'bdi', 'bdo', 'ruby', 'rt', 'rp',
    'img', 'video', 'audio', 'svg', 'canvas', 'picture', 'source', 'track', 'figure', 'figcaption', 'map', 'area',
    'a', 'button',
    'input', 'textarea', 'select', 'form', 'label', 'fieldset', 'legend',
    'option', 'optgroup', 'datalist', 'output', 'progress', 'meter',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'menu', 'table',
    'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
    'article', 'aside', 'details', 'summary', 'dialog', 'address', 'hgroup', 'search'];
  const groupNames = await page.$$eval('#palette summary span:first-child', function (n) { return n.map(function (x) { return x.textContent; }); });
  ok(groupNames.indexOf('SVG / Drawing') < 0, 'Elements tab has no SVG / Drawing group');
  const haveTags = await page.$$eval('#palette .it em', function (n) { return n.map(function (x) { return x.textContent; }); });
  const missingTags = WANT.filter(function (t) { return haveTags.indexOf(t) < 0; });
  const extraTags = haveTags.filter(function (t) { return WANT.indexOf(t) < 0; });
  ok(missingTags.length === 0 && extraTags.length === 0, 'Elements tab lists exactly the expected elements ' + JSON.stringify({ missing: missingTags, extra: extraTags }));
  ok(haveTags.length === new Set(haveTags).size, 'no element appears twice in the Elements tab');
  const notAdded = [];
  for (const t of WANT) {
    const nb = await page.evaluate(function () { return document.querySelectorAll('.lrow').length; });
    await page.evaluate(function (tag) {
      const em = [].slice.call(document.querySelectorAll('#palette .it em')).filter(function (e) { return e.textContent === tag; })[0];
      em.closest('button').click();
    }, t);
    const na = await page.evaluate(function () { return document.querySelectorAll('.lrow').length; });
    if (na <= nb) notAdded.push(t);
  }
  ok(notAdded.length === 0, 'every element in the Elements tab can be added ' + JSON.stringify(notAdded));
  const fullHtml = JSON.stringify(await callRenderer('get_full_html', {}));
  ok(!/<\/(br|wbr|hr|img|input|source|track|col|area)>/.test(fullHtml), 'empty elements are written without a closing tag');

  console.log('Elements start with their browser defaults');
  // a separate browser context, so clearing the page here cannot touch the saved draft the later tests load
  const defCtx = await browser.newContext({ viewport: { width: 1480, height: 920 } });
  const defPage = await defCtx.newPage();
  await defPage.goto(url);
  await defPage.waitForSelector('#page h1');
  await defPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
  await defPage.click('#tabEl');
  const addPalette = function (tag) {
    return defPage.evaluate(function (t) {
      const em = [].slice.call(document.querySelectorAll('#palette .it em')).filter(function (e) { return e.textContent === t; })[0];
      em.closest('button').click();
    }, tag);
  };
  await addPalette('div');
  const divBox = await defPage.evaluate(function () {
    const el = document.querySelector('#page > div'), pg = document.querySelector('#page'), cs = getComputedStyle(pg);
    return [el.offsetWidth, Math.round(pg.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))];
  });
  ok(divBox[0] === divBox[1], 'a new div fills the width of its container on the canvas ' + JSON.stringify(divBox));
  const PROBES = {
    div: { display: 'block', position: 'static', width: 'auto', height: 'auto', margin: '0', padding: '16px' },
    p: { display: 'block', margin: '0', width: 'auto' },
    h3: { display: 'block', 'font-size': '1.17em', 'font-weight': '700', margin: '1em 0' },
    span: { display: 'inline', position: 'static', width: '', margin: '0' },
    strong: { display: 'inline', 'font-weight': '700' },
    em: { display: 'inline', 'font-style': 'italic' },
    a: { display: 'inline', 'text-decoration': 'underline' },
    li: { display: 'list-item' },
    ul: { display: 'block', width: 'auto' },
    table: { display: 'table', width: '100%' },
    td: { display: 'table-cell' },
    input: { display: 'inline-block' },
    button: { display: 'inline-block' },
    blockquote: { display: 'block', margin: '1em 40px' },
    progress: { display: 'inline-block', width: '10em' },
    datalist: { display: 'none' }
  };
  const probeBad = [];
  for (const t of Object.keys(PROBES)) {
    await addPalette(t);
    for (const prop of Object.keys(PROBES[t])) {
      const got = await defPage.inputValue('#f-' + prop);
      if (got !== PROBES[t][prop]) probeBad.push(t + ' ' + prop + ': expected "' + PROBES[t][prop] + '" got "' + got + '"');
    }
  }
  ok(probeBad.length === 0, 'the CSS tab shows each element\'s default values ' + JSON.stringify(probeBad));
  console.log('CSS tab covers the full set of CSS');
  const cssInfo = await defPage.evaluate(function () {
    const sel = document.querySelector('#f-display');
    const opts = [].slice.call(sel.options).map(function (o) { return o.value; });
    const wl = document.querySelector('#f-width').getAttribute('list');
    const dl = wl ? [].slice.call(document.querySelectorAll('#' + wl + ' option')).map(function (o) { return o.value; }) : [];
    return { displayOpts: opts, widthList: wl, widthVals: dl, justify: !!document.querySelector('.seg button[title="justify"]') };
  });
  ok(['table', 'table-cell', 'list-item', 'contents', 'flow-root', 'inline-grid'].every(function (v) { return cssInfo.displayOpts.indexOf(v) >= 0; }), 'display drop-down offers table, list-item, contents and the other values');
  ok(cssInfo.displayOpts.slice(0, 8).join() === ['', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'none'].join(), 'the original display options keep their order');
  ok(cssInfo.widthVals.indexOf('fit-content') >= 0 && cssInfo.widthVals.indexOf('100%') >= 0 && cssInfo.widthVals.indexOf('inherit') >= 0, 'text fields suggest common values ' + JSON.stringify(cssInfo.widthList));
  ok(cssInfo.justify, 'text-align has a justify button');
  const addByName = async function (name, viaEnter) {
    await defPage.fill('#propSearch', name);
    const n = await defPage.$$eval('#dd button span:first-child', function (b) { return b.map(function (x) { return x.textContent; }); });
    if (viaEnter) { await defPage.press('#propSearch', 'Enter'); } else { await defPage.click('#dd button:first-child'); }
    return n;
  };
  const sug = await addByName('accent-co', false);
  ok(sug[0] === 'accent-color' && (await defPage.$$('#f-accent-color')).length === 1, 'search suggests accent-color and adds its field');
  const sug2 = await addByName('text-decoration-c', false);
  ok(sug2.indexOf('text-decoration-color') >= 0, 'search suggests longhand properties such as text-decoration-color');
  const sug3 = await addByName('margin-to', false);
  ok(sug3[0] === 'margin-top', 'search suggests margin-top first');
  await addByName('--brand-color', true);
  ok((await defPage.$$('#f---brand-color')).length === 1, 'a CSS variable can be added by typing its name and pressing Enter');
  const coverage = await defPage.evaluate(function () {
    const probe = ['margin-top', 'padding-left', 'border-top-width', 'outline-color', 'list-style-type', 'accent-color', 'resize', 'appearance', 'fill', 'stroke', 'mask', 'container-type', 'animation-timing-function', 'transition-property', 'transition-duration', 'perspective', 'color-scheme', 'direction', 'contain', 'zoom', 'all', 'text-decoration-line', 'text-decoration-style', 'text-underline-offset'];
    return probe.filter(function (p) { document.querySelector('#propSearch').value = p; document.querySelector('#propSearch').dispatchEvent(new Event('input')); return ![].slice.call(document.querySelectorAll('#dd button span:first-child')).some(function (s) { return s.textContent === p; }); });
  });
  ok(coverage.length === 0, 'search suggests every property that was missing before ' + JSON.stringify(coverage));
  console.log('Margin and padding have a field for each side');
  const sideVal = function (id) { return defPage.inputValue('#f-' + id); };
  await addPalette('div');
  ok((await sideVal('padding-top')) === '16px' && (await sideVal('padding-left')) === '16px', 'padding sides show the stored padding (16px each)');
  ok((await sideVal('margin-top')) === '0' && (await sideVal('margin-right')) === '0', 'margin sides show the stored margin');
  await defPage.fill('#f-padding-left', '8px');
  ok((await sideVal('padding')) === '16px 16px 16px 8px' || (await sideVal('padding')) === '16px 16px 16px 8px', 'editing one side updates the padding field ' + JSON.stringify(await sideVal('padding')));
  ok(await defPage.evaluate(function () { return [].slice.call(document.querySelectorAll('#page div')).some(function (d) { return d.style.paddingLeft === '8px' && d.style.paddingTop === '16px' && d.style.paddingRight === '16px'; }); }), 'the canvas shows the new left padding and keeps the others');
  await defPage.fill('#f-margin-bottom', '24px');
  ok((await sideVal('margin')) === '0 0 24px' && (await sideVal('margin-bottom')) === '24px', 'a margin side is combined with the others in the margin field ' + JSON.stringify(await sideVal('margin')));
  await defPage.fill('#f-margin', '10px 20px');
  ok((await sideVal('margin-top')) === '10px' && (await sideVal('margin-right')) === '20px' && (await sideVal('margin-bottom')) === '10px' && (await sideVal('margin-left')) === '20px', 'typing the margin shorthand fills the four side fields');
  await addPalette('h3');
  ok((await sideVal('margin-top')) === '1em' && (await sideVal('margin-right')) === '0' && (await sideVal('margin-bottom')) === '1em', 'a heading shows its default vertical margin per side');
  await defPage.fill('#propSearch', 'margin-left'); await defPage.press('#propSearch', 'Enter');
  ok((await defPage.$$('#f-margin-left')).length === 1, 'searching margin-left jumps to the side field instead of adding a second one');
  console.log('Dragging an element on the canvas');
  // a separate browser context with an empty page; each case adds a fresh box
  const mvCtx = await browser.newContext({ viewport: { width: 1480, height: 920 } });
  const mvPage = await mvCtx.newPage();
  await mvPage.goto(url);
  await mvPage.waitForSelector('#page h1');
  await mvPage.click('#tabEl');
  const mvFresh = async function (style) {
    await mvPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
    await mvPage.evaluate(function () {
      const em = [].slice.call(document.querySelectorAll('#palette .it em')).filter(function (e) { return e.textContent === 'div'; })[0];
      em.closest('button').click();
    });
    if (style) {
      await mvPage.evaluate(function (st) {
        const sel = window.NexusAPI.call('get_selection', {});
        return window.NexusAPI.call('update_element', { id: sel.id, style: st });
      }, style);
    }
  };
  const mvBox = function () {
    return mvPage.evaluate(function () {
      const el = document.querySelector('#page > div'), r = el.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), left: el.style.left, top: el.style.top, right: el.style.right, bottom: el.style.bottom, position: el.style.position };
    });
  };
  const mvDrag = async function (dx, dy) {
    const b = await mvPage.locator('#page > div').boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await mvPage.mouse.move(x, y); await mvPage.mouse.down();
    await mvPage.mouse.move(x + dx, y + dy, { steps: 10 }); await mvPage.mouse.up();
  };
  const SIZE = { width: '120px', height: '60px' };
  await mvFresh();
  const stBefore = await mvBox(); await mvDrag(120, 80); const stAfter = await mvBox();
  ok(stBefore.position === 'static' && stAfter.position === 'relative' && stAfter.left === '120px' && stAfter.top === '80px' && stAfter.x - stBefore.x === 120 && stAfter.y - stBefore.y === 80, 'an element that is static by default can be dragged: it becomes relative and follows the mouse ' + JSON.stringify(stAfter));
  await mvFresh({ position: 'static', width: '120px', height: '60px' });
  const st2 = await mvBox(); await mvDrag(120, 80); const st2a = await mvBox();
  ok(st2a.position === 'relative' && st2a.left === '120px' && st2a.top === '80px' && st2a.x - st2.x === 120, 'an element set to static can be dragged too');
  await mvPage.keyboard.press('Control+z');
  const st2u = await mvBox();
  ok(st2u.position === 'static' && st2u.left === '' && st2u.x === st2.x && st2u.y === st2.y, 'one undo puts a dragged static element fully back (position and offsets) ' + JSON.stringify(st2u));
  await mvFresh({ width: '120px', height: '60px' });
  const clk = await mvPage.locator('#page > div').boundingBox(); await mvPage.mouse.click(clk.x + 20, clk.y + 20);
  const clkBox = await mvBox();
  ok(clkBox.position === 'static' && clkBox.left === '', 'a plain click on a static element does not change its position ' + JSON.stringify(clkBox));
  await mvFresh({ position: 'absolute', left: '20px', top: '30px', width: SIZE.width, height: SIZE.height });
  const abBefore = await mvBox(); await mvDrag(100, 60); const abAfter = await mvBox();
  ok(abAfter.left === '120px' && abAfter.top === '90px' && abAfter.x - abBefore.x === 100 && abAfter.y - abBefore.y === 60, 'an absolute element follows the mouse and its left and top are updated ' + JSON.stringify(abAfter));
  const abFields = await mvPage.evaluate(function () { return [document.querySelector('#f-left') && document.querySelector('#f-left').value, document.querySelector('#f-top') && document.querySelector('#f-top').value]; });
  ok(abFields[0] === '120px' && abFields[1] === '90px', 'the CSS tab shows the new left and top after the drag ' + JSON.stringify(abFields));
  await mvPage.keyboard.press('Control+z');
  const abUndo = await mvBox();
  ok(abUndo.left === '20px' && abUndo.top === '30px', 'one undo puts the element back where it was before the drag ' + JSON.stringify(abUndo));
  await mvFresh({ position: 'relative', width: SIZE.width, height: SIZE.height });
  await mvDrag(40, 25); const reBox = await mvBox();
  ok(reBox.left === '40px' && reBox.top === '25px', 'a relative element is moved from its normal place by left and top ' + JSON.stringify(reBox));
  await mvFresh({ position: 'absolute', right: '50px', bottom: '40px', width: SIZE.width, height: SIZE.height });
  await mvDrag(-10, -20); const rbBox = await mvBox();
  ok(rbBox.right === '60px' && rbBox.bottom === '60px' && rbBox.left === '' && rbBox.top === '', 'an element placed with right and bottom is moved through right and bottom ' + JSON.stringify(rbBox));
  await mvFresh({ position: 'fixed', left: '10px', top: '10px', width: SIZE.width, height: SIZE.height });
  const fxBefore = await mvBox(); await mvDrag(30, 30); const fxAfter = await mvBox();
  ok(fxAfter.left === '40px' && fxAfter.top === '40px' && fxAfter.x - fxBefore.x === 30, 'a fixed element can be dragged too ' + JSON.stringify(fxAfter));
  await mvFresh({ position: 'absolute', left: '20px', top: '20px', width: SIZE.width, height: SIZE.height });
  await mvPage.click('#zOut'); await mvPage.click('#zOut');
  const zoomNow = parseInt(await mvPage.textContent('#zoomVal'), 10);
  await mvDrag(80, 40); const zmBox = await mvBox();
  const wantL = 20 + Math.round(80 / (zoomNow / 100)), wantT = 20 + Math.round(40 / (zoomNow / 100));
  ok(zoomNow < 100 && zmBox.left === wantL + 'px' && zmBox.top === wantT + 'px', 'dragging at ' + zoomNow + '% zoom moves the element by the right amount ' + JSON.stringify({ zoomNow: zoomNow, left: zmBox.left, top: zmBox.top, wantL: wantL, wantT: wantT }));
  await mvPage.click('#zIn'); await mvPage.click('#zIn');
  await mvFresh({ position: 'absolute', left: '20px', top: '20px', width: SIZE.width, height: SIZE.height });
  const clBefore = await mvBox();
  const clb = await mvPage.locator('#page > div').boundingBox();
  await mvPage.mouse.click(clb.x + clb.width / 2, clb.y + clb.height / 2);
  const clAfter = await mvBox();
  ok(clAfter.left === clBefore.left && clAfter.top === clBefore.top, 'a plain click on a positioned element selects it without moving it');
  // adding by click does not trap the new element inside the previous one
  const mvAdd = function (t) { return mvPage.evaluate(function (t) { const em = [].slice.call(document.querySelectorAll('#palette .it em')).filter(function (e) { return e.textContent === t; })[0]; em.closest('button').click(); }, t); };
  const mvShape = function () { return mvPage.evaluate(function () { return window.NexusAPI.call('get_tree', { max_depth: 6 }); }).then(function (t) { return (function r(n) { return n.tag + (n.children && n.children.length ? '(' + n.children.map(r).join(',') + ')' : ''); })(t); }); };
  await mvPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
  await mvAdd('div'); await mvAdd('h1'); await mvAdd('p');
  const sh1 = await mvShape();
  ok(sh1 === 'body(div,h1,p)', 'clicking div, h1, p adds them side by side, not inside each other ' + sh1);
  const posBefore = await mvPage.evaluate(function () { return [].slice.call(document.querySelectorAll('#page > *:not(style)')).map(function (e) { const r = e.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }); });
  const hb = await mvPage.locator('#page > h1').boundingBox();
  await mvPage.mouse.move(hb.x + 30, hb.y + hb.height / 2); await mvPage.mouse.down(); await mvPage.mouse.move(hb.x + 230, hb.y + hb.height / 2 + 120, { steps: 8 }); await mvPage.mouse.up();
  const posAfter = await mvPage.evaluate(function () { return [].slice.call(document.querySelectorAll('#page > *:not(style)')).map(function (e) { const r = e.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }); });
  ok(posAfter[0] === posBefore[0] && posAfter[2] === posBefore[2] && posAfter[1] !== posBefore[1], 'dragging the h1 moves only the h1; the div and the paragraph stay put ' + JSON.stringify([posBefore, posAfter]));
  await mvPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
  await mvAdd('ul'); await mvAdd('li'); await mvAdd('li');
  const sh2 = await mvShape();
  ok(sh2 === 'body(ul(li,li,li,li,li))', 'list items go inside the list (3 starters + 2 added) and stay next to each other ' + sh2);
  await mvPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
  await mvAdd('table'); await mvAdd('tr'); await mvAdd('td'); await mvAdd('td');
  const sh3 = await mvShape();
  ok(/^body\(table\(.*tr\(td,td\)/.test(sh3), 'table parts nest properly: row in table, cells in the row ' + sh3);
  await mvPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
  await mvAdd('div');
  const divId = await mvPage.evaluate(function () { return window.NexusAPI.call('get_selection', {}).id; });
  await mvPage.evaluate(function (id) { const el = document.querySelector('[data-nid="' + id + '"]'); const dt = new DataTransfer(); dt.setData('text/x-nx-tag', 'h2'); const r = el.getBoundingClientRect(); el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }, divId);
  const sh4 = await mvShape();
  ok(sh4 === 'body(div(h2))', 'dropping an element from the palette onto a box still places it inside the box ' + sh4);
  // edges of a box: dropping near the top or bottom edge puts the element beside the box, the middle puts it inside
  await mvPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
  await mvAdd('div');
  const dropAt = async function (fy) { const id = await mvPage.evaluate(function () { return window.NexusAPI.call('get_selection', {}).id; }); await mvPage.evaluate(function (a) { const el = document.querySelector('[data-nid="' + a.id + '"]'); const r = el.getBoundingClientRect(); const dt = new DataTransfer(); dt.setData('text/x-nx-tag', 'h2'); el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * a.fy })); }, { id: id, fy: fy }); };
  await dropAt(0.95);
  ok((await mvShape()) === 'body(div,h2)', 'dropping near the bottom edge of a box puts the element after the box ' + (await mvShape()));
  // drag a box's child out, and a loose element into a box
  await mvPage.evaluate(function () { return window.NexusAPI.call('new_document', {}); });
  await mvPage.evaluate(function () { return window.NexusAPI.call('replace_body_html', { html: '<div id="box" style="height:200px;background:#ddd"><h2 id="kid">Kid</h2></div><p id="loose">Loose</p>' }); });
  const centre = async function (sel) { const b = await mvPage.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b: b }; };
  const dragTo = async function (from, to, opts) { const a = await centre(from), t = await centre(to); if (opts && opts.alt) await mvPage.keyboard.down('Alt'); await mvPage.mouse.move(a.x, a.y); await mvPage.mouse.down(); await mvPage.mouse.move((a.x + t.x) / 2, (a.y + t.y) / 2, { steps: 4 }); await mvPage.mouse.move(t.x, t.y, { steps: 4 }); await mvPage.mouse.up(); if (opts && opts.alt) await mvPage.keyboard.up('Alt'); };
  await dragTo('#page p', '#page div');
  ok((await mvShape()) === 'body(div(h2,p))', 'dragging a loose element over a box and releasing puts it inside that box ' + (await mvShape()));
  const looseBox = await mvPage.locator('#page p').boundingBox(), boxBox = await mvPage.locator('#page div').boundingBox();
  ok(Math.abs(looseBox.x + looseBox.width / 2 - (boxBox.x + boxBox.width / 2)) < 130 && looseBox.y > boxBox.y - 5 && looseBox.y < boxBox.y + boxBox.height, 'the element stays where it was released (it does not jump) ' + JSON.stringify([looseBox, boxBox]));
  const pb = await mvPage.locator('#page').boundingBox(), kb = await mvPage.locator('#page h2').boundingBox();
  await mvPage.mouse.move(kb.x + 10, kb.y + kb.height / 2); await mvPage.mouse.down(); await mvPage.mouse.move(pb.x + pb.width / 2, boxBox.y + boxBox.height + 120, { steps: 8 }); await mvPage.mouse.up();
  ok(/^body\(div\(p\),h2\)$/.test(await mvShape()), 'dragging an element out of a box and releasing below it takes it out of the box ' + (await mvShape()));
  await mvPage.evaluate(function () { return window.NexusAPI.call('replace_body_html', { html: '<div id="box" style="height:200px;background:#ddd"></div><p id="loose">Loose</p>' }); });
  await dragTo('#page p', '#page div', { alt: true });
  ok((await mvShape()) === 'body(div,p)', 'holding Alt while dragging only moves the element, it does not change the box it is in ' + (await mvShape()));
  await mvPage.evaluate(function () { return window.NexusAPI.call('replace_body_html', { html: '<div id="box"><section id="inner"><h2 id="kid">Kid</h2></section></div>' }); });
  await mvPage.evaluate(function () { return window.NexusAPI.call('select_element', { id: document.querySelector('#page h2').getAttribute('data-nid') }); });
  await mvPage.evaluate(function () { document.querySelector('[data-act="out"]').click(); });
  ok((await mvShape()) === 'body(div(section,h2))', 'the Move out of box button puts the selected element after its box ' + (await mvShape()));
  // HTML tab is a complete document
  await mvPage.evaluate(function () { document.querySelector('#views [data-v="html"]').click(); });
  const code = await mvPage.inputValue('#codeHtml');
  ok(/^<!DOCTYPE html>\n<html lang="en">\n<head>[\s\S]*<\/head>\n<body>\n[\s\S]*<\/body>\n<\/html>$/.test(code), 'the HTML tab shows a complete document with doctype, html, head and body');
  await mvPage.evaluate(function () { document.querySelector('#htmlApply').click(); });
  ok((await mvShape()) === 'body(div(section,h2))', 'Apply on the full document keeps the design as it was ' + (await mvShape()));
  await mvPage.evaluate(function () { document.querySelector('#views [data-v="canvas"]').click(); });
  // move cursor and hint
  const mvHover = async function () { const b = await mvPage.locator('#page > div').boundingBox(); await mvPage.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await mvPage.mouse.move(b.x + b.width / 2 + 2, b.y + b.height / 2 + 2); };
  const mvInfo = function () { return mvPage.evaluate(function () { const el = document.querySelector('#page > div'), h = document.querySelector('#moveHint'); return { cursor: getComputedStyle(el).cursor, hintHidden: h.hidden, hint: h.textContent }; }); };
  await mvFresh({ position: 'absolute', left: '20px', top: '20px', width: '120px', height: '60px' });
  await mvHover(); const mh1 = await mvInfo();
  ok(mh1.cursor === 'move' && mh1.hintHidden === false && mh1.hint === 'Drag to move', 'a draggable element shows the move cursor and the hint ' + JSON.stringify(mh1));
  await mvPage.mouse.move(5, 5); const mh2 = await mvInfo();
  ok(mh2.cursor !== 'move' && mh2.hintHidden === true, 'cursor and hint go away when the pointer leaves ' + JSON.stringify(mh2));
  await mvHover(); await mvPage.mouse.down(); const mh3 = await mvInfo(); await mvPage.mouse.up();
  ok(mh3.hintHidden === true, 'the hint hides while pressing/dragging');
  await mvFresh({ width: '120px', height: '60px' });
  await mvHover(); const mh4 = await mvInfo();
  ok(mh4.cursor === 'move' && mh4.hintHidden === false, 'a static element also shows the move cursor and hint ' + JSON.stringify(mh4));
  await mvFresh({ position: 'absolute', left: '20px', top: '20px', width: '120px', height: '60px' });
  await mvHover();
  ok(!(await mvPage.evaluate(function () { return window.NexusAPI.call('get_full_html', {}); }).then(function (r) { return JSON.stringify(r).indexOf('nx-move') >= 0; })), 'the move cursor class does not leak into the page code');
  await mvCtx.close();

  console.log('Element documentation (click the tag on the canvas)');
  const docTags = await defPage.evaluate(function () { return window.HTML_DOCS ? Object.keys(window.HTML_DOCS) : []; });
  const palTags = await defPage.evaluate(function () { return [].slice.call(document.querySelectorAll('#palette .it em')).map(function (e) { return e.textContent; }); });
  const noDoc = palTags.filter(function (t) { return docTags.indexOf(t) < 0; });
  ok(palTags.length >= 98 && noDoc.length === 0, 'every element in the Elements tab has a built-in guide entry ' + JSON.stringify(noDoc));
  await addPalette('div');
  ok((await defPage.getAttribute('#ovLab', 'role')) === 'button', 'the tag on the canvas is a button');
  await defPage.evaluate(function () { document.querySelector('#ovLab').click(); });
  ok(!(await defPage.$eval('#docDlg', function (d) { return d.hidden; })) && (await defPage.textContent('#docTitle')) === '<div>' && /box/i.test(await defPage.textContent('#docWhat')), 'clicking the tag opens the built-in guide for the element');
  ok(await defPage.evaluate(function () { return document.querySelector('#docZeal').hidden; }), 'in a plain browser the Zeal button is hidden (it needs the desktop app)');
  await defPage.evaluate(function () { window.__opened = []; window.open = function (u) { window.__opened.push(u); return null; }; });
  await defPage.click('#docMdn');
  const opened = await defPage.evaluate(function () { return window.__opened; });
  ok(opened.length === 1 && opened[0] === 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div', 'the MDN button opens the MDN page for the element ' + JSON.stringify(opened));
  ok((await defPage.textContent('#docLink')) === 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div' && !(await defPage.$eval('#docLinkRow', function (d) { return d.hidden; })), 'the page address is shown so it can be copied if no browser opens');
  await defPage.evaluate(function () { window.__clip = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: function (t) { window.__clip = t; return Promise.resolve(); } }, configurable: true }); });
  await defPage.click('#docCopy'); await defPage.waitForTimeout(100);
  ok((await defPage.evaluate(function () { return window.__clip; })) === 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div', 'Copy link puts the address on the clipboard');
  await defPage.click('#docW3');
  const opened2 = await defPage.evaluate(function () { return window.__opened; });
  ok(opened2.length === 2 && opened2[1] === 'https://www.w3schools.com/tags/tag_div.asp' && (await defPage.textContent('#docLink')) === opened2[1], 'the W3Schools button opens the W3Schools page for the element ' + JSON.stringify(opened2));
  await defPage.keyboard.press('Escape');
  ok(await defPage.$eval('#docDlg', function (d) { return d.hidden; }), 'Escape closes the guide');
  await addPalette('h3'); await defPage.evaluate(function () { document.querySelector('#ovLab').click(); });
  ok((await defPage.textContent('#docTitle')) === '<h3>', 'the guide follows the selected element');
  await defPage.click('#docClose');
  console.log('Pages and collapsible panels');
  const pgCall = function (m, a) { return defPage.evaluate(function (x) { return window.NexusAPI.call(x.m, x.a); }, { m: m, a: a || {} }); };
  const pgTabs = function () { return defPage.$$eval('#pagebar .pg .pn', function (l) { return l.map(function (e) { return e.textContent; }); }); };
  await pgCall('new_document', { template: 'blank' });
  await pgCall('add_element', { tag: 'h1', text: 'First page title', parent: 'body' }).catch(async function () { await defPage.evaluate(function () { const em = [].slice.call(document.querySelectorAll('#palette .it em')).filter(function (e) { return e.textContent === 'h1'; })[0]; em.closest('button').click(); }); });
  await pgCall('set_css', { css: '.one{color:red}' }); await pgCall('set_js', { js: 'var one=1;' });
  ok(JSON.stringify(await pgTabs()) === '["Page 1"]', 'a project starts with one page tab ' + JSON.stringify(await pgTabs()));
  await defPage.click('#pgAdd');
  ok(JSON.stringify(await pgTabs()) === '["Page 1","Page 2"]' && (await defPage.$eval('#pagebar .pg.on .pn', function (e) { return e.textContent; })) === 'Page 2', 'the + button adds a second page and opens it');
  const pg2Tree = await pgCall('get_tree', { max_depth: 2 });
  ok((pg2Tree.children || []).length === 0 && (await pgCall('get_document')).custom_css.indexOf('.one') < 0 && (await pgCall('get_document')).js.indexOf('one=1') < 0, 'the new page is empty and has its own CSS and JavaScript');
  await defPage.evaluate(function () { const em = [].slice.call(document.querySelectorAll('#palette .it em')).filter(function (e) { return e.textContent === 'h2'; })[0]; em.closest('button').click(); });
  await pgCall('set_css', { css: '.two{color:blue}' });
  await defPage.click('#pagebar [data-pg="0"] .pn');
  const pg1 = await pgCall('get_document');
  ok((await defPage.$eval('#pagebar .pg.on .pn', function (e) { return e.textContent; })) === 'Page 1' && pg1.custom_css.indexOf('.one') >= 0 && pg1.custom_css.indexOf('.two') < 0 && pg1.html.indexOf('First page title') >= 0 && pg1.html.indexOf('<h2') < 0, 'switching back shows page 1 untouched ' + JSON.stringify(pg1).slice(0, 200));
  await defPage.click('#pagebar [data-pg="1"] .pn');
  ok((await pgCall('get_document')).custom_css.indexOf('.two') >= 0 && ((await pgCall('get_tree', { max_depth: 2 })).children || []).length === 1, 'page 2 kept its own content');
  // undo only affects the page that is open
  await pgCall('undo'); await pgCall('undo');
  ok((await defPage.$eval('#pagebar .pg.on .pn', function (e) { return e.textContent; })) === 'Page 2', 'undo stays on the open page');
  await defPage.dblclick('#pagebar .pg.on .pn');
  await defPage.fill('#pagebar .pnin', 'About'); await defPage.press('#pagebar .pnin', 'Enter');
  ok(JSON.stringify(await pgTabs()) === '["Page 1","About"]', 'double-click renames a page ' + JSON.stringify(await pgTabs()));
  await defPage.click('#pagebar .pg.on [data-pgact="dup"]');
  ok(JSON.stringify(await pgTabs()) === '["Page 1","About","About copy"]', 'duplicate adds a copy after the open page ' + JSON.stringify(await pgTabs()));
  await defPage.click('#pagebar .pg.on [data-pgact="del"]');
  ok((await pgTabs()).length === 3, 'delete needs a second click');
  await defPage.click('#pagebar .pg.on [data-pgact="del"]');
  ok(JSON.stringify(await pgTabs()) === '["Page 1","About"]', 'the second click deletes the page ' + JSON.stringify(await pgTabs()));
  const lp = await pgCall('list_pages');
  ok(lp.pages.length === 2 && lp.current === 1 && lp.pages[1].name === 'About', 'list_pages reports the pages');
  await pgCall('select_page', { page: 'Page 1' });
  ok((await pgCall('get_document')).custom_css.indexOf('.one') >= 0, 'select_page opens a page by name');
  // pages survive a reload
  await defPage.reload(); await defPage.waitForTimeout(400);
  ok(JSON.stringify(await pgTabs()) === '["Page 1","About"]' && (await pgCall('get_document')).custom_css.indexOf('.one') >= 0, 'pages are remembered after reopening ' + JSON.stringify(await pgTabs()));
  await pgCall('select_page', { page: 'About' });
  ok((await pgCall('get_document')).custom_css.indexOf('.one') < 0 && (await defPage.$eval('#pagebar .pg.on .pn', function (e) { return e.textContent; })) === 'About', 'every page keeps its own content after reopening');
  await pgCall('delete_page', { page: 'About' });
  let lastDel = null; try { await pgCall('delete_page', {}); } catch (e) { lastDel = e.message; }
  ok(/at least one page/.test(lastDel || ''), 'the last page cannot be deleted');
  // collapsible panels
  const colW = function () { return defPage.evaluate(function () { const l = document.querySelector('.left').getBoundingClientRect().width, r = document.querySelector('.right').getBoundingClientRect().width, c = document.querySelector('.center').getBoundingClientRect().width; return { l: Math.round(l), r: Math.round(r), c: Math.round(c) }; }); };
  const w0 = await colW();
  await defPage.click('#colL');
  const w1 = await colW();
  ok(w1.l < 50 && w1.c > w0.c + 150 && (await defPage.isVisible('#railL')) && !(await defPage.isVisible('#palette')), 'the arrow collapses the Elements/Layers panel and the canvas grows ' + JSON.stringify([w0, w1]));
  await defPage.click('#colR');
  const w2 = await colW();
  ok(w2.r < 50 && w2.c > w1.c + 150 && !(await defPage.isVisible('#propBody')), 'the arrow collapses the Properties panel too ' + JSON.stringify(w2));
  await defPage.reload(); await defPage.waitForTimeout(400);
  ok((await colW()).l < 50 && (await colW()).r < 50, 'collapsed panels stay collapsed after reopening');
  await defPage.click('#railL'); await defPage.click('#railR');
  const w3 = await colW();
  ok(w3.l === w0.l && w3.r === w0.r && (await defPage.isVisible('#palette')) && (await defPage.isVisible('#propBody')), 'the small arrow on the edge brings each panel back ' + JSON.stringify(w3));
  console.log('Device size dropdown');
  ok((await defPage.$$('#devs [data-w]')).length === 0, 'the Mobile / Tablet / Desktop tab buttons are gone');
  ok((await defPage.textContent('#devBtn')).trim() === 'Responsive', 'the dropdown starts as Responsive');
  await defPage.click('#devBtn');
  const menuInfo = await defPage.evaluate(function () {
    const box = document.querySelector('#devDrop');
    return { shown: !box.hidden, heads: [].slice.call(box.querySelectorAll('.dh')).map(function (x) { return x.textContent; }), items: [].slice.call(box.querySelectorAll('button')).map(function (b) { return b.textContent; }) };
  });
  ok(menuInfo.shown && menuInfo.heads.join() === 'Mobile,Foldables,Tablets,Desktops,Smart Displays', 'the dropdown lists Mobile, Foldables, Tablets, Desktops and Smart Displays ' + JSON.stringify(menuInfo.heads));
  ok(menuInfo.items.some(function (t) { return /iPhone 16\s*393 × 852/.test(t); }) && menuInfo.items.some(function (t) { return /iPad Pro 13\s*1032 × 1376/.test(t); }) && menuInfo.items.some(function (t) { return /Desktop HD\s*1920 × 1080/.test(t); }), 'every device shows its dimensions');
  await defPage.click('#devDrop button:has-text("iPhone 16 Pro Max")');
  const pick = await defPage.evaluate(function () { return { vw: document.querySelector('#vw').value, vh: document.querySelector('#vh').value, pageW: document.querySelector('#page').offsetWidth, label: document.querySelector('#devBtn').textContent, hidden: document.querySelector('#devDrop').hidden }; });
  ok(pick.vw === '440' && pick.vh === '956' && pick.pageW === 440, 'choosing a device sets the viewport width and height ' + JSON.stringify(pick));
  ok(pick.label === 'iPhone 16 Pro Max' && pick.hidden, 'the button shows the chosen device and the menu closes');
  await defPage.click('#rotate');
  ok((await defPage.inputValue('#vw')) === '956' && (await defPage.textContent('#devBtn')) === 'iPhone 16 Pro Max', 'Rotate swaps width and height and keeps the device name');
  await defPage.fill('#vw', '500'); await defPage.press('#vw', 'Tab');
  ok((await defPage.textContent('#devBtn')) === 'Responsive', 'typing your own width switches back to Responsive');
  await defPage.click('#devBtn'); await defPage.click('#devDrop button:has-text("Desktop HD")');
  ok((await defPage.inputValue('#vw')) === '1920' && (await defPage.evaluate(function () { return document.querySelector('#page').offsetWidth; })) === 1920, 'wide desktop sizes such as 1920 are accepted');
  await defPage.click('#devBtn'); await defPage.click('#devDrop button:has-text("Edit…")');
  ok(await defPage.isVisible('#devEdit') && !(await defPage.isVisible('#devDrop')), 'Edit… opens the device editor and closes the menu');
  const rows = await defPage.$$eval('#devList .dr', function (n) { return n.length; });
  ok(rows === 19, 'the editor lists every device ' + rows);
  await defPage.fill('#devList input[aria-label="Width of iPhone 16"]', '400'); await defPage.press('#devList input[aria-label="Width of iPhone 16"]', 'Tab');
  await defPage.fill('#devList input[aria-label="Name of Pixel 10"]', 'Pixel 10 Test'); await defPage.press('#devList input[aria-label="Name of Pixel 10"]', 'Tab');
  await defPage.click('#devList .dh:has-text("Smart Displays") button');
  ok((await defPage.$$eval('#devList .dr', function (n) { return n.length; })) === 20, 'a device can be added to a group');
  await defPage.click('#devList button[aria-label="Remove New device"]');
  ok((await defPage.$$eval('#devList .dr', function (n) { return n.length; })) === 19, 'a device can be removed');
  const savedDev = await defPage.evaluate(function () { return JSON.parse(localStorage.getItem('nexusstudio.devices.v1') || '[]').map(function (d) { return d.n + ':' + d.w; }); });
  ok(savedDev.indexOf('iPhone 16:400') >= 0 && savedDev.indexOf('Pixel 10 Test:412') >= 0, 'edits are saved ' + JSON.stringify(savedDev.slice(0, 6)));
  await defPage.keyboard.press('Escape');
  ok(!(await defPage.isVisible('#devEdit')), 'Escape closes the device editor');
  await defPage.click('#devBtn');
  ok(/iPhone 16\s*400 × 852/.test(await defPage.textContent('#devDrop')) && /Pixel 10 Test/.test(await defPage.textContent('#devDrop')), 'the dropdown shows the edited sizes and names');
  await defPage.click('#devDrop button:has-text("iPhone 16"):not(:has-text("Pro"))');
  ok((await defPage.inputValue('#vw')) === '400', 'choosing an edited device uses its new width');
  await defPage.click('#devBtn'); await defPage.click('#devDrop button:has-text("Edit…")'); await defPage.click('#devReset'); await defPage.click('#devDone');
  await defPage.click('#devBtn');
  ok(/iPhone 16\s*393 × 852/.test(await defPage.textContent('#devDrop')), 'Reset to defaults restores the original list');
  await defPage.keyboard.press('Escape'); await defPage.click('#propSearch').catch(function () {});
  await defCtx.close();

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
      onAiActivity: function (cb) { window.__actCb = cb; },
      docsOpenOnline: async function (t, site) { (window.__docs = window.__docs || []).push(['online', t, site]); return { ok: true }; },
      exportPages: async function (files, name) { window.__exported = { files: files, name: name }; return { ok: true, count: files.length }; },
      docsOpenZeal: async function (t) { (window.__docs = window.__docs || []).push(['zeal', t]); return window.__zealMissing ? { needPath: true, error: 'Zeal was not found on this computer.' } : { ok: true }; },
      docsSetZealPath: async function (p) { (window.__docs = window.__docs || []).push(['path', p]); if (!/zeal/i.test(p)) return { error: 'bad' }; window.__zealMissing = false; return { ok: true }; }
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
  await dpage.evaluate(function () { window.__zealMissing = true; });
  await dpage.evaluate(function () { document.querySelector('#ovLab').click(); });
  ok((await dpage.isVisible('#docZeal')) && !(await dpage.isVisible('#docZealRow')), 'in the desktop app the Zeal button shows and the path box is hidden');
  await dpage.click('#docMdn');
  await dpage.click('#docW3');
  await dpage.click('#docZeal'); await dpage.waitForTimeout(150);
  ok(await dpage.isVisible('#docZealRow'), 'if Zeal is not found, a box to type its path appears (no file dialog)')
  ok(await dpage.isVisible('#docZealHelp') && /Open file location/.test(await dpage.textContent('#docZealHelp')), 'step-by-step help for finding Zeal is shown with the box');
  await dpage.fill('#docZealPath', 'C:\\Zeal\\zeal.exe'); await dpage.click('#docZealSave'); await dpage.waitForTimeout(150);
  const docCalls = await dpage.evaluate(function () { return window.__docs; });
  ok(JSON.stringify(docCalls.map(function (c) { return c[0]; })) === '["online","online","zeal","path","zeal"]' && docCalls[0][1] === docCalls[2][1] && docCalls[0][2] === 'mdn' && docCalls[1][2] === 'w3schools' && !(await dpage.isVisible('#docZealRow')), 'desktop: MDN button, Zeal button asks for the path, saving it opens Zeal ' + JSON.stringify(docCalls));
  await dpage.evaluate(function () { document.querySelector('#pgAdd').click(); });
  await dpage.evaluate(function () { document.querySelector('[data-act="exportAll"]').click(); });
  await dpage.waitForTimeout(150);
  const expd = await dpage.evaluate(function () { return window.__exported; });
  ok(expd && expd.files.length === 2 && expd.files.every(function (f) { return /^<!DOCTYPE html>/.test(f.text); }) && expd.files[1].name === 'Page 2', 'desktop: Export all pages hands every page as a full HTML document to the app');
  await dpage.keyboard.press('Escape');
  ok(derr.length === 0, 'no errors in the desktop-wired page ' + (derr.length ? JSON.stringify(derr) : ''));

  ok(errors.length === 0, 'no console or page errors ' + (errors.length ? JSON.stringify(errors.slice(0, 5)) : ''));
  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error('TEST CRASH', e); process.exit(2); });
