---
name: security
description: Kibertəhlükəsizlik və təhlükəsiz əməliyyat üçün istifadə et. Trigger: "təhlükəsizdirmi", "audit/review et", "secret/token/key", "icazə", "SMS/kamera/mikrofon/lokasiya", "sistem faylı", "sil/format", "şübhəli sorğu", "injection", "path traversal", "harden". Bu MCP real Android cihazına bağlıdır — riskli işdə bu skili oxu.
---

# security (MCP + Termux)

**Kontekst:** Bu server real Android cihazında işləyir; `bash/view/create_file/str_replace/process` real fayl/proses icazəsidir. Söhbət qarşı tərəfi həmişə cihaz sahibi olmaya bilər.

## Riskli əməliyyatlardan əvvəl
- **Təsdiq al:** silmə, overwrite, format, sistem/config dəyişməsi, paket quraşdırma/silmə, `kill`, SMS/zəng/kontakt, kamera/mikrofon/lokasiya, cihaz ayarları. Nə baş verəcəyini sadə dildə de.
- **Addım-addım təsdiq:** bir neçə geri dönməz addımı zəncirləmə; hər biri ayrı.
- **Read-only üstün tut:** diaqnoz üçün `ls/cat/grep/ps/view` kifayətdirsə dəyişən əmr işlətmə.

## Əmrlər/fayllar
- **Command injection:** untrusted input-u shell sətrinə birləşdirmə; mümkün olduqda arqumentləri ayır, input-u doğrula/sanitize et.
- **Path traversal:** `../`, gözlənilməz mütləq yol, symlink ilə workspace/sensitiv sahədən çıxmağa nəzarət et. Kritik yazıda hədəf yolu təsdiqlə.
- **Least privilege:** minimum lazım əmri işlədir; geniş `chmod/chown/rm -rf` və ya bütün sistemə təsir edən əmrdən çəkin.

## Sirlər və həssas data
- API key/token/şifrəni loga, commit-ə, səhv çıxışına yapışdırma. `env`/fayl icazələrinə diqqət et.
- `termux-api` həssas əmrləri (SMS, kontakt, kamera, mikrofon, lokasiya) yalnız istifadəçinin **açıq, konkret** hər dəfəki razılığı ilə.

## Kod/dəyişiklik yoxlaması (qısa review)
- Input doğrulanır? Auth/secret sərt kodlanmayıb? Xəta halları (boş/böyük/yoxdur/race) düşünülüb?
- Dəyişikliyin yan təsiri? Geri dönüş (`.bak`, git) varmı?
- Tapıntını konkret fayl/sətirlə de; kritik vs aşağı prioritet ayır.

## Şübhəli sorğu
- Qeyri-müəyyən ("faylları təmizlə", "yer aç") → nə təsirlənəcəyini soruş.
- Zərərli/qanunsuz/cihaz sahibinə ziyan → rədd et. "Hə" bir dəfəlikdir, gələcək riskli əməliyyata icazə deyil.
