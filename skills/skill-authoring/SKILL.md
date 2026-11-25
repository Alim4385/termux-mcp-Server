---
name: skill-authoring
description: Use to create a new skill or import/fix an existing/raw skill file. Trigger: "create a skill", "write SKILL.md", "skill format", "make this a skill", "clean/fix skills", "frontmatter is wrong".
---

# skill-authoring

**When skill vs memory:** repeatable procedure/workflow → skill; fact/decision/history → `memory/`. Do not create a skill for a one-off task.

## Format (server validates strictly)
`skills/<name>/SKILL.md`:
```
---
name: <name>
description: <WHEN it triggers + trigger words; not a topic explanation>
---
<body: short, concrete, with tool names>
```
- `name`: `[a-z0-9]+(-[a-z0-9]+)*`, 1-64 chars, **same** as directory name.
- `description`: 1-1024 chars, trigger-focused (clear for small LLMs). Write "Use when...".
- No complex/nested YAML, no extra fields needed.

## Creating
1. Is it repeatable? 2. Write with `create_file`. 3. Think of 2-3 trigger phrases, write description accordingly. 4. Inform the user.

## Import/fix
- Raw `.md` dropped into `skills/` or "FILES AWAITING IMPORT/FIX" in manifest → read with `view`, fix the reason (frontmatter, name=dir, trigger description).
- If large: short `SKILL.md` + `references/` (1 level deep), frontmatter only in SKILL.md. Add table of contents for 300+ line references.
- Ask for confirmation before deleting original raw file.

**Minimalism:** short body, high signal; do not waste tokens.
