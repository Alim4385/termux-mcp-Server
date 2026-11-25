'use strict';
// Memory system (Phase 1) — NO NEW TOOLS. Managed with existing view/create_file/str_replace/bash
// tools; this text is automatically shown to the AI at the start of every conversation via the
// MCP "initialize.instructions" field (a built-in MCP spec mechanism — no need to invent a separate "bootstrap" tool).
const { MEMORY_DIR, MEMORY_INDEX } = require('./config');

const instructions = `MEMORY SYSTEM (for cross-conversation memory):

"${MEMORY_INDEX}" — a small index file. Each line is a 1-sentence summary of a topic + its file name. Read this file with "view" at the BEGINNING of this conversation (if it is empty/short, that's normal, continue).

When you need detail: find the relevant line in the index, then read ONLY that topic's file ("${MEMORY_DIR}/<topic-slug>.md") with "view" — NOT all topic files, only the one you need.

When you learn NEW information useful for the future during the conversation (design decision, resolved bug, user preference, project state, etc.):
1) add it to the appropriate "${MEMORY_DIR}/<topic-slug>.md" file with "str_replace" (if file exists) or "create_file" (if new);
2) update "${MEMORY_INDEX}" — add a new line, or update an existing line.

Rules:
- Keep each topic file SMALL — one topic = one file. If it grows, split into subtopics.
- NEVER bloat the index ("${MEMORY_INDEX}") with details — only 1-sentence summaries, it must always stay small.
- If the user explicitly says "forget", "don't save this to memory", comply.
- Writing to memory follows the RULE: write only useful, accurate information, no fabrication.`;

module.exports = { instructions };
