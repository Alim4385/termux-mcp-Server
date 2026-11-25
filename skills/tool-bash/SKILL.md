---
name: tool-bash
description: Use when using the bash tool — run shell commands, package/git/system commands, grep/find search. Trigger: "run command", "bash", "terminal", "grep", "git", "run script", "command not found" diagnosis. Prefer tool-process for long/non-terminating commands, and tool-view/tool-create-file/tool-str-replace for simple file read/write/edit.
---

# tool: bash

**What:** Executes shell command in Termux in current `cwd`; `cd`, `&&`, `;`, pipes work. In normal mode runs in sandbox; if cwd goes outside sandbox it is clamped back.

**Input:**
- `cmd` (string, required) — bash command.
- `stdin` (string) — interactive input; stdin gets EOF even if empty (no hang).
- `timeout` (ms, default 60000, max 90000) — on exceed returns `[TIMEOUT]`, process is killed.
- `env` (object) — added on top of existing env; values are stringified.
- `unsafe` (bool) — if `true`, bypasses sandbox safety check; only when user explicitly requests and truly necessary.

**Output:** `[exit CODE] [MSms] [cwd: ...]` + stdout + `STDERR:`. Very long output is truncated (`...[N truncated]...`).

**Behavior/gotchas:**
- Commands run **serially** (mutex) — parallel bash calls do not corrupt cwd.
- `cwd` is tracked by marker; after `cd`, next call is in new cwd. If path doesn't exist, cwd doesn't change.
- Long/non-terminating work (`npm run dev`, watch, big build/install) → `process` tool. `bash` will timeout.
- For simple file work prefer: read=`view`, new file=`create_file`, small edit=`str_replace` (more reliable/structured).
- Code search: `grep -rn "pattern" .` then narrow with `view view_range`.
- If large output expected, redirect to file, then `view tail/head`.

**Safety:** follow guard rules; get confirmation before destructive/system-changing commands. Do not paste untrusted text directly into cmd — injection risk.
