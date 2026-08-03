---
name: debug
description: Xəta mesajı, stack trace, "əvvəl işləyirdi indi işləmir", "deploy-dan/dəyişiklikdən sonra sındı" kimi hallarda strukturlaşdırılmış debug sessiyası üçün istifadə et. Səbəb aydın olmayan istənilən qəribə davranışda da tətbiq et.
---

# Debug (strukturlaşdırılmış)

4 addımlı yanaşma. Heç bir addımı ötürmə — xüsusilə 2-ci addımı (İZOLYASİYA) tələsik keçmə, əksər səhv diaqnozlar elə bu addımın tələsik keçilməsindən yaranır.

## 1. REPRODUCE (təkrarla)
- Gözlənilən vs faktiki davranış nədir? Konkret fərqi müəyyən et.
- Dəqiq təkrarlama addımları hansıdır? — `bash` ilə özün təkrarlamağa çalış, təxmin etmə.
- Nə vaxt başladı? (son commit, son dəyişiklik, son `pkg install`/`npm install`?)

## 2. ISOLATE (təcrid et)
- `bash`: `git log --oneline -20`, `git diff HEAD~5 -- <fayl>` — son dəyişikliklər nədir?
- `view`: əlaqəli faylları oxu. Runtime problemidirsə, `process wait`/logları da yoxla.
- Komponenti/faylı/funksiyanı daraltmağa çalış — bütün kod bazasında yox, konkret yerdə şübhələn.

## 3. DIAGNOSE (diaqnoz qoy)
- Hipotez qur, `bash` ilə kiçik test/əmrlə yoxla (əziyyətli tam-sınaq əvəzinə minimal təkrarlayıcı nümunə).
- SİMPTOMU yox, KÖK səbəbi tap — "nə vaxt sındı" ilə kifayətlənmə, "NİYƏ sındı" sualına cavab tap.

## 4. FIX (düzəlt)
- `str_replace` (kiçik, dəqiq dəyişiklik) və ya `create_file overwrite:true` (böyük yenidənqurma) ilə tətbiq et.
- Yan-təsirləri düşün: bu dəyişiklik başqa bir yeri poza bilərmi?
- Mümkünsə, eyni bugun təkrarlanmaması üçün kiçik yoxlama/qorumaq əlavə et (məs. guard, edge-case check).

## Nəticəni belə təqdim et

```
## Debug Hesabatı: [Qısa başlıq]
### Kök səbəb: [nə, niyə]
### Düzəliş: [nə dəyişdi, hansı fayl(lar)]
### Qorunma: [gələcəkdə bunun təkrarlanmaması üçün nə edildi]
```

## Əgər dəyərli/təkrarlana bilən bir dərs çıxarsan
Bu, `memory/` üçün yaxşı namizəddir (məs. "PID reuse bug-ı belə tapdıq və həll etdik") — uyğun mövzu faylına əlavə et.
