'use strict';
const fs = require('fs');
const path = require('path');
const { IMG_EXT, MAX_FILE } = require('../config');
const { cut, text, image } = require('../util');
const state = require('../state');

const schema = {
  name: 'view',
  description: 'View a file or directory (relative path is resolved against current cwd; absolute path — e.g. /sdcard/... — gives system-wide access same as bash, not limited to workspace). For directories, lists contents (recursive:true for subdirectories too). For text files, shows with line numbers (view_range for specific lines, or mode:"head"/"tail" for first/last N lines). For image files (jpg/png/gif/webp), displays directly.',
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'File or directory path (relative or absolute)' },
    view_range: { type: 'array', items: { type: 'number' }, description: '[start, end] line numbers (1-based), optional. end=-1 reads to end of file (e.g. [10,-1] = line 10 to EOF). Takes precedence over mode when both provided' },
    mode: { type: 'string', enum: ['head', 'tail', 'full'], description: 'For text files: "head" shows first N lines, "tail" shows last N lines (N = lines param, default 10). Applied when view_range is not provided.' },
    lines: { type: 'number', description: 'Number of lines for mode:"head"/"tail", default 10' },
    recursive: { type: 'boolean', description: 'For directories: if true, lists subdirectories recursively (node_modules/.git auto-ignored)' },
    depth: { type: 'number', description: 'Max depth for recursive:true, default 3, max 6' },
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
      return it.name; // if stat fails (e.g. broken symlink), show just the name
    }
  }));
  return rows.join('\n') || '(empty directory)';
};

const listDirRecursive = async (full, maxDepth) => {
  const lines = [];
  let nodeCount = 0;
  let truncated = false;
  const MAX_NODES = 500; // prevents output bloat in very large repos
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
  if (truncated) lines.push(`... [${MAX_NODES}+ items, truncated — provide a more specific path]`);
  return cut(lines.join('\n')) || '(empty directory)';
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path is empty', true) };
  const full = state.resolvePath(p);
  try {
    const st = await fs.promises.stat(full);
    if (st.isDirectory()) {
      const recursive = params.arguments?.recursive === true;
      const maxDepth = Math.min(Math.max(Number(params.arguments?.depth) || 3, 1), 6);
      const out = recursive ? await listDirRecursive(full, maxDepth) : await listDir(full);
      return { jsonrpc: '2.0', id, ...text(out) };
    }
    if (st.size > MAX_FILE) return { jsonrpc: '2.0', id, ...text(`❌ File is too large (${(st.size / 1024 / 1024).toFixed(1)}MB, limit 8MB)`, true) };

    const ext = path.extname(full).toLowerCase();
    if (IMG_EXT.has(ext)) {
      const buf = await fs.promises.readFile(full);
      const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext];
      return { jsonrpc: '2.0', id, ...image(buf.toString('base64'), mime) };
    }

    const buf = await fs.promises.readFile(full);
    const probe = buf.subarray(0, 8192);
    if (probe.includes(0)) {
      return { jsonrpc: '2.0', id, ...text(`❌ Appears to be a binary file: ${full} (${fmtSize(st.size)}). view only shows text and image files.`, true) };
    }
    let content = buf.toString('utf8');
    let lines = content.split('\n');
    const range = params.arguments?.view_range;
    const mode = params.arguments?.mode;
    let offset = 0;
    if (Array.isArray(range) && range.length === 2) {
      const [start, end] = range;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1) {
        return { jsonrpc: '2.0', id, ...text('❌ view_range is invalid: must be [start, end], start must be an integer >= 1', true) };
      }
      if (start > lines.length) {
        return { jsonrpc: '2.0', id, ...text(`❌ File has only ${lines.length} lines, line ${start} does not exist`, true) };
      }
      if (end !== -1 && end < start) {
        return { jsonrpc: '2.0', id, ...text('❌ view_range end cannot be less than start', true) };
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
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.code === 'ENOENT' ? 'Not found: ' + full : err.message}`, true) };
  }
};

module.exports = { schema, handler };
