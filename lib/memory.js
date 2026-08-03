'use strict';
// Yaddaş sistemi (Faz 1) — YENİ ALƏT YOXDUR. Mövcud view/create_file/str_replace/bash
// alətləri ilə idarə olunur; bu mətn MCP-nin "initialize.instructions" sahəsi vasitəsilə
// hər söhbətin əvvəlində avtomatik AI-ya göstərilir (MCP spesifikasiyasının hazır
// mexanizmidir — ayrıca "bootstrap" aləti icad etməyə ehtiyac yoxdur).
const { MEMORY_DIR, MEMORY_INDEX } = require('./config');

const instructions = `YADDAŞ SİSTEMİ (söhbətlər arası yaddaş üçün):

"${MEMORY_INDEX}" — kiçik indeks fayludur. Hər sətri bir mövzunun 1-cümləlik xülasəsi + uyğun fayl adıdır. Bu söhbətin ƏVVƏLİNDƏ bu faylı "view" ilə oxu (boş/qısadırsa, normaldır, davam et).

Detala ehtiyac olanda: indeksdə uyğun sətri tap, sonra YALNIZ o mövzunun faylını ("${MEMORY_DIR}/<mövzu-slug>.md") "view" ilə oxu — bütün mövzu fayllarını YOX, yalnız lazım olanı.

Söhbət ərzində gələcək üçün faydalı YENİ məlumat öyrənəndə (dizayn qərarı, həll olunmuş bug, istifadəçi tərcihi, layihə vəziyyəti və s.):
1) uyğun "${MEMORY_DIR}/<mövzu-slug>.md" faylına "str_replace" (fayl varsa) və ya "create_file" (yenidirsə) ilə əlavə et;
2) "${MEMORY_INDEX}"-i yenilə — yeni sətir əlavə et, ya da mövcud sətri yenilə.

Qaydalar:
- Hər mövzu faylını KİÇİK saxla — bir mövzu = bir fayl. Böyüsə, alt-mövzulara böl.
- İndeksi ("${MEMORY_INDEX}") HEÇ VAXT detallarla şişirtmə — yalnız 1-cümləlik xülasələr, həmişə kiçik qalmalıdır.
- İstifadəçi açıq şəkildə "unut", "bunu yaddaşa yazma" desə, əməl et.
- Yaddaşa yazmaq QAYDA-ya tabedir: yalnız faydalı, dəqiq məlumat yaz, uydurma.`;

module.exports = { instructions };
