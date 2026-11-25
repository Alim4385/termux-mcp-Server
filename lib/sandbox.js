'use strict';
const fs = require('fs');
const path = require('path');
const { SANDBOX } = require('./config');

const root = () => path.resolve(SANDBOX);

const realpathSafe = (p) => {
  let cur = path.resolve(p);
  while (!fs.existsSync(cur)) {
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  try { return fs.realpathSync(cur); } catch { return path.resolve(cur); }
};

const isInside = (targetPath) => {
  const base = realpathSafe(root());
  const target = realpathSafe(targetPath);
  return target === base || target.startsWith(base + path.sep);
};

const assertInside = (targetPath, label = 'path') => {
  if (!isInside(targetPath)) {
    const err = new Error(`❌ ${label} is outside the sandbox: ${targetPath}. Writes are only allowed inside the sandbox: ${root()}`);
    err.code = 'SANDBOX_VIOLATION';
    throw err;
  }
};

const clampToSandbox = (cwd) => (cwd && isInside(cwd) ? cwd : root());

const DANGEROUS_PATTERNS = [
  /\brm\s+(-[^\s]*\s+)*-[^\s]*r[^\s]*f[^\s]*\s+\/(\s|$|\*)/i,
  /\brm\s+(-[^\s]*\s+)*-[^\s]*f[^\s]*r[^\s]*\s+\/(\s|$|\*)/i,
  /\bmkfs(\.\w+)?\b/i,
  /\bdd\s+[^\n]*\bof=\/dev\//i,
  /\b:(\(\))?\s*\{\s*:*\s*\|\s*:*\s*&\s*\}\s*;?\s*:?/i, // fork bomb variants
  /\b(shutdown|reboot|poweroff|halt)\b/i,
  /\b(pm\s+(disable|uninstall|clear)|am\s+force-stop)\b/i,
  /\b(chmod|chown)\s+(-[^\s]+\s+)*(-R\s+)?[0-7]{3,4}\s+\/(\s|$)/i,
  />\s*\/(system|proc|dev|etc|vendor|apex)\b/i,
];

const checkDangerous = (cmd) => {
  if (typeof cmd !== 'string') return null;
  for (const re of DANGEROUS_PATTERNS) {
    if (re.test(cmd)) return re.toString();
  }
  return null;
};

module.exports = { root, isInside, assertInside, clampToSandbox, checkDangerous, DANGEROUS_PATTERNS };
