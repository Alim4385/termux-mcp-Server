'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GUARD, TM } = require('../config');
const { text, cut } = require('../util');
const state = require('../state');
const sandbox = require('../sandbox');

const schema = {
  name: 'git',
  description: `Run git commands in a structured way (status, diff, log, show, add, commit, branch, checkout, pull, push, remote, stash, clone, init, raw). Prefer this over bash for common git operations. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    action: { type: 'string', enum: ['status','diff','log','show','add','commit','branch','checkout','pull','push','remote','stash','clone','init','raw'], description: 'Git operation' },
    path: { type: 'string', description: 'Repo/directory path (relative to cwd or absolute). Default: current cwd' },
    args: { type: 'array', items: { type: 'string' }, description: 'Extra git args. For raw action, this is the full git argument list (required).' },
    message: { type: 'string', description: 'Commit message for commit action' },
    files: { type: 'array', items: { type: 'string' }, description: 'Files for add/checkout/stash actions' },
    branch: { type: 'string', description: 'Branch name for branch/checkout/push/pull actions' },
    remote: { type: 'string', description: 'Remote name (default origin where applicable)' },
    ref: { type: 'string', description: 'Ref/commit for show/log/diff/checkout' },
    staged: { type: 'boolean', description: 'For diff: show staged changes (--staged)' },
    limit: { type: 'number', description: 'For log: max entries (default 20, max 100)' },
    create: { type: 'boolean', description: 'For branch/checkout: create branch' },
    delete: { type: 'boolean', description: 'For branch: delete branch (-d)' },
    force: { type: 'boolean', description: 'For push/delete: force flag (use with caution)' },
    set_upstream: { type: 'boolean', description: 'For push: add -u' },
    all: { type: 'boolean', description: 'For branch: show all (-a); for add: add -A' },
    url: { type: 'string', description: 'For clone/remote add: repository URL' },
    dest: { type: 'string', description: 'For clone: destination directory name/path (relative to cwd)' },
    name: { type: 'string', description: 'For remote add/remove: remote name' },
    timeout: { type: 'number', description: 'Timeout ms (default 60000, max 120000)' },
    unsafe: { type: 'boolean', description: 'If true, bypass sandbox cwd clamp/safety checks. Use only when explicitly needed.' },
  }, required: ['action'] },
};

const runGit = (args, cwd, timeoutMs, env) => new Promise((resolve) => {
  let o = '', e = '', done = false;
  const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
  const p = spawn('git', args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...(env || {}) } });
  const MAXB = 200000;
  p.stdout.on('data', d => { if (o.length < MAXB) o += d.toString('utf8'); });
  p.stderr.on('data', d => { if (e.length < MAXB) e += d.toString('utf8'); });
  p.on('error', err => finish({ code: 1, stdout: '', stderr: err.message }));
  p.on('close', code => finish({ code: code ?? 1, stdout: o, stderr: e }));
  const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} finish({ code: 124, stdout: o, stderr: e + '\n[TIMEOUT]' }); }, timeoutMs);
});

const safeStr = (v) => typeof v === 'string' ? v : '';
const safeArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];

const buildArgs = (a) => {
  const action = a.action;
  if (action === 'status') return ['status', '--short', '--branch', ...safeArr(a.args)];
  if (action === 'diff') {
    const args = ['diff'];
    if (a.staged) args.push('--staged');
    if (safeStr(a.ref)) args.push(safeStr(a.ref));
    args.push(...safeArr(a.args));
    if (safeArr(a.files).length) args.push('--', ...safeArr(a.files));
    return args;
  }
  if (action === 'log') {
    const n = Math.min(Math.max(Number(a.limit) || 20, 1), 100);
    const args = ['log', '--oneline', `-n`, String(n)];
    if (safeStr(a.ref)) args.push(safeStr(a.ref));
    args.push(...safeArr(a.args));
    return args;
  }
  if (action === 'show') {
    const args = ['show', '--stat', '--oneline'];
    if (safeStr(a.ref)) args.push(safeStr(a.ref));
    args.push(...safeArr(a.args));
    return args;
  }
  if (action === 'add') {
    const args = ['add'];
    if (a.all) args.push('-A');
    const files = safeArr(a.files);
    if (files.length) args.push(...files);
    else if (!a.all) args.push('.');
    args.push(...safeArr(a.args));
    return args;
  }
  if (action === 'commit') {
    const msg = safeStr(a.message);
    if (!msg) return { error: 'message is required for commit' };
    return ['commit', '-m', msg, ...safeArr(a.args)];
  }
  if (action === 'branch') {
    const args = ['branch'];
    if (a.all) args.push('-a');
    if (a.delete && safeStr(a.branch)) args.push(a.force ? '-D' : '-d', safeStr(a.branch));
    else if (a.create && safeStr(a.branch)) args.push(safeStr(a.branch));
    else if (safeStr(a.branch) && !a.delete) args.push(safeStr(a.branch));
    args.push(...safeArr(a.args));
    return args;
  }
  if (action === 'checkout') {
    const args = ['checkout'];
    if (a.create && safeStr(a.branch)) args.push('-b', safeStr(a.branch));
    else if (safeStr(a.branch)) args.push(safeStr(a.branch));
    else if (safeStr(a.ref)) args.push(safeStr(a.ref));
    const files = safeArr(a.files);
    if (files.length) args.push('--', ...files);
    args.push(...safeArr(a.args));
    if (args.length === 1) return { error: 'branch, ref, or files required for checkout' };
    return args;
  }
  if (action === 'pull') {
    const args = ['pull'];
    if (safeStr(a.remote)) args.push(safeStr(a.remote));
    if (safeStr(a.branch)) args.push(safeStr(a.branch));
    args.push(...safeArr(a.args));
    return args;
  }
  if (action === 'push') {
    const args = ['push'];
    if (a.set_upstream) args.push('-u');
    if (a.force) args.push('--force-with-lease');
    if (safeStr(a.remote)) args.push(safeStr(a.remote));
    if (safeStr(a.branch)) args.push(safeStr(a.branch));
    args.push(...safeArr(a.args));
    return args;
  }
  if (action === 'remote') {
    const args = ['remote'];
    const extra = safeArr(a.args);
    if (extra.length) args.push(...extra);
    else if (safeStr(a.url) && safeStr(a.name)) args.push('add', safeStr(a.name), safeStr(a.url));
    else if (safeStr(a.name) && a.delete) args.push('remove', safeStr(a.name));
    else args.push('-v');
    return args;
  }
  if (action === 'stash') {
    const extra = safeArr(a.args);
    if (extra.length) return ['stash', ...extra];
    const files = safeArr(a.files);
    if (files.length) return ['stash', 'push', '--', ...files];
    return ['stash', 'list'];
  }
  if (action === 'clone') {
    const url = safeStr(a.url);
    if (!url) return { error: 'url is required for clone' };
    const args = ['clone', url];
    if (safeStr(a.dest)) args.push(safeStr(a.dest));
    args.push(...safeArr(a.args));
    return args;
  }
  if (action === 'init') return ['init', ...safeArr(a.args)];
  if (action === 'raw') {
    const args = safeArr(a.args);
    if (!args.length) return { error: 'args array required for raw action' };
    return args;
  }
  return { error: `Unknown action: ${action}` };
};

const handler = async (params, id) => {
  const a = params.arguments || {};
  if (typeof a.action !== 'string') return { jsonrpc: '2.0', id, ...text('❌ action is required', true) };
  const built = buildArgs(a);
  if (built.error) return { jsonrpc: '2.0', id, ...text(`❌ ${built.error}`, true) };

  const unsafe = a.unsafe === true;
  let cwd = state.getCwd();
  if (safeStr(a.path)) cwd = state.resolvePath(a.path);
  if (!unsafe) cwd = sandbox.clampToSandbox(cwd);
  try { await fs.promises.access(cwd); } catch { return { jsonrpc: '2.0', id, ...text(`❌ Path not found: ${cwd}`, true) }; }

  const reqTimeout = Number(a.timeout);
  const timeoutMs = reqTimeout > 0 ? Math.min(reqTimeout, 120000) : TM;
  const t0 = Date.now();
  const r = await runGit(built, cwd, timeoutMs);
  const ms = Date.now() - t0;
  const out = `[exit ${r.code}] [${ms}ms] [cwd: ${cwd}] [git ${built.join(' ')}]\n${r.stdout}${r.stderr ? `\nSTDERR:\n${r.stderr}` : ''}`;
  return { jsonrpc: '2.0', id, ...text(cut(out), r.code !== 0) };
};

module.exports = { schema, handler };
