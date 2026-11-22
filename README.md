# PhotoCraft Mobile

**Touch-first Mobile & Native Android (`.APK`) version of [PhotoCraft (`storytold/photocraft`)](https://github.com/storytold/photocraft)** — an open-source, clean-room layered photo and `.PSD` editor.

---

## Features

### 1. Photoshop Crop & Slice Tool Family
- **Crop Tool**: Rule of Thirds, Grid, Diagonal, and Golden Ratio overlays; aspect ratio presets (`Free`, `1:1`, `4:5`, `16:9`, `9:16`); and **Straighten (`-45°..+45°`)**.
- **Perspective Crop Tool (`image.perspectiveCrop`)**: 4 independent draggable corner pins (`TL`, `TR`, `BR`, `BL`) with an interpolated projective perspective mesh (`Show Grid`), convexity validation, and an 8-DOF 3×3 projective homography solver with bilinear sub-pixel sampling across all layers.
- **Slice Tool & Slice Select Tool (`slice.new`, `slice.fromLayer`, `slice.divide`, `slice.delete`)**:
  - Draw numbered user slices (`01`, `02`...) or generate slices automatically from a layer's pixel bounds.
  - Auto-computes surrounding dotted auto-slices (`Hide Auto Slices` toggle).
  - Select, move, resize, divide horizontally & vertically (`Divide Slice...`), edit slice name/URL/alt-tag/format (`Slice Options...`), and batch-export slices as individual `.PNG` or `.JPG` files.

### 2. Type Tool & Downloaded Font Importer (`.ttf`, `.otf`, `.woff`, `.woff2`)
- **Import Downloaded Fonts**: Pick any downloaded `.ttf`, `.otf`, `.woff`, or `.woff2` font file from device storage; dynamically registers via the `FontFace` API with local persistence.
- **Full Typography Controls**: **Horizontal Type** and **Vertical Type (縦書き)**, Font Family, Weight (`400`–`900`), Italic, Font Size, **Tracking (Letter-Spacing)**, **Leading (Line-Height)**, Text Alignment, and **Warp Text** (`Arc Upper`, `Arc Lower`, `Flag / Sine Wave`).

### 3. Complete Blending Options & 10 Layer Styles (`fx`)
- **Blending Options**:
  - **16 Blend Modes** (`Normal`, `Multiply`, `Screen`, `Overlay`, `Darken`, `Lighten`, `Color Dodge`, `Color Burn`, `Hard Light`, `Soft Light`, `Difference`, `Exclusion`, `Hue`, `Saturation`, `Color`, `Luminosity`).
  - **Layer Opacity (0–100%)** & **Fill Opacity (0–100%)** (scales layer interior pixels while keeping all Layer Styles at 100% strength).
  - **Advanced Channels (`R`, `G`, `B`)** toggles and **Blend If (This Layer Shadows / Highlights clip)** sliders.
- **10 Live Layer Effects (`fx`)**:
  - **Stroke** (`Outside`, `Inside`, `Center`; Solid Color or Gradient fill)
  - **Color Overlay** (Blend Mode, Color, Opacity)
  - **Gradient Overlay** (`Linear`, `Radial`, `Reflected`; Angle, Scale, Start/End colors)
  - **Pattern Overlay** (`Diagonal Stripes`, `Checkerboard`, `Polka Dots`, `Technical Grid`)
  - **Drop Shadow** & **Inner Shadow** (Blend Mode, Color, Opacity, Angle, Distance, Size/Blur)
  - **Outer Glow** & **Inner Glow** (Blend Mode, Color, Opacity, Size)
  - **Bevel & Emboss** (Depth, Size, Soften, Light Angle, Highlight & Shadow controls)
  - **Satin** (Color, Opacity, Distance, Size, Invert)
  - Plus **Copy Layer Style**, **Paste Layer Style**, and **Clear All fx**.

### 4. Select ➔ Subject & Selection Suite
- **Select ➔ Subject (`selection.subject`)**: Multi-edge frame backdrop color clustering + perceptual saliency + Otsu adaptive threshold + exterior background flood-fill with pixel-accurate silhouette Marching Ants.
- **One-Tap Subject Actions**: **Cutout to New Layer (`Layer via Copy ⌘J`)**, **Convert Selection to Layer Mask**, **Feather Selection**, **Invert Selection**, plus Rectangular Marquee, Elliptical Marquee, Freehand Lasso, and Magic Wand.

### 5. Clean-Room Binary `.PSD` Reader & Writer + Scopes & Filters
- **Binary `.PSD` (`8BPS`) Import & Export**: Opens multi-layer Adobe Photoshop `.PSD` files (Raw & RLE PackBits) and exports layered `.PSD`, `.PNG`, `.JPG`, and `.WEBP`.
- **Non-Destructive Adjustments & Scopes**: Interactive **Curves Spline Editor** (per-channel `RGB`, `R`, `G`, `B`) over a live **256-bin RGB Histogram**; **Levels Editor** with `Mean`, `Std Dev`, `Median`, and `Pixels` stats; Vibrance, Hue/Saturation, Brightness/Contrast, Black & White, Photo Filter, and Invert.
- **Live Filter Gallery**: Gaussian Blur, Motion Blur, Unsharp Mask, Twirl Distort, Wave Ripple, Mosaic Pixelate, Lens Vignette, Film Grain Noise, and Stylize Emboss with **Hold to Compare** preview.

---

## Project Structure

```text
photocraft-mobile/
├── web/
│   ├── index.html                  # Mobile touch app shell
│   ├── styles.css                  # PhotoCraft theme tokens (Pro Dark, Pro Medium, Breeze Dark, Pro Light)
│   ├── app.js                      # Multi-touch viewport, tools, modals & Android bridge controller
│   ├── photocraft-mobile.apk       # Prebuilt, v2/v3-signed installable Android APK
│   ├── engine/
│   │   ├── photocraft-engine.js    # Document model, compositor, slices, type engine & command registry
│   │   ├── algorithms.js           # Curves, Histogram, Perspective Homography, Select Subject & Layer Styles
│   │   ├── brush-engine.js         # Brush dabs, hardness, smoothing, spot heal, flood fill & gradients
│   │   ├── psd-codec.js            # Clean-room binary 8BPS .PSD reader & writer
│   │   └── sample-projects.js      # Built-in multi-layer showcase PSD documents
│   └── assets/                     # Official PhotoCraft icons & Inter / JetBrains Mono fonts
└── android/
    ├── build-apk.sh                # Standalone Android SDK 35 APK builder (aapt2, javac, d8, zipalign, apksigner)
    ├── build.gradle
    ├── settings.gradle
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/ai/storyteller/photocraft/mobile/MainActivity.java
        └── res/
```

## Running Locally

```bash
python3 -m http.server 8090 --directory web
```

## Rebuilding the Native Android `.APK`

```bash
./android/build-apk.sh
```
