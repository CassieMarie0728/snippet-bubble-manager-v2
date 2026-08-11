# Android Signing Security Notice

> **Do not place Android keystores, aliases, passwords, certificate fingerprints, or local signing paths in this repository.**

## Required Remediation

Any Android signing credentials that were previously documented or stored alongside this project must be treated as compromised. Before the first distribution build, create or rotate the Android signing credential in the Expo Application Services credential manager or an organization-approved secret manager. Do not reuse an exposed credential.

## Safe Release Procedure

1. Authenticate to the authorized Expo account with `npx eas-cli@latest login`.
2. Configure or rotate Android credentials interactively with `npx eas-cli@latest credentials --platform android`.
3. Store the generated credential only in EAS or an approved external vault; do not copy it into the repository, project directory, or documentation.
4. Build the release App Bundle with `./scripts/build-android.sh aab`.
5. Download the resulting `.aab` from the Expo build dashboard and upload it to the Google Play Console.

## Repository Safeguards

The project ignores keystores and common signing artifacts. A release build must fail closed if authorized EAS credentials are not available, rather than inventing or embedding signing material locally.

