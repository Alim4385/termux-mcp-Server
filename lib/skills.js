'use strict';
// Skill system — an adaptation of the official "Agent Skills" open standard (agentskills.io/specification)
// for this project. The same format is used in Anthropic's own environment (/mnt/skills/**/SKILL.md)
// and now also on other platforms like VS Code/Cursor/Copilot.
//
// Principle: each skill is a single SKILL.md file in its own directory. The file starts with a YAML-like
// "frontmatter" (minimum: name + description). This module scans the skills/ directory on EVERY "initialize"
// call, reads frontmatter from each SKILL.md, and builds a small manifest (list) — unlike memory/INDEX.md,
// this is NOT written to a file; it is computed fresh, automatically, every time. Therefore the "stale index"
// problem is impossible by design.
//
// The AI (after reading this manifest) matches the task against descriptions, reads the matching skill fully
// with "view" — ONLY that skill, not the others.

const fs = require('fs');
const path = require('path');
const { SKILLS_DIR } = require('./config');

// NO full YAML parser (zero dependencies) — the format is simple (only "key: value" lines),
// line-by-line reading is enough. Cleans quotes around quoted values ("...").
// NOTE: in the official spec "metadata" can be nested YAML — this simple parser does NOT read it as nested,
// but as flat lines (i.e. "metadata:" on its own line, child lines as separate "key: value"). In our system
// metadata/license/compatibility/allowed-tools are NOT used (only name+description needed), so this creates no functional problem.
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

// Per the official spec "name" rules (agentskills.io/specification):
// 1-64 chars, only lowercase letters/numbers/hyphens, cannot start/end with hyphen, no consecutive hyphens.
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isValidName = (name) => typeof name === 'string' && name.length >= 1 && name.length <= 64 && NAME_RE.test(name);
const isValidDescription = (desc) => typeof desc === 'string' && desc.length >= 1 && desc.length <= 1024;

// Finds skills/<each-dir>/SKILL.md, collects valid ones into "valid" list.
//
// Also detects TWO "import candidate" categories (previously silently skipped,
// now shown in the manifest with reason so the AI can fix them via the "skill-authoring" skill):
//   - malformed: SKILL.md exists but is invalid — reason noted (no/incomplete frontmatter,
//                name does not match spec format, or name does not match directory name)
//   - pending:   a standalone .md file dropped directly in skills/ root (not yet placed in
//                <name>/SKILL.md format — e.g. user downloaded from GitHub and dropped it here)
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
    try { raw = fs.readFileSync(skillPath, 'utf8'); } catch { continue; } // no SKILL.md — skip this directory silently
    const meta = parseFrontmatter(raw);

    if (!meta || !meta.name || !meta.description) {
      malformed.push({ path: skillPath, reason: 'missing/incomplete frontmatter (name or description missing)' });
      continue;
    }
    if (!isValidName(meta.name)) {
      malformed.push({ path: skillPath, reason: `name ("${meta.name}") does not match spec (only a-z/0-9/hyphen, cannot start/end with hyphen, no consecutive hyphens, max 64 chars)` });
      continue;
    }
    if (meta.name !== d.name) {
      malformed.push({ path: skillPath, reason: `name ("${meta.name}") does not match directory name ("${d.name}") — they must be identical per spec` });
      continue;
    }
    if (!isValidDescription(meta.description)) {
      malformed.push({ path: skillPath, reason: 'description is empty or longer than 1024 chars' });
      continue;
    }
    valid.push({ name: meta.name, description: meta.description, path: skillPath });
  }
  valid.sort((a, b) => a.name.localeCompare(b.name));
  return { valid, malformed, pending };
};

// Text to be added to "initialize.instructions". Returns null if nothing (no skills, no candidates).
const getManifest = () => {
  const { valid, malformed, pending } = scanSkills();
  const parts = [];

  if (valid.length > 0) {
    const lines = valid.map((s) => `- **${s.name}** — ${s.description} → "${s.path}"`);
    parts.push(`AVAILABLE SKILLS (${valid.length}). When a task matches one of these descriptions, FIRST read that SKILL.md fully with "view", then follow its instructions (do not guess from description alone):\n${lines.join('\n')}`);
  }

  const candidates = [
    ...malformed.map((m) => `- "${m.path}" — ${m.reason}`),
    ...pending.map((p) => `- "${p.path}" — standalone file in skills/ root, not yet placed in <name>/SKILL.md format`),
  ];
  if (candidates.length > 0) {
    const manageSkillsPath = path.join(SKILLS_DIR, 'skill-authoring', 'SKILL.md');
    parts.push(`FILES AWAITING IMPORT/FIX (${candidates.length}) — NOT visible in the "AVAILABLE SKILLS" list above, reason noted on each line:\n${candidates.join('\n')}\nIf a task involves one of these, or the user says something like "make this a skill"/"check skills", read the "skill-authoring" skill ("${manageSkillsPath}") with "view" and apply the import/fix process described there. If the user did not explicitly ask for it, do NOT take initiative — just be aware of their existence.`);
  }

  if (parts.length === 0) return null;
  return parts.join('\n\n');
};

module.exports = { getManifest, scanSkills, isValidName, isValidDescription };
