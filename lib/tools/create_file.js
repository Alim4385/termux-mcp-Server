'use strict';
const fs = require('fs');
const path = require('path');
const { GUARD, MAX_FILE } = require('../config');
const { text } = require('../util');
const state = require('../state');
const sandbox = require('../sandbox');

const schema = {
  name: 'create_file',
  description: `Create a new file (path can be relative — resolved against cwd — or absolute, system-wide, not limited to workspace). If the file already exists, returns an error by default — use str_replace for small edits, or overwrite:true to COMPLETELY REWRITE the file (old version is saved as "<file>.bak"). Use check_only:true to check file existence/size without writing anything. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Path of the file to create (or check when check_only is true)' },
    content: { type: 'string', description: 'File content (not required when check_only:true)' },
    overwrite: { type: 'boolean', description: 'If true, overwrites an existing file completely and saves the old version as "<file>.bak" (default: false — errors if file exists)' },
    check_only: { type: 'boolean', description: 'If true, writes nothing — only returns {exists, size}. content is not required.' },
  }, required: ['path'] },
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  const content = params.arguments?.content ?? '';
  const overwrite = params.arguments?.overwrite === true;
  const checkOnly = params.arguments?.check_only === true;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path is empty', true) };
  const full = state.resolvePath(p);

  if (checkOnly) {
    try {
      const st = await fs.promises.stat(full);
      return { jsonrpc: '2.0', id, ...text(JSON.stringify({ exists: true, size: st.size, isDirectory: st.isDirectory() })) };
    } catch {
      return { jsonrpc: '2.0', id, ...text(JSON.stringify({ exists: false })) };
    }
  }

  if (Buffer.byteLength(content, 'utf8') > MAX_FILE) {
    return { jsonrpc: '2.0', id, ...text(`❌ content is too large (limit ${Math.round(MAX_FILE / 1024 / 1024)}MB)`, true) };
  }

  try {
    sandbox.assertInside(full, 'Write path');
    const exists = fs.existsSync(full);
    if (exists && !overwrite) return { jsonrpc: '2.0', id, ...text(`❌ File already exists: ${full} — use str_replace to edit, or overwrite:true to rewrite completely`, true) };
    let backedUp = false;
    if (exists && overwrite) {
      try { await fs.promises.copyFile(full, `${full}.bak`); backedUp = true; } catch {} // best-effort, does not block write on failure
    }
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, content, 'utf8');
    return { jsonrpc: '2.0', id, ...text(`✅ ${exists ? `Overwritten${backedUp ? ` (backup: ${full}.bak)` : ''}` : 'Created'}: ${full}`) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.message}`, true) };
  }
};

module.exports = { schema, handler };
