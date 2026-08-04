'use strict';
const fs = require('fs');
const { GUARD } = require('../config');
const { text, cut, suggestSimilar } = require('../util');
const state = require('../state');

const schema = {
  name: 'str_replace',
  description: `Mövcud fayl daxilində konkret mətni dəyişdir (yol nisbi — cwd-yə görə — və ya mütləq ola bilər, sistem boyu). old_str faylda default olaraq DƏQIQ BİR DƏFƏ görünməlidir — əgər bir neçə dəfə görünürsə, ya old_str-ə daha çox ətraf mətn (kontekst) əlavə edərək unikal et, ya da HAMISINI dəyişmək istəyirsənsə replace_all:true istifadə et. Eyni faylda BİRDƏN ÇOX dəyişikliyi tək çağırışda etmək üçün "edits" massivini istifadə et: [{old_str,new_str,replace_all?}, ...] — ardıcıl tətbiq olunurlar, hər hansı biri uğursuz olsa HEÇ BİRİ yazılmır (all-or-nothing). Hər uğurlu yazılışdan əvvəl köhnə versiya "<fayl>.bak" kimi saxlanılır. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Dəyişdiriləcək faylın yolu' },
    old_str: { type: 'string', description: 'Tək dəyişiklik üçün: dəyişdiriləcək mətn. "edits" verilibsə lazım deyil.' },
    new_str: { type: 'string', description: 'Tək dəyişiklik üçün yeni mətn (boş buraxılsa old_str silinir)' },
    replace_all: { type: 'boolean', description: 'Tək dəyişiklik üçün: true olsa, old_str faylda neçə dəfə görünürsə HAMISINI dəyişir (default: false — birdən çox görünsə xəta verir). "edits" verilibsə bu sahə nəzərə alınmır, hər edit öz replace_all-ını təyin edir.' },
    edits: {
      type: 'array',
      description: '⚠️ Bir neçə dəyişikliyi ARDICIL tətbiq etmək üçün massiv (2-ci edit, 1-ci edit-in NƏTİCƏSİNƏ tətbiq olunur — eyni mətn parçasını iki dəfə dəyişmə, 2-cisi tapılmayacaq). Verilsə, old_str/new_str/replace_all-dan üstün tutulur.',
      items: {
        type: 'object',
        properties: {
          old_str: { type: 'string', description: 'Dəyişdiriləcək mətn (default: tətbiq anında faylda bir dəfə olmalıdır)' },
          new_str: { type: 'string', description: 'Yeni mətn (boş buraxılsa old_str silinir)' },
          replace_all: { type: 'boolean', description: 'true olsa, bu edit-də old_str-in faylda neçə dəfə görünürsə HAMISINI dəyişir (default: false)' },
        },
        required: ['old_str'],
      },
    },
  }, required: ['path'] },
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path boşdur', true) };

  let editList = params.arguments?.edits;
  if (!Array.isArray(editList) || editList.length === 0) {
    const oldStr = params.arguments?.old_str;
    if (oldStr === undefined) return { jsonrpc: '2.0', id, ...text('❌ old_str və ya edits tələb olunur', true) };
    editList = [{ old_str: oldStr, new_str: params.arguments?.new_str ?? '', replace_all: params.arguments?.replace_all === true }];
  }
  for (const ed of editList) {
    if (typeof ed.old_str !== 'string' || ed.old_str === '') {
      return { jsonrpc: '2.0', id, ...text('❌ old_str boş sətir ola bilməz', true) };
    }
  }

  const full = state.resolvePath(p);
  try {
    let content = await fs.promises.readFile(full, 'utf8');

    // Əvvəlcə BÜTÜN edit-ləri in-memory tətbiq et — hər hansı biri uğursuz olsa,
    // fayla heç nə yazılmır (all-or-nothing), beləcə yarımçıq/pozulmuş fayl qalmır.
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
        return { jsonrpc: '2.0', id, ...text(`❌ ${tag}old_str faylda ${count} dəfə görünür (ilk sətri uyğun gələn sətirlər: ${lineNums.join(', ') || 'naməlum'}), unikal etmək üçün ətraf mətn əlavə et, ya da HAMISINI dəyişmək istəyirsənsə replace_all:true göndər`, true) };
      }
      content = replaceAll ? content.split(oldStr).join(newStr) : content.replace(oldStr, newStr);
      totalReplacements += count;
    }

    let backedUp = false;
    try { await fs.promises.copyFile(full, `${full}.bak`); backedUp = true; } catch {} // best-effort
    await fs.promises.writeFile(full, content, 'utf8');
    const suffix = editList.length > 1 ? ` (${editList.length} edit, ${totalReplacements} əvəzləmə)` : (totalReplacements > 1 ? ` (${totalReplacements} əvəzləmə)` : '');
    return { jsonrpc: '2.0', id, ...text(`✅ Dəyişdirildi${suffix}: ${full}${backedUp ? ` (backup: ${full}.bak)` : ''}`) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.code === 'ENOENT' ? 'Tapılmadı: ' + full : err.message}`, true) };
  }
};

module.exports = { schema, handler };
