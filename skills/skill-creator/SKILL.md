---
name: skill-creator
description: Söhbət ərzində təkrarlana bilən, faydalı bir iş axını/prosedur kəşf edəndə (istifadəçi "bunu hər dəfə belə et" desə, ya da özün gələcək söhbətlər üçün faydalı olacağını düşünsən) yeni skil yaratmaq üçün istifadə et.
---

# Yeni skil necə yaradılır

Yeni SKILL.md yaratmazdan ƏVVƏL yoxla: bu, TƏKRARLANA BİLƏN bir prosedurdurmu (bir dəfəlik həll deyil)? Tək dəfəlik tapşırıqda skil YARATMA — sadəcə tapşırığı yerinə yetir. Faktları/tarixçəni isə `memory/`-ə yaz, skilə yox (fərq: memory = "nə oldu", skill = "necə etməli").

Bu server rəsmi **Agent Skills açıq standartına** (agentskills.io/specification) uyğun işləyir — eyni format Claude Code, VS Code, Cursor kimi digər alətlərdə də işləyir, ona görə aşağıdakı qaydalara DƏQİQ əməl et.

## Addımlar

1. `create_file` ilə `skills/<ad>/SKILL.md` yarat.
2. Frontmatter yaz — bu format ŞƏRTDİR, server bunu avtomatik oxuyur (həm də DƏQIQLIYINI yoxlayır — bax aşağı), səhv formatda skil "MÖVCUD SKİLLƏR" siyahısında YOX, "İDXAL/DÜZƏLİŞ GÖZLƏYƏN" siyahısında görünəcək:
```
---
name: <ad>
description: <NƏ VAXT bu skili işlətmək lazımdır — açar sözlər/trigger-lər daxil olsun, konkret ol>
---
```
   **`name` qaydaları (spesifikasiya bunları MƏCBURİ edir, server bunları yoxlayır):**
   - Yalnız kiçik hərf (a-z), rəqəm (0-9) və defis (-).
   - Defislə BAŞLAYA/BİTƏ bilməz, ARDICIL defis (`--`) ola bilməz.
   - Maks 64 simvol.
   - **Qovluq adı ilə HƏRFİ-HƏRFİNƏ EYNİ olmalıdır** (`skills/docker-deploy/SKILL.md` içində `name: docker-deploy`, başqa cür yox).
   - Düzgün: `docker-deploy`, `npm-publish`, `sql-migration`. Səhv: `Docker-Deploy` (böyük hərf), `-docker` (öndə defis), `docker--deploy` (ardıcıl defis).
3. Body-də QISA, konkret addımlar yaz — Termux MCP alətlərinə (`bash`/`view`/`create_file`/`str_replace`/`process`) birbaşa istinad et, ümumi/mücərrəd məsləhət yox.
4. **`description` ən vacib hissədir** — gələcək söhbətdə bu skil YALNIZ description-a əsasən tapılacaq (tam məzmun oxunmadan). Açar sözləri dəqiq, konkret yaz, əks halda skil "görünməz" qalar. 1024 simvoldan uzun olmasın.
5. Yaratdıqdan sonra istifadəçiyə bildir: "yeni skil yaratdım: `skills/<ad>/SKILL.md`" — sükutla etmə.

## Format qaydası
Frontmatter tam bu şəkildə olmalıdır (server sadə sətir-parse edir, mürəkkəb/iç-içə YAML dəstəklənmir — `license`/`compatibility`/`metadata`/`allowed-tools` kimi əlavə spesifikasiya sahələrinə bu layihədə EHTİYAC YOXDUR, yazsan da server onları oxumur):
- Birinci sətir: `---`
- Sonra `name: ...` və `description: ...` sətirləri (hər biri ayrı sətirdə, `açar: dəyər` formatında)
- Sonra `---`
- Sonra sərbəst Markdown body

## Böyük skillərin modul bölünməsi (rəsmi "progressive disclosure" konvensiyası)

Spesifikasiya `SKILL.md`-i 500 sətirdən (~5000 token) kiçik saxlamağı tövsiyə edir — bundan böyükdürsə, TƏK nəhəng fayl saxlama, bölmə. Bu, `lib/skills.js`-in HƏR "initialize"-də bütün skillərin tam mətnini yükləməsinin qarşısını alır (o, yalnız frontmatter-i oxuyur) VƏ AI-ın diqqətini dağıtmır. Bu bölmə 3 mərhələdir (spesifikasiyanın öz termini — "progressive disclosure"):

1. **Metadata** (~100 token) — HƏR skil üçün `name`+`description`, hər zaman yüklənir (manifestdə).
2. **Təlimat** (<5000 token) — `SKILL.md`-in tam body-si, YALNIZ skil aktivləşəndə (`view` ediləndə) yüklənir.
3. **Resurslar** (lazım olduqca) — aşağıdakı alt-qovluqlar, YALNIZ konkret ehtiyac olanda açılır.

**Rəsmi qovluq konvensiyası (`skills/<ad>/` daxilində):**
- `scripts/` — icra oluna bilən kod (bu layihədə, "sıfır asılılıq" fəlsəfəsinə görə, adətən İSTİFADƏ OLUNMUR — kod lazımdırsa `bash` aləti kifayətdir, ayrıca script faylı YARATMA, məcburi deyilsə).
- `references/` — ətraflı sənədləşmə: `references/REFERENCE.md` (ümumi ətraflı material), ya da mövzuya görə bir neçə fayl (məs. `references/bot_builder.md`, `references/pvp_combat.md`).
- `assets/` — statik resurslar (şablon, sxem və s.) — bu layihədə nadir hallarda lazım olar.

`SKILL.md` bu faylları NİSBİ YOL ilə istinad edir (məs. `references/REFERENCE.md`-ə bax) — AI YALNIZ lazım olan faylı `view` edir, qalanlarını yox. İstinadları BİR SƏVİYYƏ dərinliklə saxla (`references/`-dən özünə başqa alt-qovluq açma).

Bu alt-fayllarda frontmatter OLMUR (yalnız `SKILL.md`-in özündə olur) — onlar sistem tərəfindən skanlanmır, sadəcə `SKILL.md`-in özü onlara işarə edir.

**Nümunə struktur:**
```
skills/minecraft/
  SKILL.md                    ← frontmatter var, qısa router (~30-50 sətir)
  references/
    bot_builder.md            ← frontmatter YOX, detallı təlimat
    pvp_combat.md              ← frontmatter YOX, detallı təlimat
```

Xam/idxal edilən fayl üçün eyni qayda tətbiq olunur — bax `manage-skills` skili.
