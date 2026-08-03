---
name: smart-reading
description: Böyük fayl, uzun log, ya da böyük/naməlum ölçülü qovluq oxumazdan/araşdırmazdan ƏVVƏL istifadə et. Trigger: "bu faylı oxu" (ölçüsü məlum deyilsə), "bu qovluğa bax", "log-u yoxla", "kod bazasında X-i tap", ya da hər hansı fayl/qovluğun böyük ola biləcəyi istənilən hal.
---

# Ağıllı oxuma strategiyası

**Prinsip:** heç vaxt kor-koranə "faylın hamısını oxu" demə — `view` alətinin özündə bunun üçün alətlər var, onları işlət. Səbəb: `view` 15K simvoldan sonra kəsir (`cut()`), 8MB-dan böyük faylı ümumiyyətlə açmır — kor-koranə cəhd həm uğursuz olur, həm də token israf edir.

## Fayl oxumazdan əvvəl

1. **Əvvəlcə ölçüyə bax** (əspəsən naməlum fayl/log üçün):
   ```
   bash: wc -l <fayl>          # sətir sayı
   bash: ls -la <fayl>         # ölçü
   ```
2. **Kiçikdirsə (bir neçə yüz sətir)** — `view` ilə birbaşa tam oxu, əlavə addıma ehtiyac yoxdur.
3. **Böyükdürsə (min+ sətir, log fayl, böyük kod faylı):**
   - Konkret bir şey axtarırsansa → əvvəlcə `bash: grep -n "pattern" fayl` ilə sətir nömrəsini tap, sonra `view` ilə `view_range: [sətir-10, sətir+10]` kimi yalnız ətrafı oxu.
   - Faylın son hissəsi (log, xəta) lazımdırsa → `view` ilə `mode: "tail", lines: 50` (bütün faylı yox).
   - Faylın başlanğıcı (struktur, importlar) lazımdırsa → `mode: "head"`.
   - Ümumi mənzərə lazımdırsa (bir neçə hissə) → bir neçə `view_range` çağırışı, tək nəhəng oxuma əvəzinə.

## Qovluq araşdırmazdan əvvəl

- Adi hallarda `recursive:false` (default) kifayətdir — yalnız birbaşa məzmunu göstərir.
- Struktur lazımdırsa `recursive:true` işlət, amma `depth`-i məhdudlaşdır (default 3) — böyük repo-larda limitsiz dərinlik çıxışı şişirdər.
- Konkret fayl axtarırsansa, `view recursive` əvəzinə `bash: find . -name "*.js"` və ya `grep -rln "pattern" .` daha sürətli və dəqiqdir.

## Kod bazasında axtarış

- `bash: grep -rn "pattern" .` — mövzu üzrə axtarış, nəticədə fayl+sətir nömrəsi gəlir, sonra yalnız o sətrin ətrafını `view_range` ilə oxu.
- Heç vaxt "tap və hamısını oxu" etmə — əvvəlcə `grep` ilə DARALT, sonra YALNIZ uyğun yerləri `view` et.

## Log/process nəticələri

- `process wait` alətinin özü artıq son 64KB-ı oxuyur (`readTail`) — ayrıca `view` ilə bütün log faylını açmağa CƏHD ETMƏ, nəticə onsuz da `process wait`/`list`-dən gəlir.

## Mövcud məlumatı köçürərkən/çevirərkən — özündən keçirmə

Cihazda ARTIQ mövcud olan böyük məlumatı (uzun əmr çıxışı, log fayl, mövcud fayl məzmunu) bir yerdən başqa yerə köçürəndə/çevirəndə, bunu TƏK bir `bash` əmri ilə, yönləndirmə/pipe istifadə edərək et:
```
bash: cat a.log > b.txt
bash: grep xəta log.txt > xetalar.txt
bash: cp a.js b.js
```
Bunun ƏVƏZİNƏ faylı `view` ilə tam oxuyub, sonra `create_file`/`str_replace` ilə YENİDƏN YAZMA — bu, yavaşdır və qat-qat çox token yeyir (məzmun sənin öz cavabından keçir). Qoy shell məlumatı daşısın, sən özün daşımayasan.
