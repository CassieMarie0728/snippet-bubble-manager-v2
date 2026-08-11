#!/bin/bash

# Android Build Script
# Starts current EAS builds or prepares a local Android Studio project.

set -e

echo "🤖 Building Snippet Bubbles for Android..."
echo ""

# Determine build type
BUILD_TYPE="${1:-apk}"

if [ "$BUILD_TYPE" = "apk" ]; then
  echo "📦 Starting an internal-distribution APK build through EAS..."
  npx eas-cli@latest build --platform android --profile preview
  echo ""
  echo "✅ APK build complete!"
  echo "📥 Download from Expo build dashboard"
  
elif [ "$BUILD_TYPE" = "aab" ] || [ "$BUILD_TYPE" = "app-bundle" ]; then
  echo "📦 Starting a Play Store App Bundle build through EAS..."
  npx eas-cli@latest build --platform android --profile production
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
  echo "  3. Signing credentials configured locally or through EAS"
  echo ""
  
  # Check for Android SDK
  if [ -z "$ANDROID_HOME" ]; then
    echo "❌ Error: ANDROID_HOME environment variable not set"
    echo "Set it to your Android SDK location, e.g.:"
    echo "  export ANDROID_HOME=~/Android/Sdk"
    exit 1
  fi
  
  echo "Generating the native Android project for Android Studio..."
  npx expo prebuild --platform android
  echo "Open ./android in Android Studio, configure a release signing key outside Git, then build a release variant."
  
  echo ""
  echo "✅ Android Studio project generated."
  
else
  echo "❌ Unknown build type: $BUILD_TYPE"
  echo ""
  echo "Usage:"
  echo "  ./scripts/build-android.sh apk       - EAS internal APK build"
  echo "  ./scripts/build-android.sh aab       - EAS production App Bundle build"
  echo "  ./scripts/build-android.sh local     - Generate an Android Studio project"
  exit 1
fi

echo ""
echo "Next steps:"
echo "  1. Review android-build-config.md for detailed instructions"
echo "  2. Test the build on multiple devices"
echo "  3. Upload to Google Play Console"
echo "  4. Fill in store listing and submit for review"
