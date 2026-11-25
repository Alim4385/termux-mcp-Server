---
name: tool-create-file
description: create_file alətini işlətdikdə istifadə et — yeni fayl yaratmaq, faylı tam yenidən yazmaq, fayl mövcudluğunu yoxlamaq. Trigger: "fayl yarat", "yeni fayl yaz", "overwrite", "check_only", "mövcuddurmu yoxla".
---

# tool: create_file

**Nədir:** Fayl yaradır/yazır. Nisbi yol `cwd`-yə görə; mütləq yol sistem boyu. Qovluqlar avtomatik yaradılır (`mkdir -p`).

**Giriş:**
- `path` (tələb).
- `content` (string) — `check_only:true` olduqda lazım deyil.
- `overwrite` (bool, default false) — `true` olsa mövcud faylın üstünə yazır və köhnəni `<fayl>.bak` saxlayır (best-effort).
- `check_only` (bool) — heç nə yazmır, `{exists,size,isDirectory}` qaytarır.

**Davranış/gotcha:**
- Fayl artıq varsa və `overwrite:false` → xəta; kiçik dəyişiklik üçün `str_replace`, tam yenidən yazma üçün `overwrite:true`.
- `check_only` fayl sisteminə yazmır — təhlükəsiz yoxlama.
- Backup `.bak` eyni qovluqdadır; uğursuz backup yazılışı bloklamır.
- Böyük mövcud faylı köçürmək üçün `view`+`create_file` əvəzinə `bash cp/cat` üstün tut (token qənaəti).

**Təhlükəsizlik:** geri dönməz yazma/üstünə yazmadan əvvəl niyyət aydın olsun; kritik fayllarda istifadəçi təsdiqi.
