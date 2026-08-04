---
name: skill-creator
description: Söhbət ərzində təkrarlana bilən, faydalı bir iş axını/prosedur kəşf edəndə (istifadəçi "bunu hər dəfə belə et" desə, ya da özün gələcək söhbətlər üçün faydalı olacağını düşünsən) yeni skil yaratmaq üçün istifadə et.
---

# Yeni skil necə yaradılır

Yeni SKILL.md yaratmazdan ƏVVƏL yoxla: bu, TƏKRARLANA BİLƏN bir prosedurdurmu (bir dəfəlik həll deyil)? Tək dəfəlik tapşırıqda skil YARATMA — sadəcə tapşırığı yerinə yetir. Faktları/tarixçəni isə `memory/`-ə yaz, skilə yox (fərq: memory = "nə oldu", skill = "necə etməli").

## Addımlar

1. `create_file` ilə `skills/<qısa-ad>/SKILL.md` yarat. Ad: kiçik hərflərlə, defislə (məs. `docker-deploy`, `npm-publish`).
2. Frontmatter yaz — bu format ŞƏRTDİR, server bunu avtomatik oxuyur, səhv formatda skil sistem tərəfindən görünməyəcək:
```
---
name: <ad>
description: <NƏ VAXT bu skili işlətmək lazımdır — açar sözlər/trigger-lər daxil olsun, konkret ol>
---
```
3. Body-də QISA, konkret addımlar yaz — Termux MCP alətlərinə (`bash`/`view`/`create_file`/`str_replace`/`process`) birbaşa istinad et, ümumi/mücərrəd məsləhət yox.
4. **`description` ən vacib hissədir** — gələcək söhbətdə bu skil YALNIZ description-a əsasən tapılacaq (tam məzmun oxunmadan). Açar sözləri dəqiq, konkret yaz, əks halda skil "görünməz" qalar.
5. Yaratdıqdan sonra istifadəçiyə bildir: "yeni skil yaratdım: `skills/<ad>/SKILL.md`" — sükutla etmə.

## Format qaydası
Frontmatter tam bu şəkildə olmalıdır (server sadə sətir-parse edir, mürəkkəb YAML dəstəklənmir):
- Birinci sətir: `---`
- Sonra `name: ...` və `description: ...` sətirləri (hər biri ayrı sətirdə, `açar: dəyər` formatında)
- Sonra `---`
- Sonra sərbəst Markdown body

## Böyük skillərin modul bölünməsi

`SKILL.md`-in body-si ~150-200 sətri keçəndə (mövzu geniştir, çoxlu alt-hissə var), TƏK nəhəng fayl saxlama — bölmə. Bu, `lib/skills.js`-in HƏR "initialize"-də bütün skillərin tam mətnini yükləməsinin qarşısını alır (o, yalnız frontmatter-i oxuyur) VƏ AI-ın diqqətini dağıtmır.

**Qayda:**
- `SKILL.md` özü QISA "router" olaraq qalır — mövzunun icmalı + hansı alt-fayl nə vaxt lazımdırın cədvəli.
- Detallar eyni qovluqdakı ayrı fayllara köçür: `skills/<ad>/REFERENCE.md` (ümumi ətraflı material üçün), ya da mövzuya görə bir neçə fayl (məs. `skills/minecraft/bot_builder.md`, `skills/minecraft/pvp_combat.md`).
- `SKILL.md` bu faylları ADI ilə istinad edir (məs. "Bot qurmaqla bağlı təfərrüat üçün bax: `bot_builder.md`") — AI YALNIZ lazım olan alt-faylı `view` edir, qalanlarını yox.
- Bu alt-fayllarda frontmatter OLMUR (yalnız `SKILL.md`-in özündə olur) — onlar sistem tərəfindən skanlanmır, sadəcə `SKILL.md`-in özü onlara işarə edir.

**Nümunə struktur:**
```
skills/minecraft/
  SKILL.md          ← frontmatter var, qısa router (~30-50 sətir)
  bot_builder.md     ← frontmatter YOX, detallı təlimat
  pvp_combat.md       ← frontmatter YOX, detallı təlimat
```

Xam/idxal edilən fayl üçün eyni qayda tətbiq olunur — bax `manage-skills` skili.
