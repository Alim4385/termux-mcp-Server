'use strict';
const { MAX } = require('./config');

// Truncate long output to save tokens (tries not to cut in the middle of a surrogate pair)
const cut = (t) => {
  const s = String(t ?? '');
  if (s.length <= MAX) return s;
  let h = (MAX >> 1) - 40;
  if (h > 0 && h < s.length) {
    const code = s.charCodeAt(h - 1);
    if (code >= 0xD800 && code <= 0xDBFF) h++; // shift boundary to avoid breaking a high surrogate
  }
  let tailStart = s.length - h;
  if (tailStart > 0) {
    const code = s.charCodeAt(tailStart - 1);
    if (code >= 0xD800 && code <= 0xDBFF) tailStart++;
  }
  return `${s.slice(0, h)}\n...[${s.length - MAX} truncated]...\n${s.slice(tailStart)}`;
};

const text = (t, isError = false) => ({ result: { content: [{ type: 'text', text: t }], isError } });
const image = (data, mimeType) => ({ result: { content: [{ type: 'image', data, mimeType }], isError: false } });

// Normalize AI-provided env object into a safe format: accept only flat (non-nested) string/number/boolean
// values and convert them to strings — so spawn does not receive invalid types (object/array).
const sanitizeEnv = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
  }
  return out;
};

// For str_replace: when old_str is not found exactly, find the most similar block and return a suggestion message
const suggestSimilar = (content, oldStr) => {
  const normLine = (l) => l.trim().replace(/\s+/g, ' ');
  const normBlock = (arr) => arr.map(normLine).filter((l) => l.length > 0).join('\n');

  const oldLines = oldStr.split('\n');
  const fileLines = content.split('\n');
  const normOld = normBlock(oldLines);
  const baseLen = oldLines.length;
  const candidateLens = [...new Set([baseLen, baseLen - 1, baseLen + 1, baseLen - 2, baseLen + 2])]
    .filter((n) => n >= 1 && n <= fileLines.length);

  const suggestions = [];
  const seen = new Set();
  outer:
  for (const wl of candidateLens) {
    for (let i = 0; i + wl <= fileLines.length; i++) {
      const window = fileLines.slice(i, i + wl);
      if (normBlock(window) === normOld) {
        if (seen.has(i)) continue;
        seen.add(i);
        const cs = Math.max(0, i - 1);
        const ce = Math.min(fileLines.length, i + wl + 1);
        const context = fileLines.slice(cs, ce)
          .map((l, idx) => `${String(cs + idx + 1).padStart(5)}\t${l}`)
          .join('\n');
        suggestions.push({ line: i + 1, exact: window.join('\n'), context });
        if (suggestions.length >= 3) break outer;
      }
    }
  }

  let msg = '❌ old_str was not found exactly in the file (there may be whitespace/indentation differences).\n';
  if (suggestions.length > 0) {
    msg += '\n📌 Similar location(s) found. Copy the "Exact text" below as old_str:\n\n';
    suggestions.forEach((s, idx) => {
      msg += `--- Candidate ${idx + 1} (line ${s.line}) ---\n${s.context}\n\n⬆️ Exact text:\n${s.exact}\n\n`;
    });
  } else {
    msg += '\n💡 No similar text found. Use view to inspect the file.';
  }
  return msg;
};

module.exports = { cut, text, image, sanitizeEnv, suggestSimilar };
