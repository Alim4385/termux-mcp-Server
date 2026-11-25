'use strict';
const fs = require('fs');
const path = require('path');
const { WS, SANDBOX, SF, PROCS_FILE } = require('./config');

if (!fs.existsSync(WS)) fs.mkdirSync(WS, { recursive: true });

// ---- cwd tracking ----
let cwd = SANDBOX;
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
// SINGLE entry point for changing cwd — updates it AND writes to disk (debounced)
const setCwd = (newCwd) => { cwd = newCwd; saveCwd(); };

// Resolve a relative path against current cwd to an absolute path
const resolvePath = (p) => (path.isAbsolute(p) ? p : path.resolve(cwd, p));

// ---- Background processes (process tool) ----
// pid -> { cmd, log, startTime, sig }
const procs = new Map();

// PID "signature" (starttime) — a plain PID number can belong to a different process after restart
// (PID reuse), so we also store and compare starttime from /proc/[pid]/stat. The comm field
// is in parentheses and may contain spaces/parentheses, so we parse the part after the LAST ")".
// starttime is the 19th (0-based) field after comm.
const parseStat = (raw) => {
  const idx = raw.lastIndexOf(')');
  if (idx === -1) return null;
  const fields = raw.slice(idx + 2).trim().split(' ');
  return fields[19] || null;
};
const getProcSignatureSync = (pid) => { try { return parseStat(fs.readFileSync(`/proc/${pid}/stat`, 'utf8')); } catch { return null; } };
const getProcSignature = async (pid) => { try { return parseStat(await fs.promises.readFile(`/proc/${pid}/stat`, 'utf8')); } catch { return null; } };
// In cases where /proc cannot be read (both sides null), fall back to old "is PID alive only" behavior —
// otherwise functionality would be completely broken in environments without /proc support.
const sigMatches = (storedSig, currentSig) => {
  if (storedSig == null && currentSig == null) return true;
  return storedSig != null && currentSig != null && storedSig === currentSig;
};

// Write procs state to disk. Unlike saveCwd there is NO DEBOUNCE — start/kill are rare
// events (not after every bash command), so writing immediately removes the risk of
// "server crashed while waiting for debounce, record lost".
const saveProcs = async () => {
  try {
    const obj = {};
    for (const [pid, info] of procs) obj[pid] = info;
    await fs.promises.writeFile(PROCS_FILE, JSON.stringify(obj));
  } catch {}
};

// On startup, restore processes from previous session that are STILL ALIVE AND THE SAME PROCESS
// (checked with starttime signature against PID reuse).
(() => {
  try {
    const saved = JSON.parse(fs.readFileSync(PROCS_FILE, 'utf8'));
    for (const [pidStr, info] of Object.entries(saved)) {
      const pid = Number(pidStr);
      if (!Number.isInteger(pid)) continue;
      try {
        process.kill(pid, 0); // is it alive?
        if (sigMatches(info.sig, getProcSignatureSync(pid))) procs.set(pid, info);
      } catch {}
    }
  } catch {}
})();

module.exports = {
  getCwd, setCwd, flushCwd, resolvePath,
  procs, saveProcs, getProcSignature, sigMatches,
};
