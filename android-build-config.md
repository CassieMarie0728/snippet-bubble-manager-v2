# Android Release Configuration

## Current Release Path

Snippet Bubbles uses **Expo Application Services (EAS)** for Android distribution. This keeps signing credentials out of the repository and produces the correct artifact for each channel.

| Goal | Command | Result |
|---|---|---|
| Internal device testing | `./scripts/build-android.sh apk` | Preview APK through the authorized EAS account |
| Google Play submission | `./scripts/build-android.sh aab` | Production Android App Bundle (`.aab`) |
| Native inspection or Android Studio work | `./scripts/build-android.sh local` | Generated native Android project; signing remains external |

## Signing Requirements

Use the authorized Expo account’s EAS credential manager or an approved organization secret vault. Keystores, certificate fingerprints, aliases, passwords, and private paths must never be committed, pasted into documentation, or placed in the project directory.

Before the first release build, use the authorized Expo account to review or rotate the Android credential:

```bash
npx eas-cli@latest credentials --platform android
```

If any signing material was previously exposed, rotate it before building. The correct outcome is a fresh, externally managed credential—not another local text file full of regrettable nonsense.

## Release Readiness Checklist

- [ ] Authorized Expo/EAS account available
- [ ] Android signing credential reviewed or rotated outside the repository
- [ ] `eas.json` preview and production profiles reviewed
- [ ] `pnpm check`, `pnpm test`, and `pnpm lint` pass locally
- [ ] Preview APK tested on at least one physical Android device
- [ ] Production AAB built through the authorized EAS account
- [ ] Play Console listing uses the live privacy-policy URL
- [ ] Android package ID and release version verified before upload

## Play Store Notes

Publish an **AAB**, not an APK, to Google Play. Keep the first production rollout controlled, verify sign-in, backup/sync, AI quotas, conflict resolution, import/export, and offline behavior on a real Android device, then review Android vitals and crash reports before widening distribution.

## Local Android Studio Option

`./scripts/build-android.sh local` generates a native project for inspection or local testing. It does not authorize a release. Any local signing configuration must reference credentials held outside this repository and outside the generated project’s tracked files.

