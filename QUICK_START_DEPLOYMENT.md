# Quick Start: Deploy Snippet Bubbles

Everything is ready to deploy. Follow these steps to get live.

---

## 🌐 Deploy PWA to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
cd /home/ubuntu/snippet-bubble-manager
git add .
git commit -m "Add PWA and Android build support"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Select your GitHub repository
4. Vercel auto-detects Expo project
5. Click "Deploy"

**That's it!** Your PWA is live in ~2 minutes.

### Step 3: Test Installation

- **Desktop:** Open app URL → Click install icon in address bar
- **Android:** Open app URL in Chrome → Menu → "Install app"
- **iPhone:** Open app URL in Safari → Share → "Add to Home Screen"

---

## 🤖 Build Android APK/AAB (15 minutes)

### Step 1: Set Environment Variables

```bash
export KEYSTORE_PASSWORD="SnippetBubbles2026!"
export KEY_ALIAS="snippet-bubbles-key"
export KEY_PASSWORD="SnippetBubbles2026!"
```

### Step 2: Build APK (for testing)

```bash
cd /home/ubuntu/snippet-bubble-manager
./scripts/build-android.sh apk
```

This creates a signed APK you can test on Android devices.

### Step 3: Build App Bundle (for Play Store)

```bash
./scripts/build-android.sh aab
```

This creates an App Bundle ready for Google Play Store submission.

---

## 📱 Upload to Google Play Store (30 minutes)

### Step 1: Create Developer Account

1. Go to https://play.google.com/apps/publish
2. Pay $25 one-time fee
3. Complete account setup

### Step 2: Create New App

1. Click "Create app"
2. Enter name: "Snippet Bubbles"
3. Select category: "Productivity"
4. Accept policies

### Step 3: Upload App Bundle

1. Go to "Release" → "Production"
2. Click "Create new release"
3. Upload the `.aab` file from build
4. Review and confirm

### Step 4: Add Store Listing

1. Go to "Store listing"
2. Add description:
   ```
   Snippet Bubbles is an AI-powered code snippet manager that helps 
   developers save, organize, and reuse code snippets across projects.
   
   Features:
   - 🤖 AI-powered snippet generation
   - 💡 Explain any code snippet
   - 🔄 Convert between programming languages
   - 🏷️ Organize with tags and collections
   - 🔍 Advanced search with regex
   - 📱 Works offline (PWA)
   - 🎨 Dark mode support
   ```
3. Add screenshots (min 2, max 8)
4. Add app icon
5. Add feature graphic

### Step 5: Set Pricing

1. Go to "Pricing & distribution"
2. Select "Free"
3. Choose countries

### Step 6: Submit for Review

1. Review all information
2. Click "Submit for review"
3. Google reviews within 24-48 hours

---

## 📋 Checklist

### PWA Deployment
- [ ] Push code to GitHub
- [ ] Connect to Vercel
- [ ] Test installation on desktop
- [ ] Test installation on Android
- [ ] Test offline functionality
- [ ] Verify all features work

### Android Deployment
- [ ] Generate signing key (✅ Done)
- [ ] Build APK for testing
- [ ] Test on Android device
- [ ] Build App Bundle
- [ ] Create Play Store account
- [ ] Upload App Bundle
- [ ] Add store listing
- [ ] Add screenshots
- [ ] Submit for review

---

## 🔗 Important Links

- **Vercel:** https://vercel.com
- **GitHub:** https://github.com
- **Google Play Console:** https://play.google.com/apps/publish
- **Android Developer:** https://developer.android.com
- **Deployment Guide:** See `DEPLOYMENT.md`
- **Android Build Config:** See `android-build-config.md`
- **Signing Credentials:** See `ANDROID_SIGNING_CREDENTIALS.md`

---

## 🆘 Troubleshooting

### PWA not installing
- Ensure HTTPS is enabled
- Check browser console for errors
- Verify manifest.json is accessible

### Android build fails
- Verify Java is installed: `java -version`
- Check Android SDK: `$ANDROID_HOME/tools/bin/sdkmanager --list`
- Ensure environment variables are set

### App crashes on startup
- Check backend API is running
- Verify database connection
- Test on emulator first

---

## 📞 Support

For detailed instructions, see:
- `DEPLOYMENT.md` - Complete deployment guide
- `android-build-config.md` - Android-specific setup
- `ANDROID_SIGNING_CREDENTIALS.md` - Signing key details

---

**Status:** ✅ Ready for production deployment  
**Version:** 1.0.0  
**Last Updated:** June 8, 2026
