#!/bin/bash

# PWA Build Script
# Builds the web app with PWA support

set -e

echo "🔨 Building Snippet Bubbles PWA..."

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Build web app
echo "Building web app..."
npx expo export --platform web

# Verify manifest and service worker
echo "Verifying PWA files..."
if [ ! -f "dist/manifest.json" ]; then
  echo "⚠️  manifest.json not found in dist/"
  echo "Copying manifest.json..."
  cp public/manifest.json dist/
fi

if [ ! -f "dist/service-worker.js" ]; then
  echo "⚠️  service-worker.js not found in dist/"
  echo "Copying service-worker.js..."
  cp public/service-worker.js dist/
fi

# Verify index.html has PWA meta tags
if ! grep -q "manifest.json" dist/index.html; then
  echo "⚠️  PWA manifest link not found; injecting it into Expo's generated entry..."
  sed -i '/<\/head>/i\    <link rel="manifest" href="/manifest.json" />\n    <meta name="theme-color" content="#981518" />' dist/index.html
fi

if ! grep -q "service-worker.js" dist/index.html; then
  echo "⚠️  Service worker registration not found; injecting it without replacing the app bundle..."
  sed -i '/<\/body>/i\    <script>if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("/service-worker.js").catch(function () {}); }); }</script>' dist/index.html
fi

echo "✅ PWA build complete!"
echo ""
echo "📦 Build output: dist/"
echo ""
echo "To serve locally:"
echo "  npx http-server dist/"
echo ""
echo "To deploy to Vercel:"
echo "  vercel --prod"
echo ""
echo "To deploy to Netlify:"
echo "  netlify deploy --prod --dir=dist"
