'use strict';
const fs = require('fs');
const path = require('path');
const { WS, SF, PROCS_FILE } = require('./config');

if (!fs.existsSync(WS)) fs.mkdirSync(WS, { recursive: true });

// ---- cwd izləmə ----
let cwd = WS;
try {
  const s = JSON.parse(fs.readFileSync(SF, 'utf8'));
  if (s.cwd && fs.existsSync(s.cwd)) cwd = s.cwd;
} catch {}

const getCwd = () => cwd;

let saveTimer = null;
const saveCwd = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await fs.promises.writeFile(SF, JSON.stringify({ cwd })); } catch {}
  }, 500);
};
const flushCwd = async () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try { await fs.promises.writeFile(SF, JSON.stringify({ cwd })); } catch {}
};
// cwd-ni dəyişdirmək üçün YEGANƏ giriş nöqtəsi — dəyişir VƏ diskə (debounce ilə) yazır
const setCwd = (newCwd) => { cwd = newCwd; saveCwd(); };

// Nisbi yolu cari cwd-yə görə tam yola çevir
const resolvePath = (p) => (path.isAbsolute(p) ? p : path.resolve(cwd, p));

// ---- Arxa-fon proseslər (process tool) ----
// pid -> { cmd, log, startTime, sig }
const procs = new Map();

// PID-in "imzası" (starttime) — sadə PID nömrəsi restart-dan sonra başqa bir prosesə aid ola bilər
// (PID reuse), ona görə /proc/[pid]/stat-dan starttime-ı da saxlayıb müqayisə edirik. comm sahəsi
// mötərizədə və içində boşluq/mötərizə ola bilər, ona görə SON ")"-dan sonrakı hissəni parse edirik.
// starttime — comm-dan sonrakı sahələrin 19-cu (0-based) elementidir.
const parseStat = (raw) => {
  const idx = raw.lastIndexOf(')');
  if (idx === -1) return null;
  const fields = raw.slice(idx + 2).trim().split(' ');
  return fields[19] || null;
};
const getProcSignatureSync = (pid) => { try { return parseStat(fs.readFileSync(`/proc/${pid}/stat`, 'utf8')); } catch { return null; } };
const getProcSignature = async (pid) => { try { return parseStat(await fs.promises.readFile(`/proc/${pid}/stat`, 'utf8')); } catch { return null; } };
// /proc oxuna bilməyən (hər iki tərəf null) hallarda köhnə "yalnız PID canlıdırmı" davranışına düş —
// yoxsa /proc dəstəklənməyən mühitlərdə funksionallıq tamamilə pozular.
const sigMatches = (storedSig, currentSig) => {
  if (storedSig == null && currentSig == null) return true;
  return storedSig != null && currentSig != null && storedSig === currentSig;
};

// procs vəziyyətini diskə yaz. saveCwd-dən fərqli olaraq DEBOUNCE YOXDUR — start/kill nadir
// hadisələrdir (hər bash əmrindən sonra deyil), ona görə dərhal yazmaq "server debounce
// gözləyərkən çöksə qeyd itər" riskini aradan qaldırır.
const saveProcs = async () => {
  try {
    const obj = {};
    for (const [pid, info] of procs) obj[pid] = info;
    await fs.promises.writeFile(PROCS_FILE, JSON.stringify(obj));
  } catch {}
};

// Startup-da əvvəlki sessiyadan qalan, HƏLƏ CANLI VƏ EYNİ PROSES olan (PID reuse-a qarşı
// starttime imzası ilə yoxlanılan) prosesləri geri yüklə.
(() => {
  try {
    const saved = JSON.parse(fs.readFileSync(PROCS_FILE, 'utf8'));
    for (const [pidStr, info] of Object.entries(saved)) {
      const pid = Number(pidStr);
      if (!Number.isInteger(pid)) continue;
      try {
        process.kill(pid, 0); // canlıdırmı?
        if (sigMatches(info.sig, getProcSignatureSync(pid))) procs.set(pid, info);
      } catch {}
    }
  } catch {}
})();

module.exports = {
  getCwd, setCwd, flushCwd, resolvePath,
  procs, saveProcs, getProcSignature, sigMatches,
};
