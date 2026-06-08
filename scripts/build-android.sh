#!/bin/bash

# Android Build Script
# Builds signed APK and App Bundle for Google Play Store

set -e

echo "🤖 Building Snippet Bubbles for Android..."
echo ""

# Check for keystore
if [ ! -f "snippet-bubbles.keystore" ]; then
  echo "❌ Error: snippet-bubbles.keystore not found"
  echo ""
  echo "To generate a signing key, run:"
  echo "  keytool -genkey -v -keystore snippet-bubbles.keystore \\"
  echo "    -keyalg RSA -keysize 2048 -validity 10000 \\"
  echo "    -alias snippet-bubbles-key"
  echo ""
  exit 1
fi

# Check for required environment variables
if [ -z "$KEYSTORE_PASSWORD" ]; then
  echo "❌ Error: KEYSTORE_PASSWORD environment variable not set"
  exit 1
fi

if [ -z "$KEY_ALIAS" ]; then
  echo "❌ Error: KEY_ALIAS environment variable not set"
  exit 1
fi

if [ -z "$KEY_PASSWORD" ]; then
  echo "❌ Error: KEY_PASSWORD environment variable not set"
  exit 1
fi

# Determine build type
BUILD_TYPE="${1:-apk}"

if [ "$BUILD_TYPE" = "apk" ]; then
  echo "📦 Building APK (for testing)..."
  npx expo build:android -t apk
  echo ""
  echo "✅ APK build complete!"
  echo "📥 Download from Expo build dashboard"
  
elif [ "$BUILD_TYPE" = "aab" ] || [ "$BUILD_TYPE" = "app-bundle" ]; then
  echo "📦 Building App Bundle (for Play Store)..."
  npx expo build:android -t app-bundle
  echo ""
  echo "✅ App Bundle build complete!"
  echo "📥 Download from Expo build dashboard"
  echo "📤 Upload to Google Play Console"
  
elif [ "$BUILD_TYPE" = "local" ]; then
  echo "📦 Building locally with Android Studio..."
  echo ""
  echo "Prerequisites:"
  echo "  1. Android Studio installed"
  echo "  2. Android SDK configured"
  echo "  3. Keystore file present"
  echo ""
  
  # Check for Android SDK
  if [ -z "$ANDROID_HOME" ]; then
    echo "❌ Error: ANDROID_HOME environment variable not set"
    echo "Set it to your Android SDK location, e.g.:"
    echo "  export ANDROID_HOME=~/Android/Sdk"
    exit 1
  fi
  
  echo "Building locally..."
  cd android
  ./gradlew assembleRelease
  cd ..
  
  echo ""
  echo "✅ Local build complete!"
  echo "📦 APK location: android/app/build/outputs/apk/release/"
  
else
  echo "❌ Unknown build type: $BUILD_TYPE"
  echo ""
  echo "Usage:"
  echo "  ./scripts/build-android.sh apk       - Build APK for testing"
  echo "  ./scripts/build-android.sh aab       - Build App Bundle for Play Store"
  echo "  ./scripts/build-android.sh local     - Build locally with Android Studio"
  exit 1
fi

echo ""
echo "Next steps:"
echo "  1. Review android-build-config.md for detailed instructions"
echo "  2. Test the build on multiple devices"
echo "  3. Upload to Google Play Console"
echo "  4. Fill in store listing and submit for review"
