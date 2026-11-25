---
name: tool-search
description: Use when using the search tool — find patterns in code/files, narrow before reading large file. Trigger: "grep", "search for", "where is", "find pattern", "search in code", "where is function/symbol".
---

# tool: search

**What:** Searches text or regex in file/directory, returns `file:line:content` + context. Skips binary files.

**Input:**
- `pattern` (required) — text or regex.
- `path` (default cwd) — file or directory.
- `glob` — e.g. `"*.js"`, `"*.{ts,tsx}"`.
- `literal:true` — plain text (`-F`).
- `case_sensitive:false` — case-insensitive.
- `context` (default 2, max 5) — lines around match.
- `max_results` (default 50, max 200).

**Usage:** narrow with `search` first → then read relevant part with `view view_range`. If too many results, narrow pattern/glob.
