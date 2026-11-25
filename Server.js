'use strict';
// Termux MCP Server (beta) — bash/view/create_file/str_replace/process, sıfır asılılıq.
// Bu fayl yalnız giriş nöqtəsidir (HTTP + JSON-RPC yönləndirmə); əsl iş məntiqi lib/-dədir:
//   lib/config.js   — sabitlər
//   lib/util.js     — cut/text/image/sanitizeEnv/suggestSimilar (stateless köməkçilər)
//   lib/state.js    — cwd izləmə + arxa-fon proseslərin (PID reuse-a qarşı qorunan) vəziyyəti
//   lib/exec.js     — bash icrası, növbə (mutex), log oxuma/rotasiya
//   lib/safety.js   — təhlükəsizlik/razılıq siyasəti (həmişə yüklənir), "initialize"-ə əlavə olunur
//   lib/memory.js   — yaddaş sistemi (Faz 1) təlimat mətni, "initialize"-ə əlavə olunur
//   lib/apis.js     — API key reyestri (layihələr arası) təlimat mətni, "initialize"-ə əlavə olunur
//   lib/skills.js   — skil sistemi (skills/<ad>/SKILL.md skan + manifest), "initialize"-ə əlavə olunur
//   lib/tools/*.js  — hər alət (bash/view/create_file/str_replace/process) öz faylında

const http = require('http');
const { PORT, HOST, VERSION } = require('./lib/config');
const state = require('./lib/state');
const { getPendingBashRequests } = require('./lib/exec');
const toolsIndex = require('./lib/tools');
const safety = require('./lib/safety');
const memory = require('./lib/memory');
const apis = require('./lib/apis');
const skills = require('./lib/skills');

// MCP protokolu
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
    return { jsonrpc: '2.0', id: id ?? null, result: { content: [{ type: 'text', text: `❌ Naməlum alət: ${name}` }], isError: true } };
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
      if (tooLarge) return; // 413 artıq göndərilib
      const safeSend = (code, payload) => {
        if (res.writableEnded || res.destroyed) return; // bağlantı artıq bağlıdır, yazma
        try {
          res.writeHead(code, code === 204 ? undefined : { 'Content-Type': 'application/json' });
          res.end(payload);
        } catch { /* soket bağlanıb, təhlükəsiz şəkildə görməzdən gəl */ }
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

// Gözlənilməz xəta bütün prosesi susdurmadan sıradan çıxarmasın deyə - heç olmasa cwd-ni
// saxlayıb təmiz çıxaq ki, server yenidən başlayanda haradan davam edəcəyini itirməsin.
process.on('uncaughtException', async (err) => {
  console.error('FATAL (uncaughtException):', err);
  try { await state.flushCwd(); } catch {}
  process.exit(1);
});
// Tutulmamış promise rədd edilməsi adətən fatal deyil (bir əməliyyat uğursuz olub, server
// davam edə bilər) — sadəcə logla, prosesi söndürmə.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise rejection:', reason);
});
