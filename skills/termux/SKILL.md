---
name: termux
description: Termux/Android mühiti və termux-api üçün istifadə et. Trigger: "pkg install", "npm/pip install", "command not found", "permission denied", "storage/sdcard", "bildiriş/toast/vibrasiya/clipboard/batareya", "termux-api", "telefonla əlaqə".
---

# termux

**Mühit:** Android-da qeyri-standart Linux; `systemd` yoxdur, bəzi komanda/bayraqlar fərqlidir.

**Paketlər:**
- Sistem: `pkg install <ad>` (`pkg search <söz>` ilə tap). `command not found` → paketi de, **istifadəçidən təsdiq al, özün quraşdırma**.
- Node native build: çox vaxt `pkg install build-essential python clang` lazım ola bilər.
- Python: `pip install ...`; bəzən `--break-system-packages` gərəkir.

**Yollar/icazə:**
- HOME: `/data/data/com.termux/files/home`, workspace burada.
- `/sdcard`/shared storage üçün əvvəlcədən `termux-setup-storage` (istifadəçi özü işlətməlidir). Uğurdan sonra `~/storage/shared`.

**Resurs:** telefon RAM/CPU məhduddur; uzun iş → `process`, foreground-da saxla.

## termux-api (`bash` ilə)
Əvvəl `which termux-toast`; yoxdursa `pkg install termux-api` + Termux:API app lazım olduğunu de.

| Məqsəd | Əmr |
|---|---|
| Bildiriş | `termux-notification --title "..." --content "..." [--id X]` |
| Toast | `termux-toast "..."` (`-s` uzun) |
| Vibrasiya | `termux-vibrate -d 300` |
| Clipboard yaz/oxu | `termux-clipboard-set` / `termux-clipboard-get` |
| Batareya | `termux-battery-status` |

**Həssas (kamera/mikrofon/lokasiya/kontakt/SMS):** yalnız istifadəçinin açıq, konkret, hərdəfəlik razılığı ilə. Əmrləri ayrı-ayrı işlədir, exit kodunu yoxla.
