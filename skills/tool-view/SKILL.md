---
name: tool-view
description: view alətini işlətdikdə istifadə et — fayl/qovluq oxuma, şəkil göstərmə, böyük fayl/log araşdırma. Trigger: "fayla bax", "oxu", "qovluğu göstər", "log-a bax", "kodu tap", "tail/head", "recursive ls". Böyük faylda kor-koranə tam oxuma et, daralt.
---

# tool: view

**Nədir:** Fayl/qovluq oxuyur. Nisbi yol `cwd`-yə görə, mütləq yol sistem boyu işləyir.

**Giriş:**
- `path` (tələb).
- Mətn fayl: `view_range:[start,end]` (1-based, `end:-1` sona qədər) **üstünlük təşkil edir**. Yoxdursa `mode:"head"|"tail"|"full"` + `lines` (default 10).
- Qovluq: `recursive:true`, `depth` (default 3, maks 6). Böyük qovluqlarda `node_modules/.git/.venv/dist/build...` ignore olunur, 500+ node kəsilir.

**Çıxış:** Mətn → sətir nömrəli; şəkil (`jpg/png/gif/webp`) → image content; qovluq → siyahı. Mətn >15K simvol kəsilir. Fayl >8MB → xəta.

**Ağıllı oxuma (token qənaəti):**
- Naməlum/böyük fayl: əvvəl `wc -l`/`ls -la`, sonra hədəfli oxu.
- Axtarış: `search` aləti ilə pattern tap → `view_range:[n-10,n+10]` ilə oxu (və ya sürətli shell üçün `bash grep -rn`).
- Log sonu: `mode:"tail", lines:50`. Başlanğıc: `head`.
- Böyük qovluq: əvvəl `recursive:false`; konkret fayl üçün `find`/`grep -rln`.
- `process wait` artıq log tail qaytarır — eyni logu yenə tam `view` etmə.
- Mövcud datanı köçürərkən `view`+yenidən yazma; `bash` ilə `cp/cat/grep >` işlət.
