'use strict';
const fs = require('fs');
const path = require('path');

const VERSION = '3.3.1-beta';
const PORT = Number(process.env.MCP_PORT) || 3000;
const HOST = process.env.MCP_HOST || '127.0.0.1';
const HOME = process.env.MCP_HOME || '/data/data/com.termux/files/home';
const WS = process.env.MCP_WS || path.join(HOME, 'claude_workspace');
const SANDBOX = process.env.MCP_SANDBOX || path.join(HOME, 'ai-sandbox');
const WEB_SEARCH_URL = (process.env.MCP_WEB_SEARCH_URL || 'https://searchapi-eta.vercel.app').replace(/\/+$/, '');

const TM = 60_000;   // default timeout for bash commands (ms)
const MAX = 15_000;  // max output length (truncation limit)

const SF = path.join(WS, '.mcp_state.json');          // file storing cwd
const PROCS_FILE = path.join(WS, '.mcp_procs.json');  // background process list

// Memory system (Phase 1): topic-based files + small index. NO NEW TOOLS —
// managed with existing view/create_file/str_replace/bash tools, explained to the AI
// via "instructions" (in Server.js).
const MEMORY_DIR = path.join(WS, 'memory');
const MEMORY_INDEX = path.join(MEMORY_DIR, 'INDEX.md');

// Skill system: each subdirectory is a skill (skills/<name>/SKILL.md). NO manual index —
// lib/skills.js automatically reads frontmatter (name/description) on each "initialize"
// and builds the list, avoiding drift.
const SKILLS_DIR = path.join(WS, 'skills');

// API registry: API keys added once across projects (name + purpose + key +
// confirm_before_use). NO NEW TOOLS — managed with existing view/create_file/
// str_replace tools like the memory system, explained to the AI via "instructions" (lib/apis.js).
// A single user manages their own keys on their own device, so the key is not hidden from the AI
// (hiding is meaningless in this context — the AI must use the key anyway).
const APIS_DIR = path.join(WS, 'apis');
const APIS_FILE = path.join(APIS_DIR, 'keys.json');

// Marker for tracking real cwd — bash writes PWD itself, we don't parse commands in JS
const MARK = '\u0001CWD\u0001';

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MAX_FILE = 8 * 1024 * 1024; // 8MB — limit for every file read by the view tool

const GUARD = 'RULE: perform only operations explicitly requested by the user; avoid irreversible actions (file deletion, modifying system files); if unsure, ask the user for confirmation first.';

const TAIL_CAP = 65536; // 64KB — only the last part when reading logs in "process wait"

// Log rotation (for .proc-*.log files started by the process tool)
const LOG_MAX_AGE_MS = 3_600_000;      // 1 hour — logs older than this are deleted
const LOG_MAX_SIZE = 50 * 1024 * 1024; // 50MB — if an active log exceeds this size it is trimmed
const LOG_KEEP_TAIL = 5 * 1024 * 1024; // last part to keep when trimming

for (const d of [MEMORY_DIR, SKILLS_DIR, APIS_DIR, SANDBOX]) {
  try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); } catch {}
}
try {
  if (!fs.existsSync(MEMORY_INDEX)) {
    fs.writeFileSync(MEMORY_INDEX, '# Memory Index\n\nEach line: one topic + 1-sentence summary + file name.\nExample: "- **MCP server design** — zero dependencies, 5 tools (bash/view/create_file/str_replace/process) → `mcp-server.md`"\n\n');
  }
} catch {}
try { if (!fs.existsSync(APIS_FILE)) fs.writeFileSync(APIS_FILE, '{}\n'); } catch {}

module.exports = {
  VERSION, PORT, HOST, HOME, WS, SANDBOX, WEB_SEARCH_URL, TM, MAX, SF, PROCS_FILE, MARK, IMG_EXT, MAX_FILE, GUARD,
  TAIL_CAP, LOG_MAX_AGE_MS, LOG_MAX_SIZE, LOG_KEEP_TAIL, MEMORY_DIR, MEMORY_INDEX, SKILLS_DIR,
  APIS_DIR, APIS_FILE,
};
