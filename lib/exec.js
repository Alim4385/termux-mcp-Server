'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');
const { HOME, WS, TM, MAX, MARK, TAIL_CAP, LOG_MAX_AGE_MS, LOG_MAX_SIZE, LOG_KEEP_TAIL } = require('./config');
const { cut } = require('./util');

// Execute a bash command (timeout + truncated stdout/stderr + real cwd tracking + stdin support)
// cwd is provided from outside (state.getCwd()) — this module does not store cwd itself, it only executes.
const run = (cmd, stdin, timeoutMs, extraEnv, cwd) => new Promise((resolve) => {
  let o = '', e = '', done = false;
  const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };

  const full = `${cmd}\nprintf '${MARK}%s' "$PWD"`;
  const p = spawn('bash', ['-c', full], { cwd, detached: true, env: { ...process.env, HOME, TERM: 'xterm-256color', ...(extraEnv || {}) } });
  if (stdin) p.stdin.write(stdin);
  p.stdin.end(); // IMPORTANT: if not closed, commands waiting on stdin never get EOF and hang until timeout
  const outDec = new StringDecoder('utf8');
  const errDec = new StringDecoder('utf8');
  const MAXB = MAX * 2; // internal buffer growth limit
  p.stdout.on('data', (d) => { const s = outDec.write(d); if (o.length < MAXB) o += s; });
  p.stderr.on('data', (d) => { const s = errDec.write(d); if (e.length < MAXB) e += s; });
  p.on('close', async (c) => {
    o += outDec.end();
    e += errDec.end();
    const i = o.lastIndexOf(MARK);
    const newCwd = i === -1 ? null : o.slice(i + MARK.length).trim();
    if (i !== -1) o = o.slice(0, i);
    finish({ c: c ?? 1, o: cut(o), e: cut(e), newCwd });
  });
  p.on('error', (x) => finish({ c: 1, o: '', e: x.message, newCwd: null }));

  const timer = setTimeout(() => {
    try { process.kill(-p.pid, 'SIGKILL'); } catch { try { p.kill('SIGKILL'); } catch {} }
    finish({ c: 124, o: cut(o), e: `${cut(e)}\n[TIMEOUT]`, newCwd: null });
  }, timeoutMs || TM);
});

// Simple queue (mutex): if 2 bash requests arrive at the same time, one can corrupt the other's cwd
// (e.g. while A does "cd sub", B may start in the old cwd). To prevent this,
// bash executions run sequentially (one by one) — the simplest solution with no dependencies.
let bashQueue = Promise.resolve();
let pendingBashRequests = 0;
const runSerialized = (fn) => {
  pendingBashRequests++;
  const result = bashQueue.then(fn, fn); // continue even if previous job in queue failed
  bashQueue = result.catch(() => {}); // keep the queue alive, don't break the error chain
  result.finally(() => { pendingBashRequests--; });
  return result;
};
const getPendingBashRequests = () => pendingBashRequests;

// Read only the last part of large/growing log files instead of reading them fully every time
const readTail = async (filePath) => {
  const st = await fs.promises.stat(filePath);
  if (st.size <= TAIL_CAP) return fs.promises.readFile(filePath, 'utf8');
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(TAIL_CAP);
    await fh.read(buf, 0, TAIL_CAP, st.size - TAIL_CAP);
    const str = buf.toString('utf8');
    // The cut point may fall in the middle of a line (or a multibyte UTF-8 character) —
    // drop the first (likely broken) line so the result always consists of complete lines.
    const nl = str.indexOf('\n');
    return nl === -1 ? str : str.slice(nl + 1);
  } finally {
    await fh.close();
  }
};

// Clean up old .proc-*.log files (mtime > 1 hour). Based on mtime so logs of still-active
// processes (mtime keeps updating as they write) are not deleted by mistake,
// and "orphan" logs left after server restart (lost from in-memory procs Map) are also caught.
// Additionally, if a STILL ACTIVE log (fresh mtime) exceeds 50MB, trim it to the last 5MB
// to avoid filling phone storage (not fully deleted so wait/pattern-search requests don't break).
const cleanupOldLogs = () => {
  fs.promises.readdir(WS).then((files) => {
    const now = Date.now();
    for (const f of files) {
      if (!f.startsWith('.proc-') || !f.endsWith('.log')) continue;
      const fp = path.join(WS, f);
      fs.promises.stat(fp).then(async (st) => {
        if (now - st.mtimeMs > LOG_MAX_AGE_MS) {
          await fs.promises.unlink(fp).catch(() => {});
          return;
        }
        if (st.size > LOG_MAX_SIZE) {
          try {
            const fh = await fs.promises.open(fp, 'r');
            const buf = Buffer.alloc(LOG_KEEP_TAIL);
            await fh.read(buf, 0, LOG_KEEP_TAIL, st.size - LOG_KEEP_TAIL);
            await fh.close();
            await fs.promises.writeFile(fp, `[...rotated, previous part removed...]\n${buf.toString('utf8')}`);
          } catch {}
        }
      }).catch(() => {});
    }
  }).catch(() => {});
};

module.exports = { run, runSerialized, getPendingBashRequests, readTail, cleanupOldLogs };
