---
name: tool-append
description: Use when using the append tool — append text to end of file, log/note/incremental write. Trigger: "append to end", "append", "write log", "add to file", "add line".
---

# tool: append

**What:** Appends text to the end of a file. Creates file (and directories) if missing. **Writes are only allowed inside sandbox.**

**Input:**
- `path` (required) — file path.
- `content` (required) — text to append.

**Behavior/gotchas:**
- If file doesn't exist, creates it; if exists, appends without removing existing content.
- If existing file + new content exceeds `MAX_FILE` (8MB), returns error.
- For in-place/exact location edits use `str_replace`; for full rewrite use `create_file overwrite:true`.

**Safety:** writes only inside sandbox; outside path is blocked.
