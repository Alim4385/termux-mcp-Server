---
name: process-management
description: Uzun müddət işləyəcək əmrlər (dev server, npm run dev, build, watch mode, npm install) başladanda istifadə et. Trigger sözlər: "serveri başlat", "dev server", "arxa fonda işlət", "build et", "npm install", "uzun sürəcək əmr", "watch mode".
---

# process aləti — düzgün istifadə

## Əsas qayda
Uzun (saniyələrdən çox) sürə biləcək HƏR əmr üçün `bash` yox, `process` (start+wait) işlət. `bash`-ın timeout-u var (default 60san, maks 90san) — dev server kimi bitməyən proseslər `bash`-da əbədi asılı qalır/timeout ilə kəsilir.

## Doğru pattern: start → wait → istifadə → kill

1. `process action:"start" cmd:"npm run dev"` → `{pid, log}` qaytarır.
2. `process action:"wait" log:"<log>" pattern:"ready"` (və ya "Local:", port nömrəsi, server-ə məxsus hazır-siqnalı) — TƏXMİNİ gözləmə YERİNƏ, əsl siqnalı gözlə.
3. İş bitəndə → `process action:"kill" pid:<pid>` — unutma, əks halda arxa fonda işləməyə davam edir (batareya/yaddaş sərf edir, telefon istiləşə bilər).

## Səhv patternlər — ETMƏ

- ❌ `bash cmd:"npm run dev &"` — `&` ilə əl ilə arxa fona keçirmə. `process` bunu onsuz da düzgün edir (`detached`), `bash`-da etsən proses "yetim" qala bilər, izlənmir.
- ❌ `wait` əvəzinə təxmini gözləmə (məs. bir neçə saniyə boş `bash sleep`) sonra yoxlamaq — server 2san-də də, 20san-də də başlaya bilər, `pattern` ilə DƏQİQ siqnalı gözlə, təxmin etmə.
- ❌ İş bitdikdən sonra `kill` etməyi unutmaq.
- ❌ `wait`-i uzun timeout-la (55san maks) çağırıb nəticəni yoxlamadan davam etmək — `found:false` qayıdarsa, server başlamayıb deməkdir, log-a (`content` sahəsinə) bax, səbəbi anla.

## Vəziyyəti unutmusan?

`process action:"list"` — bu server başlatdığı, HƏLƏ CANLI prosesləri göstərir. Server restart olsa belə (PID-reuse-a qarşı starttime-imza ilə qorunaraq) düzgün nəticə verir.

## kill-in məhdudiyyəti

`process action:"kill"` YALNIZ bu alətin özü başlatdığı PID-lərə işləyir (bilərəkdən — sistemdəki başqa proseslərə zərər verməmək üçün). Başqa/naməlum PID üçün `bash cmd:"kill -9 <pid>"` istifadə et, amma bunu YALNIZ istifadəçinin konkret istəyi ilə et.
