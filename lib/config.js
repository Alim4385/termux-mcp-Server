'use strict';
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '127.0.0.1';
const HOME = '/data/data/com.termux/files/home';
const WS = path.join(HOME, 'claude_workspace');

const TM = 60_000;   // bash əmri üçün default timeout (ms)
const MAX = 15_000;  // çıxışın maksimum uzunluğu (kəsilmə həddi)

const SF = path.join(WS, '.mcp_state.json');          // cwd saxlanılan fayl
const PROCS_FILE = path.join(WS, '.mcp_procs.json');  // arxa-fon proseslərin siyahısı

// Yaddaş sistemi (Faz 1): mövzu-əsaslı fayllar + kiçik indeks. Yeni alət YOXDUR —
// mövcud view/create_file/str_replace/bash alətləri ilə idarə olunur, "instructions"
// vasitəsilə AI-ya (router.js-də) izah edilir.
const MEMORY_DIR = path.join(WS, 'memory');
const MEMORY_INDEX = path.join(MEMORY_DIR, 'INDEX.md');

// Skil sistemi: hər alt-qovluq bir skildir (skills/<ad>/SKILL.md). Manual index YOXDUR —
// lib/skills.js hər "initialize"-də frontmatter-i (name/description) avtomatik oxuyub
// siyahı düzəldir, drift riski olmur.
const SKILLS_DIR = path.join(WS, 'skills');

// Real cwd izləmək üçün marker — bash özü PWD-ni yazır, biz JS-də əmri parse etmirik
const MARK = '\u0001CWD\u0001';

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MAX_FILE = 8 * 1024 * 1024; // 8MB — view alətində oxunan hər fayl üçün limit

const GUARD = 'QAYDA: yalnız istifadəçinin açıq şəkildə istədiyi əməliyyatları yerinə yetir; geri dönməzsiz əməliyyatlardan (fayl silmə, sistem faylların dəyişdirilməsi) çəkin, əmin olmadıqda əvvəlcə istifadəçidən təsdiq al.';

const TAIL_CAP = 65536; // 64KB — "process wait" log oxumasında yalnız son hissə

// Log rotasiyası (process aləti başlatdığı .proc-*.log faylları üçün)
const LOG_MAX_AGE_MS = 3_600_000;      // 1 saat — bundan köhnə loglar silinir
const LOG_MAX_SIZE = 50 * 1024 * 1024; // 50MB — aktiv log bu ölçünü keçsə kəsilir
const LOG_KEEP_TAIL = 5 * 1024 * 1024; // kəsiləndə saxlanacaq son hissə

if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
if (!fs.existsSync(MEMORY_INDEX)) {
  fs.writeFileSync(MEMORY_INDEX, '# Yaddaş indeksi\n\nHər sətir: bir mövzu + 1-cümləlik xülasə + fayl adı.\nMəsələn: "- **MCP server dizaynı** — sıfır asılılıq, 5 alət (bash/view/create_file/str_replace/process) → `mcp-server.md`"\n\n');
}
if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

module.exports = {
  PORT, HOST, HOME, WS, TM, MAX, SF, PROCS_FILE, MARK, IMG_EXT, MAX_FILE, GUARD,
  TAIL_CAP, LOG_MAX_AGE_MS, LOG_MAX_SIZE, LOG_KEEP_TAIL, MEMORY_DIR, MEMORY_INDEX, SKILLS_DIR,
};
