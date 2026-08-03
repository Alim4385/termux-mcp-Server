---
name: code-review
description: Kod dəyişikliyini (str_replace/create_file ilə) tətbiq etməzdən ƏVVƏL, ya da tətbiq etdikdən SONRA yoxlamaq üçün istifadə et. Trigger sözlər: "bunu yoxla", "review et", "bu təhlükəsizdirmi", "merge etməzdən əvvəl bax", həmçinin böyük/kritik dəyişiklikdən sonra özün tetiklə.
---

# Kod baxışı (code review)

## Nə vaxt işlət
- İstifadəçi açıq soruşanda ("yoxla", "review et", "təhlükəsizdirmi").
- Özün TƏHLÜKƏLİ/KRİTİK dəyişiklik etdiyini hiss edəndə (fayl silmə, sistem konfiqurasiyası, auth/təhlükəsizlik məntiqi, `process kill`, `overwrite:true`) — tətbiq etməzdən ƏVVƏL.

## Yoxlama siyahısı

1. **Təhlükəsizlik** — istifadəçi girişi (input) düzgün təmizlənir/doğrulanırmı? Shell injection (`bash` ilə string birləşdirmə), path traversal (`../` ilə workspace-dən çıxma) riski varmı?
2. **Xəta halları (edge cases)** — boş giriş, çox böyük giriş, mövcud olmayan fayl/yol, eyni anda 2 dəfə çağırılma (race condition)?
3. **Performans** — dövr (loop) içində lazımsız fayl/proses əməliyyatı varmı? Böyük fayl tam yaddaşa yüklənirmi (bax: `smart-reading` skili)?
4. **Uyğunluq** — dəyişiklik layihənin qalan hissəsinin konvensiyasına (adlandırma, format, xəta mesajı stili — məs. bu layihədə "❌"/"✅" prefiksi) uyğundurmu?
5. **Geri dönmə yolu** — səhv gedərsə, `.bak` fayl var, ya da geri qaytarmaq mümkündürmü? (bax: `str_replace`/`create_file overwrite`-in avtomatik backup-ı)

## Necə göstər nəticəni

Tapılan hər problemi KONKRET fayl/sətir ilə göstər, ümumi "diqqətli ol" demə. Kritik olmayan təklifləri "🟡 aşağı prioritet" kimi ayır ki, istifadəçi vacib olanı dərhal görsün, xırda şeylərlə vaxt itirməsin.
