# Termux MCP Server

A lightweight, zero-dependency [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server designed for **Termux on Android**. It exposes a small set of practical tools for shell execution, file operations, search, background processes, web search, and remote documentation lookup — with sandbox-aware guardrails for safer personal-device use.

> **Version:** `3.3.1-beta`  
> **Runtime:** Node.js (tested on Node 22+)  
> **Transport:** HTTP JSON-RPC (`POST /mcp`)  
> **Dependencies:** None (built-in Node.js modules only)

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [HTTP Endpoints](#http-endpoints)
- [Configuration](#configuration)
- [Tools](#tools)
- [Sandbox & Safety Model](#sandbox--safety-model)
- [Skills System](#skills-system)
- [Memory System](#memory-system)
- [API Key Registry](#api-key-registry)
- [Background Processes & Logs](#background-processes--logs)
- [Project Structure](#project-structure)
- [Development Notes](#development-notes)

---

## Features

- **Zero dependencies** — plain Node.js, no npm install required.
- **MCP over HTTP** — simple JSON-RPC 2.0 endpoint for MCP clients.
- **11 built-in tools** — shell, local git, file read/write/edit/append/search, background process management, web search, GitHub repo docs, and library docs.
- **Sandbox guardrails** — writes restricted to sandbox by default; dangerous command patterns blocked unless explicitly overridden.
- **Skill system** — per-skill `SKILL.md` files auto-discovered and exposed in MCP `initialize.instructions`.
- **Memory system** — lightweight topic-based memory files managed through existing tools (no extra memory tool).
- **API registry** — cross-project API key registry stored as JSON and managed through existing tools.
- **Process management** — start/wait/list/kill long-running background jobs with log tail support and PID-reuse protection.
- **Termux-friendly** — defaults and behavior tuned for Android/Termux environments.

---

## Quick Start

### Requirements

- Node.js 20+ (Node 22 recommended)
- Termux (primary target) or any Linux environment for local testing

### Run

```bash
node Server.js
```

By default the server starts at:

```text
http://127.0.0.1:3000/mcp
```

### Health Check

```bash
curl http://127.0.0.1:3000/health
```

Example response:

```json
{
  "status": "ok",
  "version": "3.3.1-beta",
  "cwd": "/data/data/com.termux/files/home/ai-sandbox",
  "uptime_s": 12,
  "memory_mb": 52.4,
  "active_processes": 0,
  "pending_bash_requests": 0
}
```

---

## HTTP Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/mcp` | MCP JSON-RPC 2.0 endpoint (`initialize`, `tools/list`, `tools/call`, `ping`) |
| `GET` | `/health` | Server health/status info |
| `OPTIONS` | `*` | CORS preflight response |

### MCP Methods

| Method | Description |
|---|---|
| `initialize` | Returns protocol/capabilities/server info and assembled instructions (safety + memory + API registry + skills manifest) |
| `tools/list` | Returns available tool schemas |
| `tools/call` | Executes a tool by name |
| `ping` | Simple liveness check |

---

## Configuration

Configuration is controlled via environment variables. Defaults are defined in `lib/config.js`.

| Variable | Default | Description |
|---|---|---|
| `MCP_PORT` | `3000` | HTTP server port |
| `MCP_HOST` | `127.0.0.1` | HTTP bind host |
| `MCP_HOME` | `/data/data/com.termux/files/home` | Base home directory |
| `MCP_WS` | `$MCP_HOME/claude_workspace` | Workspace directory (state, memory, skills, API registry) |
| `MCP_SANDBOX` | `$MCP_HOME/ai-sandbox` | Sandbox root for write operations and default cwd |
| `MCP_WEB_SEARCH_URL` | `https://searchapi-eta.vercel.app` | Base URL for `web_search` (VortexSearch API) |
| `MCP_GITMCP_BASE` | `https://gitmcp.io` | Base URL for `gitmcp` remote MCP endpoint |
| `MCP_CONTEXT7_URL` | `https://mcp.context7.com/mcp` | Context7 MCP endpoint |
| `CONTEXT7_API_KEY` / `MCP_CONTEXT7_API_KEY` | *(empty)* | Optional Context7 API key (sent as `Authorization: Bearer ...`) |

### Internal Limits / Defaults

| Setting | Value | Notes |
|---|---:|---|
| Bash default timeout | `60,000 ms` | `bash.timeout` max `90,000 ms` |
| Max tool output length | `15,000 chars` | Long output is truncated with head/tail |
| Max file size (`view`, write guards) | `8 MB` | Protects memory/token usage |
| Process wait timeout | default `30,000 ms`, max `55,000 ms` | Polls log tail |
| Process wait interval | default `500 ms`, min `200`, max `5,000` | Polling interval |
| Log tail read cap | `64 KB` | `process.wait` reads last log chunk |
| Log max age | `1 hour` | Old `.proc-*.log` files cleaned up |
| Log max size | `50 MB` | Active logs trimmed to last `5 MB` |

---

## Tools

The server currently exposes **11 tools**.

| Tool | Purpose |
|---|---|
| `bash` | Run shell commands in Termux (serialized execution, cwd tracking) |
| `view` | Read files/directories, line ranges, head/tail, images |
| `create_file` | Create/write/check files (with overwrite backup) |
| `str_replace` | Exact text replacement, single or sequential multi-edit (all-or-nothing) |
| `append` | Append text to file end (creates file if missing) |
| `process` | Manage long-running background processes (start/wait/list/kill) |
| `search` | Grep-like text/regex search across files |
| `git` | Structured local git operations (status/diff/log/add/commit/branch/...) |
| `web_search` | Web search via VortexSearch API |
| `gitmcp` | GitHub repository docs/code search via GitMCP |
| `context7` | Library/framework docs lookup via Context7 |

### 1) `bash`

Execute shell commands in the current tracked working directory.

**Parameters**
- `cmd` *(string, required)* — Bash command
- `stdin` *(string, optional)* — Text sent to stdin
- `timeout` *(number, optional)* — Default `60000`, max `90000`
- `env` *(object, optional)* — Extra env vars (string values)
- `unsafe` *(boolean, optional)* — Bypass sandbox safety checks (use only when explicitly needed)

**Notes**
- Serialized with a mutex to prevent cwd race conditions.
- Tracks real cwd via a marker appended by the shell.
- In safe mode, cwd is clamped to sandbox and dangerous command patterns are blocked.

### 2) `view`

Read files/directories. Supports line ranges, head/tail mode, recursive directory listing, and image rendering.

**Parameters**
- `path` *(string, required)*
- `view_range` *(number[2], optional)* — `[start, end]`, 1-based; `end = -1` means EOF
- `mode` *(string, optional)* — `head | tail | full`
- `lines` *(number, optional)* — for head/tail, default `10`
- `recursive` *(boolean, optional)* — recursive directory listing
- `depth` *(number, optional)* — recursive depth, default `3`, max `6`

**Notes**
- Text output includes line numbers.
- Image files (`.jpg/.jpeg/.png/.gif/.webp`) are returned as image content.
- Binary files are detected and rejected for text view.

### 3) `create_file`

Create a file, overwrite an existing file, or check existence/size without writing.

**Parameters**
- `path` *(string, required)*
- `content` *(string, optional)* — not required with `check_only:true`
- `overwrite` *(boolean, optional)* — overwrite existing file and save `<file>.bak`
- `check_only` *(boolean, optional)* — return `{exists,size,isDirectory}` only

**Notes**
- Write restricted to sandbox.
- Refuses overwriting existing file unless `overwrite:true`.

### 4) `str_replace`

Replace exact text in an existing file. Supports single edit or sequential multi-edit array.

**Parameters**
- `path` *(string, required)*
- `old_str` *(string, optional)* — required for single edit
- `new_str` *(string, optional)* — default empty string (delete)
- `replace_all` *(boolean, optional)* — replace all occurrences for single edit
- `edits` *(array, optional)* — sequential edits: `{old_str, new_str?, replace_all?}`

**Notes**
- By default, `old_str` must match exactly once.
- `edits` are applied in-memory sequentially; **all-or-nothing** on failure.
- Creates `<file>.bak` before successful write (best effort).
- Write restricted to sandbox.

### 5) `append`

Append text to the end of a file; creates file/directories if missing.

**Parameters**
- `path` *(string, required)*
- `content` *(string, required)*

**Notes**
- Write restricted to sandbox.
- Enforces `MAX_FILE` size guard on appended/resulting content.

### 6) `process`

Manage long-running background processes.

**Parameters**
- `action` *(string, required)* — `start | wait | list | kill`
- `cmd` *(string, start)* — command to run in background (do **not** append `&`)
- `env` *(object, start, optional)* — extra env vars
- `unsafe` *(boolean, start, optional)* — bypass sandbox safety checks
- `pid` *(number, kill)* — PID returned by start
- `signal` *(string, kill, optional)* — `SIGTERM` (default) or `SIGKILL`
- `log` *(string, wait)* — log path returned by start
- `pattern` *(string, wait)* — substring or regex pattern
- `regex` *(boolean, wait, optional)* — treat pattern as JS regex
- `flags` *(string, wait, optional)* — regex flags
- `timeout` *(number, wait, optional)* — default `30000`, max `55000`
- `interval` *(number, wait, optional)* — default `500`, min `200`, max `5000`

**Notes**
- Kills process group (child processes included) when possible.
- PID reuse protection uses `/proc/<pid>/stat` starttime signature.
- `list` returns tracked processes and server stats.

### 7) `search`

Search text/regex in files using `grep`.

**Parameters**
- `pattern` *(string, required)*
- `path` *(string, optional)* — file/dir, default cwd
- `glob` *(string, optional)* — e.g. `*.js`, `*.{ts,tsx}`
- `literal` *(boolean, optional)* — literal search (`-F`)
- `case_sensitive` *(boolean, optional)* — default `true`
- `context` *(number, optional)* — default `2`, max `5`
- `max_results` *(number, optional)* — default `50`, max `200`

### 8) `web_search`

Web search via VortexSearch-compatible API.

**Parameters**
- `query` *(string, required)*
- `max_results` *(integer, optional)* — `1..8`, default `5`
- `freshness` *(string, optional)* — `day | week | month | year`
- `lang` *(string, optional)* — `az | tr | en | ru`
- `exclude_domains` *(string[], optional)* — domains to exclude

**Notes**
- Uses `MCP_WEB_SEARCH_URL` (default `https://searchapi-eta.vercel.app`).
- Returns compact, citation-friendly results (`[id]`, URL, date/snippet).

### 9) `gitmcp`

Query public GitHub repository docs/code through GitMCP.

**Parameters**
- `owner` *(string, required)* — GitHub owner/org
- `repo` *(string, required)* — repo name (or `owner/repo`)
- `action` *(string, required)* — `fetch_docs | search_docs | search_code | list_tools`
- `query` *(string, required for search actions)*

**Notes**
- Remote MCP proxy to `MCP_GITMCP_BASE` (default `https://gitmcp.io`).
- Intended for public GitHub repositories.

### 10) `context7`

Query up-to-date library/framework documentation via Context7.

**Parameters**
- `action` *(string, required)* — `resolve | query | list_tools`
- `libraryName` *(string, resolve)* — library/package name
- `query` *(string, resolve/query)* — intent or specific docs question
- `libraryId` *(string, query)* — Context7 library ID (e.g. `/vercel/next.js`)
- `language` *(string, optional, query)* — preferred language for examples
- `version` *(string, optional, query)* — library version

**Notes**
- Uses `MCP_CONTEXT7_URL` (default `https://mcp.context7.com/mcp`).
- Optional API key via `CONTEXT7_API_KEY` or `MCP_CONTEXT7_API_KEY`.

### 11) `git`

Run structured local git operations.

**Parameters**
- `action` *(string, required)* — `status | diff | log | show | add | commit | branch | checkout | pull | push | remote | stash | clone | init | raw`
- `path` *(string, optional)* — repo/directory path (default cwd)
- `args` *(string[], optional)* — extra git args; required for `raw`
- `message` *(string, commit)* — commit message
- `files` *(string[], optional)* — files for add/checkout/stash
- `branch` *(string, optional)* — branch name
- `remote` *(string, optional)* — remote name
- `ref` *(string, optional)* — ref/commit for show/log/diff/checkout
- `staged` *(boolean, diff)* — `--staged`
- `limit` *(number, log)* — default `20`, max `100`
- `create` *(boolean, branch/checkout)* — create branch
- `delete` *(boolean, branch/remote)* — delete
- `force` *(boolean, optional)* — force delete / push uses `--force-with-lease`
- `set_upstream` *(boolean, push)* — add `-u`
- `all` *(boolean, optional)* — `-a`/`-A`
- `url` *(string, clone/remote add)*
- `dest` *(string, clone)* — destination directory
- `name` *(string, remote)* — remote name
- `timeout` *(number, optional)* — default `60000`, max `120000`
- `unsafe` *(boolean, optional)* — bypass sandbox cwd clamp

**Notes**
- Not the same as `gitmcp` (which queries remote GitHub repo docs/code via GitMCP).
- CWD is sandbox-clamped unless `unsafe:true`.
- For destructive operations (force push, branch delete, raw), confirm intent first.

---

## Sandbox & Safety Model

This server is designed for **harm reduction** on a personal device, not perfect isolation.

### Sandbox Behavior

- **Write-restricted tools:** `create_file`, `str_replace`, `append` only write inside `MCP_SANDBOX`.
- **Read tools:** `view` and `search` can read outside sandbox (useful for inspecting device files).
- **Shell/process tools:** `bash` and `process.start` run with sandbox-aware cwd clamping and dangerous-command checks in safe mode.
- **`unsafe:true`:** explicitly bypasses sandbox safety checks for `bash`/`process.start` when truly necessary.

### Safety Rules (Always Injected)

The server injects safety instructions into `initialize.instructions`, including:
- Ask for explicit confirmation before irreversible/high-risk actions.
- Prefer read-only diagnostics when possible.
- Be careful with ambiguous destructive requests.
- Treat sensitive Termux:API actions as explicit per-use consent operations.
- Do not assume the chat user is always the device owner.

### Important Limitations

- This is **not** a full OS sandbox/container.
- Dangerous-command pattern checks are best-effort and can be bypassed by determined shell usage.
- `unsafe:true` is a tool parameter, not a separate authenticated authorization layer.
- Use on trusted personal devices/environments with caution.

---

## Skills System

Skills are stored as directories under `skills/<skill-name>/SKILL.md`.

- On each `initialize`, the server scans skills and builds a manifest from frontmatter (`name`, `description`).
- No manual index file is required (avoids drift).
- The manifest is injected into MCP instructions so the model can load the relevant `SKILL.md` with `view` when needed.

### Included Skills

- `debug`, `security`, `skill-authoring`, `termux`
- `tool-bash`, `tool-view`, `tool-create-file`, `tool-str-replace`, `tool-append`
- `tool-process`, `tool-search`, `tool-git`, `tool-web-search`, `tool-gitmcp`, `tool-context7`

---

## Memory System

The server includes a lightweight memory workflow (no dedicated memory tool):

- Index file: `$MCP_WS/memory/INDEX.md`
- Topic files: `$MCP_WS/memory/<topic>.md`
- The agent is instructed (via `initialize.instructions`) to read the index first, then read only the relevant topic file.
- Updates are made using existing `view/create_file/str_replace` tools.

This keeps memory scalable and token-efficient.

---

## API Key Registry

The server also includes a simple cross-project API key registry (no dedicated tool):

- File: `$MCP_WS/apis/keys.json`
- Managed through `view/create_file/str_replace`
- Schema (per entry): `name`, `purpose`, `key`, `confirm_before_use`

The instructions guide the agent to reuse saved keys safely and ask for confirmation when appropriate.

---

## Background Processes & Logs

The `process` tool manages long-running jobs started by the server:

- `start` returns `pid` and log file path (`.proc-*.log` in workspace)
- `wait` polls log tail for a pattern/regex
- `list` shows live tracked processes + server stats
- `kill` stops tracked process group (with PID reuse protection)

### Log Handling

- Old logs cleaned based on age (`1 hour`)
- Large active logs trimmed (keep tail) to avoid storage bloat
- Wait reads only the last `64 KB` for efficiency

---

## Project Structure

```text
.
├── Server.js                 # HTTP + MCP JSON-RPC entry point
├── lib/
│   ├── config.js             # Env config, paths, limits, defaults
│   ├── exec.js               # Bash execution, queue, log tail/rotation
│   ├── state.js              # cwd state, process registry, PID signature checks
│   ├── safety.js             # Always-on safety/sandbox instructions
│   ├── memory.js             # Memory system instructions
│   ├── apis.js               # API registry instructions
│   ├── skills.js             # Skill discovery + manifest generation
│   ├── sandbox.js            # Sandbox path checks and dangerous command guards
│   ├── mcp_remote.js         # Minimal remote MCP JSON-RPC/SSE client
│   ├── util.js               # text/image helpers, truncation, suggestions
│   └── tools/
│       ├── index.js          # Tool registry/dispatch
│       ├── bash.js
│       ├── view.js
│       ├── create_file.js
│       ├── str_replace.js
│       ├── append.js
│       ├── process.js
│       ├── search.js
│       ├── git.js
│       ├── web_search.js
│       ├── gitmcp.js
│       └── context7.js
└── skills/
    ├── debug/SKILL.md
    ├── security/SKILL.md
    ├── skill-authoring/SKILL.md
    ├── termux/SKILL.md
    └── tool-*/SKILL.md
```

---

## Development Notes

- **No build step / no package install** required.
- **Main entry:** `Server.js`
- **Local smoke testing:** start server with temp `MCP_HOME/MCP_WS/MCP_SANDBOX`, then send JSON-RPC requests to `/mcp`.
- **External tools** (`web_search`, `gitmcp`, `context7`) depend on network access to their configured endpoints.
- The project favors small, explicit, low-dependency implementations suitable for constrained/mobile environments.

---

## License

No license file is currently included in this repository. Add a `LICENSE` file if you plan to distribute the project publicly under specific terms.
