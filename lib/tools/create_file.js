'use strict';
const fs = require('fs');
const path = require('path');
const { GUARD } = require('../config');
const { text } = require('../util');
const state = require('../state');

const schema = {
  name: 'create_file',
  description: `Yeni fayl yarat (yol nisbi — cwd-yə görə — və ya mütləq ola bilər, sistem boyu, workspace ilə məhdudlaşmır). Fayl artıq varsa default olaraq xəta verir — kiçik dəyişiklik üçün str_replace, faylı TAM YENİDƏN yazmaq üçün overwrite:true istifadə et (bu zaman köhnə versiya "<fayl>.bak" olaraq saxlanılır). check_only:true ilə heç nə yazmadan faylın mövcudluğunu/ölçüsünü yoxlaya bilərsən. ${GUARD}`,
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Yaradılacaq (və ya check_only üçün yoxlanılacaq) faylın yolu' },
    content: { type: 'string', description: 'Faylın məzmunu (check_only:true olduqda lazım deyil)' },
    overwrite: { type: 'boolean', description: 'true olsa, mövcud faylın üzərinə tam yazır və köhnə versiyanı "<fayl>.bak" kimi saxlayır (default: false — mövcud fayl varsa xəta verir)' },
    check_only: { type: 'boolean', description: 'true olsa, heç nə yazmır — yalnız {exists, size} qaytarır. content lazım deyil.' },
  }, required: ['path'] },
};

const handler = async (params, id) => {
  const p = params.arguments?.path;
  const content = params.arguments?.content ?? '';
  const overwrite = params.arguments?.overwrite === true;
  const checkOnly = params.arguments?.check_only === true;
  if (!p) return { jsonrpc: '2.0', id, ...text('❌ path boşdur', true) };
  const full = state.resolvePath(p);

  if (checkOnly) {
    try {
      const st = await fs.promises.stat(full);
      return { jsonrpc: '2.0', id, ...text(JSON.stringify({ exists: true, size: st.size, isDirectory: st.isDirectory() })) };
    } catch {
      return { jsonrpc: '2.0', id, ...text(JSON.stringify({ exists: false })) };
    }
  }

  try {
    const exists = fs.existsSync(full);
    if (exists && !overwrite) return { jsonrpc: '2.0', id, ...text(`❌ Fayl artıq mövcuddur: ${full} — dəyişmək üçün str_replace, tam yenidən yazmaq üçün overwrite:true istifadə et`, true) };
    let backedUp = false;
    if (exists && overwrite) {
      try { await fs.promises.copyFile(full, `${full}.bak`); backedUp = true; } catch {} // best-effort, uğursuz olsa da yazılışı bloklamır
    }
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, content, 'utf8');
    return { jsonrpc: '2.0', id, ...text(`✅ ${exists ? `Üzərinə yazıldı${backedUp ? ` (backup: ${full}.bak)` : ''}` : 'Yaradıldı'}: ${full}`) };
  } catch (err) {
    return { jsonrpc: '2.0', id, ...text(`❌ ${err.message}`, true) };
  }
};

module.exports = { schema, handler };
