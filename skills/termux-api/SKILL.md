---
name: termux-api
description: Telefonla qarşılıqlı əlaqə lazım olanda istifadə et — bildiriş göndərmək, ekranda mesaj göstərmək, vibrasiya, panoya (clipboard) yazmaq/oxumaq, batareya statusu və s. Trigger sözlər: "bildiriş göndər", "toast göstər", "vibrasiya et", "clipboard-a yaz/köçür", "uzun proses bitəndə xəbər ver", "termux-api", "termux notification", "telefonu vibrasiya etdir".
---

# Termux:API istifadə qaydaları

Bu serverdə termux-api üçün AYRICA alət YOXDUR (bilərəkdən — bax `bash` aləti kifayət edir, əlavə alət minimal-alət fəlsəfəsinə ziddir). Bütün əməliyyatlar `bash` aləti ilə termux-api komanda-sətri proqramlarını birbaşa çağıraraq edilir.

Əvvəlcə paketin qurulu olub-olmadığını yoxlamaq faydalıdır: `which termux-toast`. Yoxdursa, istifadəçiyə "pkg install termux-api" + Termux:API tətbiqinin (Play Store/F-Droid) qurulmasının lazım olduğunu bildir — özün paket QURMA, bu istifadəçinin qərarıdır.

## Əsas əmrlər

| Məqsəd | Əmr | Qeyd |
|---|---|---|
| Bildiriş göndər | `termux-notification --title "Başlıq" --content "Mətn"` | Uzun proses (build, npm install, `process start`) bitəndə istifadəçini xəbərdar etmək üçün əla. Eyni `--id` ilə göndərsən əvvəlkini əvəz edir (spam yaratmır). |
| Ekranda qısa mesaj | `termux-toast "mətn"` | `-s` bayrağı ilə daha uzun görünür |
| Vibrasiya | `termux-vibrate -d 300` | `-d` millisaniyədir, 300-500 arası adətən kifayətdir |
| Panoya yaz | `echo "mətn" \| termux-clipboard-set` | stdin-dən oxuyur, `bash`-ın `stdin` parametri ilə də ötürülə bilər |
| Panodan oxu | `termux-clipboard-get` | |
| Batareya statusu | `termux-battery-status` | JSON qaytarır |

## ⚠️ Sensitiv icazə tələb edən əmrlər — DİQQƏTLİ OL

`termux-camera-photo`, `termux-microphone-record`, `termux-location`, `termux-contact-list`, `termux-sms-send` kimi əmrlər HƏSSAS icazələr tələb edir (kamera, mikrofon, yerləşmə, kontaktlar, SMS).

**Bunları istifadəçinin AÇIQ VƏ KONKRET istəyi olmadan işlətmə.** "AI özü nəsə etsin" tipli ümumi tapşırıqda bu əmrlərə əl vurma — yalnız istifadəçi birbaşa "şəkil çək", "yerimi tap" kimi konkret tələb edəndə.

## Prinsiplər

- Hər termux-api əmrini AYRICA `bash` çağırışında işlət (zəncirləmə `&&` ilə birləşdirmə) — xəta olsa hansı addımda olduğu aydın olsun.
- Əmr "command not found" versə — paket qurulu deyil, bunu istifadəçiyə bildir, sınama davam etmə.
- Nəticəni yoxlamaq üçün exit kodu (`[exit 0]`/`[exit N]`) kifayətdir, əlavə doğrulama tələb etmə.
