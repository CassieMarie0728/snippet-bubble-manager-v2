# Release Candidate Validation Record

> **Status:** In progress. The first preview APK completed and exposed device-test defects; the replacement preview build will validate the remediation below.

## Android Signing and Preview Build

| Control | Evidence | Status |
|---|---|---|
| EAS project identity | `@c728/snippet-bubble-manager` (`e7db80b7-c252-4dda-8ac6-45d21dc60cb4`) resolves through `eas project:info`. | Passed |
| Credential rotation | A fresh EAS-managed JKS credential named **Snippet Bubbles Preview** was created for the Android preview profile. No keystore or signing password was written to the repository. | Passed |
| Preview artifact request | Android internal-distribution preview build `f9c2c88e-f9ad-4ce1-9d8e-d3fe3fa859e5` was uploaded to EAS on 2026-08-11. | Submitted |
| Current remote state | The EAS build finished successfully on 2026-08-11. | Passed |
| Preview APK | [Download the internal-test APK](https://expo.dev/artifacts/eas/nrKXsP-Y2rjW6s39RbI_ud2T72kQ0wVmTXdiCFoKZbE.apk) | Available through 2026-08-25 |
| Replacement preview build | Build `90f9becd-f1fd-44ae-9c3c-3a83374de891` finished successfully with the Android remediation included. | Ready for device retest |

The first device test correctly caught a broken auto-registered Index tab, missing native API routing for sign-in and AI calls, and clipboard-only Android export behavior. Those defects are remediated in the next preview candidate; this initial artifact must not be used as release evidence.

Build dashboard: <https://expo.dev/accounts/c728/projects/snippet-bubble-manager/builds/f9c2c88e-f9ad-4ce1-9d8e-d3fe3fa859e5>

Replacement build dashboard and installation QR code: <https://expo.dev/accounts/c728/projects/snippet-bubble-manager/builds/90f9becd-f1fd-44ae-9c3c-3a83374de891>

## Local Release Preflight

| Check | Result | Notes |
|---|---|---|
| TypeScript | Passed | `pnpm check` completed without type errors. |
| Automated tests | Passed | 152 passed; 1 intentionally skipped authentication logout test. |
| Lint | Passed | `pnpm lint` completed with zero rule violations. |
| Expo public configuration | Passed | JSON config confirms owner `c728` and the persisted EAS project ID. |
| Android JavaScript bundle | Passed | `npx expo export --platform android` emitted the production bundle successfully after the remediation. |

## Focused Functional Evidence

| Release concern | Automated coverage | Result |
|---|---|---|
| Sync conflicts and protected cloud operations | `tests/cloud-snippets.router.test.ts` | 14 passed |
| AI quotas and content-free telemetry | `tests/ai-quota.router.test.ts` | 4 passed |
| Cloud merge behavior | `lib/__tests__/cloud-sync.test.ts` | 4 passed |
| Offline durable sync queue | `lib/__tests__/sync-queue.test.ts` | 3 passed |
| JSON import duplicate strategies | `lib/__tests__/snippet-import.test.ts` | 3 passed |
| OAuth-to-sync state refresh | `lib/__tests__/auth-events.test.ts` | 1 passed |
| Multipart AI response normalization | `tests/ai-quota.router.test.ts` | 1 additional test passed |

The focused remediation suite completed on 2026-08-11 with **9 passing tests across 3 files**. The complete suite then passed with **152 passing tests and 1 intentionally skipped test**. These checks validate the deterministic paths behind the device retest; an Android handset remains necessary to confirm installation, real connectivity, and the system share panel.

## Android Remediation Included in the Replacement Preview

| Reported concern | Corrective action |
|---|---|
| Broken Index tab icon | The legacy Index route is now hidden from bottom navigation, leaving only the intended destinations. |
| Missing save confirmations | A shared transient notification layer now confirms AI settings, snippet saves and updates, imports, and exports. |
| Sign-in did not enable sync | Native API calls now use the deployed HTTPS API host, and OAuth storage emits an authentication refresh signal to cloud sync. |
| AI requests failed | AI actions now use the configured tRPC client and normalize multipart provider output into the expected string response. |
| No Library creation action | The Library now has an accessible crimson floating ADD action using the standard snippet editor route. |
| Android export was not a file | Native export writes a `.json` file and opens the Android system share sheet; import accepts standard JSON MIME variants. |

## Remaining Release-Candidate Checks

The automated evidence is complete. The following acceptance checks require a real Android device and should be performed with the preview APK:

1. Create a deliberate sync conflict, review both versions, select a winner, and confirm the resolved revision syncs cleanly.
2. Confirm AI hourly and daily quota responses, including retry guidance after a limit is reached.
3. Run JSON and Markdown import/export round-trips using each duplicate strategy and verify recovery reporting.
4. Validate local-first editing and the durable sync queue while offline, then reconnect and confirm convergence.
5. Confirm the bottom bar has no Index entry, the Library ADD button opens a new snippet, and every requested success toast appears once.
6. Export a `.json` file through the Android share panel, save it, then import the same file and confirm a duplicate strategy works.

## Release Constraints

- This preview build is **internal distribution only** and is not a Play Store submission.
- A production Android App Bundle requires a separate, user-authorized release-build request after preview-device validation passes.
- Play Store release builds should retain EAS-managed signing and enable the release hardening described in `ANDROID_RELEASE.md`.

## Android Remediation Tranche 2

| Concern | Corrective action | Current evidence |
|---|---|---|
| Secure auth session launch failure | Native sign-in now requests a server-generated login URL and falls back to the system browser when `openAuthSessionAsync` cannot launch. | Focused regression passed |
| Preset-only AI language selection | AI generation now supports Auto-detect and an arbitrary Custom language value without forcing a catalog selection. | Focused regression passed |
| System-wide snippet access | Added an opt-in native Android overlay module with a draggable bubble, expanded snippet panel, minimize/close controls, and a route back to the full editor. | Expo autolinking resolved; remote native compile pending |
| Overlay safety | Settings now explains the Android Display over other apps permission and keeps the feature disabled by default. | TypeScript and UI wiring passed |

The focused tranche suite completed with **9 passing tests across 3 files**, including the standalone-browser OAuth fallback and omitted/custom AI-language request paths. The replacement EAS build must still prove the Kotlin service, manifest merge, and overlay lifecycle on a physical Android device.

## Current Replacement APK Submission

The user-authorized overlay/login preview request was submitted to EAS as build `e654c031-3ce0-425b-a6b9-8fc446a02b64` on 2026-08-12. It uses checkpoint fingerprint `0ce1cfb0`, the `preview` profile, internal Android distribution, and the EAS-managed **Snippet Bubbles Preview** keystore. The latest remote status is `IN_QUEUE`; no artifact or build logs are available yet. Build dashboard: <https://expo.dev/accounts/c728/projects/snippet-bubble-manager/builds/e654c031-3ce0-425b-a6b9-8fc446a02b64>.

## Corrected Overlay/Login APK

The replacement EAS Android preview build completed successfully after the SDK 54 Kotlin correction. Build ID: `9a14df47-dfb5-49bc-8022-1221fb450493`. Status: `FINISHED`. Git checkpoint: `482066384d2de3414455dae2778deb0e5a377aef`. Distribution: internal APK. Artifact: <https://expo.dev/artifacts/eas/4LJmpIUD90803oh_i3JaABqnCbzZbPFu7K9X9KvcVIU.apk>. Dashboard: <https://expo.dev/accounts/c728/projects/snippet-bubble-manager/builds/9a14df47-dfb5-49bc-8022-1221fb450493>.

The remote Gradle compiler successfully built the local floating-bubble module after the `AsyncFunction<Boolean>` declarations were corrected for SDK 54. Physical-device validation remains user-facing: install the APK and test overlay permission, drag/collapse/expand behavior, snippet launch, Android sign-in, custom AI language generation, and JSON sharing.

## Android Overlay Workspace Build Record (2026-08-15)

- Initial expanded-overlay preview submission: EAS build `8b8a0ce5-2d4a-4e6c-b948-5da9f3390ada` — failed during `:snippet-bubbles-floating-bubble:compileReleaseKotlin`.
- Exact compiler findings from the EAS Gradle log: `FloatingBubbleService.kt:154:7 Unresolved reference 'singleLine'`; lines 309, 318, and 328 attempted to assign a `String` to the outer `LinearLayout` variable named `text` because of Kotlin scope shadowing.
- Corrections applied: replaced `singleLine = true` with `setSingleLine(true)`; renamed the row content layout; used `setText(...)` for nested `TextView` values.
- JavaScript gates after correction: TypeScript passed; 158 tests passed, 1 skipped; lint passed with zero warnings.
- Replacement preview submission: EAS build `2fa6ae93-d69e-4a22-85e5-4aa3e8e71341`, profile `preview`, status was `IN_PROGRESS` at the time of this record.
- EAS status page: https://expo.dev/accounts/c728/projects/snippet-bubble-manager/builds/2fa6ae93-d69e-4a22-85e5-4aa3e8e71341
- The sandbox could not run a local Gradle compile because no Android SDK/ANDROID_HOME is installed; EAS remote Gradle compilation is the native validation gate.


### Expanded Overlay Preview Build — Corrected and Finished

After fixing the native Kotlin compiler errors from build `8b8a0ce5-2d4a-4e6c-b948-5da9f3390ada`, the replacement EAS preview build `2fa6ae93-d69e-4a22-85e5-4aa3e8e71341` finished successfully on 2026-08-15. It used the internal `preview` profile and EAS-managed **Snippet Bubbles Preview** signing credentials. Artifact: <https://expo.dev/artifacts/eas/8RN9pHCyqXDS1HV5ZHDJf7HJIENbQUHTGKvU-ah8jyY.apk>. Dashboard: <https://expo.dev/accounts/c728/projects/snippet-bubble-manager/builds/2fa6ae93-d69e-4a22-85e5-4aa3e8e71341>.

The APK now contains the larger overlay-native workspace, 100-item cap, search and Snippets/Memos tabs, inline create/edit flow, monospaced multiline code-friendly editor, and native-to-app reconciliation. Physical Android validation remains open.
