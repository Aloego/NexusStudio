'use strict';
// A small MCP server (Streamable HTTP, JSON responses) that only listens on this computer.
// It has no Electron code in it so it can be tested on its own.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const TOOLS = require('./tools');

const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];
const PREFERRED_PORT = 39517;
const MAX_BODY = 8 * 1024 * 1024;
const MAX_TEXT = 150000;

const INSTRUCTIONS = [
  'NexusStudio is a visual web page editor. The person is looking at the page while you work.',
  'Call get_tree first to learn element ids, then edit with update_element, add_element, add_html and the other tools.',
  'Prefer batch for several related edits so the person can undo them with one Ctrl+Z.',
  'Use screenshot to check your work. Inline styles are editable in the editor; use set_css for hover states and media queries.'
].join(' ');

function createMcp(opts) {
  const dataDir = opts.dataDir;
  const callRenderer = opts.callRenderer;
  const screenshot = opts.screenshot;
  const onActivity = opts.onActivity || function () {};
  const version = opts.version || '1.0.0';
  const infoFile = path.join(dataDir, 'mcp.json');
  let token = null, port = 0, server = null;
  let queue = Promise.resolve();

  function loadToken() {
    try {
      const j = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
      if (typeof j.token === 'string' && /^[a-f0-9]{64}$/.test(j.token)) token = j.token;
    } catch (e) { /* first run */ }
    if (!token) token = crypto.randomBytes(32).toString('hex');
  }
  function writeInfo(running) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(infoFile, JSON.stringify({
      running: !!running, port: port, token: token, url: 'http://127.0.0.1:' + port + '/mcp', pid: process.pid, version: version
    }, null, 2), { mode: 0o600 });
  }
  function authOk(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return false;
    const a = Buffer.from(m[1]), b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  function hostOk(req) {
    const h = String(req.headers.host || '').toLowerCase();
    return h === '127.0.0.1:' + port || h === 'localhost:' + port;
  }
  const rpcOk = (id, result) => ({ jsonrpc: '2.0', id: id, result: result });
  const rpcErr = (id, code, message) => ({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code: code, message: message } });

  function toolList() {
    return TOOLS.map(function (t) {
      return {
        name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema,
        annotations: { title: t.title, readOnlyHint: !!t.readOnly, destructiveHint: !!t.destructive, idempotentHint: false, openWorldHint: false }
      };
    });
  }
  function textResult(text, isError) {
    return { content: [{ type: 'text', text: text }], isError: !!isError };
  }
  function clip(s) {
    return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) + '\n…(cut off at ' + MAX_TEXT + ' characters; ask for a smaller part with get_tree id or max_depth)' : s;
  }
  function checkArgs(tool, args) {
    const req = (tool.inputSchema && tool.inputSchema.required) || [];
    req.forEach(function (k) { if (args[k] === undefined || args[k] === null) throw new Error('Missing required argument: ' + k); });
    const props = (tool.inputSchema && tool.inputSchema.properties) || {};
    Object.keys(args).forEach(function (k) { if (!props[k]) throw new Error('Unknown argument: ' + k); });
  }
  async function runTool(tool, args) {
    checkArgs(tool, args);
    onActivity(tool.name, args);
    if (tool.name === 'screenshot') {
      const shot = await screenshot(args);
      return { content: [
        { type: 'image', data: shot.data, mimeType: shot.mimeType },
        { type: 'text', text: 'Canvas screenshot, ' + shot.width + ' x ' + shot.height + ' pixels.' }
      ] };
    }
    const result = await callRenderer(tool.name, args);
    return textResult(clip(typeof result === 'string' ? result : JSON.stringify(result, null, 1)));
  }
  function serial(fn) {
    const p = queue.then(fn, fn);
    queue = p.catch(function () {});
    return p;
  }

  async function handleRpc(msg) {
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return rpcErr(msg && msg.id, -32600, 'Invalid request');
    }
    const isNotification = msg.id === undefined || msg.id === null;
    if (isNotification) return null;
    const params = msg.params && typeof msg.params === 'object' ? msg.params : {};
    switch (msg.method) {
      case 'initialize': {
        const v = SUPPORTED.indexOf(params.protocolVersion) >= 0 ? params.protocolVersion : SUPPORTED[0];
        return rpcOk(msg.id, { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'nexusstudio', title: 'NexusStudio', version: version }, instructions: INSTRUCTIONS });
      }
      case 'ping': return rpcOk(msg.id, {});
      case 'tools/list': return rpcOk(msg.id, { tools: toolList() });
      case 'tools/call': {
        const tool = TOOLS.find(function (t) { return t.name === params.name; });
        if (!tool) return rpcErr(msg.id, -32602, 'Unknown tool: ' + params.name);
        const args = params.arguments === undefined ? {} : params.arguments;
        if (!args || typeof args !== 'object' || Array.isArray(args)) return rpcErr(msg.id, -32602, 'arguments must be an object');
        try {
          return rpcOk(msg.id, await serial(function () { return runTool(tool, args); }));
        } catch (e) {
          return rpcOk(msg.id, textResult('Error: ' + (e && e.message ? e.message : String(e)), true));
        }
      }
      default: return rpcErr(msg.id, -32601, 'Method not found: ' + msg.method);
    }
  }

  function send(res, status, obj) {
    const body = obj === undefined ? '' : JSON.stringify(obj);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(body) });
    res.end(body);
  }

  function onRequest(req, res) {
    if (req.headers.origin) return send(res, 403, { error: 'Browser requests are not allowed' });
    if (!hostOk(req)) return send(res, 403, { error: 'Bad host' });
    if (!authOk(req)) { res.setHeader('www-authenticate', 'Bearer'); return send(res, 401, { error: 'Missing or wrong key' }); }
    const url = (req.url || '').split('?')[0];
    if (url !== '/mcp') return send(res, 404, { error: 'Not found' });
    if (req.method === 'DELETE') return send(res, 200, {});
    if (req.method !== 'POST') { res.setHeader('allow', 'POST, DELETE'); return send(res, 405, { error: 'Use POST' }); }
    const chunks = []; let size = 0, dead = false;
    req.on('data', function (c) {
      size += c.length;
      if (size > MAX_BODY) { dead = true; send(res, 413, { error: 'Too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', async function () {
      if (dead) return;
      let msg;
      try { msg = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return send(res, 400, rpcErr(null, -32700, 'Parse error')); }
      try {
        if (Array.isArray(msg)) {
          const out = (await Promise.all(msg.map(handleRpc))).filter(Boolean);
          return out.length ? send(res, 200, out) : send(res, 202);
        }
        const out = await handleRpc(msg);
        return out ? send(res, 200, out) : send(res, 202);
      } catch (e) {
        return send(res, 500, rpcErr(msg && msg.id, -32603, 'Internal error'));
      }
    });
  }

  function listen(p) {
    return new Promise(function (resolve, reject) {
      const s = http.createServer(onRequest);
      s.once('error', reject);
      s.listen(p, '127.0.0.1', function () { s.removeListener('error', reject); resolve(s); });
    });
  }
  async function start() {
    if (server) return info();
    loadToken();
    try { server = await listen(PREFERRED_PORT); } catch (e) { server = await listen(0); }
    port = server.address().port;
    writeInfo(true);
    return info();
  }
  function stop() {
    return new Promise(function (resolve) {
      if (!server) return resolve();
      const s = server; server = null;
      try { writeInfo(false); } catch (e) { /* ignore */ }
      s.close(function () { resolve(); });
      if (s.closeAllConnections) s.closeAllConnections();
    });
  }
  function info() {
    return { running: !!server, port: port, token: token, url: 'http://127.0.0.1:' + port + '/mcp', infoFile: infoFile, tools: TOOLS.map(function (t) { return { name: t.name, title: t.title }; }) };
  }
  loadToken();
  return { start: start, stop: stop, info: info };
}

module.exports = { createMcp: createMcp, PREFERRED_PORT: PREFERRED_PORT };
