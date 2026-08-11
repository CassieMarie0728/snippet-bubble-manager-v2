
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

## [ERR-20260811-IMPORT-ASSERT] vitest

**Logged**: 2026-08-11T17:50:31-05:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
An import-plan test incorrectly expected the copied result to contain only the new snippet, despite the strategy intentionally preserving the existing one.

### Error
The `toMatchObject` array assertion failed because the actual plan contained both the imported copy and the original snippet.

### Suggested Fix
Assert the outcome count and first imported record rather than an exact one-element array.

### Metadata
- Reproducible: yes
- Related Files: lib/__tests__/snippet-import.test.ts

### Resolution
- **Resolved**: 2026-08-11T17:51:00-05:00
- **Notes**: Replaced the overly strict array assertion with targeted outcome and first-record assertions.

---

## [ERR-20260811-SEARCH-SCOPE] file-search

**Logged**: 2026-08-11T18:10:00Z
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
A targeted text search used a file path where the search interface expects a directory scope.

### Error
```
Search scope path is not a directory: /home/ubuntu/snippet-bubble-manager/server/db.ts
```

### Resolution
- **Resolved**: 2026-08-11T18:10:00Z
- **Notes**: The imports were inspected safely with a read-only command; use a direct file read or directory-scoped search next time.

### Metadata
- Reproducible: yes
- Related Files: server/db.ts
- Tags: tool-usage, search-scope

---

## [ERR-20260811-PRIVACY-ASSERT] static-verification

**Logged**: 2026-08-11T18:17:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A static privacy-page verification used a phrase that did not exactly match the more detailed final copy.

### Error
```
exit code 1 from the privacy disclosure verification command
```

### Resolution
- **Resolved**: 2026-08-11T18:17:00Z
- **Notes**: Verify the required policy concepts with stable, shorter phrases rather than an entire prose sentence.

### Metadata
- Reproducible: yes
- Related Files: landing-page/privacy.html
- Tags: static-validation, assertion

---

## [ERR-20260811-PRIVACY-MARKER] static-verification

**Logged**: 2026-08-11T18:18:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A second static marker was still too exact for the privacy notice’s final copy.

### Error
```
exit code 1 from the revised privacy disclosure verification command
```

### Resolution
- **Resolved**: 2026-08-11T18:18:00Z
- **Notes**: Inspect the file content directly before selecting final stable validation markers.

### Metadata
- Reproducible: yes
- Related Files: landing-page/privacy.html
- Tags: static-validation, assertion

---

## [ERR-20260811-GH-RAW-WORKFLOW] gh-api

**Logged**: 2026-08-11T18:22:00Z
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
The GitHub CLI attempted to parse a raw workflow response as JSON during Pages-source inspection.

### Error
```
invalid character 'a' in literal null (expecting 'u')
```

### Resolution
- **Resolved**: 2026-08-11T18:22:00Z
- **Notes**: Retrieve the normal contents JSON and decode its `content` field instead of requesting a raw response through this command shape.

### Metadata
- Reproducible: yes
- Related Files: .github/workflows/deploy-landing.yaml
- Tags: github, api, workflow, pages

---

## [ERR-20260811-PAGES-PERMISSION] gh-api

**Logged**: 2026-08-11T18:43:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
The repository integration can read Pages state and run deployments but cannot switch Pages from legacy branch publishing to the custom workflow.

### Error
```
Resource not accessible by integration (HTTP 403)
```

### Context
- Verified public Pages URL returned GitHub’s 404 page.
- Pages is configured as `build_type: legacy` from `main` root, while the verified deployment workflow publishes `landing-page/` artifacts.

### Suggested Fix
Repository owner must open **Settings → Pages** and select **GitHub Actions** as the build and deployment source, or grant the integration permission to manage GitHub Pages settings.

### Metadata
- Reproducible: yes
- Related Files: .github/workflows/deploy-landing.yaml
- Tags: github, pages, permissions, deployment

---

## [ERR-20260811-LANDING-CTA-URL] curl-validation

**Logged**: 2026-08-11T18:47:00Z
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
The presumed public Manus app URL returned 404, and the validation loop did not exit on its failed HTTP status.

### Error
```
404 https://snippetmgr-ev54bpnq.manus.space
```

### Resolution
- **Resolved**: 2026-08-11T18:47:00Z
- **Notes**: Replace the dead web-app CTA with a verified repository destination and use an explicit failure flag in future multi-URL checks.

### Metadata
- Reproducible: yes
- Related Files: landing-page/index.html
- Tags: landing-page, cta, validation, deployment

---

## [ERR-20260811-PLAN-SAME-PHASE] plan-advance

**Logged**: 2026-08-11T18:49:00Z
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
An additional plan advance targeted phase 4 even though the previous transition had already entered phase 4.

### Error
```
Invalid phase advance: cannot advance to the same phase (phase 4).
```

### Resolution
- **Resolved**: 2026-08-11T18:49:00Z
- **Notes**: Continue substantive work in the active final phase rather than issuing a duplicate transition.

### Metadata
- Reproducible: yes
- Related Files: todo.md
- Tags: planning, phase-transition

---

## [ERR-20260811-ROUTER-RANGE] file-read

**Logged**: 2026-08-11T18:51:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
The initial router inspection requested lines beyond the current file length.

### Error
```
Invalid view_range start 410: file has 279 lines.
```

### Resolution
- **Resolved**: 2026-08-11T18:51:00Z
- **Notes**: Re-read the router from its valid lower range before editing.

### Metadata
- Reproducible: yes
- Related Files: server/routers.ts
- Tags: file-read, tooling, range

---

## [ERR-20260811-GREP-FILE-SCOPE] file-search

**Logged**: 2026-08-11T18:52:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
The text-search helper requires a directory glob, not a direct file path.

### Error
```
Search scope path is not a directory
```

### Resolution
- **Resolved**: 2026-08-11T18:52:00Z
- **Notes**: Use direct file inspection for the known helper file or a directory glob for future text searches.

### Metadata
- Reproducible: yes
- Related Files: server/db.ts
- Tags: file-search, tooling, scope

---

## [ERR-20260811-CONFLICT-SCREEN-PATCH] implementation

**Logged**: 2026-08-11T18:54:00Z
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
The multi-file conflict-resolution change partially applied. The Settings hunk was ambiguous and the new screen requires stricter TypeScript narrowing around the selected revision payload.

### Error
```
No replacement was performed: <Pressable> location was ambiguous.
TS18047: selectedPayload is possibly null.
```

### Next Step
Patch only the uniquely located Settings cloud-sync section and introduce a locally narrowed selected payload before computing its preview.

### Metadata
- Reproducible: yes
- Related Files: app/(tabs)/settings.tsx, app/sync-conflicts.tsx
- Tags: typescript, patching, conflict-resolution

---

## [ERR-20260811-SETTINGS-STYLE-COMMA] implementation

**Logged**: 2026-08-11T18:55:00Z
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
The targeted Settings update added style properties after an existing final style entry without the required separating comma.

### Error
```
TS1005: ',' expected
```

### Next Step
Inspect the affected style block, restore valid object punctuation, then rerun the type check before further feature validation.

### Metadata
- Reproducible: yes
- Related Files: app/(tabs)/settings.tsx
- Tags: typescript, stylesheet, syntax

---

## [ERR-20260811-BRACE-GLOB-SEARCH] file-search

**Logged**: 2026-08-11T19:04:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
The repository text-search helper does not expand brace-style path groups.

### Error
```
No text files found matching pattern with brace expansion.
```

### Resolution
- **Resolved**: 2026-08-11T19:04:00Z
- **Notes**: Use a supported broad project glob and filter results by path instead.

### Metadata
- Reproducible: yes
- Related Files: app, components, landing-page
- Tags: file-search, glob, tooling

---

## [ERR-20260811-SHELL-HISTORY-EXPANSION] validation

**Logged**: 2026-08-11T19:07:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
A double-quoted inline Node expression containing `!` was interpreted by Bash history expansion before Node executed.

### Error
```
bash: event not found
```

### Resolution
- **Resolved**: 2026-08-11T19:07:00Z
- **Notes**: Use a shell-safe single-quoted Node expression or avoid negation syntax in inline commands.

### Metadata
- Reproducible: yes
- Related Files: scripts/build-android.sh, eas.json
- Tags: shell, validation, history-expansion

---
