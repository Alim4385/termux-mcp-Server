'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { GUARD, WS, HOME } = require('../config');
const { text, cut, sanitizeEnv } = require('../util');
const { readTail, cleanupOldLogs } = require('../exec');
const state = require('../state');

const schema = {
  name: 'process',
  description: `Uzun müddət işləyən arxa fon prosesini idarə et (məs. bir dev server). "start" əmri arxa fonda başladır, PID və log fayl yolu qaytarır — cmd-in özündə "&" YAZMA, alət onsuz da arxa fona keçirir. "wait" log faylında müəyyən söz/mətn (pattern, ya da regex:true ilə JS regex) görünənə qədər gözləyir. "list" bu alətlə başladılmış (hələ işləyən) prosesləri VƏ server statistikasını ({processes:[...], server:{uptime_s, memory_mb, cwd, active_processes}}) qaytarır — bütün sistem prosesləri üçün bunun əvəzinə bash ilə "ps aux" işlət. Server yenidən başlasa belə, hələ canlı olan proseslər "list"də görünməyə davam edir. "kill" YALNIZ bu alətin "start"-ı ilə açılmış PID-i (və onun bütün alt-proseslərini) dayandıra bilər — başqa/sistem PID-i üçün bunun əvəzinə bash ilə "kill -9 <pid>" işlət. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    action: { type: 'string', enum: ['start', 'wait', 'list', 'kill'], description: 'Əməliyyat' },
    cmd: { type: 'string', description: 'start üçün bash əmri (arxa fonda işə salınacaq, "&" əlavə etmə)' },
    env: { type: 'object', description: 'start üçün əlavə mühit dəyişənləri (məs. {"PORT":"3000"}) — mövcud env-i əvəz etmir, üzərinə əlavə edir', additionalProperties: { type: 'string' } },
    pid: { type: 'number', description: 'kill üçün proses ID-si (start-ın qaytardığı pid)' },
    signal: { type: 'string', enum: ['SIGTERM', 'SIGKILL'], description: 'kill üçün siqnal, default SIGTERM (mülayim dayandırma)' },
    log: { type: 'string', description: 'wait üçün log fayl yolu (start-ın qaytardığı log)' },
    pattern: { type: 'string', description: 'wait üçün gözlənilən mətn/söz (və ya regex=true olsa, JS regex ifadəsi)' },
    regex: { type: 'boolean', description: 'true olsa, pattern JS regex kimi şərh olunur (məs. "PORT [0-9]+"), default false (sadə substring axtarışı)' },
    flags: { type: 'string', description: 'regex:true olduqda JS regex flag-ları (məs. "i" case-insensitive, "m" multiline üçün), default boş' },
    timeout: { type: 'number', description: 'wait üçün maksimum gözləmə müddəti (ms), default 30000, maks 55000' },
    interval: { type: 'number', description: 'wait üçün yoxlama tezliyi (ms), default 500, min 200, maks 5000' },
  }, required: ['action'] },
};

const startAction = async (params, id) => {
  const cmd = params.arguments?.cmd;
  if (!cmd) return { jsonrpc: '2.0', id, ...text('❌ start üçün cmd tələb olunur', true) };
  cleanupOldLogs(); // qeyri-blok edici - cavabı gözlətmir, arxa fonda işləyir
  const logPath = path.join(WS, `.proc-${Date.now()}-${Math.floor(Math.random() * 1000)}.log`);
  try {
    const cwd = state.getCwd();
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
  if (!logPath || !pattern) return { jsonrpc: '2.0', id, ...text('❌ wait üçün log və pattern tələb olunur', true) };

  let matcher;
  if (params.arguments?.regex === true) {
    try {
      const flags = typeof params.arguments?.flags === 'string' ? params.arguments.flags : '';
      const re = new RegExp(pattern, flags);
      matcher = (s) => re.test(s);
    } catch (err) {
      return { jsonrpc: '2.0', id, ...text(`❌ Səhv regex: ${err.message}`, true) };
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
    } catch { /* fayl hələ yaranmayıb (və ya silinib) ola bilər, gözləməyə davam et */ }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  if (!everRead) {
    return { jsonrpc: '2.0', id, ...text(JSON.stringify({ found: false, log: logPath, error: 'Log faylı heç vaxt oxunmadı — yol səhvdir, ya da fayl yaranmayıb/silinib' }), true) };
  }
  return { jsonrpc: '2.0', id, ...text(JSON.stringify({ found: false, log: logPath, content: cut(lastContent) }), true) };
};

const listAction = async (id) => {
  cleanupOldLogs(); // qeyri-blok edici — yalnız "start"a bağlı qalmasın, "list" də köhnə logları süpürsün
  const out = [];
  let changed = false;
  for (const [pid, info] of state.procs) {
    let alive = true;
    try { process.kill(pid, 0); } catch { alive = false; }
    // PID canlıdır, amma "eyni proses"dirmi? — starttime imzası uyğun gəlmirsə, bu artıq
    // başqa bir prosesdir (PID reuse), ölü kimi sayıb siyahıdan çıxarırıq.
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
  cleanupOldLogs(); // qeyri-blok edici — kill zamanı da köhnə logları süpür
  const pid = params.arguments?.pid;
  const signal = params.arguments?.signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM';
  if (!Number.isInteger(pid) || pid <= 1) {
    return { jsonrpc: '2.0', id, ...text('❌ pid düzgün deyil (1-dən böyük tam ədəd olmalıdır)', true) };
  }
  if (pid === process.pid) {
    return { jsonrpc: '2.0', id, ...text('❌ Bu, serverin öz prosesidir — öldürülə bilməz', true) };
  }
  if (!state.procs.has(pid)) {
    return { jsonrpc: '2.0', id, ...text(`❌ PID ${pid} bu server tərəfindən başladılmayıb (yalnız "process start" ilə açılan proseslər öldürülə bilər) — sistemdəki başqa bir prosesi dayandırmaq üçün bash ilə "kill -9 ${pid}" işlət`, true) };
  }
  // PID reuse qorunması: server restart olub, sonra bu PID başqa bir prosesə verilmiş ola bilər —
  // starttime imzası uyğun gəlmirsə, "izlənən" proses artıq bitib, öldürmə əməliyyatına icazə vermə.
  const stored = state.procs.get(pid);
  if (!state.sigMatches(stored.sig, await state.getProcSignature(pid))) {
    state.procs.delete(pid);
    await state.saveProcs();
    return { jsonrpc: '2.0', id, ...text(`❌ PID ${pid} artıq mövcud deyil (proses bitib) — bu nömrə hazırda başqa bir prosesə aid ola bilər (PID reuse), təhlükəsizlik üçün öldürmə əməliyyatı ləğv edildi`, true) };
  }
  try {
    process.kill(-pid, signal); // bütün proses qrupunu öldür (alt-proseslər daxil)
    state.procs.delete(pid);
    await state.saveProcs();
    return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid, signal, status: 'killed' })) };
  } catch {
    try {
      process.kill(pid, signal); // qrup kill uğursuzdursa, tək prosesi sına
      state.procs.delete(pid);
      await state.saveProcs();
      return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid, signal, status: 'killed (tək proses)' })) };
    } catch (err2) {
      const msg = err2.code === 'ESRCH' ? `Proses tapılmadı (PID: ${pid}) — artıq bitmiş ola bilər` : err2.message;
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
  return { jsonrpc: '2.0', id, ...text('❌ Naməlum action (start, wait, list, kill olmalıdır)', true) };
};

module.exports = { schema, handler };
