'use strict';
const fs = require('fs');
const { GUARD, MAX_FILE } = require('../config');
const { text, cut, suggestSimilar } = require('../util');
const state = require('../state');
const sandbox = require('../sandbox');

const schema = {
  name: 'str_replace',
  description: `Replace specific text inside an existing file (path can be relative — resolved against cwd — or absolute, system-wide). By default old_str must appear EXACTLY ONCE in the file — if it appears multiple times, either add more surrounding context to make it unique, or use replace_all:true if you want to change ALL occurrences. To make MULTIPLE changes in the same file in a single call, use the "edits" array: [{old_str,new_str,replace_all?}, ...] — applied sequentially, and if any fails NOTHING is written (all-or-nothing). Before each successful write the old version is saved as "<file>.bak". ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Path of the file to modify' },
    old_str: { type: 'string', description: 'For a single edit: text to replace. Not required if "edits" is provided.' },
    new_str: { type: 'string', description: 'For a single edit: new text (if omitted, old_str is deleted)' },
    replace_all: { type: 'boolean', description: 'For a single edit: if true, replaces ALL occurrences of old_str in the file (default: false — errors if more than one match). Ignored when "edits" is provided; each edit sets its own replace_all.' },
    edits: {
      type: 'array',
      description: '⚠️ Array for applying multiple edits SEQUENTIALLY (2nd edit applies to the RESULT of 1st — do not target the same text twice, 2nd won\'t find it). If provided, takes precedence over old_str/new_str/replace_all.',
      items: {
        type: 'object',
        properties: {
          old_str: { type: 'string', description: 'Text to replace (default: must appear once in file at time of application)' },
          new_str: { type: 'string', description: 'New text (if omitted, old_str is deleted)' },
          replace_all: { type: 'boolean', description: 'If true, replaces ALL occurrences of old_str for this edit (default: false)' },
        },
        required: ['old_str'],
      },
    },
  }, required: ['path'] },
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path is empty', true) };

  let editList = params.arguments?.edits;
  if (!Array.isArray(editList) || editList.length === 0) {
    const oldStr = params.arguments?.old_str;
    if (oldStr === undefined) return { jsonrpc: '2.0', id, ...text('❌ old_str or edits is required', true) };
    editList = [{ old_str: oldStr, new_str: params.arguments?.new_str ?? '', replace_all: params.arguments?.replace_all === true }];
  }
  for (const ed of editList) {
    if (typeof ed.old_str !== 'string' || ed.old_str === '') {
      return { jsonrpc: '2.0', id, ...text('❌ old_str cannot be an empty string', true) };
    }
  }

  const full = state.resolvePath(p);
  try {
    sandbox.assertInside(full, 'Write path');
    const st = await fs.promises.stat(full);
    if (st.size > MAX_FILE) return { jsonrpc: '2.0', id, ...text(`❌ File is too large (${(st.size / 1024 / 1024).toFixed(1)}MB, limit ${Math.round(MAX_FILE / 1024 / 1024)}MB)`, true) };
    let content = await fs.promises.readFile(full, 'utf8');

    // First apply ALL edits in-memory — if any fails, nothing is written to file (all-or-nothing),
    // so no partial/corrupted file is left behind.
    let totalReplacements = 0;
    for (let idx = 0; idx < editList.length; idx++) {
      const oldStr = editList[idx].old_str;
      const newStr = editList[idx].new_str ?? '';
      const replaceAll = editList[idx].replace_all === true;
      const count = content.split(oldStr).length - 1;
      const tag = editList.length > 1 ? `Edit #${idx + 1}: ` : '';

      if (count === 0) {
        return { jsonrpc: '2.0', id, ...text(cut(`${tag}${suggestSimilar(content, oldStr)}`), true) };
      }
      if (count > 1 && !replaceAll) {
        const lineNums = [];
        content.split('\n').forEach((l, i) => { if (l.includes(oldStr.split('\n')[0])) lineNums.push(i + 1); });
        return { jsonrpc: '2.0', id, ...text(`❌ ${tag}old_str appears ${count} times in the file (lines matching first line: ${lineNums.join(', ') || 'unknown'}), add surrounding context to make it unique, or send replace_all:true if you want to change ALL`, true) };
      }
      content = replaceAll ? content.split(oldStr).join(newStr) : content.replace(oldStr, newStr);
      totalReplacements += count;
    }

    let backedUp = false;
    try { await fs.promises.copyFile(full, `${full}.bak`); backedUp = true; } catch {} // best-effort
    await fs.promises.writeFile(full, content, 'utf8');
    const suffix = editList.length > 1 ? ` (${editList.length} edits, ${totalReplacements} replacements)` : (totalReplacements > 1 ? ` (${totalReplacements} replacements)` : '');
    return { jsonrpc: '2.0', id, ...text(`✅ Replaced${suffix}: ${full}${backedUp ? ` (backup: ${full}.bak)` : ''}`) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.code === 'ENOENT' ? 'Not found: ' + full : err.message}`, true) };
  }
};

module.exports = { schema, handler };
