'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { GUARD, WS, HOME } = require('../config');
const { text, cut, sanitizeEnv } = require('../util');
const { readTail, cleanupOldLogs } = require('../exec');
const state = require('../state');
const sandbox = require('../sandbox');

const schema = {
  name: 'process',
  description: `Manage long-running background processes (e.g. a dev server). "start" launches a command in background and returns PID and log file path — do NOT add "&" to cmd, the tool backgrounds it automatically. "wait" waits until a specific word/text (pattern, or JS regex with regex:true) appears in the log file. "list" returns processes started by this tool that are still running AND server stats ({processes:[...], server:{uptime_s, memory_mb, cwd, active_processes}}) — for all system processes use bash "ps aux" instead. Even after server restart, still-alive processes continue to appear in "list". "kill" can only stop a PID started by this tool's "start" (and its entire child process group) — for other/system PIDs use bash "kill -9 <pid>" instead. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    action: { type: 'string', enum: ['start', 'wait', 'list', 'kill'], description: 'Operation' },
    cmd: { type: 'string', description: 'For start: bash command to run in background (do not add "&")' },
    env: { type: 'object', description: 'For start: extra environment variables (e.g. {"PORT":"3000"}) — added on top of existing env, does not replace it', additionalProperties: { type: 'string' } },
    unsafe: { type: 'boolean', description: 'For start: if true, bypasses sandbox safety checks. Use only when explicitly requested by user.' },
    pid: { type: 'number', description: 'For kill: process ID (pid returned by start)' },
    signal: { type: 'string', enum: ['SIGTERM', 'SIGKILL'], description: 'For kill: signal, default SIGTERM (graceful stop)' },
    log: { type: 'string', description: 'For wait: log file path (log returned by start)' },
    pattern: { type: 'string', description: 'For wait: text/word to wait for (or JS regex expression if regex=true)' },
    regex: { type: 'boolean', description: 'If true, pattern is interpreted as JS regex (e.g. "PORT [0-9]+"), default false (plain substring search)' },
    flags: { type: 'string', description: 'When regex:true, JS regex flags (e.g. "i" case-insensitive, "m" multiline), default empty' },
    timeout: { type: 'number', description: 'For wait: maximum wait time (ms), default 30000, max 55000' },
    interval: { type: 'number', description: 'For wait: polling interval (ms), default 500, min 200, max 5000' },
  }, required: ['action'] },
};

const startAction = async (params, id) => {
  const cmd = params.arguments?.cmd;
  if (!cmd) return { jsonrpc: '2.0', id, ...text('❌ cmd is required for start', true) };
  const unsafe = params.arguments?.unsafe === true;
  if (!unsafe) {
    const hit = sandbox.checkDangerous(cmd);
    if (hit) return { jsonrpc: '2.0', id, ...text(`❌ Dangerous command blocked (sandbox protection). Rule: ${hit}\nResend with unsafe:true if needed.`, true) };
  }
  cleanupOldLogs(); // non-blocking - does not delay response, runs in background
  const logPath = path.join(WS, `.proc-${Date.now()}-${Math.floor(Math.random() * 1000)}.log`);
  try {
    const cwd = unsafe ? state.getCwd() : sandbox.clampToSandbox(state.getCwd());
    const p = spawn('bash', ['-c', `( ${cmd} ) > '${logPath}' 2>&1`], { cwd, detached: true, stdio: 'ignore', env: { ...process.env, HOME, ...sanitizeEnv(params.arguments?.env) } });
    p.unref();
    const sig = await state.getProcSignature(p.pid);
    state.procs.set(p.pid, { cmd, log: logPath, startTime: Date.now(), sig });
    await state.saveProcs();
    return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid: p.pid, cmd, log: logPath, status: 'started' })) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.message}`, true) };
  }
};

const waitAction = async (params, id) => {
  const logPath = params.arguments?.log;
  const pattern = params.arguments?.pattern;
  if (!logPath || !pattern) return { jsonrpc: '2.0', id, ...text('❌ log and pattern are required for wait', true) };

  let matcher;
  if (params.arguments?.regex === true) {
    try {
      const flags = typeof params.arguments?.flags === 'string' ? params.arguments.flags : '';
      const re = new RegExp(pattern, flags);
      matcher = (s) => re.test(s);
    } catch (err) {
      return { jsonrpc: '2.0', id, ...text(`❌ Invalid regex: ${err.message}`, true) };
    }
  } else {
    matcher = (s) => s.includes(pattern);
  }

  const maxWait = Math.min(Number(params.arguments?.timeout) || 30000, 55000);
  const pollMs = Math.min(Math.max(Number(params.arguments?.interval) || 500, 200), 5000);
  const deadline = Date.now() + maxWait;
  let lastContent = '';
  let everRead = false;
  while (Date.now() < deadline) {
    try {
      lastContent = await readTail(logPath);
      everRead = true;
      if (matcher(lastContent)) {
        return { jsonrpc: '2.0', id, ...text(JSON.stringify({ found: true, log: logPath, content: cut(lastContent) })) };
      }
    } catch { /* file may not exist yet (or was deleted), keep waiting */ }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  if (!everRead) {
    return { jsonrpc: '2.0', id, ...text(JSON.stringify({ found: false, log: logPath, error: 'Log file was never readable — wrong path, or file was not created/deleted' }), true) };
  }
  return { jsonrpc: '2.0', id, ...text(JSON.stringify({ found: false, log: logPath, content: cut(lastContent) }), true) };
};

const listAction = async (id) => {
  cleanupOldLogs(); // non-blocking — not only on "start", "list" also sweeps old logs
  const out = [];
  let changed = false;
  for (const [pid, info] of state.procs) {
    let alive = true;
    try { process.kill(pid, 0); } catch { alive = false; }
    // PID is alive, but is it the "same process"? — if starttime signature doesn't match, this is already
    // a different process (PID reuse), treat as dead and remove from list.
    if (alive && !state.sigMatches(info.sig, await state.getProcSignature(pid))) alive = false;
    if (!alive) { state.procs.delete(pid); changed = true; continue; }
    out.push({ pid, cmd: info.cmd, log: info.log, uptime_ms: Date.now() - info.startTime });
  }
  if (changed) await state.saveProcs();
  const mem = process.memoryUsage();
  const server = {
    uptime_s: Math.round(process.uptime()),
    memory_mb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
    cwd: state.getCwd(),
    active_processes: out.length,
  };
  return { jsonrpc: '2.0', id, ...text(JSON.stringify({ processes: out, server }, null, 2)) };
};

const killAction = async (params, id) => {
  cleanupOldLogs(); // non-blocking — sweep old logs on kill too
  const pid = params.arguments?.pid;
  const signal = params.arguments?.signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM';
  if (!Number.isInteger(pid) || pid <= 1) {
    return { jsonrpc: '2.0', id, ...text('❌ pid is invalid (must be an integer > 1)', true) };
  }
  if (pid === process.pid) {
    return { jsonrpc: '2.0', id, ...text('❌ This is the server\'s own process — cannot be killed', true) };
  }
  if (!state.procs.has(pid)) {
    return { jsonrpc: '2.0', id, ...text(`❌ PID ${pid} was not started by this server (only processes started with "process start" can be killed) — to stop another system process use bash "kill -9 ${pid}"`, true) };
  }
  // PID reuse protection: server may have restarted and this PID may have been assigned to another process —
  // if starttime signature doesn't match, the tracked process is already gone, do not allow kill.
  const stored = state.procs.get(pid);
  if (!state.sigMatches(stored.sig, await state.getProcSignature(pid))) {
    state.procs.delete(pid);
    await state.saveProcs();
    return { jsonrpc: '2.0', id, ...text(`❌ PID ${pid} no longer exists (process ended) — this number may now belong to another process (PID reuse), kill cancelled for safety`, true) };
  }
  try {
    process.kill(-pid, signal); // kill entire process group (including child processes)
    state.procs.delete(pid);
    await state.saveProcs();
    return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid, signal, status: 'killed' })) };
  } catch {
    try {
      process.kill(pid, signal); // if group kill failed, try single process
      state.procs.delete(pid);
      await state.saveProcs();
      return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid, signal, status: 'killed (single process)' })) };
    } catch (err2) {
      const msg = err2.code === 'ESRCH' ? `Process not found (PID: ${pid}) — it may have already exited` : err2.message;
      return { jsonrpc: '2.0', id, ...text(`❌ ${msg}`, true) };
    }
  }
};

const handler = async (params, id) => {
  const action = params.arguments?.action;
  if (action === 'start') return startAction(params, id);
  if (action === 'wait') return waitAction(params, id);
  if (action === 'list') return listAction(id);
  if (action === 'kill') return killAction(params, id);
  return { jsonrpc: '2.0', id, ...text('❌ Unknown action (must be start, wait, list, kill)', true) };
};

module.exports = { schema, handler };
