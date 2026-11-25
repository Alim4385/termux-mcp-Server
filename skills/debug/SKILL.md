---
name: debug
description: Use for structured diagnosis of errors, stack traces, unexpected behavior, "not working/broken" cases. Trigger: "bug", "error", "why doesn't it work", "debug this", "traceback", "regression", "it used to work".
---

# debug

**1. Reproduce** — what is expected vs actual? Reproduce minimally with `bash`; do not guess.
**2. Isolate** — recent change: `git log --oneline -10`, `git diff -- <file>`. Narrow with `view` on relevant file, runtime logs via `process wait`/tail. Reduce the component.
**3. Diagnose** — form a hypothesis, verify with a small test. Find **root cause**, not symptom.
**4. Fix & verify** — fix with `str_replace`/`create_file overwrite`, rerun the same steps. Consider side effects. Add guard/check to prevent recurrence.

**Report:** root cause → fix (file/line) → verification → prevention. If it's a useful lesson, write to `memory/`.
