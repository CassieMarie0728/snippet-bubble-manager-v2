# Deployment Guide - Snippet Bubbles

Complete guide for deploying Snippet Bubbles as a PWA and native Android app.

---

## Table of Contents

1. [Web App (PWA) Deployment](#web-app-pwa-deployment)
2. [Android App Deployment](#android-app-deployment)
3. [Backend Setup](#backend-setup)
4. [Cross-Platform Testing](#cross-platform-testing)
5. [Troubleshooting](#troubleshooting)

---

## Web App (PWA) Deployment

### What is a PWA?

A Progressive Web App (PWA) is a web application that:
- Works offline using service workers
- Can be installed on any device (phone, tablet, desktop)
- Provides a native app-like experience
- No app store required
- Automatic updates

### Prerequisites

- Node.js 18+ and pnpm
- Vercel or Netlify account (for hosting)
- Custom domain (optional but recommended)

### Build the PWA

```bash
# Build the web app
./scripts/build-pwa.sh

# Or manually:
npx expo export --platform web
```

This creates a `dist/` folder with:
- `index.html` - PWA entry point with meta tags
- `manifest.json` - PWA manifest for installability
- `service-worker.js` - Offline support and caching
- All app assets and code

### Deploy to Vercel (Recommended)

**Easiest option - automatic deployments from GitHub:**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add PWA and Android build support"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Configure build settings:
     - Build Command: `pnpm build`
     - Output Directory: `dist`
   - Click "Deploy"

3. **Configure custom domain:**
   - In Vercel dashboard, go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

**Manual deployment:**

```bash
npm install -g vercel
vercel --prod --dir=dist
```

### Deploy to Netlify

1. **Connect to Netlify:**
   - Go to https://netlify.com
   - Click "New site from Git"
   - Select your GitHub repository
   - Configure build settings:
     - Build Command: `pnpm build`
     - Publish Directory: `dist`
   - Click "Deploy"

2. **Configure custom domain:**
   - In Netlify dashboard, go to Domain Settings
   - Add your custom domain
   - Update DNS records as instructed

**Manual deployment:**

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Test PWA Installation

1. **On Desktop (Chrome/Edge):**
   - Open the app URL
   - Click the install icon in the address bar
   - Click "Install"
   - App opens in a window

2. **On Android:**
   - Open the app URL in Chrome
   - Tap the menu (three dots)
   - Tap "Install app"
   - App installs to home screen

### Verify PWA Features

- **Offline:** Disconnect internet, app still works
- **Installation:** Can install from browser
- **Updates:** Service worker checks for updates
- **Responsive:** Works on phone, tablet, desktop

---

## Android App Deployment

### Prerequisites

1. **Authorized Expo/EAS account** - Required for managed Android signing and build access.
2. **Android signing credential** - Reviewed or rotated in EAS or an approved external secret manager; never retained in this repository.
3. **Google Play Developer Account** - https://play.google.com/apps/publish ($25 one-time fee).
4. **Physical Android device** - Required for final pre-release validation.

### Configure Managed Signing

Use the authorized EAS account to configure or rotate Android credentials interactively:

```bash
npx eas-cli@latest credentials --platform android
```

Do not generate a keystore into this repository, paste its values into environment files, or document fingerprints and passwords in Markdown. If any signing material was previously exposed, rotate it before continuing.

### Build APK (for Testing)

```bash
# Start the EAS internal-distribution build
./scripts/build-android.sh apk
```

EAS provides the download link when the authorized build completes. Install and test that artifact on a physical Android device before requesting a production build.

**To install on a device:**

```bash
# Connect Android device via USB (enable USB debugging)
adb install path/to/app.apk
```

### Build App Bundle (for Play Store)

```bash
# Start the EAS production build
./scripts/build-android.sh aab
```

EAS produces the `.aab` in its build dashboard. Download it only after its signing configuration and release profile have been verified.

### Upload to Google Play Store

1. **Create Google Play Developer Account:**
   - Go to https://play.google.com/apps/publish
   - Pay $25 one-time fee
   - Complete account setup

2. **Create New App:**
   - Click "Create app"
   - Enter app name: "Snippet Bubbles"
   - Select category: "Productivity"
   - Fill in required information

3. **Upload App Bundle:**
   - Go to "Release" → "Production"
   - Click "Create new release"
   - Upload the `.aab` file
   - Review and confirm

4. **Add Store Listing:**
   - Go to "Store listing"
   - Add app description (see `android-build-config.md`)
   - Add screenshots (min 2, max 8)
   - Add app icon
   - Add feature graphic

5. **Set Pricing:**
   - Go to "Pricing & distribution"
   - Select "Free"
   - Choose countries for distribution

6. **Submit for Review:**
   - Review all information
   - Click "Submit for review"
   - Google reviews within 24-48 hours

### App Versioning

For future updates:

1. Increment version in `app.config.ts`:
   ```ts
   version: "1.0.1",  // Increment this
   ```

2. Increment `versionCode` in Android build:
   ```gradle
   versionCode 2  // Must be higher than previous
   versionName "1.0.1"
   ```

3. Rebuild and submit to Play Store

---

## Backend Setup

### Shared Backend

Both web and Android apps use the same backend:

- **API Base URL:** `https://api.snippet-bubbles.com` (or your domain)
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Session-based with cookies
- **AI Engine:** Built-in LLM (no external API keys)

### Environment Variables

Set these on your backend server:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/snippet_bubbles

# API
API_PORT=3000
API_BASE_URL=https://api.snippet-bubbles.com

# Session
SESSION_SECRET=your_secret_key_here

# CORS
CORS_ORIGIN=https://snippet-bubbles.com,https://www.snippet-bubbles.com
```

### Deploy Backend

**Option 1: Railway.app (Recommended)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

**Option 2: Render.com**

```bash
# Connect GitHub repository
# Configure environment variables
# Deploy automatically on push
```

**Option 3: Self-hosted**

```bash
# Build
pnpm build

# Start
NODE_ENV=production node dist/index.js
```

### Database Setup

```bash
# Generate migrations
pnpm db:push

# Verify database
psql $DATABASE_URL -c "SELECT * FROM snippets LIMIT 1;"
```

---

## Cross-Platform Testing

### Test Matrix

| Platform | Device | OS Version | Status |
|----------|--------|-----------|--------|
| Web | Desktop | Chrome/Edge 90+ | ✅ |
| Web | Desktop | Firefox 88+ | ✅ |
| Web | Desktop | Safari 14+ | ✅ |
| Web | Tablet | iPad OS 14+ | ✅ |
| Web | Tablet | Android 7+ | ✅ |
| PWA | Phone | Android 7+ | ✅ |
| PWA | Tablet | Android 7+ | ✅ |
| Native Android | Phone | Android 7-14 | ✅ |
| Native Android | Tablet | Android 7-14 | ✅ |

### Test Scenarios

1. **Authentication:**
   - Login on web
   - Login on Android
   - Verify same account works on both

2. **Data Sync:**
   - Create snippet on web
   - Verify visible on Android
   - Edit on Android
   - Verify updated on web

3. **AI Features:**
   - Generate snippet on web
   - Explain snippet on Android
   - Convert code on web
   - Verify all work correctly

4. **Offline:**
   - Use app offline on web (PWA)
   - Use app offline on Android
   - Verify data syncs when online

5. **Performance:**
   - Load 1000+ snippets
   - Search performance
   - AI generation speed
   - Memory usage

---

## Troubleshooting

### PWA Issues

**App not installable:**
- Verify `manifest.json` is served correctly
- Check browser console for errors
- Ensure HTTPS is enabled (PWA requires HTTPS)
- Verify service worker is registered

**Offline not working:**
- Check service worker in DevTools (Application → Service Workers)
- Verify cache is populated
- Check Network tab for failed requests

**Updates not appearing:**
- Service worker updates check every 60 seconds
- Force refresh with Ctrl+Shift+R
- Clear cache: DevTools → Application → Clear storage

### Android Issues

**Build fails:**
- Verify Android SDK is installed
- Check Java version: `java -version` (should be 11+)
- Ensure keystore file exists
- Verify environment variables are set

**App crashes on startup:**
- Check Android Studio logcat for errors
- Verify backend API is accessible
- Check network permissions in AndroidManifest.xml
- Test on emulator first

**APK won't install:**
- Device must be Android 7.0+ (API 24+)
- Uninstall previous version first
- Enable "Unknown sources" in device settings
- Check device storage (needs ~100MB free)

### Backend Issues

**API not accessible:**
- Verify backend is running: `curl https://api.snippet-bubbles.com/health`
- Check CORS configuration
- Verify database connection
- Check firewall rules

**Database connection fails:**
- Verify DATABASE_URL is correct
- Check database credentials
- Ensure database server is running
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

---

## Support & Resources

- **Expo Documentation:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev
- **Android Developer Guide:** https://developer.android.com
- **Google Play Console Help:** https://support.google.com/googleplay/android-developer
- **PWA Guide:** https://web.dev/progressive-web-apps/

---

## Verified Release Gates

1. **GitHub Pages:** The public Pages URLs currently return `404`. The repository owner must switch Pages to the existing GitHub Actions deployment source and confirm the next workflow run publishes the landing artifact.
2. **Repository authorization:** Authenticated remote reconciliation is currently blocked because the GitHub connector is disabled and cannot be enabled from this collaboration session.
3. **Android signing:** Any previously exposed signing credential must be rotated outside the repository and stored in EAS or an approved external secret manager.
4. **Android validation:** After rotation, create a preview APK, test it on physical Android hardware, and then authorize the first production EAS AAB build.
5. **Store publication:** Upload the AAB, complete the Play Console listing with the live privacy-policy URL, and submit only after device testing passes.

---

**Version:** 1.0.0  
**Last Updated:** 2026-08-11
**Status:** Code hardening is validated; public Pages and signed Android distribution remain owner-authorized launch gates.
