# Snippet Bubbles — Release Quick Start

> **Current status:** The application code has passed its automated checks, but the public GitHub Pages site and first signed Android release are not yet live. Treat this as a release-gate checklist, not a victory lap wearing a fake mustache.

## 1. Publish the Landing Site Through GitHub Pages

The repository contains a GitHub Actions landing-page deployment workflow. The owner must first configure the repository’s **Pages** settings to use **GitHub Actions** as its source. The public Pages URLs currently return `404`, so do not announce them until that source switch and a successful deployment run are verified.

After the source switch:

1. Restore the repository’s authorized GitHub connection.
2. Push the reviewed landing workflow and landing-page files to the deployment branch.
3. Confirm the GitHub Actions deployment succeeds.
4. Confirm the root landing page and `privacy.html` return `200` before publishing either URL elsewhere.

## 2. Build a Preview Android APK

Android signing belongs in the authorized Expo Application Services account or an approved external secret manager—not in this repository.

```bash
# Review or rotate external Android credentials first.
npx eas-cli@latest credentials --platform android

# Then start the internal-distribution Android build.
./scripts/build-android.sh apk
```

Install the EAS-provided APK on at least one physical Android device. Test sign-in, backup/sync, conflict resolution, AI quota behavior, import/export, and offline operation before requesting production distribution.

## 3. Build the Production Android App Bundle

After preview testing passes:

```bash
./scripts/build-android.sh aab
```

Download the resulting `.aab` from the authorized EAS build dashboard. Submit that bundle through the Google Play Console, along with accurate listing copy, screenshots, and the **live** privacy-policy URL.

## Release Checklist

| Gate | Required evidence |
|---|---|
| GitHub Pages | Source set to GitHub Actions; public landing and privacy URLs return `200` |
| Repository access | Authorized GitHub connection restored; reviewed changes pushed |
| Android signing | Previously exposed signing credential rotated externally; no credential files remain tracked |
| Preview APK | Installed and tested on physical Android hardware |
| Production AAB | Successful EAS production build and Play Console upload |
| Store listing | Accurate feature claims, screenshots, and live privacy-policy URL |

## References

- [Deployment guide](DEPLOYMENT.md)
- [Android release configuration](android-build-config.md)
- [Android signing security notice](ANDROID_SIGNING_CREDENTIALS.md)
- [Google Play Console](https://play.google.com/apps/publish)

**Last updated:** 2026-08-11
**Status:** **External release gates remain open.**
