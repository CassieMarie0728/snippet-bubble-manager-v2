# Android Signing Credentials

**⚠️ KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT**

## Keystore Information

- **Filename:** `snippet-bubbles.keystore`
- **Alias:** `snippet-bubbles-key`
- **Keystore Password:** `SnippetBubbles2026!`
- **Key Password:** `SnippetBubbles2026!`
- **Validity:** 10,000 days (until October 24, 2053)

## Certificate Details

```
Owner: CN=Snippet Bubbles, OU=Development, O=Snippet Bubbles, L=Joplin, ST=Missouri, C=US
Issuer: CN=Snippet Bubbles, OU=Development, O=Snippet Bubbles, L=Joplin, ST=Missouri, C=US
Serial: 600ee687add22d5e
SHA1: C9:FB:93:6F:A2:B4:9A:26:28:5D:AA:1E:13:28:98:16:89:9C:EA:E8
SHA256: 86:5D:B8:6E:EC:87:4D:A4:5A:9C:C4:0F:87:71:CB:BB:D4:2E:AD:AC:DD:23:6A:9C:00:76:BA:CB
```

## Environment Variables for Building

Set these before building APK/AAB:

```bash
export KEYSTORE_PASSWORD="SnippetBubbles2026!"
export KEY_ALIAS="snippet-bubbles-key"
export KEY_PASSWORD="SnippetBubbles2026!"
```

## Build Commands

### Build APK (for testing on devices)

```bash
export KEYSTORE_PASSWORD="SnippetBubbles2026!"
export KEY_ALIAS="snippet-bubbles-key"
export KEY_PASSWORD="SnippetBubbles2026!"

./scripts/build-android.sh apk
```

### Build App Bundle (for Google Play Store)

```bash
export KEYSTORE_PASSWORD="SnippetBubbles2026!"
export KEY_ALIAS="snippet-bubbles-key"
export KEY_PASSWORD="SnippetBubbles2026!"

./scripts/build-android.sh aab
```

## Important Notes

1. **Never share this file** - It contains your signing credentials
2. **Back it up securely** - You'll need it for all future app updates
3. **Keep the password safe** - If lost, you'll need to create a new key for future releases
4. **Add to .gitignore** - This file should NOT be committed to version control

## Keystore File Location

```
/home/ubuntu/snippet-bubble-manager/snippet-bubbles.keystore
```

## Verification

To verify the keystore is valid:

```bash
keytool -list -v -keystore snippet-bubbles.keystore -storepass "SnippetBubbles2026!"
```

---

**Generated:** June 8, 2026  
**Status:** Ready for production builds
