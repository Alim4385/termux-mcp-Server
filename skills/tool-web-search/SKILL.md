---
name: tool-web-search
description: web_search alətini işlətdikdə istifadə et — internetdə axtarış, cari hadisə, fakt, qiymət, hava/vaxt/valyuta, naməlum mövzu yoxlama. Trigger: "webdə axtar", "internetdə tap", "son xəbərlər", "qiyməti nədir", "bunu yoxla", "search web".
---

# tool: web_search

**Nədir:** VortexSearch API (`MCP_WEB_SEARCH_URL`, default `https://searchapi-eta.vercel.app`) üzərindən web axtarışı edir. Nəticələri qısa mətn kimi qaytarır.

**Giriş:**
- `query` (tələb) — axtarış sorğusu.
- `max_results` (1-8, default 5).
- `freshness` — `day|week|month|year` (təzəlik filtri).
- `lang` — `az|tr|en|ru`.
- `exclude_domains` — istisna domenlər.

**Davranış:**
- Nəticələr `[id] title / url / date / snippet` formatında gəlir. Cavab verəndə `[id]` ilə istinad et.
- `confidence` aşağıdırsa və ya nəticə yoxdursa, uydurma — "yoxlaya bilmədim" de.
- Rəqəm/tarix iddialarını nəticədəki məzmuna görə yoxla.
- API xətası/timeout olsa, qısa bildir və lazım gələrsə sorğunu daraldıb yenidən sına.

**Qeyd:** Bu, lokal `search` (fayl/grep) deyil; internet axtarışıdır.
