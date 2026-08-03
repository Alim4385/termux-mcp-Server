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
