'use strict';
const fs = require('fs');
const path = require('path');
const { GUARD, MAX_FILE } = require('../config');
const { text } = require('../util');
const state = require('../state');
const sandbox = require('../sandbox');

const schema = {
  name: 'append',
  description: `Faylın sonuna mətn əlavə et. Fayl yoxdursa yaradılır (valideyn qovluqlar da). Kiçik dəyişiklik üçün str_replace, tam yenidən yazmaq üçün create_file overwrite:true daha uyğundur. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Mətn əlavə ediləcək faylın yolu (nisbi və ya tam)' },
    content: { type: 'string', description: 'Faylın sonuna əlavə ediləcək mətn' },
  }, required: ['path', 'content'] },
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  const content = params.arguments?.content;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path boşdur', true) };
  if (typeof content !== 'string') return { jsonrpc: '2.0', id, ...text('❌ content string olmalıdır', true) };
  const full = state.resolvePath(p);
  const addBytes = Buffer.byteLength(content, 'utf8');
  if (addBytes > MAX_FILE) {
    return { jsonrpc: '2.0', id, ...text(`❌ content çox böyükdür (limit ${Math.round(MAX_FILE / 1024 / 1024)}MB)`, true) };
  }
  try {
    sandbox.assertInside(full, 'Yazma yolu');
    let existed = false;
    let size = 0;
    try {
      const st = await fs.promises.stat(full);
      existed = true;
      if (st.isDirectory()) return { jsonrpc: '2.0', id, ...text(`❌ Bu bir qovluqdur: ${full}`, true) };
      size = st.size;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (size + addBytes > MAX_FILE) {
      return { jsonrpc: '2.0', id, ...text(`❌ Nəticə fayl çox böyük olacaq (${((size + addBytes) / 1024 / 1024).toFixed(1)}MB, limit ${Math.round(MAX_FILE / 1024 / 1024)}MB)`, true) };
    }
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.appendFile(full, content, 'utf8');
    return { jsonrpc: '2.0', id, ...text(`✅ ${existed ? 'Əlavə edildi' : 'Yaradıldı və əlavə edildi'}: ${full} (+${addBytes} bayt)`) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.message}`, true) };
  }
};

module.exports = { schema, handler };
