---
name: tool-create-file
description: Use when using the create_file tool — create new file, fully rewrite file, check file existence. Trigger: "create file", "write new file", "overwrite", "check_only", "does file exist".
---

# tool: create_file

**What:** Creates/writes a file. Relative path resolved against `cwd`. **Writes are only allowed inside sandbox** (outside sandbox returns error). Directories are auto-created (`mkdir -p`).

**Input:**
- `path` (required).
- `content` (string) — not needed when `check_only:true`.
- `overwrite` (bool, default false) — if `true`, overwrites existing file and saves old as `<file>.bak` (best-effort).
- `check_only` (bool) — writes nothing, returns `{exists,size,isDirectory}`.

**Behavior/gotchas:**
- If file exists and `overwrite:false` → error; for small edit use `str_replace`, for append use `append`, for full rewrite use `overwrite:true`.
- `check_only` does not write to filesystem — safe check.
- Backup `.bak` is in same directory; failed backup does not block write.
- For copying/moving large existing data, prefer `bash cp/cat` over `view`+`create_file` (token savings).

**Safety:** before irreversible write/overwrite, be clear about intent; get user confirmation for critical files.
