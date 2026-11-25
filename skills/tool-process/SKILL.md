---
name: tool-process
description: process alətini işlətdikdə istifadə et — uzun/bitməyən arxa fon prosesi (dev server, build, watch, npm/pip install). Trigger: "serveri başlat", "arxa fonda işlət", "npm install uzun çəkir", "dev server", "build", "watch". bash timeout-dan qaçmaq üçün bunu işlət.
---

# tool: process

**Nədir:** Arxa fon prosesi başladır/izləyir/dayandırır. `bash` uzun işi üçün deyil, bu üçündür.

**Actions:**
- `start` — `cmd` tələb. Cmd-in sonuna `&` **YAZMA** (detached onsuzdur). `env` əlavə edə bilər. `unsafe:true` yalnız açıq lazım olduqda. Qaytarır: `{pid, log, status}`.
- `wait` — `log`, `pattern` tələb. `regex:true` olsa pattern JS regexdir (`flags` məsələn `"i"`). `timeout` default 30000, maks 55000; `interval` default 500, min 200, maks 5000. Log-un son 64KB-ı yoxlanır. Qaytarır: `{found, log, content}`.
- `list` — bu alətlə başlayan canlı proseslər + server stats `{uptime_s,memory_mb,cwd,active_processes}`. Bütün sistem üçün `ps aux`.
- `kill` — `pid` tələb, yalnız bu alətin start etdiyi PID. `signal`: `SIGTERM`(default)/`SIGKILL`. Proses qrupu öldürülür; PID reuse imzası uyğun gəlməsə ləğv edilir.

**Pattern:** `start` → `wait` (real hazır siqnalı: "ready", "Listening", port) → iş gör → `kill`. `sleep` ilə təxmin etmə.

**Gotcha:** server restart olsa da eyni proses canlıdırsa `list`-də görünə bilər. Köhnə `.proc-*.log` təmizlənir; 50MB+ aktiv log kəsilir. `wait` tapmasa belə son content qaytarır — diaqnoz üçün oxu.
