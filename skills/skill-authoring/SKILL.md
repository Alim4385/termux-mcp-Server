---
name: skill-authoring
description: Yeni skil yaratmaq və ya mövcud/xam skill faylını idxal/düzəltmək üçün istifadə et. Trigger: "yeni skill yarat", "SKILL.md yaz", "skill formatı", "bu faylı skill et", "skills təmizlə/düzəlt", "frontmatter səhvdir".
---

# skill-authoring

**Nə vaxt skil, nə vaxt memory:** təkrarlana bilən prosedur/workflow → skil; fakt/qərar/tarixçə → `memory/`. Tək dəfəlik tapşırıq üçün skil yaratma.

## Format (server sərt yoxlayır)
`skills/<ad>/SKILL.md`:
```
---
name: <ad>
description: <NƏ VAXT işə düşür + trigger sözlər; mövzu izahı yox>
---
<body: qısa, konkret, tool adları ilə>
```
- `name`: `[a-z0-9]+(-[a-z0-9]+)*`, 1-64 simvol, qovluq adı ilə **eyni**.
- `description`: 1-1024 simvol, trigger-ə fokuslan (kiçik LLM üçün aydın). "Nə vaxt istifadə et..." yaz.
- Mürəkkəb/nested YAML, əlavə sahələr lazım deyil.

## Yaratma
1. Təkrarlanabilirlik varmı? 2. `create_file` ilə yaz. 3. 2-3 trigger cümlə düşün, description-u ona görə yaz. 4. İstifadəçiyə bildir.

## İdxal/düzəliş
- `skills/`-ə atılmış xam `.md` və ya manifestdə "İDXAL/DÜZƏLİŞ GÖZLƏYƏN" → `view` ilə oxu, səbəbi düzəlt (frontmatter, name=dir, description trigger). Lazım olsa `manage-skills` yox, bu qayda ilə düzəlt.
- Böyükdürsə: qısa `SKILL.md` + `references/` (1 səviyyə), frontmatter yalnız SKILL.md-də. 300+ sətir reference-ə içindəkilər əlavə et.
- Orijinal xam faylı silməzdən əvvəl təsdiq al.

**Minimalizm:** body qısa, siqnal yüksək; token yedirtmə.
