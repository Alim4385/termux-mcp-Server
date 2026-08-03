'use strict';
// Skil sistemi — Claude Code-un öz skil mexanizminin analoqu (Anthropic-in mənim öz
// mühitimdə: /mnt/skills/**/SKILL.md — eyni frontmatter formatı, eyni prinsip).
//
// Prinsip: hər skil öz qovluğunda tək bir SKILL.md faylıdır. Faylın başında YAML-a bənzər
// "frontmatter" var (name + description). Bu modul HƏR "initialize" çağırışında skills/
// qovluğunu skan edir, hər SKILL.md-in frontmatter-ini oxuyur, kiçik bir manifest (siyahı)
// düzəldir — bu, memory/INDEX.md-dən FƏRQLİ olaraq FAYLA yazılmır, hər dəfə TƏZƏDƏN,
// avtomatik hesablanır. Ona görə "köhnəlmiş index" problemi prinsipcə mümkün deyil.
//
// AI (bu manifesti oxuyandan sonra) tapşırığı description-larla uyğunlaşdırır, uyğun
// gələn skili "view" ilə tam oxuyur — YALNIZ o skili, qalanlarını yox.

const fs = require('fs');
const path = require('path');
const { SKILLS_DIR } = require('./config');

// Tam YAML parser YOXDUR (sıfır asılılıq) — format sadədir (yalnız "açar: dəyər" sətirləri),
// sətir-sətir oxumaq kifayətdir. Dırnaq içindəki dəyərlərin ("...") dırnaqlarını təmizləyir.
const parseFrontmatter = (raw) => {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  const meta = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') break;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return meta;
};

// skills/<hər-qovluq>/SKILL.md-ləri tapır, uyğun frontmatter-i olanları qaytarır.
// Səhv formatlı/frontmatter-siz SKILL.md-lər sükutla keçilir (server çökməsin deyə).
const scanSkills = () => {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }); } catch { return out; }
  for (const d of entries) {
    if (!d.isDirectory()) continue;
    const skillPath = path.join(SKILLS_DIR, d.name, 'SKILL.md');
    try {
      const raw = fs.readFileSync(skillPath, 'utf8');
      const meta = parseFrontmatter(raw);
      if (meta && meta.name && meta.description) {
        out.push({ name: meta.name, description: meta.description, path: skillPath });
      }
    } catch { /* SKILL.md yoxdur/oxunmur — bu qovluğu sükutla keç */ }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
};

// "initialize.instructions"-a əlavə olunacaq mətn. Skil yoxdursa null qaytarır (boş bölmə göstərilməsin).
const getManifest = () => {
  const skills = scanSkills();
  if (skills.length === 0) return null;
  const lines = skills.map((s) => `- **${s.name}** — ${s.description} → "${s.path}"`);
  return `MÖVCUD SKİLLƏR (${skills.length} ədəd). Tapşırıq bunlardan birinin description-una uyğun gələndə, ƏVVƏLCƏ "view" ilə həmin SKILL.md-i TAM oxu, sonra ordakı təlimatlara əməl et (yalnız description-a əsaslanıb təxmin etmə):\n${lines.join('\n')}`;
};

module.exports = { getManifest, scanSkills };
