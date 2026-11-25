---
name: tool-view
description: Use when using the view tool — read file/directory, show image, investigate large file/log. Trigger: "look at file", "read", "show directory", "check log", "find in code", "tail/head", "recursive ls". Do not blindly read large files fully, narrow first.
---

# tool: view

**What:** Reads file/directory. Relative path resolved against `cwd`, absolute path works system-wide.

**Input:**
- `path` (required).
- Text file: `view_range:[start,end]` (1-based, `end:-1` to EOF) **takes precedence**. Otherwise `mode:"head"|"tail"|"full"` + `lines` (default 10).
- Directory: `recursive:true`, `depth` (default 3, max 6). In large dirs `node_modules/.git/.venv/dist/build...` ignored, 500+ nodes truncated.

**Output:** Text → numbered lines; image (`jpg/png/gif/webp`) → image content; directory → listing. Text >15K chars truncated. File >8MB → error.

**Smart reading (token savings):**
- Unknown/large file: first `wc -l`/`ls -la`, then targeted read.
- Search: find pattern with `search` tool → read with `view_range:[n-10,n+10]` (or quick shell `bash grep -rn`).
- Log tail: `mode:"tail", lines:50`. Start: `head`.
- Large directory: first `recursive:false`; for specific file use `find`/`grep -rln`.
- `process wait` already returns log tail — do not re-read same log fully with `view`.
- When copying existing data, don't `view`+rewrite; use `bash` with `cp/cat/grep >`.
