'use strict';
// Skil sistemi — rəsmi "Agent Skills" açıq standartının (agentskills.io/specification)
// bu layihəyə uyğunlaşdırılmış tətbiqi. Anthropic-in öz mühitində (/mnt/skills/**/SKILL.md)
// və indi VS Code/Cursor/Copilot kimi digər platformalarda da eyni format işlədilir.
//
// Prinsip: hər skil öz qovluğunda tək bir SKILL.md faylıdır. Faylın başında YAML-a bənzər
// "frontmatter" var (minimum: name + description). Bu modul HƏR "initialize" çağırışında
// skills/ qovluğunu skan edir, hər SKILL.md-in frontmatter-ini oxuyur, kiçik bir manifest
// (siyahı) düzəldir — bu, memory/INDEX.md-dən FƏRQLİ olaraq FAYLA yazılmır, hər dəfə
// TƏZƏDƏN, avtomatik hesablanır. Ona görə "köhnəlmiş index" problemi prinsipcə mümkün deyil.
//
// AI (bu manifesti oxuyandan sonra) tapşırığı description-larla uyğunlaşdırır, uyğun
// gələn skili "view" ilə tam oxuyur — YALNIZ o skili, qalanlarını yox.

const fs = require('fs');
const path = require('path');
const { SKILLS_DIR } = require('./config');

// Tam YAML parser YOXDUR (sıfır asılılıq) — format sadədir (yalnız "açar: dəyər" sətirləri),
// sətir-sətir oxumaq kifayətdir. Dırnaq içindəki dəyərlərin ("...") dırnaqlarını təmizləyir.
// QEYD: rəsmi spesifikasiyada "metadata" sahəsi iç-içə (nested) YAML ola bilər — bu sadə
// parser onu nested kimi YOX, düz sətir kimi oxuyar (yəni "metadata:" öz sətri, alt sətirlər
// ayrı "açar: dəyər" kimi düşər). Bizim sistemdə metadata/license/compatibility/allowed-tools
// istifadə OLUNMUR (yalnız name+description lazımdır), ona görə bu, funksional problem yaratmır.
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

// Rəsmi spesifikasiyaya görə "name" qaydaları (agentskills.io/specification):
// 1-64 simvol, yalnız kiçik hərf/rəqəm/defis, defislə başlaya/bitə bilməz, ardıcıl defis olmaz.
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isValidName = (name) => typeof name === 'string' && name.length >= 1 && name.length <= 64 && NAME_RE.test(name);
const isValidDescription = (desc) => typeof desc === 'string' && desc.length >= 1 && desc.length <= 1024;

// skills/<hər-qovluq>/SKILL.md-ləri tapır, keçərli olanları "valid" siyahısına yığır.
//
// Bundan başqa İKİ "idxal namizədi" kateqoriyasını da aşkarlayır (əvvəllər bunlar sükutla
// keçilirdi, indi manifestdə səbəbi ilə birlikdə görünürlər ki, AI onları "manage-skills"
// skili ilə düzəltsin):
//   - malformed: SKILL.md var, amma etibarsızdır — səbəb qeyd olunur (frontmatter yox/natamam,
//                name formatı spesifikasiyaya uyğun deyil, ya da name qovluq adı ilə üst-üstə düşmür)
//   - pending:   skills/ kökünə birbaşa atılmış tək .md fayl (hələ <ad>/SKILL.md formatına
//                salınmayıb — məs. istifadəçi GitHub-dan endirib birbaşa bura köçürüb)
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

    if (!meta || !meta.name || !meta.description) {
      malformed.push({ path: skillPath, reason: 'frontmatter yoxdur/natamamdır (name və ya description əskikdir)' });
      continue;
    }
    if (!isValidName(meta.name)) {
      malformed.push({ path: skillPath, reason: `name ("${meta.name}") spesifikasiyaya uyğun deyil (yalnız a-z/0-9/defis, defislə başlamaz/bitməz, ardıcıl defis olmaz, maks 64 simvol)` });
      continue;
    }
    if (meta.name !== d.name) {
      malformed.push({ path: skillPath, reason: `name ("${meta.name}") qovluq adı ("${d.name}") ilə üst-üstə düşmür — spesifikasiyaya görə eyni olmalıdır` });
      continue;
    }
    if (!isValidDescription(meta.description)) {
      malformed.push({ path: skillPath, reason: 'description boşdur, ya da 1024 simvoldan uzundur' });
      continue;
    }
    valid.push({ name: meta.name, description: meta.description, path: skillPath });
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

  const candidates = [
    ...malformed.map((m) => `- "${m.path}" — ${m.reason}`),
    ...pending.map((p) => `- "${p.path}" — skills/ kökündə tək fayl, hələ <ad>/SKILL.md formatına salınmayıb`),
  ];
  if (candidates.length > 0) {
    const manageSkillsPath = path.join(SKILLS_DIR, 'manage-skills', 'SKILL.md');
    parts.push(`İDXAL/DÜZƏLİŞ GÖZLƏYƏN FAYLLAR (${candidates.length} ədəd) — yuxarıdakı "MÖVCUD SKİLLƏR" siyahısında GÖRÜNMÜR, səbəbi hər sətirdə qeyd olunub:\n${candidates.join('\n')}\nBunlardan biri ilə əlaqəli tapşırıq gələndə, ya da istifadəçi "bu faylı skil et"/"skilləri yoxla" kimi bir şey desə, "manage-skills" skilini ("${manageSkillsPath}") "view" ilə oxu, orda təsvir olunan idxal/düzəliş prosesini tətbiq et. İstifadəçi bunu açıq istəməyibsə, özün TƏŞƏBBÜS GÖSTƏRMƏ — sadəcə mövcudluğunu bil.`);
  }

  if (parts.length === 0) return null;
  return parts.join('\n\n');
};

module.exports = { getManifest, scanSkills, isValidName, isValidDescription };
