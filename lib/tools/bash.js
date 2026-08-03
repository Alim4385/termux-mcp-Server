'use strict';
const fs = require('fs');
const { GUARD, TM } = require('../config');
const { text, sanitizeEnv } = require('../util');
const { run, runSerialized } = require('../exec');
const state = require('../state');

const schema = {
  name: 'bash',
  description: `Termux-da istənilən bash əmri icra et (cd, zəncirlənmiş əmrlər ("&&", ";") daxil olmaqla, cwd avtomatik izlənir). Paket qurmaq, script işlətmək, sistem məlumatı almaq üçün istifadə et. Sadə fayl yazma/oxuma/düzəliş üçün bunun əvəzinə view/create_file/str_replace alətlərini üstün tut — onlar daha etibarlıdır. Kod bazasında mətn axtarışı üçün "grep -rn pattern ." işlət. Uzun müddət işləyəcək (dəqiqələrlə) əmrlər üçün bunun əvəzinə "process" alətini (start+wait) istifadə et — bash burda bloklanır, process arxa fonda işlədir. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    cmd: { type: 'string', description: 'Bash əmri' },
    stdin: { type: 'string', description: 'Əmrə göndəriləcək stdin mətni (interaktiv sual üçün, məs. "Y\\n"). Boş buraxıla bilər.' },
    timeout: { type: 'number', description: 'Maksimum gözləmə müddəti (ms), default 60000, maks 90000 — daha uzun işlər üçün "process" alətini istifadə et' },
    env: { type: 'object', description: 'Əlavə mühit dəyişənləri (məs. {"NODE_ENV":"production","PORT":"3000"}) — mövcud env-i əvəz etmir, üzərinə əlavə edir', additionalProperties: { type: 'string' } },
  }, required: ['cmd'] },
};

const handler = async (params, id) => {
  const cmd = params.arguments?.cmd;
  if (!cmd) return { jsonrpc: '2.0', id, ...text('❌ cmd boşdur', true) };
  const reqTimeout = Number(params.arguments?.timeout);
  const timeoutMs = reqTimeout > 0 ? Math.min(reqTimeout, 90000) : TM;

  const t0 = Date.now();
  const { c, o, e } = await runSerialized(async () => {
    const r = await run(cmd, params.arguments?.stdin, timeoutMs, sanitizeEnv(params.arguments?.env), state.getCwd());
    if (r.newCwd && r.newCwd !== state.getCwd()) {
      try { await fs.promises.access(r.newCwd); state.setCwd(r.newCwd); } catch {}
    }
    return r;
  });
  const ms = Date.now() - t0;
  return { jsonrpc: '2.0', id, ...text(`[exit ${c}] [${ms}ms] [cwd: ${state.getCwd()}]\n${o}${e ? `\nSTDERR:\n${e}` : ''}`, c !== 0) };
};

module.exports = { schema, handler };
