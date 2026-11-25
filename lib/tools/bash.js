'use strict';
const fs = require('fs');
const { GUARD, TM } = require('../config');
const { text, sanitizeEnv } = require('../util');
const { run, runSerialized } = require('../exec');
const state = require('../state');
const sandbox = require('../sandbox');

const schema = {
  name: 'bash',
  description: `Execute any bash command in Termux (including cd and chained commands like "&&", ";", cwd is tracked automatically). Use for package installation, running scripts, getting system info. For simple file read/write/edit, prefer view/create_file/str_replace — they are more reliable. For text search in codebase, run "grep -rn pattern .". For long-running commands (minutes), use the "process" tool (start+wait) instead — bash blocks here, process runs in background. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    cmd: { type: 'string', description: 'Bash command' },
    stdin: { type: 'string', description: 'Text to send to command stdin (for interactive prompts, e.g. "Y\\n"). Can be left empty.' },
    timeout: { type: 'number', description: 'Maximum wait time (ms), default 60000, max 90000 — for longer jobs use the "process" tool' },
    env: { type: 'object', description: 'Extra environment variables (e.g. {"NODE_ENV":"production","PORT":"3000"}) — added on top of existing env, does not replace it', additionalProperties: { type: 'string' } },
    unsafe: { type: 'boolean', description: 'If true, bypasses sandbox safety checks. Use only when the user explicitly requested it and it is truly necessary.' },
  }, required: ['cmd'] },
};

const handler = async (params, id) => {
  const cmd = params.arguments?.cmd;
  if (!cmd) return { jsonrpc: '2.0', id, ...text('❌ cmd is empty', true) };
  const unsafe = params.arguments?.unsafe === true;
  if (!unsafe) {
    const hit = sandbox.checkDangerous(cmd);
    if (hit) {
      return { jsonrpc: '2.0', id, ...text(`❌ Dangerous command blocked (sandbox protection). Rule: ${hit}\nIf the user explicitly requested this command and you understand the risks, resend with unsafe:true.`, true) };
    }
  }
  const reqTimeout = Number(params.arguments?.timeout);
  const timeoutMs = reqTimeout > 0 ? Math.min(reqTimeout, 90000) : TM;

  const t0 = Date.now();
  const { c, o, e } = await runSerialized(async () => {
    const baseCwd = unsafe ? state.getCwd() : sandbox.clampToSandbox(state.getCwd());
    const r = await run(cmd, params.arguments?.stdin, timeoutMs, sanitizeEnv(params.arguments?.env), baseCwd);
    if (r.newCwd) {
      try {
        await fs.promises.access(r.newCwd);
        state.setCwd(unsafe ? r.newCwd : sandbox.clampToSandbox(r.newCwd));
      } catch {}
    } else if (!unsafe) {
      // on timeout or missing marker — ensure we stay inside sandbox
      const cur = state.getCwd();
      if (!sandbox.isInside(cur)) state.setCwd(sandbox.root());
    }
    return r;
  });
  const ms = Date.now() - t0;
  return { jsonrpc: '2.0', id, ...text(`[exit ${c}] [${ms}ms] [cwd: ${state.getCwd()}]\n${o}${e ? `\nSTDERR:\n${e}` : ''}`, c !== 0) };
};

module.exports = { schema, handler };
