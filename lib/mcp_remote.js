'use strict';
const { text } = require('./util');

const parseSSEorJSON = async (res) => {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const body = await res.text();
  if (ct.includes('text/event-stream')) {
    // take last JSON-RPC message with result/error
    const lines = body.split(/\r?\n/);
    let last = null;
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const msg = JSON.parse(data);
        if (msg && (msg.result !== undefined || msg.error !== undefined)) last = msg;
        else if (msg && msg.method) last = msg; // notification
      } catch {}
    }
    return last;
  }
  try { return JSON.parse(body); } catch { return null; }
};

const postJsonRpc = async (url, payload, headers = {}, timeoutMs = 20000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...headers,
      },
      body: JSON.stringify(payload),
    });
    const msg = await parseSSEorJSON(res);
    return { ok: res.ok, status: res.status, msg, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
};

const callRemoteTool = async (endpoint, toolName, args = {}, timeoutMs = 25000, extraHeaders = {}) => {
  // initialize
  const init = await postJsonRpc(endpoint, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'termux-mcp-proxy', version: '1.0' } }
  }, extraHeaders, timeoutMs);
  if (!init.msg?.result) {
    const err = init.msg?.error?.message || `init failed (HTTP ${init.status})`;
    throw new Error(err);
  }
  const session = init.headers.get('mcp-session-id') || '';
  const extra = { ...extraHeaders, ...(session ? { 'Mcp-Session-Id': session } : {}) };

  // initialized notification (best effort)
  try { await postJsonRpc(endpoint, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, extra, 8000); } catch {}

  // tools/call
  const call = await postJsonRpc(endpoint, {
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: toolName, arguments: args || {} }
  }, extra, timeoutMs);
  if (call.msg?.error) throw new Error(call.msg.error.message || 'Remote tool error');
  if (call.msg?.result) return call.msg.result;
  throw new Error(`Unexpected remote response (HTTP ${call.status})`);
};

const listRemoteTools = async (endpoint, timeoutMs = 20000, extraHeaders = {}) => {
  const init = await postJsonRpc(endpoint, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'termux-mcp-proxy', version: '1.0' } }
  }, extraHeaders, timeoutMs);
  if (!init.msg?.result) throw new Error(init.msg?.error?.message || `init failed (HTTP ${init.status})`);
  const session = init.headers.get('mcp-session-id') || '';
  const extra = { ...extraHeaders, ...(session ? { 'Mcp-Session-Id': session } : {}) };
  try { await postJsonRpc(endpoint, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, extra, 8000); } catch {}
  const r = await postJsonRpc(endpoint, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, extra, timeoutMs);
  if (r.msg?.error) throw new Error(r.msg.error.message || 'tools/list failed');
  return r.msg?.result?.tools || [];
};

module.exports = { callRemoteTool, listRemoteTools };
