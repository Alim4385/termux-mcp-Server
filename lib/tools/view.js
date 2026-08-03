'use strict';
const fs = require('fs');
const path = require('path');
const { IMG_EXT, MAX_FILE } = require('../config');
const { cut, text, image } = require('../util');
const state = require('../state');

const schema = {
  name: 'view',
  description: 'Fayl və ya qovluğa bax (nisbi yol cari cwd-yə görə həll olunur; mütləq yol — məs. /sdcard/... — verilsə, workspace ilə məhdudlaşmadan bütün sistemə eyni səviyyədə giriş verir, bash aləti kimi). Qovluqdursa məzmununu sadalayır (recursive:true ilə alt-qovluqları da). Mətn fayldırsa sətir nömrələri ilə göstərir (view_range ilə müəyyən sətirlər, ya da mode:"head"/"tail" ilə ilk/son N sətir). Şəkil fayldırsa (jpg/png/gif/webp) birbaşa göstərir.',
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Fayl və ya qovluq yolu (nisbi və ya tam)' },
    view_range: { type: 'array', items: { type: 'number' }, description: '[başlanğıc, son] sətir nömrələri (1-dən başlayır), istəyə bağlı. son=-1 olsa fayl sonunadək oxuyur (məs. [10,-1] = 10-cu sətirdən sona qədər). mode ilə birlikdə verilsə, view_range üstünlük təşkil edir' },
    mode: { type: 'string', enum: ['head', 'tail', 'full'], description: 'Mətn fayl üçün: "head" ilk N sətir, "tail" son N sətir göstərir (N = lines parametri, default 10). view_range verilməyibsə tətbiq olunur.' },
    lines: { type: 'number', description: 'mode:"head"/"tail" üçün göstəriləcək sətir sayı, default 10' },
    recursive: { type: 'boolean', description: 'Qovluq üçün: true olsa alt-qovluqları da rekursiv göstərir (node_modules/.git avtomatik ignore olunur)' },
    depth: { type: 'number', description: 'recursive:true üçün maksimum dərinlik, default 3, maks 6' },
  }, required: ['path'] },
};

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

const listDir = async (full, jsonId) => {
  const items = await fs.promises.readdir(full, { withFileTypes: true });
  const sorted = items.sort((a, b) => a.name.localeCompare(b.name));
  const rows = await Promise.all(sorted.map(async (it) => {
    if (it.isDirectory()) return `${it.name}/ (DIR)`;
    try {
      const s = await fs.promises.stat(path.join(full, it.name));
      return `${it.name} (${fmtSize(s.size)})`;
    } catch {
      return it.name; // stat uğursuz olsa (məs. simvolik keçid qırıqdır) sadə ad göstər
    }
  }));
  return rows.join('\n') || '(boş qovluq)';
};

const listDirRecursive = async (full, maxDepth) => {
  const lines = [];
  let nodeCount = 0;
  let truncated = false;
  const MAX_NODES = 500; // runaway böyük repolarda çıxışın şişməsinin qarşısını alır
  const IGNORE = new Set(['node_modules', '.git', '.venv', 'venv', '__pycache__', 'dist', 'build', '.next', '.cache']);
  const walk = async (dir, prefix, depth) => {
    if (truncated || depth > maxDepth) return;
    let items;
    try { items = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
    const sorted = items.filter((it) => !IGNORE.has(it.name)).sort((a, b) => a.name.localeCompare(b.name));
    const statPromises = new Map();
    let budget = MAX_NODES - nodeCount;
    for (const it of sorted) {
      if (budget <= 0) break;
      if (!it.isDirectory()) {
        statPromises.set(it.name, fs.promises.stat(path.join(dir, it.name)).catch(() => null));
        budget--;
      }
    }
    for (const it of sorted) {
      if (nodeCount >= MAX_NODES) { truncated = true; return; }
      nodeCount++;
      if (it.isDirectory()) {
        lines.push(`${prefix}${it.name}/`);
        await walk(path.join(dir, it.name), `${prefix}  `, depth + 1);
      } else {
        const s = await statPromises.get(it.name);
        lines.push(`${prefix}${it.name}${s ? ` (${fmtSize(s.size)})` : ''}`);
      }
    }
  };
  await walk(full, '', 1);
  if (truncated) lines.push(`... [${MAX_NODES}+ element, kəsildi — daha dəqiq path ver]`);
  return cut(lines.join('\n')) || '(boş qovluq)';
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path boşdur', true) };
  const full = state.resolvePath(p);
  try {
    const st = await fs.promises.stat(full);
    if (st.isDirectory()) {
      const recursive = params.arguments?.recursive === true;
      const maxDepth = Math.min(Math.max(Number(params.arguments?.depth) || 3, 1), 6);
      const out = recursive ? await listDirRecursive(full, maxDepth) : await listDir(full);
      return { jsonrpc: '2.0', id, ...text(out) };
    }
    if (st.size > MAX_FILE) return { jsonrpc: '2.0', id, ...text(`❌ Fayl çox böyükdür (${(st.size / 1024 / 1024).toFixed(1)}MB, limit 8MB)`, true) };

    const ext = path.extname(full).toLowerCase();
    if (IMG_EXT.has(ext)) {
      const buf = await fs.promises.readFile(full);
      const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext];
      return { jsonrpc: '2.0', id, ...image(buf.toString('base64'), mime) };
    }

    let content = await fs.promises.readFile(full, 'utf8');
    let lines = content.split('\n');
    const range = params.arguments?.view_range;
    const mode = params.arguments?.mode;
    let offset = 0;
    if (Array.isArray(range) && range.length === 2) {
      const [start, end] = range;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1) {
        return { jsonrpc: '2.0', id, ...text('❌ view_range düzgün deyil: [başlanğıc, son] formatında olmalı, başlanğıc >= 1 tam ədəd olmalıdır', true) };
      }
      if (start > lines.length) {
        return { jsonrpc: '2.0', id, ...text(`❌ Fayl yalnız ${lines.length} sətirdən ibarətdir, ${start}-cü sətir yoxdur`, true) };
      }
      if (end !== -1 && end < start) {
        return { jsonrpc: '2.0', id, ...text('❌ view_range-də son sətir başlanğıcdan kiçik ola bilməz', true) };
      }
      offset = start - 1;
      lines = lines.slice(offset, end === -1 ? undefined : end);
    } else if (mode === 'head' || mode === 'tail') {
      const n = Math.max(1, Number(params.arguments?.lines) || 10);
      if (mode === 'head') {
        lines = lines.slice(0, n);
        offset = 0;
      } else {
        offset = Math.max(0, lines.length - n);
        lines = lines.slice(offset);
      }
    }
    const numbered = lines.map((l, i) => `${String(offset + i + 1).padStart(5)}\t${l}`).join('\n');
    return { jsonrpc: '2.0', id, ...text(cut(numbered)) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.code === 'ENOENT' ? 'Tapılmadı: ' + full : err.message}`, true) };
  }
};

module.exports = { schema, handler };
