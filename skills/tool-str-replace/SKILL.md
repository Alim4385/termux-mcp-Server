---
name: tool-str-replace
description: Use when using the str_replace tool — exact text edit in existing file, multiple edits, replace_all. Trigger: "change text", "replace", "edit this", "old_str not found", "change multiple places", "edits". If file doesn't exist use create_file; for full rewrite use create_file overwrite.
---

# tool: str_replace

**What:** Replaces `old_str` → `new_str` in an existing file. Relative/absolute path, but **writes are only allowed inside sandbox**.

**Input:**
- `path` (required).
- Single edit: `old_str` (required), `new_str` (default ""), `replace_all` (default false).
- Multiple edits: `edits: [{old_str,new_str,replace_all?}, ...]` — takes precedence over single fields.

**Behavior/gotchas:**
- Default: `old_str` must appear **exactly once** in file. 0 times → suggests similar candidate/line; >1 times → error, either add unique context or use `replace_all:true`.
- `edits` are applied **sequentially**: 2nd edit sees result of 1st. Do not target same text twice.
- `edits` are **all-or-nothing**: if any edit fails, nothing is written to file.
- Before every successful write `<file>.bak` is saved (best-effort).
- `old_str` cannot be empty string. Empty `new_str` acts as deletion.

**Safety:** verify intent before large/critical changes; `.bak` is for rollback.
