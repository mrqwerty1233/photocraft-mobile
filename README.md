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

### 3. Customizable Photoshop Workspace, Settings Tab & Startup Canvas Selector
- **Photoshop-Style "New Document" Start Screen**: Launches directly into document canvas selection (`Recent`, `Saved`, `Photo`, `Print`, `Art & Illustration`, `Web`, `Mobile`, `Film & Video`) with Preset Details (`Width`/`Height` in `px`/`in`/`cm`/`mm`/`pt`, Portrait/Landscape orientation, Resolution, Color Mode, Bit Depth, Background Contents, and Save Custom Preset).
- **Dedicated `Settings` Tab (Replaces `Storage/PSD`)**:
  - **Toolbar Dock Location**: Switch instantly between **Bottom**, **Top**, **Left Side (Photoshop)**, and **Right Side** (with 1-column or 2-column vertical layouts).
  - **Move Toolbar Freely Toggle**: Detach the toolbar and drag it freely anywhere over the canvas via its top grip bar (`⋮⋮`), with automatic smart left/right flyout menus.
  - **Customize Toolbar Items**: Show or hide individual tool groups and pin direct quick-access buttons (`Eraser`, `Select Subject`, `Perspective Crop`, `Eyedropper`, `Hand`, `Layer Style fx`) or apply one-tap workspace presets.
  - **Storage & Export Controls**: Integrated Storage Permission request, default export folder selector, theme switcher, and history jumper.
- **Right-Side Docked Layers Panel with Toggle Hide/Show Side Arrow (`«` / `»`)**:
  - Slide out Photoshop's right-side **Layers** & **Swatches** panel anytime via the right edge toggle arrow or bottom `Layers` tab, complete with expandable `Effects` sub-trees and the bottom quick-action icon bar (`fx`, `Mask`, `Adj`, `Dup`, `+New`, `Delete`).
- **Top Header Dropdowns**: `File ▾`, `✨ Select ▾`, `fx ▾`, and left `Brush ▾` popover dropdowns.

### 4. Complete Studio Toolset & Photoshop-Exact Layer Style (`fx`)
- **Crop & Slice Suite**:
  - **Crop Tool (`C`)**: Rule-of-thirds grid, 8 handles, aspect ratio presets, Straighten angle, and Rotate 90° CW/CCW.
  - **Perspective Crop Tool**: Interactive 4-corner homography mesh (`TL`, `TR`, `BR`, `BL`) for keystone rectification.
  - **Slice Tool & Slice Select Tool**: Drag user slices with auto-numbered badges, divide slices, and batch-export slices.
- **Type Tool (`T`) & Custom Font Importer**:
  - Import downloaded `.ttf`, `.otf`, `.woff`, and `.woff2` fonts at runtime via the `FontFace` API.
- **100% Photoshop-Exact Layer Style (`fx`) Dialog**:
  - All 14 sections (`Styles`, `Blending Options`, `Bevel & Emboss` ➔ `Contour` & `Texture`, stackable `+` `Stroke`, `Inner Shadow`, `Color Overlay`, `Gradient Overlay`, `Drop Shadow`, plus `Inner Glow`, `Satin`, `Pattern Overlay`, `Outer Glow`), 27 Blend Modes, 12 Contour Curves, Global Light, Blend If (`This Layer` & `Underlying Layer` with Split handles), Live Preview box, `[✓] Preview`, `OK`/`Cancel` rollback, `New Style...`, and `Make Default`/`Reset to Default`.
- **AI Select ➔ Subject**:
  - Multi-cue foreground saliency segmentation.

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
