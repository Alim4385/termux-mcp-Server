---
name: tool-str-replace
description: str_replace alətini işlətdikdə istifadə et — mövcud faylda dəqiq mətn dəyişmək, çoxlu edit, replace_all. Trigger: "mətn dəyiş", "replace", "edit et", "old_str tapılmadı", "bir neçə yeri dəyiş", "edits". Fayl yoxdursa create_file, tam yenidən yazma üçün create_file overwrite.
---

# tool: str_replace

**Nədir:** Mövcud faylda `old_str` → `new_str` əvəz edir. Nisbi/mütləq yol.

**Giriş:**
- `path` (tələb).
- Tək edit: `old_str` (tələb), `new_str` (default ""), `replace_all` (default false).
- Çoxlu edit: `edits: [{old_str,new_str,replace_all?}, ...]` — verilsə tək sahələrdən üstün tutulur.

**Davranış/gotcha:**
- Default: `old_str` faylda **dəqiq 1 dəfə** olmalıdır. 0 dəfə → oxşar namizəd/sətir təklifi verir; >1 dəfə → xəta, ya unikal kontekst əlavə et, ya `replace_all:true`.
- `edits` **ardıcıl** tətbiq olunur: 2-ci edit 1-cinin nəticəsinə baxır. Eyni mətni iki dəfə hədəfləmə.
- `edits` **all-or-nothing**: hər hansı edit uğursuz olsa fayla heç nə yazılmır.
- Hər uğurlu yazıdan əvvəl `<fayl>.bak` saxlanılır (best-effort).
- `old_str` boş sətir ola bilməz. `new_str` boş buraxılsa silmə kimi işləyir.

**Təhlükəsizlik:** böyük/kritik dəyişiklikdən əvvəl niyyəti yoxla; `.bak` geri dönüş üçündür.
