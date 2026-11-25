---
name: tool-gitmcp
description: Use for GitHub repository docs/code via GitMCP (gitmcp.io). Trigger: "GitHub repo docs", "library documentation", "search repo code", "gitmcp", "repository documentation".
---

# tool: gitmcp

**What:** Remote MCP tool for GitHub repos. Connects to `https://gitmcp.io/{owner}/{repo}` to fetch/search documentation and code of a public GitHub repository.

**When:** When the user asks about a public repo on GitHub (docs, API usage, code examples). For local files use `view/search`, for general web use `web_search`.

**Input:**
- `owner` (required) — GitHub owner/org (e.g. `facebook`).
- `repo` (required) — repo name (e.g. `react`). `owner/repo` format also accepted.
- `action` (required): `fetch_docs` | `search_docs` | `search_code` | `list_tools`.
- `query` — required for `search_docs`/`search_code`.

**Usage:**
- General repo docs: `fetch_docs`.
- Specific question: `search_docs` + `query`.
- Code example/implementation search: `search_code` + `query`.
- See remote tools: `list_tools`.

**Note:** Public GitHub repos only; remote MCP call, network/endpoint errors possible.
