---
name: manage-skills
description: skills/ qovluğuna birbaşa atılmış xam (frontmatter-siz və ya səhv formatlı) .md faylını düzgün skil formatına salmaq üçün istifadə et. Trigger sözlər: "bu faylı skil et", "bunu skills-ə əlavə et", "GitHub-dan endirdiyim skili qoş", "Download-dakı .md-i sistemə at", "yeni skil idxal et", "skills qovluğunu təmizlə". Həmçinin "initialize" manifestində "İDXAL GÖZLƏYƏN FAYLLAR" bölməsi göründükdə bu skilə yönləndirilir.
---

# Skil idxalı və idarəetməsi

Bu skil YENİ ALƏT tələb ETMİR — mövcud `view`/`create_file`/`str_replace`/`bash` alətləri ilə idarə olunur. Məqsəd: istifadəçi haradansa (adətən GitHub-dan) endirdiyi xam `.md` faylını `skills/` qovluğuna atanda, onu əl ilə frontmatter yazmadan avtomatik düzgün skil formatına salmaq.

## Nə vaxt işə düşür

- `initialize` manifestində "İDXAL/DÜZƏLİŞ GÖZLƏYƏN FAYLLAR" bölməsi görünəndə (bu, `lib/skills.js`-in avtomatik aşkarlamasıdır — hər sətirdə KONKRET səbəb yazılır: frontmatter yoxdur, `name` formatı yanlışdır, `name` qovluq adı ilə üst-üstə düşmür, `description` boş/uzundur, ya da `skills/` kökündə tək duran `.md` fayldır).
- İstifadəçi açıq şəkildə bir fayl göstərib "bunu skil et" desə.

**Diqqət:** manifestdə namizəd görünsə də, istifadəçi konkret istəməyibsə özün təşəbbüs göstərib idxal etmə — sadəcə mövcudluğunu bil, soruşulanda hərəkətə keç.

## Addımlar

### 1. Faylı oxu, tam anla
`view` ilə faylın tam məzmununu oxu. Mövzunu, məqsədi, hansı kontekstdə faydalı olduğunu çıxar. Manifestdə səbəb artıq qeyd olunub — əgər sadəcə "name qovluq adı ilə üst-üstə düşmür" kimi kiçik bir problemdirsə, bütün 2a addımını təkrar etməyə ehtiyac yoxdur, sadəcə həmin sahəni düzəlt.

### 2. Frontmatter vəziyyətini yoxla
- Fayl artıq `---\nname: ...\ndescription: ...\n---` ilə başlayır, `name` aşağıdakı QAYDALARA tam uyğundur, VƏ `description` "NƏ VAXT bu işlədilməlidir" məntiqini konkret (açar sözlərlə) izah edir → format düzgündür, yalnız 3-cü addıma keç.
- Əks halda (frontmatter yoxdur/natamamdır, `name` qaydaları pozur, `description` mövzu izahıdır trigger deyil) → 2a-ya keç.

### 2a. Frontmatter-i özün yarat/düzəlt (avtomatik taqlama)
Bunun üçün əlavə API çağırışı YOXDUR — məzmunu artıq oxumusan, elə bu söhbətdə özün yaz. Bu, rəsmi "Agent Skills" açıq standartına (agentskills.io/specification) uyğundur, server bunu SƏRT yoxlayır:

- **name qaydaları (MƏCBURİ, server rədd edir əks halda):**
  - Yalnız kiçik hərf (a-z), rəqəm (0-9), defis (-).
  - Defislə başlaya/bitə bilməz, ardıcıl defis (`--`) ola bilməz.
  - Maks 64 simvol.
  - **Skilin qoyulacağı qovluğun adı ilə HƏRFİ-HƏRFİNƏ EYNİ olmalıdır** (`skills/docker-deploy/SKILL.md` → `name: docker-deploy`).
  - Məzmunun mövzusunu 1-3 sözlə əks etdirməlidir (məs. `docker-deploy`, `figma-export`, `sql-migration`).
- **description**: DİGƏR mövcud skillərin formatına dəqiq uyğun yaz, maks 1024 simvol — "Nə vaxt istifadə et" + konkret trigger sözlər/ifadələr. Mövzu izahı YAZMA ("bu skil X haqqındadır" YOX), NƏ VAXT tetiklənməli onu yaz ("X ediləndə/soruşulanda istifadə et, trigger sözlər: ...").
  - Nümunə (səhv): `description: Docker haqqında məlumat.`
  - Nümunə (düzgün): `description: Docker konteynerini build/deploy edərkən istifadə et. Trigger sözlər: "docker build", "container-ə çıxar", "image push et".`

### 3. Həcmi qiymətləndir — modul bölünməsi lazımdırmı?
- Body (frontmatter-dən sonrakı hissə) ~500 sətirdən (spesifikasiyanın tövsiyəsi) kiçikdirsə → olduğu kimi tək `SKILL.md` kimi saxla.
- Böyükdürsə → `skill-creator` skilindəki "Böyük skillərin modul bölünməsi" bölməsinə bax və rəsmi konvensiyanı tətbiq et: qısa router `SKILL.md` + detallar `skills/<ad>/references/` alt-qovluğuna (məs. `references/REFERENCE.md`, ya da mövzuya görə bir neçə fayl).

### 4. Yaz
`create_file` ilə `skills/<name>/SKILL.md` (lazım olsa `references/` alt-qovluğundakı fayllar da) yarat. Qovluq adı ilə frontmatter-dəki `name` **DƏQIQ EYNİ** olmalıdır — server bunu indi sərt yoxlayır, uyğunsuzluq skili "İDXAL GÖZLƏYƏN" siyahısında saxlayır (yəni tapılmır).

### 5. Orijinal faylla bağlı soruş
Mənbə fayl (məs. `skills/random-download.md` və ya Download qovluğundakı orijinal) silinsinmi? **Təsdiqsiz silmə ETMƏ** — bu, geri dönməz əməliyyatdır, GUARD qaydasına tabedir. İstifadəçi "hə, sil" desə, `bash: rm <yol>` işlət.

### 6. Bildir
Sükutla etmə: "✅ yeni skil idxal edildi: `skills/<name>/SKILL.md`" (bölünübsə, neçə fayla bölündüyünü də de).

## Əlaqəli skillər
- **skill-creator** — bu, SIFIRDAN (söhbətdə kəşf olunan prosedurdan) yeni skil yaratmaq üçündür. `manage-skills` isə ARTIQ MÖVCUD OLAN xam faylı idxal etmək üçündür. Modul bölünməsi qaydası hər ikisi üçün ORTAQdır, `skill-creator`-da təsvir olunub, təkrarlanmır.
