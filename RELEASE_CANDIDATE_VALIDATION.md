# Release Candidate Validation Record

> **Status:** In progress. This record distinguishes completed evidence from checks still awaiting the remote EAS preview APK artifact.

## Android Signing and Preview Build

| Control | Evidence | Status |
|---|---|---|
| EAS project identity | `@c728/snippet-bubble-manager` (`e7db80b7-c252-4dda-8ac6-45d21dc60cb4`) resolves through `eas project:info`. | Passed |
| Credential rotation | A fresh EAS-managed JKS credential named **Snippet Bubbles Preview** was created for the Android preview profile. No keystore or signing password was written to the repository. | Passed |
| Preview artifact request | Android internal-distribution preview build `f9c2c88e-f9ad-4ce1-9d8e-d3fe3fa859e5` was uploaded to EAS on 2026-08-11. | Submitted |
| Current remote state | The build is queued in the EAS free-tier worker queue; no APK artifact is available yet. | Awaiting worker |

Build dashboard: <https://expo.dev/accounts/c728/projects/snippet-bubble-manager/builds/f9c2c88e-f9ad-4ce1-9d8e-d3fe3fa859e5>

## Local Release Preflight

| Check | Result | Notes |
|---|---|---|
| TypeScript | Passed | `pnpm check` completed without type errors. |
| Automated tests | Passed | 150 passed; 1 intentionally skipped authentication logout test. |
| Lint | Passed | `pnpm lint` completed with zero rule violations. |
| Expo public configuration | Passed | JSON config confirms owner `c728` and the persisted EAS project ID. |

## Focused Functional Evidence

| Release concern | Automated coverage | Result |
|---|---|---|
| Sync conflicts and protected cloud operations | `tests/cloud-snippets.router.test.ts` | 14 passed |
| AI quotas and content-free telemetry | `tests/ai-quota.router.test.ts` | 4 passed |
| Cloud merge behavior | `lib/__tests__/cloud-sync.test.ts` | 4 passed |
| Offline durable sync queue | `lib/__tests__/sync-queue.test.ts` | 3 passed |
| JSON import duplicate strategies | `lib/__tests__/snippet-import.test.ts` | 3 passed |

The focused suite completed on 2026-08-11 with **28 passing tests across 5 files**. It validates the deterministic code paths behind the physical-device checks listed below; the APK test remains necessary to validate installation, real connectivity changes, and user-facing behavior on an Android device.

## Remaining Release-Candidate Checks

The following evidence will be completed after the preview APK is available for physical-device testing:

1. Create a deliberate sync conflict, review both versions, select a winner, and confirm the resolved revision syncs cleanly.
2. Confirm AI hourly and daily quota responses, including retry guidance after a limit is reached.
3. Run JSON and Markdown import/export round-trips using each duplicate strategy and verify recovery reporting.
4. Validate local-first editing and the durable sync queue while offline, then reconnect and confirm convergence.

## Release Constraints

- This preview build is **internal distribution only** and is not a Play Store submission.
- A production Android App Bundle requires a separate, user-authorized release-build request after preview-device validation passes.
- Play Store release builds should retain EAS-managed signing and enable the release hardening described in `ANDROID_RELEASE.md`.
