# ProStudio Mobile — Touch & Android Photo / PSD Studio

**ProStudio Mobile** is a high-performance, mobile-first layered raster photo and `.PSD` editor built for touchscreens (phones & tablets) and packaged as both a Progressive Web App (PWA) and a signed native **Android `.APK`**.

---

## Key Features

### 1. High-Performance Canvas Engine
- **On-Demand Dirty-Flag Compositor**: Zero idle CPU/GPU usage—the viewport redraws only when document pixels, selections, or view transforms change.
- **Fast Interactive Layer Sandwich Caching**: During brush strokes and layer dragging, static layers below and above the active layer are pre-composited once at `pointerdown`, bypassing per-frame adjustment layer evaluations for smooth 60fps painting and dragging.
- **Direct-Dab & Dirty-Rect Brush Engine**: Interpolated brush dabs render directly or composite only their localized dirty bounding box rather than clearing and copying the entire canvas on every pointer move.
- **Clamped Device Pixel Ratio**: Viewport buffer scales up to `2x` DPR with an opaque hardware-accelerated 2D backing store.

### 2. Storage Permission & Export Location Selector
- **Android Runtime Storage Permission**: Native bridge (`ProStudioAndroid`) checks and requests `READ_MEDIA_IMAGES` (Android 13+) and `WRITE_EXTERNAL_STORAGE` / `READ_EXTERNAL_STORAGE` (Android 12 and below).
- **Download / Export File Location Option**:
  - **Ask Where to Save / Pick Custom Folder...**: Launches Android's native `Intent.ACTION_CREATE_DOCUMENT` system folder/file picker or desktop/mobile `window.showSaveFilePicker` API so you can pick any directory on your device.
  - **Target Device Folders**: Choose **Downloads** (`/storage/emulated/0/Download`), **Pictures** (`/storage/emulated/0/Pictures`), **DCIM / Camera** (`/storage/emulated/0/DCIM`), or **Documents** (`/storage/emulated/0/Documents`).
  - **Custom Subfolder & Filename**: Configure a custom subfolder (e.g. `ProStudio`) and file name directly in the Storage & Export dialog.

### 3. Compact Dropdown Menus (No Horizontal Sliding Bars)
- **Top Header Dropdowns**:
  - **`File ▾`**: New Document, Open Photo / PSD, Load Studio Presets, Storage & Export Location, Quick Save `.PSD` / `.PNG` / `.JPG`, and Download Android `.APK`.
  - **`✨ Select ▾`**: One-tap **AI Select ➔ Subject**, All, Deselect, Invert, Feather, Expand, Contract, and Color Range.
  - **`fx ▾`**: Quick jump to Blending Options & 10 Layer Styles.
- **Left Floating `Brush ▾` Popover**: Replaces tall vertical on-canvas slider bars with a compact dropdown popover for Brush Size, Hardness, Opacity, Flow, and Color Swatches.
- **6-Group Bottom Tool Bar with Upward Flyout Dropdowns (`▴`)**: All 18 studio tools fit across 6 grouped buttons without horizontal scrolling. Tap an active group to open its upward dropdown flyout.

### 4. Complete Studio Toolset
- **Crop & Slice Suite**:
  - **Crop Tool (`C`)**: Rule-of-thirds grid, 8 handles, aspect ratio presets (`Free`, `1:1`, `4:5`, `16:9`, `9:16`, `4:3`, `3:2`), Straighten angle, and Rotate 90° CW/CCW.
  - **Perspective Crop Tool**: Interactive 4-corner homography mesh (`TL`, `TR`, `BR`, `BL`) that rectifies keystone-distorted photos into a flat rectangle via inverse bilinear/homography warping.
  - **Slice Tool & Slice Select Tool**: Drag user slices with auto-numbered badges, edit slice Name/URL/Target/Dimensions, and batch-export slices.
- **Type Tool (`T`) & Custom Font Importer**:
  - Upload downloaded `.ttf`, `.otf`, `.woff`, and `.woff2` font files at runtime via the `FontFace` API and persist them in `localStorage`.
  - Live non-destructive text editing with font size, tracking, line height, weight, italic, alignment, and optional text stroke.
- **Blending Options & 10 Layer Styles (`fx`)**:
  - **General Blending**: 17 Blend Modes, Opacity, **Fill Opacity** (independently fades layer pixels while keeping layer styles at full strength), **R/G/B Channel Toggles**, and **Blend If** luminance ramps.
  - **10 Layer Styles**: Drop Shadow, Inner Shadow, Outer Glow, Inner Glow, Bevel & Emboss, Satin, Color Overlay, Gradient Overlay, Pattern Overlay, and Stroke (`Outside`, `Inside`, `Center`).
- **AI Select ➔ Subject**:
  - Multi-cue foreground saliency segmentation combining corner/border background color modeling, center spatial prior, and Sobel edge density closure.

---

## Project Structure

```text
.
├── web/
│   ├── index.html               # Mobile studio UI with dropdown menus & storage modal
│   ├── styles.css               # Dark studio theme, dropdown popovers & 6-column tool dock
│   ├── app.js                   # On-demand canvas renderer, gestures, storage & tool controllers
│   ├── manifest.json            # PWA web manifest
│   ├── sw.js                    # Offline service worker
│   └── engine/
│       ├── studio-engine.js     # Document graph, history, layer styles (fx) & fast sandwich cache
│       ├── brush-engine.js      # Direct-dab & dirty-rect pressure brush engine
│       ├── algorithms.js        # 17 blend modes, adjustments, perspective warp & Select Subject
│       ├── psd-codec.js         # Binary Adobe .PSD parser & encoder
│       └── sample-projects.js   # Built-in multi-layer sample compositions
└── android/
    ├── build-apk.sh             # Standalone Android SDK 35 APK builder & v2/v3 signer
    ├── build.gradle             # Gradle project configuration
    └── src/main/
        ├── AndroidManifest.xml  # Storage permissions & hardware-accelerated activity
        └── java/com/prostudio/mobile/MainActivity.java
```

---

## Running Locally & Building the Android `.APK`

### Run the Web Studio
```bash
cd web
python3 -m http.server 8090
```

### Build the Signed Android `.APK`
```bash
./android/build-apk.sh
```
The signed, zipaligned APK is output to `web/prostudio-mobile.apk`.
