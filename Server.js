'use strict';
// Termux MCP Server (beta) — bash/view/create_file/str_replace/process, zero dependencies.
// This file is only the entry point (HTTP + JSON-RPC routing); real logic lives in lib/:
//   lib/config.js   — constants
//   lib/util.js     — cut/text/image/sanitizeEnv/suggestSimilar (stateless helpers)
//   lib/state.js    — cwd tracking + background process state (protected against PID reuse)
//   lib/exec.js     — bash execution, queue (mutex), log read/rotation
//   lib/safety.js   — safety/consent policy (always loaded), added to "initialize"
//   lib/memory.js   — memory system (Phase 1) instruction text, added to "initialize"
//   lib/apis.js     — API key registry (cross-project) instruction text, added to "initialize"
//   lib/skills.js   — skill system (skills/<name>/SKILL.md scan + manifest), added to "initialize"
//   lib/tools/*.js  — each tool (bash/view/create_file/str_replace/process) in its own file

const http = require('http');
const { PORT, HOST, VERSION } = require('./lib/config');
const state = require('./lib/state');
const { getPendingBashRequests } = require('./lib/exec');
const toolsIndex = require('./lib/tools');
const safety = require('./lib/safety');
const memory = require('./lib/memory');
const apis = require('./lib/apis');
const skills = require('./lib/skills');

// MCP protocol
const handle = async ({ method, params, id }, isNotification = false) => {
  if (method === 'initialize') {
    const skillsManifest = skills.getManifest();
    const parts = [safety.instructions, memory.instructions, apis.instructions];
    if (skillsManifest) parts.push(skillsManifest);
    return { jsonrpc: '2.0', id, result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'termux-mcp-beta', version: VERSION },
      instructions: parts.join('\n\n---\n\n'),
    } };
  }
  if (isNotification) return null;

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: toolsIndex.list } };
  }

  if (method === 'tools/call') {
    const name = params?.name;
    if (typeof name !== 'string' || !name) {
      return { jsonrpc: '2.0', id: id ?? null, error: { code: -32602, message: 'Invalid params: tool name required' } };
    }
    const result = await toolsIndex.dispatch(name, params, id);
    if (result) return result;
    return { jsonrpc: '2.0', id: id ?? null, result: { content: [{ type: 'text', text: `❌ Unknown tool: ${name}` }], isError: true } };
  }

  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };

  return { jsonrpc: '2.0', id: id ?? null, error: { code: -32601, message: `Method not found: ${method}` } };
};

// HTTP server
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.writeHead(200).end();
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const mem = process.memoryUsage();
    return res.end(JSON.stringify({
      status: 'ok',
      version: VERSION,
      cwd: state.getCwd(),
      uptime_s: Math.round(process.uptime()),
      memory_mb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      active_processes: state.procs.size,
      pending_bash_requests: getPendingBashRequests(),
    }));
  }
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    let tooLarge = false;
    req.on('data', (d) => {
      if (tooLarge) return;
      body += d;
      if (body.length > 1e6) {
        tooLarge = true;
        try {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Request body too large (max 1MB)' } }));
        } catch {}
        req.destroy();
      }
    });
    req.on('end', async () => {
      if (tooLarge) return; // 413 already sent
      const safeSend = (code, payload) => {
        if (res.writableEnded || res.destroyed) return; // connection already closed, do not write
        try {
          res.writeHead(code, code === 204 ? undefined : { 'Content-Type': 'application/json' });
          res.end(payload);
        } catch { /* socket closed, ignore safely */ }
      };
      let msg;
      try {
        msg = JSON.parse(body);
      } catch {
        return safeSend(400, JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
      }
      if (Array.isArray(msg)) {
        return safeSend(400, JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Batch requests are not supported' } }));
      }
      if (!msg || typeof msg !== 'object') {
        return safeSend(400, JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }));
      }
      const isNotification = !('id' in msg);
      try {
        const r = await handle(msg, isNotification);
        if (!r) return safeSend(204);
        safeSend(200, JSON.stringify(r));
      } catch (e) {
        const errId = ('id' in msg) ? msg.id : null;
        safeSend(200, JSON.stringify({ jsonrpc: '2.0', id: errId, error: { code: -32603, message: `Internal error: ${e.message}` } }));
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found. Use POST /mcp or GET /health');
}).listen(PORT, HOST, () => {
  console.log(`⚠️  Termux MCP Server v${VERSION}`);
  console.log(`🌐 http://${HOST}:${PORT}/mcp`);
  console.log(`📁 ${state.getCwd()}`);
});

process.on('SIGINT', async () => { await state.flushCwd(); process.exit(0); });
process.on('SIGTERM', async () => { await state.flushCwd(); process.exit(0); });

// Prevent an unexpected error from silencing the whole process - at least save cwd
// and exit cleanly so on restart the server does not lose where it left off.
process.on('uncaughtException', async (err) => {
  console.error('FATAL (uncaughtException):', err);
  try { await state.flushCwd(); } catch {}
  process.exit(1);
});
// Unhandled promise rejection is usually not fatal (one operation failed, server can continue)
// — just log it, do not kill the process.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise rejection:', reason);
});
