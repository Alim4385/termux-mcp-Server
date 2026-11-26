---
name: tool-git
description: Use when using the git tool — local git operations like status, diff, log, add, commit, branch, checkout, pull, push, clone. Trigger: "git status", "commit", "diff", "branch", "push", "pull", "git log", "clone repo".
---

# tool: git

**What:** Structured local git command tool. Prefer over `bash` for common git operations (clearer args, no shell quoting issues).

**Not:** `gitmcp` is for remote GitHub repo docs/code search; this `git` tool is for local git repos.

**Actions:**
- `status` — short branch status.
- `diff` — diff; `staged:true`, `ref`, `files`.
- `log` — oneline log; `limit` (default 20, max 100), `ref`.
- `show` — show ref with stat.
- `add` — add files or `all:true`.
- `commit` — requires `message`.
- `branch` — list/create/delete; `branch`, `create`, `delete`, `force`, `all`.
- `checkout` — `branch`/`ref`, `create:true` for -b, or `files`.
- `pull`/`push` — optional `remote`, `branch`; push supports `set_upstream`, `force` (uses `--force-with-lease`).
- `remote` — list/add/remove (`name`, `url`, `delete`, or raw args).
- `stash` — list by default, or pass args/files.
- `clone` — requires `url`, optional `dest`.
- `init` — init repo.
- `raw` — pass full git args array.

**Input:** `path` (repo dir, default cwd), `timeout`, `unsafe`. CWD clamped to sandbox unless `unsafe:true`.

**Safety:** get confirmation before destructive ops (force push, delete branch, reset-like raw). Do not expose secrets in commit messages.
