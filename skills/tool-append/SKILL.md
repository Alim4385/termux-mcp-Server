---
name: tool-append
description: append alətini işlətdikdə istifadə et — faylın sonuna mətn əlavə etmək, log/qeyd/artımlı yazı. Trigger: "sonuna əlavə et", "append", "log yaz", "fayla əlavə et", "əlavə sətir yaz".
---

# tool: append

**Nədir:** Faylın sonuna mətn əlavə edir. Fayl yoxdursa yaradır (qovluqları da). **Yazma yalnız sandbox içində icazəlidir.**

**Giriş:**
- `path` (tələb) — fayl yolu.
- `content` (tələb) — sonuna əlavə ediləcək mətn.

**Davranış/gotcha:**
- Fayl yoxdursa yeni yaradılır; varsa sonuna əlavə edir, mövcud məzmunu silmir.
- Mövcud fayl + yeni məzmun `MAX_FILE` (8MB) limitini keçərsə xəta verir.
- Araya/dəqiq yerə dəyişiklik üçün `str_replace`, tam yenidən yazmaq üçün `create_file overwrite:true`.

**Təhlükəsizlik:** yalnız sandbox içində yazır; çöl yolu verilərsə bloklanır.
