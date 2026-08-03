---
name: termux-environment
description: Paket qurmaq (npm install, pip install, pkg install), Termux-a məxsus fayl yolları/icazələr, ya da "command not found"/icazə xətası ilə qarşılaşanda istifadə et. Trigger sözlər: "paket qur", "npm install", "pip install", "command not found", "icazə xətası", "storage-a giriş", "permission denied".
---

# Termux mühiti — xüsusiyyətlər

Termux, Android üzərində işləyən QEYRİ-STANDART bir Linux mühitidir. Adi Linux distributiv təcrübəsi bəzən DÜZ GƏLMİR — aşağıdakıları bil.

## Paket idarəetməsi

- Sistem paketləri üçün: `pkg install <ad>` (apt-ın Termux wrapper-idir). `apt` da işləyir, amma `pkg` üstünlük təşkil edir (asılılıqları daha yaxşı idarə edir).
- Node.js paketləri: `npm install` normal işləyir, AMMA native compile (C/C++ bind) tələb edən paketlər tez-tez uğursuz olur — `pkg install build-essential` (və ya çatışmayan konkret alət, məs. `python`, `clang`) əvvəlcədən lazım ola bilər.
- Python paketləri: `pip install` işləyir, `--break-system-packages` bəzən lazım olur (əsas Termux Python mühiti xarici idarə olunduğu üçün).
- **HEÇ VAXT istifadəçidən soruşmadan böyük/naməlum paket quraşdırma.** `command not found` görəndə hansı paketin lazım olduğunu söylə, təsdiq gözlə — özün `pkg install` ETMƏ.

## Fayl sistemi

- Ev qovluğu: `/data/data/com.termux/files/home` — bu server-in `HOME`-udur, workspace bunun daxilindədir.
- Android-in ümumi yaddaşına (Downloads, DCIM, Pictures) giriş üçün istifadəçi ƏVVƏLCƏDƏN `termux-setup-storage` işlətməli olub (bir dəfəlik icazə tələb edir, Android sistem dialoqu açılır — bunu sənin adından edə bilmirsən). Giriş xətası ("Permission denied" `/sdcard`-da) görsən, bunu xatırlat.
- Uğurlu `termux-setup-storage`-dan sonra `~/storage/shared` Android-in ümumi yaddaşına bağlanır.

## Ümumi "command not found" səbəbləri

- Bir çox "standart" Linux aləti (məs. `systemctl` — Android-də systemd YOXDUR, bəzi `ps`/`top` bayraqları fərqli davranır) Termux-da yoxdur və ya fərqlidir.
- Xəta görəndə həll yolunu TƏXMİN ETMƏ — `pkg search <söz>` ilə uyğun paketi tap, ya da istifadəçidən soruş.

## Prosess/resurs məhdudiyyətləri

- Telefon = məhdud RAM/CPU. Ağır proseslər (böyük build, çoxlu paralel npm install) telefonu yavaşlada və ya Android-in Termux prosesini "arxa fonda" oldugunu düşünüb dayandıra bilər (əgər tətbiq foreground-da deyilsə). Uzun proseslər üçün `process` alətini işlət (bax: `process-management` skili) ki, vəziyyəti izləyə biləsən.
