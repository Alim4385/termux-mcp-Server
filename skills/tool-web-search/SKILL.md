---
name: tool-web-search
description: Use when using the web_search tool — web search, current events, facts, prices, weather/time/currency, checking unknown topics. Trigger: "search web", "find on internet", "latest news", "what is the price", "check this", "search online".
---

# tool: web_search

**What:** Web search via VortexSearch API (`MCP_WEB_SEARCH_URL`, default `https://searchapi-eta.vercel.app`). Returns compact text results.

**Input:**
- `query` (required) — search query.
- `max_results` (1-8, default 5).
- `freshness` — `day|week|month|year`.
- `lang` — `az|tr|en|ru`.
- `exclude_domains` — domains to exclude.

**Behavior:**
- Results come as `[id] title / url / date / snippet`. Cite with `[id]` when answering.
- If `confidence` is low or no results, do not guess — say you could not verify.
- Verify number/date claims against returned content.
- On API error/timeout, report briefly and retry with narrower query if needed.

**Note:** This is internet search, not local `search` (file/grep).
