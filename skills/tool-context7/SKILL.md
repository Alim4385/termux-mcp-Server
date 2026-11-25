---
name: tool-context7
description: Use when using the context7 tool — up-to-date library/framework documentation and code examples via Context7. Trigger: "library docs", "how to use this library", "API docs", "framework setup", "context7", "latest docs for package".
---

# tool: context7

**What:** Context7 MCP proxy for library/framework documentation. Resolves library name to Context7 ID and fetches up-to-date docs/examples.

**When:** User asks about a library/framework/API/setup (React, Next.js, Supabase, etc.). Not for local files (`view/search`), not for GitHub repo internals (`gitmcp`), not for general web news (`web_search`).

**Input:**
- `action` (required): `resolve` | `query` | `list_tools`.
- `resolve`: needs `libraryName` (e.g. `"next.js"`) + `query` (what you need).
- `query`: needs `libraryId` (e.g. `"/vercel/next.js"`, usually from resolve) + `query`. Optional: `language`, `version`.
- `list_tools`: shows remote Context7 tools.

**Pattern:** `resolve` library name → pick best library ID → `query` with specific question. Keep query focused on one concept.

**Note:** Uses `MCP_CONTEXT7_URL` (default `https://mcp.context7.com/mcp`). Optional `CONTEXT7_API_KEY`/`MCP_CONTEXT7_API_KEY` for higher rate limits. Remote call; network errors possible.
