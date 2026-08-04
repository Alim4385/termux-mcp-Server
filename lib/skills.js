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

// skills/<hər-qovluq>/SKILL.md-ləri tapır, uyğun frontmatter-i olanları "valid" siyahısına yığır.
//
// Bundan başqa İKİ "idxal namizədi" kateqoriyasını da aşkarlayır (əvvəllər bunlar sükutla
// keçilirdi, indi manifestdə görünürlər ki, AI onları "manage-skills" skili ilə idxal etsin):
//   - malformed: skills/<ad>/SKILL.md var, amma frontmatter yoxdur/natamamdır (name/description əskikdir)
//   - pending:   skills/ kökünə birbaşa atılmış tək .md fayl (hələ <ad>/SKILL.md formatına salınmayıb —
//                məs. istifadəçi GitHub-dan endirib birbaşa bura köçürüb)
const scanSkills = () => {
  const valid = [];
  const malformed = [];
  const pending = [];
  let entries;
  try { entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }); } catch { return { valid, malformed, pending }; }
  for (const d of entries) {
    if (d.isFile() && d.name.toLowerCase().endsWith('.md')) {
      pending.push({ path: path.join(SKILLS_DIR, d.name) });
      continue;
    }
    if (!d.isDirectory()) continue;
    const skillPath = path.join(SKILLS_DIR, d.name, 'SKILL.md');
    let raw;
    try { raw = fs.readFileSync(skillPath, 'utf8'); } catch { continue; } // SKILL.md yoxdur — bu qovluğu sükutla keç
    const meta = parseFrontmatter(raw);
    if (meta && meta.name && meta.description) {
      valid.push({ name: meta.name, description: meta.description, path: skillPath });
    } else {
      malformed.push({ path: skillPath });
    }
  }
  valid.sort((a, b) => a.name.localeCompare(b.name));
  return { valid, malformed, pending };
};

// "initialize.instructions"-a əlavə olunacaq mətn. Heç nə (nə skil, nə namizəd) yoxdursa null qaytarır.
const getManifest = () => {
  const { valid, malformed, pending } = scanSkills();
  const parts = [];

  if (valid.length > 0) {
    const lines = valid.map((s) => `- **${s.name}** — ${s.description} → "${s.path}"`);
    parts.push(`MÖVCUD SKİLLƏR (${valid.length} ədəd). Tapşırıq bunlardan birinin description-una uyğun gələndə, ƏVVƏLCƏ "view" ilə həmin SKILL.md-i TAM oxu, sonra ordakı təlimatlara əməl et (yalnız description-a əsaslanıb təxmin etmə):\n${lines.join('\n')}`);
  }

  const candidates = [...malformed.map((m) => m.path), ...pending.map((p) => p.path)];
  if (candidates.length > 0) {
    const manageSkillsPath = path.join(SKILLS_DIR, 'manage-skills', 'SKILL.md');
    parts.push(`İDXAL GÖZLƏYƏN FAYLLAR (${candidates.length} ədəd) — bunlar ya SKILL.md-dir amma frontmatter-i yoxdur/natamamdır, ya da skills/ kökündə tək fayl kimi durur (hələ <ad>/SKILL.md formatına salınmayıb), ona görə yuxarıdakı "MÖVCUD SKİLLƏR" siyahısında GÖRÜNMÜR:\n${candidates.map((p) => `- "${p}"`).join('\n')}\nBunlardan biri ilə əlaqəli tapşırıq gələndə, ya da istifadəçi "bu faylı skil et" kimi bir şey desə, "manage-skills" skilini ("${manageSkillsPath}") "view" ilə oxu, orda təsvir olunan idxal prosesini tətbiq et. İstifadəçi bunu açıq istəməyibsə, özün TƏŞƏBBÜS GÖSTƏRMƏ — sadəcə mövcudluğunu bil.`);
  }

  if (parts.length === 0) return null;
  return parts.join('\n\n');
};

module.exports = { getManifest, scanSkills };
