'use strict';
const { MAX } = require('./config');

// Token qənaəti üçün uzun çıxışı kəs (surrogate cütünün ortasından kəsməməyə çalışır)
const cut = (t) => {
  const s = String(t ?? '');
  if (s.length <= MAX) return s;
  let h = (MAX >> 1) - 40;
  if (h > 0 && h < s.length) {
    const code = s.charCodeAt(h - 1);
    if (code >= 0xD800 && code <= 0xDBFF) h++; // yüksək surrogate-i qırmamaq üçün sərhədi sürüşdür
  }
  let tailStart = s.length - h;
  if (tailStart > 0) {
    const code = s.charCodeAt(tailStart - 1);
    if (code >= 0xD800 && code <= 0xDBFF) tailStart++;
  }
  return `${s.slice(0, h)}\n...[${s.length - MAX} kəsildi]...\n${s.slice(tailStart)}`;
};

const text = (t, isError = false) => ({ result: { content: [{ type: 'text', text: t }], isError } });
const image = (data, mimeType) => ({ result: { content: [{ type: 'image', data, mimeType }], isError: false } });

// AI-nin göndərdiyi env obyektini təhlükəsiz formata salır: yalnız düz (nested olmayan) string/number/boolean
// dəyərləri qəbul edir, onları da string-ə çevirir — spawn-a səhv tip (object/array) getməsin deyə.
const sanitizeEnv = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
  }
  return out;
};

// str_replace üçün: old_str faylda tapılmadıqda ən oxşar bloku tapıb təklif mətni qaytarır
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

  let msg = '❌ old_str faylda dəqiq tapılmadı (boşluq/girinti fərqi ola bilər).\n';
  if (suggestions.length > 0) {
    msg += '\n📌 Oxşar yer(lər) tapıldı. Aşağıdakı "Dəqiq mətn"i old_str kimi kopyala:\n\n';
    suggestions.forEach((s, idx) => {
      msg += `--- Namizəd ${idx + 1} (sətir ${s.line}) ---\n${s.context}\n\n⬆️ Dəqiq mətn:\n${s.exact}\n\n`;
    });
  } else {
    msg += '\n💡 Oxşar mətn tapılmadı. view ilə faylı yoxla.';
  }
  return msg;
};

module.exports = { cut, text, image, sanitizeEnv, suggestSimilar };
