---
name: tool-process
description: Use when using the process tool — long-running/non-terminating background processes (dev server, build, watch, npm/pip install). Trigger: "start server", "run in background", "npm install takes long", "dev server", "build", "watch". Use this to avoid bash timeout.
---

# tool: process

**What:** Starts/monitors/stops background processes. Not for long jobs in `bash` — use this.

**Actions:**
- `start` — `cmd` required. Do **NOT** add `&` at end (already detached). Can add `env`. `unsafe:true` only when explicitly needed. Returns: `{pid, log, status}`.
- `wait` — `log`, `pattern` required. If `regex:true`, pattern is JS regex (`flags` e.g. `"i"`). `timeout` default 30000, max 55000; `interval` default 500, min 200, max 5000. Checks last 64KB of log. Returns: `{found, log, content}`.
- `list` — live processes started by this tool + server stats `{uptime_s,memory_mb,cwd,active_processes}`. For all system processes use `ps aux`.
- `kill` — `pid` required, only PID started by this tool. `signal`: `SIGTERM`(default)/`SIGKILL`. Kills process group; cancelled if PID reuse signature doesn't match.

**Pattern:** `start` → `wait` (real ready signal: "ready", "Listening", port) → do work → `kill`. Do not guess with `sleep`.

**Gotchas:** after server restart, a still-alive process may still appear in `list`. Old `.proc-*.log` files are cleaned; active logs >50MB are trimmed. Even if `wait` doesn't find pattern, it returns last content — read it for diagnosis.
