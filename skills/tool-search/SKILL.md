---
name: tool-search
description: search alətini işlətdikdə istifadə et — kod/fayl içində pattern axtarmaq, böyük faylı tam oxumadan daraltmaq. Trigger: "grep", "axtar", "harada var", "pattern tap", "kodda axtar", "simvol/funksiya haradadır".
---

# tool: search

**Nədir:** Fayl/qovluqda mətn və ya regex axtarır, `file:line:content` + kontekst qaytarır. Binary faylları skip edir.

**Giriş:**
- `pattern` (tələb) — mətn və ya regex.
- `path` (default cwd) — fayl və ya qovluq.
- `glob` — məs. `"*.js"`, `"*.{ts,tsx}"`.
- `literal:true` — düz mətn (`-F`).
- `case_sensitive:false` — case-insensitive.
- `context` (default 2, maks 5) — match ətrafı sətirlər.
- `max_results` (default 50, maks 200).

**İstifadə:** əvvəl `search` ilə daralt → sonra `view view_range` ilə lazımi hissəni oxu. Çox nəticə varsa pattern-i/glob-u daralt.
