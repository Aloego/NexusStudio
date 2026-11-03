'use strict';
// Lets apps that only speak "stdio" MCP (such as Claude Desktop) talk to NexusStudio.
// It reads one JSON message per line from stdin, passes it to the NexusStudio server on this
// computer, and writes the answer to stdout. It starts NexusStudio first if it is not running.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const readline = require('readline');

const dataDir = process.env.NEXUSSTUDIO_DATA || path.join(process.env.APPDATA || path.join(os.homedir(), '.config'), 'NexusStudio');
const exe = process.env.NEXUSSTUDIO_EXE || (process.versions.electron ? process.execPath : null);
const log = function (m) { process.stderr.write('[nexusstudio-bridge] ' + m + '\n'); };
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

function readCfg() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dataDir, 'mcp.json'), 'utf8'));
    return j && j.port && j.token ? j : null;
  } catch (e) { return null; }
}
function post(cfg, body, timeout) {
  return new Promise(function (resolve, reject) {
    const data = Buffer.from(JSON.stringify(body));
    const req = http.request({
      host: '127.0.0.1', port: cfg.port, path: '/mcp', method: 'POST', timeout: timeout || 60000,
      headers: { 'content-type': 'application/json', 'content-length': data.length, authorization: 'Bearer ' + cfg.token, accept: 'application/json' }
    }, function (res) {
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }); });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(new Error('Timed out waiting for NexusStudio')); });
    req.end(data);
  });
}
async function alive() {
  const cfg = readCfg();
  if (!cfg) return null;
  try {
    const r = await post(cfg, { jsonrpc: '2.0', id: 0, method: 'ping' }, 3000);
    return r.status === 200 ? cfg : null;
  } catch (e) { return null; }
}
let launching = null;
async function ensureApp() {
  let cfg = await alive();
  if (cfg) return cfg;
  if (!launching) {
    launching = (async function () {
      if (!(exe && /nexusstudio/i.test(path.basename(exe)))) return null; // cannot start it from here
      {
        log('Starting NexusStudio...');
        const env = Object.assign({}, process.env);
        delete env.ELECTRON_RUN_AS_NODE;
        const child = cp.spawn(exe, [], { detached: true, stdio: 'ignore', env: env });
        child.on('error', function (e) { log('Could not start NexusStudio: ' + e.message); });
        child.unref();
      }
      for (let i = 0; i < 60; i++) {
        await sleep(500);
        const c = await alive();
        if (c) return c;
      }
      return null;
    })().finally(function () { launching = null; });
  }
  cfg = await launching;
  return cfg;
}

function write(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
const errorFor = function (id, message) { return { jsonrpc: '2.0', id: id, error: { code: -32000, message: message } }; };

async function handle(msg) {
  if (!msg || typeof msg !== 'object') return;
  const hasId = msg.id !== undefined && msg.id !== null;
  if (!hasId) return; // notifications need no answer
  if (msg.method === 'initialize') {
    const v = msg.params && msg.params.protocolVersion;
    return write({ jsonrpc: '2.0', id: msg.id, result: {
      protocolVersion: typeof v === 'string' ? v : '2025-06-18', capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'nexusstudio-bridge', version: '1.0.0' },
      instructions: 'NexusStudio is a visual web page editor. Call get_tree first, then edit.'
    } });
  }
  if (msg.method === 'ping') return write({ jsonrpc: '2.0', id: msg.id, result: {} });
  const cfg = await ensureApp();
  if (!cfg) return write(errorFor(msg.id, 'NexusStudio is not running and could not be started. Open NexusStudio, then try again.'));
  try {
    const r = await post(cfg, msg);
    if (r.status !== 200) return write(errorFor(msg.id, 'NexusStudio answered with status ' + r.status + (r.status === 401 ? ' (the key changed; restart the AI app)' : '')));
    write(JSON.parse(r.text));
  } catch (e) {
    write(errorFor(msg.id, 'Could not reach NexusStudio: ' + e.message));
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let pending = 0, closed = false;
rl.on('line', function (line) {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  pending++;
  handle(msg).catch(function (e) { log(e && e.message); }).finally(function () { pending--; if (closed && !pending) process.exit(0); });
});
rl.on('close', function () { closed = true; if (!pending) process.exit(0); });
