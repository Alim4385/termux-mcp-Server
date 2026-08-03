'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');
const { HOME, WS, TM, MAX, MARK, TAIL_CAP, LOG_MAX_AGE_MS, LOG_MAX_SIZE, LOG_KEEP_TAIL } = require('./config');
const { cut } = require('./util');

// Bash əmrini icra et (timeout + kəsilmiş stdout/stderr + real cwd izləməsi + stdin dəstəyi)
// cwd xaricdən (state.getCwd()) verilir — bu modul cwd-nin özünü saxlamır, sadəcə icra edir.
const run = (cmd, stdin, timeoutMs, extraEnv, cwd) => new Promise((resolve) => {
  let o = '', e = '', done = false;
  const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };

  const full = `${cmd}\nprintf '${MARK}%s' "$PWD"`;
  const p = spawn('bash', ['-c', full], { cwd, env: { ...process.env, HOME, TERM: 'xterm-256color', ...(extraEnv || {}) } });
  if (stdin) p.stdin.write(stdin);
  p.stdin.end(); // VACİB: bağlanmasa, stdin gözləyən əmr heç vaxt EOF almaz, timeout-a qədər asılı qalar
  const outDec = new StringDecoder('utf8');
  const errDec = new StringDecoder('utf8');
  const MAXB = MAX * 2; // daxili buferin böyümə həddi
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
    try { p.kill('SIGKILL'); } catch {}
    finish({ c: 124, o: cut(o), e: `${cut(e)}\n[TIMEOUT]`, newCwd: null });
  }, timeoutMs || TM);
});

// Sadə növbə (mutex): eyni anda 2 bash sorğusu gələrsə, biri digərinin cwd-sini poza bilər
// (məs. A "cd sub" edərkən B köhnə cwd-də başlaya bilər). Bunu qarşısını almaq üçün
// bash icraları ardıcıl (bir-bir) işlədilir — asılılıq tələb etməyən ən sadə həll.
let bashQueue = Promise.resolve();
let pendingBashRequests = 0;
const runSerialized = (fn) => {
  pendingBashRequests++;
  const result = bashQueue.then(fn, fn); // növbədəki əvvəlki iş uğursuz olsa belə davam et
  bashQueue = result.catch(() => {}); // növbəni "canlı" saxla, xəta zənciri kəsməsin
  result.finally(() => { pendingBashRequests--; });
  return result;
};
const getPendingBashRequests = () => pendingBashRequests;

// Böyük/böyüyən log fayllarını hər dəfə tam oxumamaq üçün yalnız son hissəsini oxu
const readTail = async (filePath) => {
  const st = await fs.promises.stat(filePath);
  if (st.size <= TAIL_CAP) return fs.promises.readFile(filePath, 'utf8');
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(TAIL_CAP);
    await fh.read(buf, 0, TAIL_CAP, st.size - TAIL_CAP);
    const str = buf.toString('utf8');
    // Kəsmə nöqtəsi bir sətrin (və ya çoxbaytlı UTF-8 simvolunun) ortasına düşmüş ola bilər —
    // ilk (yəqin ki qırıq) sətri atırıq ki, nəticə həmişə tam sətirlərdən ibarət olsun.
    const nl = str.indexOf('\n');
    return nl === -1 ? str : str.slice(nl + 1);
  } finally {
    await fh.close();
  }
};

// Köhnə .proc-*.log fayllarını təmizlə (mtime > 1 saat). mtime-a əsaslanır ki, aktiv işləyən
// proseslərin logları (davamlı yazıldığı üçün mtime-ı təzələnir) yanlışlıqla silinməsin,
// həm də server restart-dan sonra procs Map-in yaddaşdan itdiyi "orphan" logları da tutsun.
// Bundan başqa, HƏLƏ AKTİV olan (mtime təzə) log 50MB-ı keçsə, telefon yaddaşını doldurmasın
// deyə son 5MB-a qədər kəsilir (tam silinmir ki, wait ilə pattern axtaran sorğu qırılmasın).
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
            await fs.promises.writeFile(fp, `[...rotasiya edildi, əvvəlki hissə silindi...]\n${buf.toString('utf8')}`);
          } catch {}
        }
      }).catch(() => {});
    }
  }).catch(() => {});
};

module.exports = { run, runSerialized, getPendingBashRequests, readTail, cleanupOldLogs };
