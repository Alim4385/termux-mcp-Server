---
name: termux
description: Use for Termux/Android environment and termux-api. Trigger: "pkg install", "npm/pip install", "command not found", "permission denied", "storage/sdcard", "notification/toast/vibration/clipboard/battery", "termux-api", "phone interaction".
---

# termux

**Environment:** Non-standard Linux on Android; no `systemd`, some commands/flags differ.

**Packages:**
- System: `pkg install <name>` (find with `pkg search <word>`). `command not found` → identify package, **ask user for confirmation, do not install yourself**.
- Node native build: often needs `pkg install build-essential python clang`.
- Python: `pip install ...`; sometimes `--break-system-packages` is needed.

**Paths/permissions:**
- HOME: `/data/data/com.termux/files/home`, workspace is here.
- For `/sdcard`/shared storage, `termux-setup-storage` must be run first (user does it). After success: `~/storage/shared`.

**Resources:** phone RAM/CPU is limited; long jobs → `process`, keep foreground free.

## termux-api (via `bash`)
First check `which termux-toast`; if missing, tell user `pkg install termux-api` + Termux:API app is needed.

| Purpose | Command |
|---|---|
| Notification | `termux-notification --title "..." --content "..." [--id X]` |
| Toast | `termux-toast "..."` (`-s` for long) |
| Vibration | `termux-vibrate -d 300` |
| Clipboard set/get | `termux-clipboard-set` / `termux-clipboard-get` |
| Battery | `termux-battery-status` |

**Sensitive (camera/microphone/location/contacts/SMS):** only with user's explicit, specific, per-use consent. Run commands separately, check exit code.
