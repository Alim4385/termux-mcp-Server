'use strict';
const fs = require('fs');
const path = require('path');
const { GUARD, MAX_FILE } = require('../config');
const { text } = require('../util');
const state = require('../state');
const sandbox = require('../sandbox');

const schema = {
  name: 'append',
  description: `Append text to the end of a file. Creates the file (and parent directories) if it does not exist. For small in-place edits prefer str_replace; for full rewrites prefer create_file with overwrite:true. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Path of the file to append to (relative or absolute)' },
    content: { type: 'string', description: 'Text to append to the end of the file' },
  }, required: ['path', 'content'] },
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  const content = params.arguments?.content;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path is empty', true) };
  if (typeof content !== 'string') return { jsonrpc: '2.0', id, ...text('❌ content must be a string', true) };
  const full = state.resolvePath(p);
  const addBytes = Buffer.byteLength(content, 'utf8');
  if (addBytes > MAX_FILE) {
    return { jsonrpc: '2.0', id, ...text(`❌ content is too large (limit ${Math.round(MAX_FILE / 1024 / 1024)}MB)`, true) };
  }
  try {
    sandbox.assertInside(full, 'Write path');
    let existed = false;
    let size = 0;
    try {
      const st = await fs.promises.stat(full);
      existed = true;
      if (st.isDirectory()) return { jsonrpc: '2.0', id, ...text(`❌ This is a directory: ${full}`, true) };
      size = st.size;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (size + addBytes > MAX_FILE) {
      return { jsonrpc: '2.0', id, ...text(`❌ Resulting file would be too large (${((size + addBytes) / 1024 / 1024).toFixed(1)}MB, limit ${Math.round(MAX_FILE / 1024 / 1024)}MB)`, true) };
    }
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.appendFile(full, content, 'utf8');
    return { jsonrpc: '2.0', id, ...text(`✅ ${existed ? 'Appended' : 'Created and appended'}: ${full} (+${addBytes} bytes)`) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.message}`, true) };
  }
};

module.exports = { schema, handler };
