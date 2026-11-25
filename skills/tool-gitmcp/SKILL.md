---
name: tool-gitmcp
description: GitHub repozitoriyaları üçün gitmcp aləti — public GitHub repo sənədlərini/kodunu GitMCP (gitmcp.io) ilə gətirmək və axtarmaq. Trigger: "GitHub repo docs", "bu kitabxananın sənədləri", "repo kodunda axtar", "gitmcp", "repository documentation".
---

# tool: gitmcp

**Nədir:** GitHub repoları üçün remote MCP aləti. `https://gitmcp.io/{owner}/{repo}` endpoint-inə qoşulub public GitHub repozitoriyasının sənədlərini gətirir/axtarır.

**Nə vaxt:** İstifadəçi GitHub-dakı public repo haqqında soruşanda (sənəd, API istifadəsi, kod nümunəsi). Lokal fayllar üçün `view/search`, ümumi web üçün `web_search` istifadə et.

**Giriş:**
- `owner` (tələb) — GitHub owner/org (məs. `facebook`).
- `repo` (tələb) — repo adı (məs. `react`). `owner/repo` formatı da qəbul olunur.
- `action` (tələb): `fetch_docs` | `search_docs` | `search_code` | `list_tools`.
- `query` — `search_docs`/`search_code` üçün tələb.

**İstifadə:**
- Ümumi repo sənədi: `fetch_docs`.
- Konkret sual: `search_docs` + `query`.
- Kod nümunəsi/implementasiya axtarışı: `search_code` + `query`.
- Remote alətləri görmək: `list_tools`.

**Qeyd:** Yalnız public GitHub repoları; remote MCP çağırışıdır, şəbəkə/endpoint xətası ola bilər.
