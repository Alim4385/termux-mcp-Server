'use strict';
// API registry — NO NEW TOOLS. Managed with existing view/create_file/str_replace tools;
// this text is shown to the AI at the start of every conversation via "initialize.instructions".
// Goal: avoid asking repeatedly for the same API keys (OpenAI, WhatsApp, etc.) across projects —
// add once, then read from here like a library in every project.
const { APIS_FILE } = require('./config');

const instructions = `API REGISTRY (for storing API keys across projects):

"${APIS_FILE}" — all API keys are stored in a single JSON file. Format:
{
  "<short-id>": { "name": "Human-readable name", "purpose": "What it is used for (short)", "key": "", "confirm_before_use": false }
}

WHEN TO READ: whenever a project needs any external API (whether the user explicitly says so or you determine it yourself), FIRST read "${APIS_FILE}" with "view".

IF FOUND:
- "key" is filled AND "confirm_before_use" is false → use it directly, no need to ask for permission.
- "key" is filled AND "confirm_before_use" is true → BEFORE using it, tell the user which API you will use and why, then wait for confirmation.
- Entry (name) exists but "key" is empty → ask the user for the key, then write it with "str_replace".

IF NOT FOUND (no entry with that name): ask the user for the API key, then add a new entry using "str_replace" (if file is not just "{}") or "create_file" (if file is "{}", with overwrite:true). When creating the entry:
- Write "purpose" briefly in your own words (e.g. "Text completion with GPT models").
- Evaluate "confirm_before_use" YOURSELF (also follow if the user explicitly says so): if the API has irreversible effects (spends money, sends messages/emails, deletes/changes data) or the key is especially sensitive → true; if it is read/query-only, low-risk → false.

RULES:
- There is NO need to hide the key from the AI — a single user manages their own keys on their own device; hiding provides no functional benefit in this context (you need to use the key anyway).
- Do not manually edit the file in a way that breaks formatting — always keep valid JSON.
- If the user explicitly says "delete/forget this key", remove that entry with "str_replace".`;

module.exports = { instructions };
