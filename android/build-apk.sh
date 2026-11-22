#!/usr/bin/env bash
# ==============================================================================
# ProStudio Mobile — Self-Contained Native Android APK Builder
# Uses Android SDK 35 (aapt2, javac, d8, zipalign, apksigner)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ANDROID_SDK="${ANDROID_HOME:-/opt/android-sdk}"
BUILD_TOOLS="$ANDROID_SDK/build-tools/35.0.0"
PLATFORM_JAR="$ANDROID_SDK/platforms/android-35/android.jar"

AAPT2="$BUILD_TOOLS/aapt2"
D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"
APKSIGNER="$BUILD_TOOLS/apksigner"

BUILD_DIR="$SCRIPT_DIR/build"
STAGING_ASSETS="$BUILD_DIR/staging_assets/www"
RES_DIR="$SCRIPT_DIR/src/main/res"
MANIFEST="$SCRIPT_DIR/src/main/AndroidManifest.xml"
JAVA_SRC="$SCRIPT_DIR/src/main/java/com/prostudio/mobile/MainActivity.java"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/compiled_res" \
         "$BUILD_DIR/gen" \
         "$BUILD_DIR/classes" \
         "$BUILD_DIR/dex" \
         "$STAGING_ASSETS"

echo "[1/7] Copying ProStudio Mobile launcher icons into Android mipmap directories..."
mkdir -p "$RES_DIR/mipmap-mdpi" \
         "$RES_DIR/mipmap-hdpi" \
         "$RES_DIR/mipmap-xhdpi" \
         "$RES_DIR/mipmap-xxhdpi" \
         "$RES_DIR/mipmap-xxxhdpi"

cp "$APP_ROOT/web/assets/icons/icon-64.png" "$RES_DIR/mipmap-mdpi/ic_launcher.png"
cp "$APP_ROOT/web/assets/icons/icon-64.png" "$RES_DIR/mipmap-hdpi/ic_launcher.png"
cp "$APP_ROOT/web/assets/icons/icon-128.png" "$RES_DIR/mipmap-xhdpi/ic_launcher.png"
cp "$APP_ROOT/web/assets/icons/icon-256.png" "$RES_DIR/mipmap-xxhdpi/ic_launcher.png"
cp "$APP_ROOT/web/assets/icons/icon-512.png" "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png"

echo "[2/7] Bundling ProStudio Mobile web engine into Android APK assets/www/..."
cp -r "$APP_ROOT/web/"* "$STAGING_ASSETS/"
rm -f "$STAGING_ASSETS/prostudio-mobile.apk"

echo "[3/7] Compiling Android resources with aapt2..."
"$AAPT2" compile --dir "$RES_DIR" -o "$BUILD_DIR/compiled_res/resources.zip"

"$AAPT2" link \
  -I "$PLATFORM_JAR" \
  --manifest "$MANIFEST" \
  -A "$BUILD_DIR/staging_assets" \
  -o "$BUILD_DIR/unaligned.apk" \
  --java "$BUILD_DIR/gen" \
  --auto-add-overlay \
  "$BUILD_DIR/compiled_res/resources.zip"

echo "[4/7] Compiling MainActivity.java and R.java against Android 35 SDK..."
find "$BUILD_DIR/gen" -name "*.java" > "$BUILD_DIR/sources.txt"
echo "$JAVA_SRC" >> "$BUILD_DIR/sources.txt"

javac --release 11 \
  -cp "$PLATFORM_JAR" \
  -d "$BUILD_DIR/classes" \
  @"$BUILD_DIR/sources.txt"

echo "[5/7] Converting JVM bytecode to Dalvik DEX format with d8..."
CLASS_FILES=$(find "$BUILD_DIR/classes" -name "*.class")
"$D8" --lib "$PLATFORM_JAR" \
  --min-api 26 \
  --output "$BUILD_DIR/dex" \
  $CLASS_FILES

echo "[6/7] Packaging classes.dex and aligning APK with zipalign..."
(cd "$BUILD_DIR/dex" && zip -q "$BUILD_DIR/unaligned.apk" classes.dex)
"$ZIPALIGN" -f -p 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"

echo "[7/7] Signing APK with v2/v3 Android signature and verifying..."
KEYSTORE="$BUILD_DIR/debug.keystore"
keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE" \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=ProStudio Mobile, OU=Studio, O=ProStudio, L=San Francisco, ST=CA, C=US" >/dev/null 2>&1

FINAL_APK="$BUILD_DIR/prostudio-mobile.apk"
"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --ks-key-alias androiddebugkey \
  --out "$FINAL_APK" \
  "$BUILD_DIR/aligned.apk"

"$APKSIGNER" verify --verbose "$FINAL_APK"

cp "$FINAL_APK" "$APP_ROOT/web/prostudio-mobile.apk"
echo "Successfully built and verified signed APK:"
ls -lh "$FINAL_APK" "$APP_ROOT/web/prostudio-mobile.apk"
