
## [ERR-20260811-TODO-RANGE] file-read

**Logged**: 2026-08-11T16:42:00-05:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
A stale line range was used after `todo.md` changed, causing the file-read request to fail.

### Error
```
Invalid view_range start 130: file has 130 lines.
```

### Context
- Attempted to read a fixed line range after another process modified `todo.md`.

### Resolution
- **Resolved**: 2026-08-11T16:42:00-05:00
- **Notes**: Re-read the complete file before applying the TODO update.

### Suggested Fix
Use an unrestricted read whenever a tracked file may have changed since its last inspection.

### Metadata
- Reproducible: yes
- Related Files: todo.md
- Tags: file-range, stale-context

---

## [ERR-20260811-S3-REMOTE] git-ls-remote

**Logged**: 2026-08-11T16:52:00-05:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Direct terminal access to the sandbox `origin` remote failed because its S3 credentials are deliberately injected only during checkpoint saves.

### Error
```
fatal: invalid credentials Unable to locate credentials
```

### Context
- Attempted `git ls-remote --heads origin main` while reconciling repository state.

### Resolution
- **Resolved**: 2026-08-11T16:52:00-05:00
- **Notes**: Use `webdev_save_checkpoint` for sandbox-origin synchronization and GitHub CLI/API for user-facing GitHub verification.

### Suggested Fix
Do not use raw `git fetch`, `git pull`, or `git push` against the sandbox origin from the terminal.

### Metadata
- Reproducible: yes
- Related Files: .git/config
- Tags: git, s3, checkpoint, credentials

---

## [ERR-20260811-GIT-STAGING] git-add

**Logged**: 2026-08-11T16:54:00-05:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
A reconciliation commit failed because the old workflow filename no longer existed after a Git-detected rename.

### Error
```
fatal: pathspec '.github/workflows/deploy-landing.yml' did not match any files
```

### Context
- Attempted to stage both sides of a detected filename rename explicitly.

### Resolution
- **Resolved**: 2026-08-11T16:54:00-05:00
- **Notes**: Stage the workflow directory with `git add -A .github/workflows` so Git records the rename without referencing a vanished path.

### Suggested Fix
When handling renames, stage the parent directory or use `git add -A` after confirming the current status.

### Metadata
- Reproducible: yes
- Related Files: .github/workflows/deploy-landing.yaml
- Tags: git, rename, staging

---

## [ERR-20260811-GIT-IDENTITY] git-commit

**Logged**: 2026-08-11T16:55:00-05:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
The sandbox did not have a local Git author identity configured, so the reconciliation commit could not be created.

### Error
```
fatal: unable to auto-detect email address
```

### Context
- Attempted to commit the verified GitHub reconciliation changes.

### Resolution
- **Resolved**: 2026-08-11T16:55:00-05:00
- **Notes**: Configure a repository-local author name and GitHub noreply email before retrying; do not alter global sandbox identity.

### Suggested Fix
Set `git config user.name` and `git config user.email` in the repository only.

### Metadata
- Reproducible: yes
- Related Files: .git/config
- Tags: git, identity, commit

---

## [ERR-20260811-GITHUB-DIVERGENCE] git-push

**Logged**: 2026-08-11T16:56:00-05:00
**Priority**: medium
**Status**: in_progress
**Area**: infra

### Summary
The user-facing GitHub `main` branch contains commits that are not present in the sandbox branch, so a fast-forward push was correctly rejected.

### Error
```
! [rejected] main -> main (non-fast-forward)
```

### Context
- Local reconciliation commit: `9b5a3ba`.
- Remote GitHub API showed a later repository push timestamp than the sandbox-origin checkpoint history.

### Suggested Fix
Fetch `user_github/main`, inspect the merge base and changed paths, then merge or rebase without force-pushing. Resolve only deliberate conflicts and re-run validation before pushing.

### Metadata
- Reproducible: yes
- Related Files: .git/config
- Tags: git, github, divergence, reconciliation

---

## [ERR-20260811-TODO-MERGE] git-merge

**Logged**: 2026-08-11T16:57:00-05:00
**Priority**: low
**Status**: in_progress
**Area**: docs

### Summary
Git could not automatically merge `todo.md` because both branches appended the same landing-page block at the file end.

### Error
```
CONFLICT (content): Merge conflict in todo.md
```

### Context
- The GitHub version adds the landing-page TODO block.
- The local version contains the exact same block plus the new priority cloud-foundation backlog.

### Suggested Fix
Resolve `todo.md` with the local version because it is a verified superset, stage it, and complete the merge without rewriting history.

### Metadata
- Reproducible: yes
- Related Files: todo.md
- Tags: git, merge, todo, reconciliation

---

## [ERR-20260811-WORKFLOW-PERMISSION] git-push

**Logged**: 2026-08-11T16:58:00-05:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
The GitHub App credential can push normal repository content but cannot create or modify workflow files.

### Error
```
refusing to allow a GitHub App to create or update workflow `.github/workflows/deploy-landing.yaml` without `workflows` permission
```

### Context
- The reconciliation commit containing `todo.md` pushed successfully.
- A later local commit changed the workflow path filter and was rejected by GitHub.

### Suggested Fix
Use a user-authorized credential with the `workflows` permission, or have the repository owner apply the one-line workflow path edit in GitHub. Continue feature work from `user_github/main` so non-workflow commits can still be published safely.

### Metadata
- Reproducible: yes
- Related Files: .github/workflows/deploy-landing.yaml
- Tags: github, actions, permissions, workflow

---
