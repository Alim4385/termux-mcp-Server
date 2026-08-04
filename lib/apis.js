'use strict';
// API reyestri — YENİ ALƏT YOXDUR. Mövcud view/create_file/str_replace alətləri ilə idarə
// olunur; bu mətn "initialize.instructions" vasitəsilə hər söhbətin əvvəlində AI-ya göstərilir.
// Məqsəd: layihələr arası təkrar-təkrar eyni API key-i (OpenAI, WhatsApp və s.) istəməmək —
// bir dəfə əlavə olunur, sonra hər layihədə "kitabxana kimi" oradan oxunur.
const { APIS_FILE } = require('./config');

const instructions = `API REYESTRİ (layihələr arası API key-lərin yadda saxlanması üçün):

"${APIS_FILE}" — bütün API key-lər tək JSON faylda saxlanılır. Format:
{
  "<qısa-ad>": { "name": "İnsan-oxuya-bilən ad", "purpose": "Nə üçün işlədilir (qısa)", "key": "", "confirm_before_use": false }
}

NƏ VAXT OXU: layihədə hər hansı xarici API lazım olanda (istifadəçi konkret desə də, sən özün müəyyən etsən də) İLK NÖVBƏDƏ "${APIS_FILE}"-i "view" ilə oxu.

TAPILDIQDA:
- "key" doludursa VƏ "confirm_before_use" false-dursa → birbaşa işlət, istifadəçidən icazə istəmə.
- "key" doludursa VƏ "confirm_before_use" true-dursa → işlətməzdən ƏVVƏL istifadəçiyə hansı API-ni, nə üçün işlədəcəyini de, təsdiq gözlə.
- Qeyd (ad) var amma "key" boşdursa → istifadəçidən key-i istə, aldıqdan sonra "str_replace" ilə yaz.

TAPILMADIQDA (bu adla qeyd yoxdur): istifadəçidən API key-i istə, sonra "str_replace" (fayl boş "{}" deyilsə) və ya "create_file" (fayl "{}"-dursa, overwrite:true ilə) istifadə edərək yeni qeyd əlavə et. Qeydi yaradanda:
- "purpose"-u öz sözlərinlə qısa yaz (məs. "GPT modelləri ilə mətn tamamlama").
- "confirm_before_use"-u SƏN özün qiymətləndir (istifadəçi açıq desə ona da əməl et): API geri-dönməz təsir edirsə (pul xərcləyir, mesaj/email göndərir, məlumat silir/dəyişir) və ya key xüsusilə həssasdırsa → true; sadəcə oxuma/sorğu xarakterli, aşağı-riskli API-dirsə → false.

QAYDALAR:
- Key-i AI-dan gizlətməyə ehtiyac YOXDUR — tək istifadəçi öz cihazında öz key-lərini idarə edir, gizlətmək bu kontekstdə funksional fayda vermir (sən onsuz da key-i işlətməlisən).
- Faylı əl ilə format pozacaq şəkildə redaktə etmə — həmişə keçərli JSON saxla.
- İstifadəçi açıq şəkildə "bu key-i sil/unut" desə, "str_replace" ilə həmin qeydi çıxar.`;

module.exports = { instructions };
