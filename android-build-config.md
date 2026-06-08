# Android Build Configuration

## Overview
This document outlines the complete Android build setup for Snippet Bubbles, including signing configuration, Play Store metadata, and build instructions.

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java Development Kit (JDK)** - Version 11 or higher
3. **Android SDK** - API 24+ (configured via Android Studio)
4. **Keystore for signing** - Generated during first build

## Build Process

### Step 1: Generate Signing Key

Create a keystore for signing the APK/AAB:

```bash
keytool -genkey -v -keystore snippet-bubbles.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias snippet-bubbles-key
```

**When prompted, enter:**
- Keystore password: [secure password]
- Key password: [same as keystore password]
- First and last name: Snippet Bubbles
- Organizational unit: Development
- Organization: Snippet Bubbles
- City: [Your City]
- State: [Your State]
- Country: US

**Save the keystore file securely** - you'll need it for all future builds.

### Step 2: Build APK (for testing)

```bash
eas build --platform android --local
```

Or using Expo CLI directly:

```bash
expo build:android -t apk
```

### Step 3: Build App Bundle (for Play Store)

```bash
eas build --platform android --local --app-bundle
```

Or using Expo CLI:

```bash
expo build:android -t app-bundle
```

## Signing Configuration

The app is configured with the following package name:

```
space.manus.snippet.bubble.manager.t20260327210406
```

### Keystore Details

**File:** `snippet-bubbles.keystore`
**Alias:** `snippet-bubbles-key`
**Validity:** 10,000 days (27+ years)

### Signing Configuration in Gradle

The signing is configured in `android/app/build.gradle`:

```gradle
signingConfigs {
  release {
    storeFile file('snippet-bubbles.keystore')
    storePassword System.getenv('KEYSTORE_PASSWORD')
    keyAlias System.getenv('KEY_ALIAS')
    keyPassword System.getenv('KEY_PASSWORD')
  }
}

buildTypes {
  release {
    signingConfig signingConfigs.release
  }
}
```

## Environment Variables

Set these before building:

```bash
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_ALIAS="snippet-bubbles-key"
export KEY_PASSWORD="your_key_password"
```

## Play Store Configuration

### App Details

- **App Name:** Snippet Bubbles
- **Package Name:** space.manus.snippet.bubble.manager.t20260327210406
- **Category:** Productivity
- **Content Rating:** Everyone (PEGI 3)
- **Minimum API Level:** 24 (Android 7.0)
- **Target API Level:** 34 (Android 14)

### Required Screenshots

For Play Store listing, you'll need:

1. **Phone Screenshots** (1080x1920 px, min 2, max 8):
   - Library screen with snippets
   - AI generation screen
   - Snippet detail with AI features
   - Settings with AI personality options

2. **Tablet Screenshots** (1440x2560 px, optional):
   - Same content as phone, optimized for larger screens

### App Description

```
Snippet Bubbles is an AI-powered code snippet manager that helps developers 
save, organize, and reuse code snippets across projects.

Features:
- 🤖 AI-powered snippet generation from natural language prompts
- 💡 Explain any code snippet with AI
- 🔄 Convert code between programming languages
- 🏷️ Organize snippets with tags, categories, and collections
- 🔍 Advanced search with regex and code content matching
- 📱 Works offline with full PWA support
- 🎨 Dark mode support
- 📤 Export/import snippets as JSON
- 🔗 Share snippets with QR codes
- ✨ Customizable AI personality (tone, style, instructions)

Available on web (PWA) and Android. No subscriptions, no tracking, open source.
```

### Privacy Policy

Include a privacy policy URL in Play Store listing. For now, use:

```
https://snippet-bubbles.example.com/privacy
```

(Replace with actual URL when deployed)

### Permissions

The app requests the following permissions:

- `POST_NOTIFICATIONS` - For push notifications (future feature)

### Testing

Before submitting to Play Store:

1. **Test on multiple devices:**
   - Minimum: Android 7.0 (API 24)
   - Target: Android 14 (API 34)

2. **Test all features:**
   - Snippet CRUD operations
   - AI generation, explanation, conversion
   - Search and filtering
   - Export/import
   - Dark mode toggle
   - Offline functionality

3. **Test on different screen sizes:**
   - Phone (5-6 inches)
   - Tablet (7-10 inches)

## Uploading to Play Store

1. **Create Google Play Developer Account** - https://play.google.com/apps/publish
2. **Create new app** in Play Console
3. **Fill in app details** (name, description, category, etc.)
4. **Upload signed AAB** to Play Console
5. **Add screenshots and promotional graphics**
6. **Fill in store listing** (description, privacy policy, etc.)
7. **Set pricing** (free or paid)
8. **Submit for review**

## Troubleshooting

### Build fails with "Keystore not found"

Ensure the keystore file is in the correct location and the path is correct in build.gradle.

### APK won't install on device

- Ensure device is running Android 7.0 or higher
- Uninstall any previous version of the app
- Enable "Unknown sources" in device settings

### App crashes on startup

- Check Android Studio logcat for error messages
- Ensure all required permissions are declared in AndroidManifest.xml
- Verify backend API is accessible from the device

## Version Management

Current version: **1.0.0**

To increment version for future releases:

1. Update `versionCode` in `android/app/build.gradle`
2. Update `versionName` in `android/app/build.gradle`
3. Update `version` in `app.config.ts`
4. Rebuild and test
5. Submit to Play Store

## Resources

- [Android Developer Documentation](https://developer.android.com/docs)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Expo Android Build Documentation](https://docs.expo.dev/build/setup/)
- [Android App Signing Guide](https://developer.android.com/studio/publish/app-signing)
