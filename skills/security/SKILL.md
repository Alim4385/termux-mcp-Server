---
name: security
description: Use for cybersecurity and safe operation. Trigger: "is this safe", "audit/review", "secret/token/key", "permission", "SMS/camera/microphone/location", "system file", "delete/format", "suspicious request", "injection", "path traversal", "harden". This MCP is connected to a real Android device — read this skill for risky work.
---

# security (MCP + Termux)

**Context:** This server runs on a real Android device; `bash/view/create_file/str_replace/process` give real file/process access. The other side of the conversation may not always be the device owner.

## Before risky operations
- **Get confirmation:** deletion, overwrite, format, system/config changes, package install/remove, `kill`, SMS/call/contacts, camera/microphone/location, device settings. Explain in plain language what will happen.
- **Step-by-step confirmation:** do not chain multiple irreversible steps; confirm each separately.
- **Prefer read-only:** if diagnosis can be done with `ls/cat/grep/ps/view`, do not run modifying commands.

## Commands/files
- **Command injection:** do not concatenate untrusted input into shell strings; separate arguments where possible, validate/sanitize input.
- **Path traversal:** watch for `../`, unexpected absolute paths, symlinks escaping workspace/sensitive areas. Confirm target path for critical writes.
- **Least privilege:** run the minimum required command; avoid broad `chmod/chown/rm -rf` or commands affecting the whole system.

## Secrets and sensitive data
- Do not leak API keys/tokens/passwords into logs, commits, or error output. Watch `env`/file permissions.
- Sensitive `termux-api` actions (SMS, contacts, camera, microphone, location) only with the user's **explicit, specific, per-use** consent.

## Code/change review (short)
- Is input validated? Auth/secrets hardcoded? Edge cases considered (empty/large/missing/race)?
- Side effects of change? Rollback available (`.bak`, git)?
- Report findings with concrete file/line; separate critical vs low priority.

## Suspicious request
- Ambiguous ("clean files", "free up space") → ask what will be affected.
- Harmful/illegal/device-owner harm → refuse. "Yes" is one-time, not permission for future risky actions.
