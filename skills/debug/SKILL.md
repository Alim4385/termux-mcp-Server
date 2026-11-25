---
name: debug
description: Xəta, stack trace, gözlənilməz davranış, "işləmir/sındı" hallarında strukturlaşdırılmış diaqnoz üçün istifadə et. Trigger: "bug", "error", "niyə işləmir", "debug et", "traceback", "regression", "əvvəl işləyirdi".
---

# debug

**1. Reproduce** — gözlənilən vs faktiki nədir? `bash` ilə minimal şəkildə təkrarla; təxmin etmə.
**2. Isolate** — son dəyişiklik: `git log --oneline -10`, `git diff -- <fayl>`. Əlaqəli faylı `view`, runtime logu `process wait`/tail ilə daralt. Komponenti kiçilt.
**3. Diagnose** — hipotez qur, kiçik testlə yoxla. Simptom yox, **kök səbəb** tap.
**4. Fix & verify** — `str_replace`/`create_file overwrite` ilə düzəlt, eyni addımla yenidən sına. Yan təsiri düşün. Təkrarlanmaması üçün guard/check əlavə et.

**Hesabat:** kök səbəb → düzəliş (fayl/sətir) → yoxlama → qorunma. Faydalı dərsdirsə `memory/`-ə yaz.
