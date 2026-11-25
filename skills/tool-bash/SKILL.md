---
name: tool-bash
description: bash alətini işlətdikdə istifadə et — shell əmri icra, paket/git/sistem əmrləri, grep/find ilə axtarış. Trigger: "əmr icra et", "bash", "terminal", "grep", "git", "skript işlədir", "command not found" diaqnozu. Uzun/bitməyən əmrlər üçün tool-process, sadə fayl oxu/yaz/dəyiş üçün tool-view/tool-create-file/tool-str-replace üstün tut.
---

# tool: bash

**Nədir:** Termux-da shell əmrini cari `cwd`-də icra edir; `cd`, `&&`, `;`, pipe işləyir. Adi rejimdə sandbox-da işləyir; cwd sandbox-dan çölə çıxdıqda geri sıxılır.

**Giriş:**
- `cmd` (string, tələb) — bash əmri.
- `stdin` (string) — interaktiv input; boş olsa da stdin EOF alır (asılı qalmır).
- `timeout` (ms, default 60000, maks 90000) — aşanda `[TIMEOUT]`, proses kəsilir.
- `env` (object) — mövcud env-ə əlavə; dəyərlər stringləşdirilir.
- `unsafe` (bool) — `true` olsa sandbox təhlükəsizlik yoxlamasını bypass edir; yalnız istifadəçi açıq istəyəndə və lazım olduqda.

**Çıxış:** `[exit KOD] [MSms] [cwd: ...]` + stdout + `STDERR:`. Çıxış çox uzunsa kəsilir (`...[N kəsildi]...`).

**Davranış/gotcha:**
- Əmrlər **serial** icra olunur (mutex) — paralel bash çağırışı cwd-ni pozmur.
- `cwd` marker ilə izlənir; `cd` sonrası növbəti çağırış yeni cwd-dədir. Yol yoxdursa cwd dəyişmir.
- Uzun/bitməyən iş (`npm run dev`, watch, böyük build/install) → `process` aləti. `bash` timeout verir.
- Sadə fayl işi üçün bash əvəzinə: oxu=`view`, yeni fayl=`create_file`, kiçik düzəliş=`str_replace` (daha etibarlı, strukturlaşdırılmış).
- Kod axtarışı: `grep -rn "pattern" .` sonra `view view_range` ilə daralt.
- Böyük çıxış gözlənirsə çıxışı fayla yönləndir, sonra `view tail/head`.

**Təhlükəsizlik:** guard qaydalarına əməl et; dağıdıcı/sistem dəyişən əmrdən əvvəl təsdiq al. Untrusted mətni cmd-ə birbaşa yapışdırma — injection riski.
