/* ============================================================================
 * PhotoCraft Mobile — Main Interactive UI & Multi-Touch Viewport Controller
 * Includes:
 * - Crop Tool, Perspective Crop Tool (4-corner homography), Slice Tool & Slice Select Tool
 * - Text Tool with Downloaded Font Importer (.ttf, .otf, .woff, .woff2 via FontFace API)
 * - Full Photoshop Blending Options & 10 Layer Styles (Stroke, Color/Gradient/Pattern Overlay,
 *   Drop/Inner Shadow, Outer/Inner Glow, Bevel & Emboss, Satin, Fill Opacity, RGB Channels, Blend If)
 * - Select -> Subject (Saliency & Backdrop Cut with Silhouette Marching Ants & Cutout via Copy)
 * ============================================================================ */

import { Algorithms } from './engine/algorithms.js';
import { PsdCodec } from './engine/psd-codec.js';
import { BrushEngine, BRUSH_PRESETS } from './engine/brush-engine.js';
import { PhotoCraftDoc, PhotoCraftSession, BLEND_MODES } from './engine/photocraft-engine.js';
import { SampleProjects } from './engine/sample-projects.js';

const PRESET_SWATCHES = [
  '#378ef0', '#1d68c4', '#2ec4b6', '#38c172', '#f59e0b', '#ec5b62', '#e11d48', '#ffffff',
  '#d4d4d8', '#71717a', '#27272a', '#09090b', '#1e4e82', '#f6f2e8', '#e8d7b9', '#8d8b86'
];

const BUILTIN_FONTS = [
  { family: 'Inter, sans-serif', label: 'Inter (PhotoCraft UI)' },
  { family: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
  { family: 'Georgia, serif', label: 'Georgia Serif' },
  { family: '"Times New Roman", serif', label: 'Times New Roman' },
  { family: 'Impact, sans-serif', label: 'Impact Display' },
  { family: '"Courier New", monospace', label: 'Courier Typewriter' },
  { family: 'system-ui, sans-serif', label: 'System Sans' }
];

const FILTER_CATALOG = [
  {
    id: 'gaussianBlur',
    name: 'Gaussian Blur',
    defaults: { radius: 10 },
    controls: [{ key: 'radius', label: 'Radius (px)', min: 1, max: 60, step: 1 }]
  },
  {
    id: 'motionBlur',
    name: 'Motion Blur',
    defaults: { distance: 22, angle: 25 },
    controls: [
      { key: 'distance', label: 'Distance (px)', min: 2, max: 90, step: 1 },
      { key: 'angle', label: 'Angle (°)', min: -180, max: 180, step: 1 }
    ]
  },
  {
    id: 'unsharpMask',
    name: 'Unsharp Mask',
    defaults: { amount: 140, radius: 4, threshold: 2 },
    controls: [
      { key: 'amount', label: 'Amount (%)', min: 20, max: 300, step: 5 },
      { key: 'radius', label: 'Radius (px)', min: 1, max: 25, step: 1 },
      { key: 'threshold', label: 'Threshold', min: 0, max: 30, step: 1 }
    ]
  },
  {
    id: 'twirl',
    name: 'Twirl Distort',
    defaults: { angle: 160, radiusPct: 80 },
    controls: [
      { key: 'angle', label: 'Angle (°)', min: -360, max: 360, step: 5 },
      { key: 'radiusPct', label: 'Reach (%)', min: 15, max: 100, step: 1 }
    ]
  },
  {
    id: 'wave',
    name: 'Wave Ripple',
    defaults: { amplitude: 16, wavelength: 52 },
    controls: [
      { key: 'amplitude', label: 'Amplitude', min: 2, max: 60, step: 1 },
      { key: 'wavelength', label: 'Wavelength', min: 12, max: 160, step: 2 }
    ]
  },
  {
    id: 'pixelate',
    name: 'Mosaic Pixelate',
    defaults: { cellSize: 14 },
    controls: [{ key: 'cellSize', label: 'Cell Size (px)', min: 2, max: 64, step: 1 }]
  },
  {
    id: 'vignette',
    name: 'Lens Vignette',
    defaults: { amount: 60, midpoint: 48 },
    controls: [
      { key: 'amount', label: 'Darkness (%)', min: 0, max: 100, step: 1 },
      { key: 'midpoint', label: 'Midpoint (%)', min: 10, max: 90, step: 1 }
    ]
  },
  {
    id: 'noise',
    name: 'Film Grain Noise',
    defaults: { amount: 24, monochromatic: true },
    controls: [{ key: 'amount', label: 'Amount (%)', min: 1, max: 80, step: 1 }]
  },
  {
    id: 'emboss',
    name: 'Stylize Emboss',
    defaults: { height: 2, amount: 140 },
    controls: [
      { key: 'height', label: 'Height (px)', min: 1, max: 6, step: 1 },
      { key: 'amount', label: 'Amount (%)', min: 30, max: 250, step: 5 }
    ]
  }
];

class PhotoCraftMobileApp {
  constructor() {
    this.session = new PhotoCraftSession();
    this.brush = new BrushEngine();

    // Active Tool & Sub-modes
    this.activeTool = 'brush';
    this.selectMode = 'rect'; // 'rect' | 'ellipse' | 'lasso' | 'wand'
    this.fillMode = 'bucket'; // 'bucket' | 'gradient'
    this.toneMode = 'dodge'; // 'dodge' | 'burn'
    this.shapeMode = 'rect'; // 'rect' | 'ellipse' | 'polygon' | 'star'
    this.wandTolerance = 34;

    // Imported Custom Fonts Registry
    this.importedFonts = []; // [{ family, label, fileName }]
    this.activeFontFamily = BUILTIN_FONTS[0].family;

    // Active Colors
    this.fgColor = '#378ef0';
    this.bgColor = '#f6f2e8';

    // Viewport Camera (Zoom & Pan)
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    // Active Slide-Up Sheet ('none' | 'layers' | 'adjustments' | 'filters' | 'project')
    this.activeSheet = 'none';
    this.activeAdjustTab = 'curves';
    this.activeCurveChannel = 'rgb';
    this.curvePoints = {
      rgb: [[0, 0], [72, 58], [184, 202], [255, 255]],
      r: [[0, 0], [255, 255]],
      g: [[0, 0], [255, 255]],
      b: [[0, 0], [255, 255]]
    };
    this.levelsParams = { inBlack: 0, gamma: 1.0, inWhite: 255, outBlack: 0, outWhite: 255 };
    this.adjSliders = {
      brightness: 0,
      contrast: 0,
      hue: 0,
      saturation: 0,
      lightness: 0,
      vibrance: 24,
      vibSat: 8,
      photoColor: '#ec8a00',
      photoDensity: 28
    };

    // Active Filter Selection
    this.activeFilterId = 'gaussianBlur';
    this.activeFilterParams = { radius: 10 };
    this.compareOriginal = false;

    // 1. Standard Crop Tool State
    this.cropBox = null;
    this.cropAspect = 'free'; // 'free' | '1:1' | '4:5' | '16:9' | '9:16'
    this.cropGridMode = 'thirds'; // 'thirds' | 'grid' | 'diagonal' | 'golden'
    this.cropAngle = 0; // -45..45 degrees

    // 2. Perspective Crop Tool State (4-corner homography quad: TL, TR, BR, BL)
    this.perspectiveQuad = null; // [{x,y}, {x,y}, {x,y}, {x,y}]
    this.perspectiveShowGrid = true;
    this.perspectiveOutW = 0;
    this.perspectiveOutH = 0;

    // 3. Slice Tool & Slice Select Tool State
    this.sliceConstraint = 'normal'; // 'normal' | 'fixedRatio' | 'fixedSize'

    // Pointer / Multi-Touch Gesture State
    this.pointers = new Map();
    this.pinchStartDist = 0;
    this.pinchStartZoom = 1;
    this.pinchStartCenter = null;
    this.pinchStartPan = null;
    this.multiTouchMaxCount = 0;
    this.multiTouchStartTime = 0;
    this.multiTouchMoved = false;

    this.toolDrag = null;
    this.antsOffset = 0;
    this.theme = 'pro-dark';

    this.initDOM();
    this.restorePersistedFonts();
    this.loadDocument(SampleProjects.createGreatWaveShowcase());
    this.startAnimationLoop();
  }

  get allFonts() {
    return [...this.importedFonts, ...BUILTIN_FONTS];
  }

  initDOM() {
    this.viewportCanvas = document.getElementById('viewport-canvas');
    this.viewportCtx = this.viewportCanvas.getContext('2d');
    this.workspaceEl = document.getElementById('canvas-workspace');

    if (window.PhotoCraftAndroid || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
      document.getElementById('outer-environment').classList.remove('phone-frame-mode');
      const banner = document.getElementById('desktop-host-banner');
      if (banner && window.PhotoCraftAndroid) banner.style.display = 'none';
    }

    document.getElementById('btn-frame-phone')?.addEventListener('click', () => {
      document.getElementById('outer-environment').classList.add('phone-frame-mode');
      document.getElementById('btn-frame-phone').classList.add('active');
      document.getElementById('btn-frame-full').classList.remove('active');
      setTimeout(() => this.fitCanvasToViewport(), 260);
    });
    document.getElementById('btn-frame-full')?.addEventListener('click', () => {
      document.getElementById('outer-environment').classList.remove('phone-frame-mode');
      document.getElementById('btn-frame-full').classList.add('active');
      document.getElementById('btn-frame-phone').classList.remove('active');
      setTimeout(() => this.fitCanvasToViewport(), 260);
    });

    // Top bar actions
    document.getElementById('btn-undo').addEventListener('click', () => {
      if (this.session.doc?.canUndo()) {
        this.session.dispatch('edit.undo');
        this.hapticTick();
        this.showToast('Undo');
      }
    });
    document.getElementById('btn-redo').addEventListener('click', () => {
      if (this.session.doc?.canRedo()) {
        this.session.dispatch('edit.redo');
        this.hapticTick();
        this.showToast('Redo');
      }
    });
    document.getElementById('btn-select-menu').addEventListener('click', () => this.openSelectMenuModal());
    document.getElementById('hud-zoom-badge').addEventListener('click', () => this.fitCanvasToViewport());
    document.getElementById('hud-fx-badge').addEventListener('click', () => this.openLayerStylesModal());
    document.getElementById('hud-active-layer').addEventListener('click', () => this.toggleSheet('layers'));
    document.getElementById('btn-open-project-sheet').addEventListener('click', () => this.toggleSheet('project'));
    document.getElementById('btn-cmd-palette').addEventListener('click', () => this.openCommandPaletteModal());
    document.getElementById('btn-export-modal').addEventListener('click', () => this.openExportModal());

    // Color swatches & swap
    document.getElementById('btn-color-picker').addEventListener('click', () => this.openColorPickerModal());
    document.getElementById('btn-swap-colors').addEventListener('click', () => {
      const tmp = this.fgColor;
      this.fgColor = this.bgColor;
      this.bgColor = tmp;
      this.syncColorSwatches();
      this.hapticTick();
    });

    // Quick vertical sliders (Brush Size & Opacity)
    this.bindVerticalQuickSlider(
      document.getElementById('quick-size-track'),
      (ratio) => {
        this.brush.size = Math.max(1, Math.round(1 + ratio * 159));
        this.syncQuickBrushPill();
        this.renderToolOptionsStrip();
      }
    );
    this.bindVerticalQuickSlider(
      document.getElementById('quick-opacity-track'),
      (ratio) => {
        this.brush.opacity = Math.max(1, Math.round(ratio * 100));
        this.syncQuickBrushPill();
        this.renderToolOptionsStrip();
      }
    );

    // Tool carousel buttons
    document.querySelectorAll('.tool-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectTool(btn.dataset.tool);
      });
    });

    // Bottom navigation dock tabs
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.sheet;
        if (target === 'none') {
          this.closeSheet();
        } else {
          this.toggleSheet(target);
        }
      });
    });

    document.getElementById('sheet-backdrop').addEventListener('click', () => this.closeSheet());
    document.getElementById('sheet-close-handle').addEventListener('click', () => this.closeSheet());
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());

    // File input handlers
    document.getElementById('file-input-open').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleOpenFile(file);
      e.target.value = '';
    });
    document.getElementById('file-input-place-layer').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handlePlaceImageAsLayer(file);
      e.target.value = '';
    });
    document.getElementById('file-input-font').addEventListener('change', (e) => {
      if (e.target.files?.length) {
        this.handleImportFontFiles(e.target.files);
      }
      e.target.value = '';
    });

    this.bindCanvasEvents();

    const ro = new ResizeObserver(() => this.resizeViewportCanvas());
    ro.observe(this.workspaceEl);

    this.session.onChange(() => {
      this.syncHeaderAndHUD();
      if (this.activeSheet !== 'none') {
        this.renderActiveSheet();
      }
      this.renderFloatingContextBar();
    });

    this.syncColorSwatches();
    this.syncQuickBrushPill();
    this.renderToolOptionsStrip();
  }

  /**
   * ==========================================================================
   * Downloaded Font Importer (.ttf, .otf, .woff, .woff2 via FontFace API)
   * ==========================================================================
   */
  async handleImportFontFiles(fileList) {
    let lastLoadedFamily = null;
    for (const file of Array.from(fileList)) {
      try {
        const buf = await file.arrayBuffer();
        const rawName = file.name.replace(/\.(ttf|otf|woff2?|ttc)$/i, '').replace(/[-_]+/g, ' ').trim();
        const cleanFamily = `PCFont_${rawName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const fontFace = new FontFace(cleanFamily, buf);
        await fontFace.load();
        document.fonts.add(fontFace);

        if (!this.importedFonts.some((f) => f.family === cleanFamily)) {
          this.importedFonts.unshift({
            family: cleanFamily,
            label: `★ ${rawName} (Imported)`,
            fileName: file.name
          });
        }
        lastLoadedFamily = cleanFamily;

        // Persist small/medium fonts in localStorage so they stay available across sessions
        if (buf.byteLength < 1500000) {
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          const saved = JSON.parse(localStorage.getItem('pc_imported_fonts') || '[]');
          if (!saved.some((s) => s.family === cleanFamily)) {
            saved.unshift({ family: cleanFamily, label: `★ ${rawName} (Imported)`, b64 });
            try {
              localStorage.setItem('pc_imported_fonts', JSON.stringify(saved.slice(0, 5)));
            } catch (_) {}
          }
        }
      } catch (err) {
        this.showToast(`Failed to load font ${file.name}: ${err.message}`);
      }
    }

    if (lastLoadedFamily) {
      this.activeFontFamily = lastLoadedFamily;
      const active = this.session.doc?.activeLayer;
      if (active && active.kind === 'text' && active.textData) {
        active.textData.fontFamily = lastLoadedFamily;
        this.session.doc.rasterizeTextLayer(active);
        this.session.doc.pushHistory(`Apply Font (${lastLoadedFamily})`);
        this.session.notify('text.fontImported');
      }
      this.renderToolOptionsStrip();
      // If Type modal font select is currently open in DOM, refresh it too
      const modalFontSel = document.getElementById('modal-type-font-select');
      if (modalFontSel) {
        modalFontSel.innerHTML = '';
        for (const f of this.allFonts) {
          const opt = document.createElement('option');
          opt.value = f.family;
          opt.textContent = f.label;
          if (f.family === lastLoadedFamily) opt.selected = true;
          modalFontSel.appendChild(opt);
        }
        modalFontSel.dispatchEvent(new Event('change'));
      }
      this.showToast(`Imported font! Ready in Type Tool`);
    }
  }

  async restorePersistedFonts() {
    try {
      const saved = JSON.parse(localStorage.getItem('pc_imported_fonts') || '[]');
      for (const item of saved) {
        const binary = atob(item.b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const ff = new FontFace(item.family, bytes.buffer);
        await ff.load();
        document.fonts.add(ff);
        if (!this.importedFonts.some((f) => f.family === item.family)) {
          this.importedFonts.push({ family: item.family, label: item.label });
        }
      }
    } catch (_) {}
  }

  loadDocument(doc) {
    this.session.doc = doc;
    this.resetCropBoxes(doc);
    this.resizeViewportCanvas();
    this.fitCanvasToViewport();
    this.session.notify('document.loaded');
  }

  resetCropBoxes(doc = this.session.doc) {
    if (!doc) return;
    this.cropBox = {
      x: Math.round(doc.width * 0.08),
      y: Math.round(doc.height * 0.08),
      w: Math.round(doc.width * 0.84),
      h: Math.round(doc.height * 0.84)
    };
    this.cropAngle = 0;
    // Initialize Perspective Crop 4-corner quad with a slight trapezoid inset so perspective handles are obvious
    this.perspectiveQuad = [
      { x: Math.round(doc.width * 0.14), y: Math.round(doc.height * 0.12) }, // TL
      { x: Math.round(doc.width * 0.86), y: Math.round(doc.height * 0.16) }, // TR
      { x: Math.round(doc.width * 0.90), y: Math.round(doc.height * 0.88) }, // BR
      { x: Math.round(doc.width * 0.10), y: Math.round(doc.height * 0.86) }  // BL
    ];
  }

  resizeViewportCanvas() {
    const rect = this.workspaceEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.viewportCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.viewportCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  fitCanvasToViewport() {
    const doc = this.session.doc;
    if (!doc) return;
    const rect = this.workspaceEl.getBoundingClientRect();
    const padX = 72;
    const padY = 64;
    const availW = Math.max(120, rect.width - padX);
    const availH = Math.max(120, rect.height - padY);
    this.zoom = Math.min(availW / doc.width, availH / doc.height, 2.5);
    this.panX = (rect.width - doc.width * this.zoom) / 2;
    this.panY = (rect.height - doc.height * this.zoom) / 2;
    this.syncHeaderAndHUD();
  }

  screenToDoc(clientX, clientY) {
    const rect = this.viewportCanvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom,
      sx,
      sy
    };
  }

  bindVerticalQuickSlider(trackEl, onUpdate) {
    let dragging = false;
    const updateFromEvent = (e) => {
      const rect = trackEl.getBoundingClientRect();
      const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      onUpdate(ratio);
    };
    trackEl.addEventListener('pointerdown', (e) => {
      dragging = true;
      trackEl.setPointerCapture(e.pointerId);
      updateFromEvent(e);
    });
    trackEl.addEventListener('pointermove', (e) => {
      if (dragging) updateFromEvent(e);
    });
    trackEl.addEventListener('pointerup', () => {
      dragging = false;
    });
  }

  syncColorSwatches() {
    document.getElementById('quick-swatch-fg').style.background = this.fgColor;
    document.getElementById('quick-swatch-bg').style.background = this.bgColor;
  }

  syncQuickBrushPill() {
    const sizePct = Math.min(100, Math.max(4, (this.brush.size / 160) * 100));
    document.getElementById('quick-size-fill').style.height = `${sizePct}%`;
    document.getElementById('quick-size-val').textContent = `${this.brush.size}px`;
    document.getElementById('quick-opacity-fill').style.height = `${this.brush.opacity}%`;
    document.getElementById('quick-opacity-val').textContent = `${this.brush.opacity}%`;
  }

  syncHeaderAndHUD() {
    const doc = this.session.doc;
    if (!doc) return;
    document.getElementById('doc-title-label').textContent = doc.title;
    document.getElementById('doc-dimensions-label').textContent =
      `${doc.width} × ${doc.height} px · ${doc.layers.length} layer${doc.layers.length !== 1 ? 's' : ''}`;
    document.getElementById('nav-layer-count').textContent = String(doc.layers.length);
    document.getElementById('btn-undo').disabled = !doc.canUndo();
    document.getElementById('btn-redo').disabled = !doc.canRedo();
    document.getElementById('hud-zoom-badge').textContent = `${Math.round(this.zoom * 100)}%`;

    const active = doc.activeLayer;
    if (active) {
      const maskSuffix = doc.editingMask ? ' [Mask]' : '';
      document.getElementById('hud-layer-name').textContent = `${active.name}${maskSuffix}`;
      document.getElementById('hud-layer-dot').style.background =
        doc.editingMask ? '#e8b046' : active.kind === 'adjustment' ? '#7cc0ff' : '#378ef0';
      const hasFx = Algorithms.hasActiveLayerEffects(active.styles);
      const fxBadge = document.getElementById('hud-fx-badge');
      if (fxBadge) {
        fxBadge.style.borderColor = hasFx ? '#e8b046' : 'rgba(255,255,255,0.12)';
        fxBadge.style.color = hasFx ? '#ffd074' : '';
      }
    }
  }

  selectTool(toolId) {
    this.activeTool = toolId;
    document.querySelectorAll('.tool-item-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === toolId);
    });
    const doc = this.session.doc;
    if (doc) {
      if (toolId === 'crop' && !this.cropBox) {
        this.resetCropBoxes(doc);
      } else if (toolId === 'perspectiveCrop') {
        if (!this.perspectiveQuad) this.resetCropBoxes(doc);
        // Deselect active selection when starting Perspective Crop, per PhotoCraft #11975
        if (doc.hasSelection) doc.clearSelection();
      } else if ((toolId === 'slice' || toolId === 'sliceSelect') && doc.slices.length === 0) {
        // Seed 2 starter slices so the user immediately sees how slices work and can drag/divide them!
        doc.addSlice({
          name: 'header_banner',
          x: Math.round(doc.width * 0.08),
          y: Math.round(doc.height * 0.12),
          w: Math.round(doc.width * 0.84),
          h: Math.round(doc.height * 0.48),
          origin: 'user'
        });
        doc.addSlice({
          name: 'caption_card',
          x: 70,
          y: 770,
          w: Math.min(760, doc.width - 140),
          h: Math.min(245, doc.height - 800),
          origin: 'layer'
        });
      }
    }
    this.hapticTick();
    this.renderToolOptionsStrip();
    this.renderFloatingContextBar();
  }

  /* ==========================================================================
   * Dynamic Tool Options Strip (above Tool Carousel)
   * ========================================================================== */
  renderToolOptionsStrip() {
    const strip = document.getElementById('tool-options-strip');
    strip.innerHTML = '';

    const addChip = (label, active, onClick) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `opt-chip${active ? ' active' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      strip.appendChild(btn);
    };

    const addInlineSlider = (label, min, max, val, unit, onInput) => {
      const wrap = document.createElement('label');
      wrap.className = 'opt-slider-inline';
      wrap.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" value="${val}" /><strong>${val}${unit}</strong>`;
      const input = wrap.querySelector('input');
      const strong = wrap.querySelector('strong');
      input.addEventListener('input', () => {
        const v = Number(input.value);
        strong.textContent = `${v}${unit}`;
        onInput(v);
      });
      strip.appendChild(wrap);
    };

    if (this.activeTool === 'brush' || this.activeTool === 'eraser' || this.activeTool === 'heal') {
      for (const preset of BRUSH_PRESETS) {
        addChip(preset.name, this.brush.presetId === preset.id, () => {
          this.brush.applyPreset(preset.id);
          this.syncQuickBrushPill();
          this.renderToolOptionsStrip();
        });
      }
      addInlineSlider('Hardness', 0, 100, this.brush.hardness, '%', (v) => {
        this.brush.hardness = v;
      });
      addInlineSlider('Smooth', 0, 100, this.brush.smoothing, '%', (v) => {
        this.brush.smoothing = v;
      });
    } else if (this.activeTool === 'select') {
      addChip('✨ Select Subject', false, () => {
        this.session.dispatch('selection.subject');
        this.showToast('Select ➔ Subject applied!');
      });
      addChip('Rect Marquee', this.selectMode === 'rect', () => {
        this.selectMode = 'rect';
        this.renderToolOptionsStrip();
      });
      addChip('Ellipse Marquee', this.selectMode === 'ellipse', () => {
        this.selectMode = 'ellipse';
        this.renderToolOptionsStrip();
      });
      addChip('Free Lasso', this.selectMode === 'lasso', () => {
        this.selectMode = 'lasso';
        this.renderToolOptionsStrip();
      });
      addChip('Magic Wand', this.selectMode === 'wand', () => {
        this.selectMode = 'wand';
        this.renderToolOptionsStrip();
      });
      if (this.selectMode === 'wand') {
        addInlineSlider('Tolerance', 1, 160, this.wandTolerance, '', (v) => {
          this.wandTolerance = v;
        });
      }
    } else if (this.activeTool === 'crop' || this.activeTool === 'perspectiveCrop' || this.activeTool === 'slice' || this.activeTool === 'sliceSelect') {
      // Crop Tool Family Switcher Pills (matching Photoshop's Crop tool group C)
      addChip('Crop', this.activeTool === 'crop', () => this.selectTool('crop'));
      addChip('Perspective Crop', this.activeTool === 'perspectiveCrop', () => this.selectTool('perspectiveCrop'));
      addChip('Slice Tool', this.activeTool === 'slice', () => this.selectTool('slice'));
      addChip('Slice Select', this.activeTool === 'sliceSelect', () => this.selectTool('sliceSelect'));

      if (this.activeTool === 'crop') {
        for (const r of [
          { id: 'free', label: 'Free' },
          { id: '1:1', label: '1:1' },
          { id: '4:5', label: '4:5' },
          { id: '16:9', label: '16:9' }
        ]) {
          addChip(r.label, this.cropAspect === r.id, () => {
            this.cropAspect = r.id;
            this.applyCropAspectConstraint();
            this.renderToolOptionsStrip();
          });
        }
        for (const g of [
          { id: 'thirds', label: 'Rule of Thirds' },
          { id: 'grid', label: 'Grid' },
          { id: 'diagonal', label: 'Diagonal' },
          { id: 'golden', label: 'Golden Ratio' }
        ]) {
          addChip(g.label, this.cropGridMode === g.id, () => {
            this.cropGridMode = g.id;
            this.renderToolOptionsStrip();
          });
        }
        addInlineSlider('Straighten', -45, 45, this.cropAngle, '°', (v) => {
          this.cropAngle = v;
        });
      } else if (this.activeTool === 'perspectiveCrop') {
        addChip(this.perspectiveShowGrid ? '☑ Show Grid' : '☐ Show Grid', this.perspectiveShowGrid, () => {
          this.perspectiveShowGrid = !this.perspectiveShowGrid;
          this.renderToolOptionsStrip();
        });
        addChip('Front Image Bounds', false, () => {
          const doc = this.session.doc;
          if (!doc) return;
          this.perspectiveQuad = [
            { x: 0, y: 0 },
            { x: doc.width, y: 0 },
            { x: doc.width, y: doc.height },
            { x: 0, y: doc.height }
          ];
          this.renderFloatingContextBar();
        });
        addChip('Reset Perspective Quad', false, () => {
          this.resetCropBoxes();
          this.renderFloatingContextBar();
        });
      } else {
        // Slice & Slice Select tool options
        addChip('+ Slice from Layer', false, () => {
          this.session.dispatch('slice.fromLayer');
          this.showToast('Created Slice from Active Layer');
        });
        addChip('⊞ Divide Slice...', false, () => this.openDivideSliceModal());
        addChip('⚙ Slice Options...', false, () => this.openSliceOptionsModal());
        addChip(
          this.session.doc?.hideAutoSlices ? 'Show Auto Slices' : 'Hide Auto Slices',
          Boolean(this.session.doc?.hideAutoSlices),
          () => {
            if (!this.session.doc) return;
            this.session.doc.hideAutoSlices = !this.session.doc.hideAutoSlices;
            this.renderToolOptionsStrip();
          }
        );
        addChip('⬇ Export Slices', true, () => this.exportAllSlices());
        addChip('Clear Slices', false, () => this.session.dispatch('slice.clearAll'));
      }
    } else if (this.activeTool === 'text') {
      addChip('📥 Import Font (.ttf/.otf/.woff)', true, () => {
        document.getElementById('file-input-font').click();
      });
      addChip('+ Add Type Layer', false, () => this.openTextEditorModal(null));
      if (this.session.doc?.activeLayer?.kind === 'text') {
        addChip('✎ Edit Active Type', true, () => this.openTextEditorModal(this.session.doc.activeLayer));
      }
      addChip('fx Blending Options & Styles', false, () => this.openLayerStylesModal());
    } else if (this.activeTool === 'move') {
      addChip('Flip Horiz', false, () => this.session.dispatch('transform.flipHorizontal'));
      addChip('Flip Vert', false, () => this.session.dispatch('transform.flipVertical'));
      addChip('Rotate 90° CW', false, () => {
        this.session.dispatch('transform.rotate90CW');
        this.fitCanvasToViewport();
      });
      addChip('Scale 90%', false, () => this.scaleActiveLayer(0.9));
      addChip('Scale 110%', false, () => this.scaleActiveLayer(1.1));
      addChip('fx Blending Options', false, () => this.openLayerStylesModal());
    } else if (this.activeTool === 'fill') {
      addChip('Paint Bucket', this.fillMode === 'bucket', () => {
        this.fillMode = 'bucket';
        this.renderToolOptionsStrip();
      });
      addChip('Linear Gradient', this.fillMode === 'gradient' && this.brush.gradientType === 'linear', () => {
        this.fillMode = 'gradient';
        this.brush.gradientType = 'linear';
        this.renderToolOptionsStrip();
      });
      addChip('Radial Gradient', this.fillMode === 'gradient' && this.brush.gradientType === 'radial', () => {
        this.fillMode = 'gradient';
        this.brush.gradientType = 'radial';
        this.renderToolOptionsStrip();
      });
      if (this.fillMode === 'bucket') {
        addInlineSlider('Tolerance', 1, 180, this.brush.bucketTolerance, '', (v) => {
          this.brush.bucketTolerance = v;
        });
      }
    } else if (this.activeTool === 'tone') {
      addChip('Dodge (Lighten)', this.toneMode === 'dodge', () => {
        this.toneMode = 'dodge';
        this.renderToolOptionsStrip();
      });
      addChip('Burn (Darken)', this.toneMode === 'burn', () => {
        this.toneMode = 'burn';
        this.renderToolOptionsStrip();
      });
      addInlineSlider('Size', 4, 150, this.brush.size, 'px', (v) => {
        this.brush.size = v;
        this.syncQuickBrushPill();
      });
    } else if (this.activeTool === 'shape') {
      for (const st of [
        { id: 'rect', label: 'Rectangle' },
        { id: 'ellipse', label: 'Ellipse' },
        { id: 'polygon', label: 'Hexagon' },
        { id: 'star', label: '5-Pt Star' }
      ]) {
        addChip(st.label, this.shapeMode === st.id, () => {
          this.shapeMode = st.id;
          this.renderToolOptionsStrip();
        });
      }
      addChip('+ Stamp Shape', false, () => {
        this.session.dispatch('shape.addLayer', {
          shapeType: this.shapeMode,
          fill: this.fgColor,
          stroke: this.bgColor,
          strokeWidth: 4
        });
        this.showToast(`Added ${this.shapeMode} shape layer`);
      });
    } else if (this.activeTool === 'eyedropper') {
      addChip('Touch & drag on canvas to sample pixel color with magnifier loupe', true, () => {});
    } else if (this.activeTool === 'hand') {
      addChip('Fit to Screen', false, () => this.fitCanvasToViewport());
      addChip('100% Actual Pixels', false, () => {
        this.zoom = 1;
        this.syncHeaderAndHUD();
      });
      addChip('200% Zoom', false, () => {
        this.zoom = 2;
        this.syncHeaderAndHUD();
      });
    }
  }

  applyCropAspectConstraint() {
    const doc = this.session.doc;
    if (!doc || !this.cropBox || this.cropAspect === 'free') return;
    const [aw, ah] = this.cropAspect.split(':').map(Number);
    const ratio = aw / ah;
    let w = doc.width * 0.8;
    let h = w / ratio;
    if (h > doc.height * 0.8) {
      h = doc.height * 0.8;
      w = h * ratio;
    }
    this.cropBox = {
      x: Math.round((doc.width - w) / 2),
      y: Math.round((doc.height - h) / 2),
      w: Math.round(w),
      h: Math.round(h)
    };
  }

  scaleActiveLayer(factor) {
    const doc = this.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment') return;

    const temp = document.createElement('canvas');
    temp.width = doc.width;
    temp.height = doc.height;
    const tCtx = temp.getContext('2d');
    const nw = doc.width * factor;
    const nh = doc.height * factor;
    tCtx.drawImage(layer.canvas, (doc.width - nw) / 2, (doc.height - nh) / 2, nw, nh);

    const ctx = layer.canvas.getContext('2d');
    ctx.clearRect(0, 0, doc.width, doc.height);
    ctx.drawImage(temp, 0, 0);
    doc.pushHistory(`Scale Layer (${Math.round(factor * 100)}%)`);
    this.session.notify('transform.scale');
  }

  /* ==========================================================================
   * Floating Contextual Action Bar (Selection / Crop / Perspective Crop / Slice)
   * ========================================================================== */
  renderFloatingContextBar() {
    const bar = document.getElementById('floating-context-bar');
    const doc = this.session.doc;
    if (!doc) {
      bar.hidden = true;
      return;
    }

    bar.innerHTML = '';

    const addBtn = (label, cls, onClick) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ctx-btn ${cls || ''}`.trim();
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      bar.appendChild(btn);
    };

    if (this.activeTool === 'crop' && this.cropBox) {
      bar.hidden = false;
      addBtn('Reset', '', () => this.resetCropBoxes(doc));
      addBtn('Cancel ✕', 'danger', () => this.selectTool('brush'));
      addBtn(`Apply Crop (${Math.round(this.cropBox.w)}×${Math.round(this.cropBox.h)}) ✓`, 'primary', () => {
        this.session.dispatch('crop.apply', { ...this.cropBox, angle: this.cropAngle });
        this.cropAngle = 0;
        this.fitCanvasToViewport();
        this.selectTool('brush');
        this.showToast('Document Cropped');
      });
      return;
    }

    if (this.activeTool === 'perspectiveCrop' && this.perspectiveQuad) {
      bar.hidden = false;
      const valid = Algorithms.isConvexQuad(this.perspectiveQuad);
      addBtn('Reset Quad', '', () => this.resetCropBoxes(doc));
      addBtn('Cancel ✕', 'danger', () => this.selectTool('brush'));
      addBtn(
        valid ? 'Apply Perspective Crop ✓' : 'Quad Invalid (Non-Convex)',
        valid ? 'primary' : 'danger',
        () => {
          if (!valid) {
            this.showToast('Perspective quad must be convex (untangle corners)');
            return;
          }
          this.session.dispatch('image.perspectiveCrop', {
            corners: this.perspectiveQuad
          });
          this.resetCropBoxes(doc);
          this.fitCanvasToViewport();
          this.selectTool('brush');
          this.showToast('Perspective Crop Rectified!');
        }
      );
      return;
    }

    if (this.activeTool === 'slice' || this.activeTool === 'sliceSelect') {
      bar.hidden = false;
      const sel = doc.selectedSlice;
      addBtn('+ From Layer', '', () => {
        this.session.dispatch('slice.fromLayer');
        this.showToast('Slice Created from Active Layer');
      });
      addBtn('Divide Slice...', '', () => this.openDivideSliceModal());
      if (sel) {
        addBtn('Slice Options...', '', () => this.openSliceOptionsModal());
        addBtn('Delete Slice', 'danger', () => this.session.dispatch('slice.delete'));
      }
      addBtn(`Export Slices (${doc.slices.length || 1}) ✓`, 'primary', () => this.exportAllSlices());
      return;
    }

    if (doc.hasSelection) {
      bar.hidden = false;
      addBtn('✂️ Cutout to Layer (⌘J)', 'primary', () => {
        this.session.dispatch('layer.viaCopy');
        this.showToast('Subject Cutout copied to new layer!');
      });
      addBtn('To Layer Mask', 'primary', () => {
        this.session.dispatch('layer.addMask', { fromSelection: true });
        this.showToast('Created Layer Mask from Selection');
      });
      addBtn('Feather', '', () => {
        this.session.dispatch('selection.feather', { radius: 6 });
        this.showToast('Selection Feathered');
      });
      addBtn('Invert', '', () => this.session.dispatch('selection.invert'));
      addBtn('Deselect', '', () => this.session.dispatch('selection.deselect'));
      addBtn('Clear', 'danger', () => this.session.dispatch('selection.clearPixels'));
      return;
    }

    bar.hidden = true;
  }

  /* ==========================================================================
   * Multi-Touch & Pointer Canvas Interactions
   * ========================================================================== */
  bindCanvasEvents() {
    const canvas = this.viewportCanvas;

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        const newZoom = Math.max(0.12, Math.min(16, this.zoom * factor));
        this.panX = mx - ((mx - this.panX) / this.zoom) * newZoom;
        this.panY = my - ((my - this.panY) / this.zoom) * newZoom;
        this.zoom = newZoom;
        this.syncHeaderAndHUD();
      },
      { passive: false }
    );

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 1) {
        this.multiTouchMaxCount = 1;
        this.multiTouchStartTime = performance.now();
        this.multiTouchMoved = false;
        this.handleSinglePointerDown(e);
      } else if (this.pointers.size >= 2) {
        this.multiTouchMaxCount = Math.max(this.multiTouchMaxCount, this.pointers.size);
        if (this.brush.activeStroke) {
          const st = this.brush.activeStroke;
          st.targetCanvas.getContext('2d').clearRect(0, 0, st.targetCanvas.width, st.targetCanvas.height);
          st.targetCanvas.getContext('2d').drawImage(st.baseCanvas, 0, 0);
          this.brush.activeStroke = null;
        }
        this.toolDrag = null;
        document.getElementById('pixel-loupe').hidden = true;

        const pts = Array.from(this.pointers.values());
        this.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        this.pinchStartZoom = this.zoom;
        this.pinchStartCenter = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2
        };
        this.pinchStartPan = { x: this.panX, y: this.panY };
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const prev = this.pointers.get(e.pointerId);
      if (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) > 8) {
        this.multiTouchMoved = true;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 2 && this.pinchStartCenter) {
        const pts = Array.from(this.pointers.values());
        const dist = Math.max(12, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
        const center = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2
        };
        const rect = canvas.getBoundingClientRect();
        const cx = this.pinchStartCenter.x - rect.left;
        const cy = this.pinchStartCenter.y - rect.top;

        const scale = dist / Math.max(12, this.pinchStartDist);
        const newZoom = Math.max(0.15, Math.min(16, this.pinchStartZoom * scale));

        const docX = (cx - this.pinchStartPan.x) / this.pinchStartZoom;
        const docY = (cy - this.pinchStartPan.y) / this.pinchStartZoom;

        this.zoom = newZoom;
        this.panX = (center.x - rect.left) - docX * newZoom;
        this.panY = (center.y - rect.top) - docY * newZoom;
        this.syncHeaderAndHUD();
        return;
      }

      if (this.pointers.size === 1 && this.multiTouchMaxCount === 1) {
        this.handleSinglePointerMove(e);
      }
    });

    const handlePointerUpOrCancel = (e) => {
      this.pointers.delete(e.pointerId);

      if (this.pointers.size === 0) {
        const elapsed = performance.now() - this.multiTouchStartTime;
        if (this.multiTouchMaxCount === 2 && !this.multiTouchMoved && elapsed < 320) {
          if (this.session.doc?.canUndo()) {
            this.session.dispatch('edit.undo');
            this.hapticTick();
            this.showToast('2-Finger Tap: Undo');
          }
        } else if (this.multiTouchMaxCount >= 3 && !this.multiTouchMoved && elapsed < 360) {
          if (this.session.doc?.canRedo()) {
            this.session.dispatch('edit.redo');
            this.hapticTick();
            this.showToast('3-Finger Tap: Redo');
          }
        } else if (this.multiTouchMaxCount === 1) {
          this.handleSinglePointerUp(e);
        }
        this.multiTouchMaxCount = 0;
        this.pinchStartCenter = null;
      }
    };

    canvas.addEventListener('pointerup', handlePointerUpOrCancel);
    canvas.addEventListener('pointercancel', handlePointerUpOrCancel);
  }

  handleSinglePointerDown(e) {
    const doc = this.session.doc;
    if (!doc) return;
    const pt = this.screenToDoc(e.clientX, e.clientY);
    const layer = doc.activeLayer;

    if (this.activeTool === 'hand') {
      this.toolDrag = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origPanX: this.panX,
        origPanY: this.panY
      };
      return;
    }

    if (this.activeTool === 'eyedropper') {
      this.sampleColorWithLoupe(pt.x, pt.y, e.clientX, e.clientY);
      this.toolDrag = { type: 'eyedropper' };
      return;
    }

    if (this.activeTool === 'text') {
      if (layer && layer.kind === 'text') {
        this.openTextEditorModal(layer);
      } else {
        this.openTextEditorModal(null, pt.x, pt.y);
      }
      return;
    }

    // 1. Standard Crop Tool Interaction
    if (this.activeTool === 'crop' && this.cropBox) {
      const cb = this.cropBox;
      const handleRadius = 26 / this.zoom;
      let mode = 'move';
      if (Math.hypot(pt.x - cb.x, pt.y - cb.y) < handleRadius) mode = 'nw';
      else if (Math.hypot(pt.x - (cb.x + cb.w), pt.y - cb.y) < handleRadius) mode = 'ne';
      else if (Math.hypot(pt.x - cb.x, pt.y - (cb.y + cb.h)) < handleRadius) mode = 'sw';
      else if (Math.hypot(pt.x - (cb.x + cb.w), pt.y - (cb.y + cb.h)) < handleRadius) mode = 'se';

      this.toolDrag = {
        type: 'crop',
        mode,
        startX: pt.x,
        startY: pt.y,
        origBox: { ...cb }
      };
      return;
    }

    // 2. Perspective Crop Tool Interaction (4 independent corner pins or quad body move)
    if (this.activeTool === 'perspectiveCrop' && this.perspectiveQuad) {
      const handleRadius = 30 / this.zoom;
      let cornerIdx = -1;
      let minDist = handleRadius;
      for (let i = 0; i < 4; i++) {
        const d = Math.hypot(pt.x - this.perspectiveQuad[i].x, pt.y - this.perspectiveQuad[i].y);
        if (d < minDist) {
          minDist = d;
          cornerIdx = i;
        }
      }
      this.toolDrag = {
        type: 'perspectiveCrop',
        cornerIdx, // 0..3 or -1 for whole-quad translate
        startX: pt.x,
        startY: pt.y,
        origQuad: this.perspectiveQuad.map((p) => ({ ...p }))
      };
      return;
    }

    // 3. Slice Tool (draw new slice marquee)
    if (this.activeTool === 'slice') {
      this.toolDrag = {
        type: 'sliceDraw',
        startX: pt.x,
        startY: pt.y,
        currX: pt.x,
        currY: pt.y
      };
      return;
    }

    // 4. Slice Select Tool (select slice, move or resize corner)
    if (this.activeTool === 'sliceSelect') {
      const handleRadius = 24 / this.zoom;
      const sel = doc.selectedSlice;
      if (sel && Math.hypot(pt.x - (sel.x + sel.w), pt.y - (sel.y + sel.h)) < handleRadius) {
        this.toolDrag = {
          type: 'sliceEdit',
          mode: 'resize',
          slice: sel,
          startX: pt.x,
          startY: pt.y,
          origRect: { x: sel.x, y: sel.y, w: sel.w, h: sel.h }
        };
        return;
      }

      // Hit test user slices top-down
      let hit = null;
      for (let i = doc.slices.length - 1; i >= 0; i--) {
        const s = doc.slices[i];
        if (pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h) {
          hit = s;
          break;
        }
      }
      if (hit) {
        doc.selectedSliceId = hit.id;
        this.renderFloatingContextBar();
        this.toolDrag = {
          type: 'sliceEdit',
          mode: 'move',
          slice: hit,
          startX: pt.x,
          startY: pt.y,
          origRect: { x: hit.x, y: hit.y, w: hit.w, h: hit.h }
        };
      }
      return;
    }

    if (this.activeTool === 'select') {
      if (this.selectMode === 'wand') {
        doc.selectMagicWand(pt.x, pt.y, this.wandTolerance);
        this.session.notify('selection.wand');
        this.showToast('Magic Wand Selection');
        return;
      }
      this.toolDrag = {
        type: 'select',
        mode: this.selectMode,
        startX: pt.x,
        startY: pt.y,
        currX: pt.x,
        currY: pt.y,
        points: [{ x: pt.x, y: pt.y }]
      };
      return;
    }

    if (!layer || layer.locked) {
      this.showToast('Active layer is locked');
      return;
    }

    if (this.activeTool === 'move') {
      if (layer.kind === 'adjustment') {
        this.showToast('Select a pixel, type, or shape layer to move');
        return;
      }
      const targetCanvas = doc.editingMask && layer.maskCanvas ? layer.maskCanvas : layer.canvas;
      const snap = document.createElement('canvas');
      snap.width = doc.width;
      snap.height = doc.height;
      snap.getContext('2d').drawImage(targetCanvas, 0, 0);

      this.toolDrag = {
        type: 'move',
        startX: pt.x,
        startY: pt.y,
        dx: 0,
        dy: 0,
        targetCanvas,
        snapCanvas: snap,
        origTextPos: layer.textData ? { x: layer.textData.x, y: layer.textData.y } : null
      };
      return;
    }

    if (this.activeTool === 'shape') {
      this.toolDrag = {
        type: 'shape',
        startX: pt.x,
        startY: pt.y,
        currX: pt.x,
        currY: pt.y
      };
      return;
    }

    if (this.activeTool === 'fill') {
      const targetCanvas = doc.editingMask && layer.maskCanvas ? layer.maskCanvas : layer.canvas;
      if (this.fillMode === 'bucket') {
        this.brush.floodFill(
          targetCanvas,
          pt.x,
          pt.y,
          doc.editingMask ? '#ffffff' : this.fgColor,
          doc.hasSelection ? doc.selectionMask : null
        );
        doc.pushHistory('Paint Bucket Fill');
        this.session.notify('fill.bucket');
      } else {
        this.toolDrag = {
          type: 'gradient',
          startX: pt.x,
          startY: pt.y,
          currX: pt.x,
          currY: pt.y,
          targetCanvas
        };
      }
      return;
    }

    // Painting tools: brush, eraser, heal, tone (dodge/burn)
    if (layer.kind === 'adjustment' && !doc.editingMask) {
      if (!layer.maskCanvas) {
        doc.addMaskToActiveLayer(false);
      } else {
        doc.editingMask = true;
      }
    }

    const targetCanvas = doc.editingMask && layer.maskCanvas ? layer.maskCanvas : layer.canvas;
    const strokeTool = this.activeTool === 'tone' ? this.toneMode : this.activeTool;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1.0;

    this.brush.beginStroke(
      strokeTool,
      targetCanvas,
      pt.x,
      pt.y,
      pressure,
      this.fgColor,
      this.bgColor,
      doc.editingMask,
      doc.hasSelection ? doc.selectionCanvas : null
    );
    doc.compose();
  }

  handleSinglePointerMove(e) {
    const doc = this.session.doc;
    if (!doc) return;
    const pt = this.screenToDoc(e.clientX, e.clientY);

    if (this.brush.activeStroke) {
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1.0;
      this.brush.moveStroke(pt.x, pt.y, pressure);
      doc.compose();
      return;
    }

    const drag = this.toolDrag;
    if (!drag) return;

    if (drag.type === 'pan') {
      this.panX = drag.origPanX + (e.clientX - drag.startX);
      this.panY = drag.origPanY + (e.clientY - drag.startY);
      return;
    }

    if (drag.type === 'eyedropper') {
      this.sampleColorWithLoupe(pt.x, pt.y, e.clientX, e.clientY);
      return;
    }

    if (drag.type === 'move') {
      drag.dx = pt.x - drag.startX;
      drag.dy = pt.y - drag.startY;
      const ctx = drag.targetCanvas.getContext('2d');
      ctx.clearRect(0, 0, doc.width, doc.height);
      ctx.drawImage(drag.snapCanvas, drag.dx, drag.dy);
      doc.compose();
      return;
    }

    if (drag.type === 'select') {
      drag.currX = pt.x;
      drag.currY = pt.y;
      if (drag.mode === 'lasso') {
        drag.points.push({ x: pt.x, y: pt.y });
      }
      return;
    }

    if (drag.type === 'gradient' || drag.type === 'shape' || drag.type === 'sliceDraw') {
      drag.currX = pt.x;
      drag.currY = pt.y;
      return;
    }

    if (drag.type === 'perspectiveCrop' && this.perspectiveQuad) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      if (drag.cornerIdx >= 0) {
        this.perspectiveQuad[drag.cornerIdx] = {
          x: Math.max(-doc.width * 0.2, Math.min(doc.width * 1.2, Math.round(drag.origQuad[drag.cornerIdx].x + dx))),
          y: Math.max(-doc.height * 0.2, Math.min(doc.height * 1.2, Math.round(drag.origQuad[drag.cornerIdx].y + dy)))
        };
      } else {
        this.perspectiveQuad = drag.origQuad.map((p) => ({
          x: Math.round(p.x + dx),
          y: Math.round(p.y + dy)
        }));
      }
      this.renderFloatingContextBar();
      return;
    }

    if (drag.type === 'sliceEdit' && drag.slice) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      const or = drag.origRect;
      if (drag.mode === 'move') {
        drag.slice.x = Math.max(0, Math.min(doc.width - or.w, Math.round(or.x + dx)));
        drag.slice.y = Math.max(0, Math.min(doc.height - or.h, Math.round(or.y + dy)));
      } else {
        drag.slice.w = Math.max(16, Math.min(doc.width - or.x, Math.round(or.w + dx)));
        drag.slice.h = Math.max(16, Math.min(doc.height - or.y, Math.round(or.h + dy)));
      }
      return;
    }

    if (drag.type === 'crop' && this.cropBox) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      const ob = drag.origBox;
      if (drag.mode === 'move') {
        this.cropBox.x = Math.max(0, Math.min(doc.width - ob.w, ob.x + dx));
        this.cropBox.y = Math.max(0, Math.min(doc.height - ob.h, ob.y + dy));
      } else if (drag.mode === 'se') {
        this.cropBox.w = Math.max(32, Math.min(doc.width - ob.x, ob.w + dx));
        this.cropBox.h = Math.max(32, Math.min(doc.height - ob.y, ob.h + dy));
      } else if (drag.mode === 'nw') {
        const nx = Math.max(0, Math.min(ob.x + ob.w - 32, ob.x + dx));
        const ny = Math.max(0, Math.min(ob.y + ob.h - 32, ob.y + dy));
        this.cropBox.w = ob.w - (nx - ob.x);
        this.cropBox.h = ob.h - (ny - ob.y);
        this.cropBox.x = nx;
        this.cropBox.y = ny;
      } else if (drag.mode === 'ne') {
        const ny = Math.max(0, Math.min(ob.y + ob.h - 32, ob.y + dy));
        this.cropBox.w = Math.max(32, Math.min(doc.width - ob.x, ob.w + dx));
        this.cropBox.h = ob.h - (ny - ob.y);
        this.cropBox.y = ny;
      } else if (drag.mode === 'sw') {
        const nx = Math.max(0, Math.min(ob.x + ob.w - 32, ob.x + dx));
        this.cropBox.w = ob.w - (nx - ob.x);
        this.cropBox.h = Math.max(32, Math.min(doc.height - ob.y, ob.h + dy));
        this.cropBox.x = nx;
      }
      this.renderFloatingContextBar();
    }
  }

  handleSinglePointerUp() {
    const doc = this.session.doc;
    if (!doc) return;

    if (this.brush.activeStroke) {
      const toolLabel = this.activeTool.charAt(0).toUpperCase() + this.activeTool.slice(1);
      this.brush.endStroke();
      if (doc.activeLayer && !doc.editingMask && (doc.activeLayer.kind === 'text' || doc.activeLayer.kind === 'shape')) {
        doc.activeLayer.kind = 'raster';
      }
      doc.pushHistory(`${toolLabel} Stroke`);
      this.session.notify('stroke.end');
      return;
    }

    const drag = this.toolDrag;
    this.toolDrag = null;
    if (!drag) return;

    if (drag.type === 'eyedropper') {
      document.getElementById('pixel-loupe').hidden = true;
      this.showToast(`Sampled ${this.fgColor.toUpperCase()}`);
      return;
    }

    if (drag.type === 'move' && (Math.abs(drag.dx) > 1 || Math.abs(drag.dy) > 1)) {
      const layer = doc.activeLayer;
      if (layer?.textData && drag.origTextPos && !doc.editingMask) {
        layer.textData.x = drag.origTextPos.x + drag.dx;
        layer.textData.y = drag.origTextPos.y + drag.dy;
      }
      doc.pushHistory('Move Layer');
      this.session.notify('layer.moved');
      return;
    }

    if (drag.type === 'select') {
      const w = drag.currX - drag.startX;
      const h = drag.currY - drag.startY;
      if (drag.mode === 'rect') {
        doc.setRectSelection(drag.startX, drag.startY, w, h);
      } else if (drag.mode === 'ellipse') {
        doc.setEllipseSelection(drag.startX, drag.startY, w, h);
      } else if (drag.mode === 'lasso') {
        doc.setLassoSelection(drag.points);
      }
      this.session.notify('selection.changed');
      return;
    }

    if (drag.type === 'sliceDraw') {
      const x = Math.min(drag.startX, drag.currX);
      const y = Math.min(drag.startY, drag.currY);
      const w = Math.abs(drag.currX - drag.startX);
      const h = Math.abs(drag.currY - drag.startY);
      if (w >= 12 && h >= 12) {
        this.session.dispatch('slice.new', { x, y, w, h, origin: 'user' });
        this.showToast(`Created Slice #${doc.slices.length}`);
      }
      return;
    }

    if (drag.type === 'sliceEdit') {
      doc.pushHistory('Modify Slice');
      this.renderFloatingContextBar();
      return;
    }

    if (drag.type === 'gradient') {
      this.brush.drawGradient(
        drag.targetCanvas,
        drag.startX,
        drag.startY,
        drag.currX,
        drag.currY,
        this.fgColor,
        this.bgColor,
        doc.hasSelection ? doc.selectionCanvas : null
      );
      doc.pushHistory('Gradient Fill');
      this.session.notify('fill.gradient');
      return;
    }

    if (drag.type === 'shape') {
      const x = Math.min(drag.startX, drag.currX);
      const y = Math.min(drag.startY, drag.currY);
      const w = Math.max(36, Math.abs(drag.currX - drag.startX));
      const h = Math.max(36, Math.abs(drag.currY - drag.startY));
      this.session.dispatch('shape.addLayer', {
        shapeType: this.shapeMode,
        x,
        y,
        w,
        h,
        fill: this.fgColor,
        stroke: this.bgColor,
        strokeWidth: 3
      });
    }
  }

  sampleColorWithLoupe(docX, docY, clientX, clientY) {
    const doc = this.session.doc;
    if (!doc) return;
    const ix = Math.max(0, Math.min(doc.width - 1, Math.round(docX)));
    const iy = Math.max(0, Math.min(doc.height - 1, Math.round(docY)));
    const ctx = doc.compositeCanvas.getContext('2d');
    const px = ctx.getImageData(ix, iy, 1, 1).data;
    if (px[3] > 0) {
      this.fgColor = Algorithms.rgbToHex(px[0], px[1], px[2]);
      this.syncColorSwatches();
    }

    const loupe = document.getElementById('pixel-loupe');
    const lCanvas = document.getElementById('pixel-loupe-canvas');
    const lCtx = lCanvas.getContext('2d');
    const wsRect = this.workspaceEl.getBoundingClientRect();
    loupe.hidden = false;
    loupe.style.left = `${clientX - wsRect.left}px`;
    loupe.style.top = `${clientY - wsRect.top}px`;

    lCtx.imageSmoothingEnabled = false;
    lCtx.fillStyle = '#181818';
    lCtx.fillRect(0, 0, 66, 66);
    lCtx.drawImage(doc.compositeCanvas, ix - 5, iy - 5, 11, 11, 0, 0, 66, 66);

    lCtx.strokeStyle = '#ffffff';
    lCtx.lineWidth = 1.5;
    lCtx.strokeRect(30, 30, 6, 6);
    document.getElementById('pixel-loupe-hex').textContent = this.fgColor.toUpperCase();
  }

  /* ==========================================================================
   * Canvas Render Loop (60fps Viewport Compositor + Overlays)
   * ========================================================================== */
  startAnimationLoop() {
    const tick = () => {
      this.antsOffset = (this.antsOffset + 0.35) % 16;
      this.renderViewport();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  renderViewport() {
    const doc = this.session.doc;
    if (!doc) return;

    const canvas = this.viewportCanvas;
    const ctx = this.viewportCtx;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 1. Document shadow & checkerboard
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 24 / this.zoom;
    ctx.shadowOffsetY = 6 / this.zoom;
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, doc.width, doc.height);
    ctx.restore();

    this.drawCheckerboard(ctx, doc.width, doc.height);

    // 2. Composite Document Image
    ctx.imageSmoothingEnabled = this.zoom < 3.5;
    if (this.compareOriginal && doc.livePreview) {
      const savedPreview = doc.livePreview;
      doc.livePreview = null;
      doc.compose();
      ctx.drawImage(doc.compositeCanvas, 0, 0);
      doc.livePreview = savedPreview;
      doc.compose();
    } else {
      ctx.drawImage(doc.compositeCanvas, 0, 0);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(0, 0, doc.width, doc.height);

    // 3. Active Selection Marching Ants (including Select -> Subject silhouette!)
    this.drawSelectionOverlay(ctx, doc);

    // 4. Live Drag Previews
    this.drawLiveToolDragOverlay(ctx);

    // 5. Transform Bounding Box & Handles
    if (this.activeTool === 'move' && doc.activeLayer && doc.activeLayer.kind !== 'adjustment') {
      this.drawTransformHandles(ctx, doc);
    }

    // 6. Standard Crop Overlay (with Straighten Angle & Grid Modes)
    if (this.activeTool === 'crop' && this.cropBox) {
      this.drawCropOverlay(ctx, doc);
    }

    // 7. Perspective Crop 4-Corner Homography Quad & Mesh Overlay
    if (this.activeTool === 'perspectiveCrop' && this.perspectiveQuad) {
      this.drawPerspectiveCropOverlay(ctx, doc);
    }

    // 8. Slice Tool & Slice Select Overlay (User Slices + Auto Slices + Numbered Badges)
    if (this.activeTool === 'slice' || this.activeTool === 'sliceSelect' || doc.slices.length > 0) {
      this.drawSlicesOverlay(ctx, doc);
    }

    ctx.restore();
    ctx.restore();
  }

  drawCheckerboard(ctx, width, height) {
    if (!this.checkerPattern) {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 24;
      pCanvas.height = 24;
      const pCtx = pCanvas.getContext('2d');
      pCtx.fillStyle = '#ffffff';
      pCtx.fillRect(0, 0, 24, 24);
      pCtx.fillStyle = '#dcdcdc';
      pCtx.fillRect(0, 0, 12, 12);
      pCtx.fillRect(12, 12, 12, 12);
      this.checkerPattern = ctx.createPattern(pCanvas, 'repeat');
    }
    ctx.fillStyle = this.checkerPattern;
    ctx.fillRect(0, 0, width, height);
  }

  drawSelectionOverlay(ctx, doc) {
    if (!doc.hasSelection || !doc.selectionOutline) return;
    const out = doc.selectionOutline;
    const lw = 1.5 / this.zoom;

    const strokeAnts = (drawPathFn) => {
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = '#000000';
      drawPathFn();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([6 / this.zoom, 6 / this.zoom]);
      ctx.lineDashOffset = -this.antsOffset / this.zoom;
      drawPathFn();
      ctx.stroke();
      ctx.restore();
    };

    if (out.type === 'rect') {
      strokeAnts(() => {
        ctx.beginPath();
        ctx.rect(out.x, out.y, out.w, out.h);
      });
    } else if (out.type === 'ellipse') {
      strokeAnts(() => {
        ctx.beginPath();
        ctx.ellipse(out.cx, out.cy, out.rw, out.rh, 0, 0, Math.PI * 2);
      });
    } else if (out.type === 'lasso' && out.points?.length > 2) {
      strokeAnts(() => {
        ctx.beginPath();
        ctx.moveTo(out.points[0].x, out.points[0].y);
        for (let i = 1; i < out.points.length; i++) {
          ctx.lineTo(out.points[i].x, out.points[i].y);
        }
        ctx.closePath();
      });
    } else if (out.type === 'mask') {
      // Draw pixel-accurate animated marching ants along the Select -> Subject silhouette contour!
      if (out.contourPoints && out.contourPoints.length > 0) {
        const dotSize = Math.max(2, 2.6 / this.zoom);
        const phase = Math.floor(this.antsOffset / 2);
        ctx.save();
        for (let i = 0; i < out.contourPoints.length; i++) {
          const pt = out.contourPoints[i];
          ctx.fillStyle = (i + phase) % 2 === 0 ? '#ffffff' : '#000000';
          ctx.fillRect(pt.x - dotSize / 2, pt.y - dotSize / 2, dotSize, dotSize);
        }
        ctx.restore();
      } else if (doc.selectionMask) {
        let minX = doc.width, minY = doc.height, maxX = 0, maxY = 0;
        const m = doc.selectionMask;
        for (let y = 0; y < doc.height; y += 2) {
          const row = y * doc.width;
          for (let x = 0; x < doc.width; x += 2) {
            if (m[row + x] > 64) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX > minX && maxY > minY) {
          strokeAnts(() => {
            ctx.beginPath();
            ctx.rect(minX, minY, maxX - minX, maxY - minY);
          });
        }
      }
    }
  }

  drawLiveToolDragOverlay(ctx) {
    const drag = this.toolDrag;
    if (!drag) return;
    const lw = 1.5 / this.zoom;

    if (drag.type === 'select' || drag.type === 'sliceDraw') {
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = drag.type === 'sliceDraw' ? '#38b5ff' : '#378ef0';
      ctx.fillStyle = drag.type === 'sliceDraw' ? 'rgba(56, 181, 255, 0.16)' : 'rgba(55, 142, 240, 0.14)';
      ctx.beginPath();
      if (drag.type === 'sliceDraw' || drag.mode === 'rect') {
        ctx.rect(drag.startX, drag.startY, drag.currX - drag.startX, drag.currY - drag.startY);
      } else if (drag.mode === 'ellipse') {
        const rx = Math.abs(drag.currX - drag.startX) / 2;
        const ry = Math.abs(drag.currY - drag.startY) / 2;
        const cx = Math.min(drag.startX, drag.currX) + rx;
        const cy = Math.min(drag.startY, drag.currY) + ry;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else if (drag.mode === 'lasso' && drag.points.length > 1) {
        ctx.moveTo(drag.points[0].x, drag.points[0].y);
        for (let i = 1; i < drag.points.length; i++) {
          ctx.lineTo(drag.points[i].x, drag.points[i].y);
        }
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (drag.type === 'gradient') {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / this.zoom;
      ctx.beginPath();
      ctx.moveTo(drag.startX, drag.startY);
      ctx.lineTo(drag.currX, drag.currY);
      ctx.stroke();
      for (const [px, py, col] of [
        [drag.startX, drag.startY, this.fgColor],
        [drag.currX, drag.currY, this.bgColor]
      ]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, 7 / this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    } else if (drag.type === 'shape') {
      ctx.save();
      ctx.strokeStyle = '#378ef0';
      ctx.fillStyle = 'rgba(55, 142, 240, 0.25)';
      ctx.lineWidth = 2 / this.zoom;
      ctx.strokeRect(
        Math.min(drag.startX, drag.currX),
        Math.min(drag.startY, drag.currY),
        Math.abs(drag.currX - drag.startX),
        Math.abs(drag.currY - drag.startY)
      );
      ctx.restore();
    }
  }

  drawTransformHandles(ctx, doc) {
    const pad = 20;
    const x = pad, y = pad, w = doc.width - pad * 2, h = doc.height - pad * 2;
    ctx.save();
    ctx.strokeStyle = '#378ef0';
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.strokeRect(x, y, w, h);

    const hs = 9 / this.zoom;
    const pts = [
      [x, y], [x + w / 2, y], [x + w, y],
      [x, y + h / 2], [x + w, y + h / 2],
      [x, y + h], [x + w / 2, y + h], [x + w, y + h]
    ];
    ctx.fillStyle = '#ffffff';
    for (const [hx, hy] of pts) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
    ctx.restore();
  }

  drawCropOverlay(ctx, doc) {
    const cb = this.cropBox;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, doc.width, cb.y);
    ctx.fillRect(0, cb.y + cb.h, doc.width, doc.height - (cb.y + cb.h));
    ctx.fillRect(0, cb.y, cb.x, cb.h);
    ctx.fillRect(cb.x + cb.w, cb.y, doc.width - (cb.x + cb.w), cb.h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / this.zoom;
    ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.beginPath();

    if (this.cropGridMode === 'grid') {
      const steps = 6;
      for (let i = 1; i < steps; i++) {
        ctx.moveTo(cb.x + (cb.w * i) / steps, cb.y);
        ctx.lineTo(cb.x + (cb.w * i) / steps, cb.y + cb.h);
        ctx.moveTo(cb.x, cb.y + (cb.h * i) / steps);
        ctx.lineTo(cb.x + cb.w, cb.y + (cb.h * i) / steps);
      }
    } else if (this.cropGridMode === 'diagonal') {
      ctx.moveTo(cb.x, cb.y);
      ctx.lineTo(cb.x + cb.w, cb.y + cb.h);
      ctx.moveTo(cb.x + cb.w, cb.y);
      ctx.lineTo(cb.x, cb.y + cb.h);
    } else if (this.cropGridMode === 'golden') {
      const phi1 = 0.382;
      const phi2 = 0.618;
      for (const f of [phi1, phi2]) {
        ctx.moveTo(cb.x + cb.w * f, cb.y);
        ctx.lineTo(cb.x + cb.w * f, cb.y + cb.h);
        ctx.moveTo(cb.x, cb.y + cb.h * f);
        ctx.lineTo(cb.x + cb.w, cb.y + cb.h * f);
      }
    } else {
      // Rule of Thirds
      for (const f of [1 / 3, 2 / 3]) {
        ctx.moveTo(cb.x + cb.w * f, cb.y);
        ctx.lineTo(cb.x + cb.w * f, cb.y + cb.h);
        ctx.moveTo(cb.x, cb.y + cb.h * f);
        ctx.lineTo(cb.x + cb.w, cb.y + cb.h * f);
      }
    }
    ctx.stroke();

    const cs = 12 / this.zoom;
    ctx.fillStyle = '#378ef0';
    for (const [cx, cy] of [
      [cb.x, cb.y],
      [cb.x + cb.w, cb.y],
      [cb.x, cb.y + cb.h],
      [cb.x + cb.w, cb.y + cb.h]
    ]) {
      ctx.fillRect(cx - cs / 2, cy - cs / 2, cs, cs);
    }
    ctx.restore();
  }

  /**
   * Draw Perspective Crop 4-Corner Homography Quad & Subdivided Perspective Mesh
   * (crates/ui-egui/src/tools/perspective_crop_ui.rs)
   */
  drawPerspectiveCropOverlay(ctx, doc) {
    const q = this.perspectiveQuad;
    if (!q || q.length !== 4) return;
    const isConvex = Algorithms.isConvexQuad(q);
    const strokeCol = isConvex ? '#38b5ff' : '#ec5b62';

    ctx.save();
    // Darken outside the perspective quad using even-odd fill rule
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.rect(0, 0, doc.width, doc.height);
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[1].x, q[1].y);
    ctx.lineTo(q[2].x, q[2].y);
    ctx.lineTo(q[3].x, q[3].y);
    ctx.closePath();
    ctx.fill('evenodd');

    // Perspective subdivision grid (interpolated across quad)
    if (this.perspectiveShowGrid) {
      ctx.strokeStyle = isConvex ? 'rgba(56, 181, 255, 0.55)' : 'rgba(236, 91, 98, 0.65)';
      ctx.lineWidth = 1.2 / this.zoom;
      const N = 3;
      const lerpPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      ctx.beginPath();
      for (let i = 1; i < N; i++) {
        const t = i / N;
        const topPt = lerpPt(q[0], q[1], t);
        const botPt = lerpPt(q[3], q[2], t);
        ctx.moveTo(topPt.x, topPt.y);
        ctx.lineTo(botPt.x, botPt.y);

        const leftPt = lerpPt(q[0], q[3], t);
        const rightPt = lerpPt(q[1], q[2], t);
        ctx.moveTo(leftPt.x, leftPt.y);
        ctx.lineTo(rightPt.x, rightPt.y);
      }
      // Diagonals
      ctx.moveTo(q[0].x, q[0].y);
      ctx.lineTo(q[2].x, q[2].y);
      ctx.moveTo(q[1].x, q[1].y);
      ctx.lineTo(q[3].x, q[3].y);
      ctx.stroke();
    }

    // Outer quad boundary
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.2 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[1].x, q[1].y);
    ctx.lineTo(q[2].x, q[2].y);
    ctx.lineTo(q[3].x, q[3].y);
    ctx.closePath();
    ctx.stroke();

    // 4 Corner Pin Handles with Labels (TL, TR, BR, BL)
    const labels = ['TL', 'TR', 'BR', 'BL'];
    const r = 10 / this.zoom;
    ctx.font = `bold ${Math.round(10 / this.zoom)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.2 / this.zoom;
      ctx.beginPath();
      ctx.arc(q[i].x, q[i].y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111111';
      ctx.fillText(labels[i], q[i].x, q[i].y);
    }

    ctx.restore();
  }

  /**
   * Draw Slice Tool & Slice Select Overlay (crates/ui-egui/src/tools/slice_ui.rs)
   */
  drawSlicesOverlay(ctx, doc) {
    const items = doc.resolveDisplaySlices();
    const isSliceMode = this.activeTool === 'slice' || this.activeTool === 'sliceSelect';
    if (!isSliceMode && doc.slices.length === 0) return;

    ctx.save();
    for (const s of items) {
      const isSelected = s.id === doc.selectedSliceId;
      const isAuto = s.origin === 'auto';

      ctx.strokeStyle = isSelected ? '#f59e0b' : isAuto ? 'rgba(180, 180, 190, 0.55)' : '#38b5ff';
      ctx.lineWidth = (isSelected ? 2.2 : 1.4) / this.zoom;
      if (isAuto) {
        ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      // Top-left numbered Slice Badge (`01`, `02`...)
      const badgeH = 18 / this.zoom;
      const badgeW = (isAuto ? 32 : 52) / this.zoom;
      ctx.fillStyle = isSelected
        ? 'rgba(245, 158, 11, 0.92)'
        : isAuto
        ? 'rgba(75, 85, 99, 0.78)'
        : 'rgba(25, 130, 214, 0.92)';
      ctx.fillRect(s.x, s.y, Math.min(s.w, badgeW), Math.min(s.h, badgeH));

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(10.5 / this.zoom)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const numStr = String(s.number).padStart(2, '0');
      const tag = isAuto ? numStr : `${numStr} ⊞`;
      ctx.fillText(tag, s.x + 4 / this.zoom, s.y + badgeH / 2);

      // If selected in Slice Select mode, draw corner resize handle
      if (isSelected && isSliceMode) {
        const hs = 11 / this.zoom;
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.setLineDash([]);
        ctx.fillRect(s.x + s.w - hs / 2, s.y + s.h - hs / 2, hs, hs);
        ctx.strokeRect(s.x + s.w - hs / 2, s.y + s.h - hs / 2, hs, hs);
      }
    }
    ctx.restore();
  }

  /* ==========================================================================
   * Slice Tool Modals (Divide Slice, Slice Options, Export Slices)
   * ========================================================================== */
  openDivideSliceModal() {
    const doc = this.session.doc;
    if (!doc) return;
    if (doc.slices.length === 0) {
      doc.addSlice({ x: 0, y: 0, w: doc.width, h: doc.height, origin: 'user', name: 'full_canvas' });
    }
    let rows = 2;
    let cols = 2;

    this.openModal(
      'Divide Slice (Horizontally & Vertically)',
      (body) => {
        const sliders = document.createElement('div');
        sliders.className = 'slider-list';
        this.appendRangeRow(sliders, 'Slices Down (Horizontal Cuts)', 1, 8, 1, rows, ' rows', (v) => {
          rows = v;
        });
        this.appendRangeRow(sliders, 'Slices Across (Vertical Cuts)', 1, 8, 1, cols, ' cols', (v) => {
          cols = v;
        });
        body.appendChild(sliders);
      },
      (footer) => {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'pill-action-btn secondary';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => this.closeModal());

        const apply = document.createElement('button');
        apply.type = 'button';
        apply.className = 'pill-action-btn';
        apply.textContent = 'Divide Slice';
        apply.addEventListener('click', () => {
          this.session.dispatch('slice.divide', { horizCount: rows, vertCount: cols });
          this.closeModal();
          this.showToast(`Divided into ${rows * cols} slices`);
        });
        footer.appendChild(cancel);
        footer.appendChild(apply);
      }
    );
  }

  openSliceOptionsModal() {
    const doc = this.session.doc;
    const s = doc?.selectedSlice;
    if (!doc || !s) {
      this.showToast('Select or draw a slice first');
      return;
    }

    let name = s.name;
    let url = s.url || '';
    let altText = s.altText || '';
    let format = s.format || 'png';

    this.openModal(
      `Slice Options — ${s.name}`,
      (body) => {
        body.innerHTML = `
          <div class="ctrl-field">
            <label>Slice Name</label>
            <input type="text" class="pc-input" id="sl-opt-name" value="${name}" />
          </div>
          <div class="ctrl-field">
            <label>URL (for HTML/Web Slice Map)</label>
            <input type="text" class="pc-input" id="sl-opt-url" value="${url}" placeholder="https://..." />
          </div>
          <div class="ctrl-field">
            <label>Alt Tag</label>
            <input type="text" class="pc-input" id="sl-opt-alt" value="${altText}" placeholder="Descriptive alt text" />
          </div>
          <div class="ctrl-field">
            <label>Export Format</label>
            <select class="pc-select" id="sl-opt-fmt">
              <option value="png" ${format === 'png' ? 'selected' : ''}>PNG Lossless (.png)</option>
              <option value="jpeg" ${format === 'jpeg' ? 'selected' : ''}>JPEG (.jpg)</option>
            </select>
          </div>
          <div class="histogram-stats-row" style="grid-template-columns:1fr 1fr;">
            <div>Bounds<strong>${s.x}, ${s.y}</strong></div>
            <div>Dimensions<strong>${s.w} × ${s.h} px</strong></div>
          </div>
        `;
        body.querySelector('#sl-opt-name').addEventListener('input', (e) => (name = e.target.value));
        body.querySelector('#sl-opt-url').addEventListener('input', (e) => (url = e.target.value));
        body.querySelector('#sl-opt-alt').addEventListener('input', (e) => (altText = e.target.value));
        body.querySelector('#sl-opt-fmt').addEventListener('change', (e) => (format = e.target.value));
      },
      (footer) => {
        const expOne = document.createElement('button');
        expOne.type = 'button';
        expOne.className = 'pill-action-btn secondary';
        expOne.textContent = '⬇ Export This Slice';
        expOne.addEventListener('click', () => {
          s.name = name || s.name;
          s.format = format;
          this.exportSingleSlice(s);
          this.closeModal();
        });

        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'pill-action-btn';
        save.textContent = 'Save Slice';
        save.addEventListener('click', () => {
          s.name = name || s.name;
          s.url = url;
          s.altText = altText;
          s.format = format;
          doc.pushHistory('Edit Slice Options');
          this.closeModal();
          this.showToast(`Updated slice "${s.name}"`);
        });
        footer.appendChild(expOne);
        footer.appendChild(save);
      }
    );
  }

  exportSingleSlice(s) {
    const doc = this.session.doc;
    if (!doc) return;
    doc.compose();
    const c = document.createElement('canvas');
    c.width = Math.max(1, s.w);
    c.height = Math.max(1, s.h);
    const ctx = c.getContext('2d');
    if (s.format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(doc.compositeCanvas, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
    const mime = s.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = s.format === 'jpeg' ? 'jpg' : 'png';
    c.toBlob((blob) => {
      if (blob) {
        this.triggerDownloadOrAndroidShare(blob, `${s.name}.${ext}`, mime);
      }
    }, mime, 0.92);
  }

  exportAllSlices() {
    const doc = this.session.doc;
    if (!doc) return;
    const targets = doc.slices.length > 0 ? doc.slices : doc.resolveDisplaySlices();
    targets.forEach((s, i) => {
      setTimeout(() => this.exportSingleSlice(s), i * 180);
    });
    this.showToast(`Exported ${targets.length} slice${targets.length !== 1 ? 's' : ''}`);
  }

  /* ==========================================================================
   * Select Menu Modal (`✨ Select ▾` -> Select Subject, Cutout, Mask, etc.)
   * ========================================================================== */
  openSelectMenuModal() {
    const doc = this.session.doc;
    if (!doc) return;

    this.openModal(
      'Select Menu (Photoshop Selection & Subject AI)',
      (body) => {
        const items = [
          {
            title: '✨ Select ➔ Subject (Saliency & Backdrop Cut)',
            sub: 'Automatically detects foreground subject & traces silhouette',
            primary: true,
            fn: () => {
              this.session.dispatch('selection.subject');
              this.showToast('Subject Selected!');
            }
          },
          {
            title: '✂️ Layer via Copy — Cutout Subject (⌘J)',
            sub: 'Extracts active selection / subject onto a new transparent layer',
            fn: () => {
              if (!doc.hasSelection) this.session.dispatch('selection.subject');
              this.session.dispatch('layer.viaCopy');
              this.showToast('Extracted Subject Cutout to New Layer!');
            }
          },
          {
            title: '🎭 Convert Selection to Layer Mask',
            sub: 'Masks active layer using current subject or marquee selection',
            fn: () => {
              if (!doc.hasSelection) this.session.dispatch('selection.subject');
              this.session.dispatch('layer.addMask', { fromSelection: true });
              this.showToast('Created Layer Mask from Selection');
            }
          },
          {
            title: 'Select All (⌘A)',
            sub: `${doc.width} × ${doc.height} px`,
            fn: () => this.session.dispatch('selection.all')
          },
          {
            title: 'Invert Selection (⇧⌘I)',
            sub: 'Swap selected foreground and background',
            fn: () => this.session.dispatch('selection.invert')
          },
          {
            title: 'Feather Selection (8 px)',
            sub: 'Soften selection edge transitions',
            fn: () => {
              this.session.dispatch('selection.feather', { radius: 8 });
              this.showToast('Selection Feathered (8 px)');
            }
          },
          {
            title: 'Deselect (⌘D)',
            sub: 'Clear active marching ants selection',
            fn: () => this.session.dispatch('selection.deselect')
          }
        ];

        const list = document.createElement('div');
        list.className = 'cmd-list';
        list.style.maxHeight = '340px';
        for (const it of items) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cmd-item';
          if (it.primary) {
            btn.style.background = 'var(--pc-accent-soft)';
            btn.style.borderColor = 'var(--pc-accent)';
          }
          btn.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:2px;">
              <span class="cmd-item-title">${it.title}</span>
              <span class="cmd-item-id">${it.sub}</span>
            </div>
          `;
          btn.addEventListener('click', () => {
            this.closeModal();
            it.fn();
          });
          list.appendChild(btn);
        }
        body.appendChild(list);
      },
      (footer) => {
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'pill-action-btn secondary';
        close.textContent = 'Close';
        close.addEventListener('click', () => this.closeModal());
        footer.appendChild(close);
      }
    );
  }

  /* ==========================================================================
   * Slide-Up Mobile Bottom Sheets (Layers, Adjustments, Filters, PSD & App)
   * ========================================================================== */
  toggleSheet(sheetId) {
    if (this.activeSheet === sheetId) {
      this.closeSheet();
      return;
    }
    if (this.session.doc?.livePreview && sheetId !== 'filters') {
      this.session.doc.livePreview = null;
      this.session.doc.compose();
    }
    this.activeSheet = sheetId;
    document.getElementById('bottom-sheet').classList.add('open');
    document.getElementById('sheet-backdrop').classList.add('open');
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sheet === sheetId);
    });
    this.hapticTick();
    this.renderActiveSheet();
  }

  closeSheet() {
    if (this.session.doc?.livePreview) {
      this.session.doc.livePreview = null;
      this.session.doc.compose();
    }
    this.activeSheet = 'none';
    document.getElementById('bottom-sheet').classList.remove('open');
    document.getElementById('sheet-backdrop').classList.remove('open');
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sheet === 'none');
    });
  }

  renderActiveSheet() {
    if (this.activeSheet === 'layers') this.renderLayersSheet();
    else if (this.activeSheet === 'adjustments') this.renderAdjustmentsSheet();
    else if (this.activeSheet === 'filters') this.renderFiltersSheet();
    else if (this.activeSheet === 'project') this.renderProjectSheet();
  }

  /* --------------------------------------------------------------------------
   * 1. LAYERS SHEET
   * -------------------------------------------------------------------------- */
  renderLayersSheet() {
    const doc = this.session.doc;
    if (!doc) return;
    const active = doc.activeLayer;

    document.getElementById('sheet-title').textContent = 'Layers & Blending';
    document.getElementById('sheet-subtitle').textContent = `${doc.layers.length} layers · PSD stack`;

    const headerActions = document.getElementById('sheet-header-actions');
    headerActions.innerHTML = '';

    const fxTopBtn = document.createElement('button');
    fxTopBtn.type = 'button';
    fxTopBtn.className = 'pill-action-btn secondary';
    fxTopBtn.textContent = 'fx Blending Options';
    fxTopBtn.addEventListener('click', () => this.openLayerStylesModal());
    headerActions.appendChild(fxTopBtn);

    const addLayerBtn = document.createElement('button');
    addLayerBtn.type = 'button';
    addLayerBtn.className = 'pill-action-btn';
    addLayerBtn.textContent = '+ Layer';
    addLayerBtn.addEventListener('click', () => this.session.dispatch('layer.new'));
    headerActions.appendChild(addLayerBtn);

    const body = document.getElementById('sheet-body');
    body.innerHTML = '';

    if (active) {
      const ctrlGrid = document.createElement('div');
      ctrlGrid.className = 'layer-controls-grid';

      const blendField = document.createElement('div');
      blendField.className = 'ctrl-field';
      blendField.innerHTML = `<label>Blend Mode</label>`;
      const sel = document.createElement('select');
      sel.className = 'pc-select';
      for (const bm of BLEND_MODES) {
        const opt = document.createElement('option');
        opt.value = bm.id;
        opt.textContent = bm.label;
        if (active.blendMode === bm.id) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        active.blendMode = sel.value;
        doc.pushHistory(`Blend Mode: ${sel.value}`);
        this.session.notify('layer.blendMode');
      });
      blendField.appendChild(sel);
      ctrlGrid.appendChild(blendField);

      const opacVal = Math.round((active.opacity ?? 1) * 100);
      const opacField = document.createElement('div');
      opacField.className = 'ctrl-field';
      opacField.innerHTML = `<label><span>Opacity</span><strong id="lbl-lyr-opac">${opacVal}%</strong></label>
        <input type="range" class="pc-range" min="0" max="100" value="${opacVal}" />`;
      opacField.querySelector('input').addEventListener('input', (e) => {
        const v = Number(e.target.value);
        opacField.querySelector('#lbl-lyr-opac').textContent = `${v}%`;
        active.opacity = v / 100;
        doc.compose();
      });
      opacField.querySelector('input').addEventListener('change', () => {
        doc.pushHistory('Layer Opacity');
      });
      ctrlGrid.appendChild(opacField);

      const fillVal = Math.round((active.fill ?? 1) * 100);
      const fillField = document.createElement('div');
      fillField.className = 'ctrl-field';
      fillField.innerHTML = `<label><span>Fill</span><strong id="lbl-lyr-fill">${fillVal}%</strong></label>
        <input type="range" class="pc-range" min="0" max="100" value="${fillVal}" />`;
      fillField.querySelector('input').addEventListener('input', (e) => {
        const v = Number(e.target.value);
        fillField.querySelector('#lbl-lyr-fill').textContent = `${v}%`;
        active.fill = v / 100;
        doc.compose();
      });
      ctrlGrid.appendChild(fillField);

      body.appendChild(ctrlGrid);
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'layer-action-toolbar';
    const actions = [
      { label: 'fx Blending & Styles', fn: () => this.openLayerStylesModal() },
      { label: 'Duplicate', fn: () => this.session.dispatch('layer.duplicate') },
      { label: '+ Mask', fn: () => this.session.dispatch('layer.addMask', { fromSelection: true }) },
      { label: 'Invert Mask', fn: () => this.session.dispatch('layer.invertMask') },
      { label: 'Clipping Mask', fn: () => this.session.dispatch('layer.toggleClipping') },
      { label: 'Merge Down', fn: () => this.session.dispatch('layer.mergeDown') },
      { label: 'Flatten', fn: () => this.session.dispatch('layer.flattenImage') },
      { label: 'Delete', fn: () => this.session.dispatch('layer.delete') }
    ];
    for (const act of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt-chip';
      b.textContent = act.label;
      b.addEventListener('click', act.fn);
      toolbar.appendChild(b);
    }
    body.appendChild(toolbar);

    const list = document.createElement('div');
    list.className = 'layer-list';

    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const lyr = doc.layers[i];
      const isSelected = lyr.id === doc.activeLayerId;
      const row = document.createElement('div');
      row.className = `layer-row${isSelected ? ' selected' : ''}`;

      const visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = `layer-vis-btn${lyr.visible ? '' : ' hidden-layer'}`;
      visBtn.title = 'Toggle Layer Visibility';
      visBtn.innerHTML = lyr.visible
        ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lyr.visible = !lyr.visible;
        this.session.notify('layer.visibility');
      });
      row.appendChild(visBtn);

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'layer-thumb-wrap';

      const thumb = document.createElement('div');
      thumb.className = `layer-thumb${isSelected && !doc.editingMask ? ' active-target' : ''}`;
      if (lyr.kind === 'adjustment') {
        thumb.innerHTML = `<span style="font-size:16px;color:#7cc0ff;">◐</span>`;
      } else {
        const tc = document.createElement('canvas');
        tc.width = 48;
        tc.height = 48;
        tc.getContext('2d').drawImage(lyr.canvas, 0, 0, doc.width, doc.height, 0, 0, 48, 48);
        thumb.appendChild(tc);
      }
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.activeLayerId = lyr.id;
        doc.editingMask = false;
        this.session.notify('layer.select');
      });
      thumbWrap.appendChild(thumb);

      if (lyr.maskCanvas) {
        const mThumb = document.createElement('div');
        mThumb.className = `layer-mask-thumb${isSelected && doc.editingMask ? ' active-target' : ''}`;
        mThumb.title = 'Tap to paint on Layer Mask (White=Reveal, Black=Hide)';
        const mc = document.createElement('canvas');
        mc.width = 36;
        mc.height = 48;
        mc.getContext('2d').drawImage(lyr.maskCanvas, 0, 0, doc.width, doc.height, 0, 0, 36, 48);
        mThumb.appendChild(mc);
        mThumb.addEventListener('click', (e) => {
          e.stopPropagation();
          doc.activeLayerId = lyr.id;
          doc.editingMask = true;
          this.showToast(`Editing Layer Mask on "${lyr.name}"`);
          this.session.notify('layer.selectMask');
        });
        thumbWrap.appendChild(mThumb);
      }

      row.appendChild(thumbWrap);

      const info = document.createElement('div');
      info.className = 'layer-info';
      const hasFx = Algorithms.hasActiveLayerEffects(lyr.styles);
      const bmLabel = BLEND_MODES.find((b) => b.id === lyr.blendMode)?.label || 'Normal';
      info.innerHTML = `
        <div class="layer-name-row">
          <span class="layer-name">${lyr.clipping ? '↳ ' : ''}${lyr.name}</span>
          ${lyr.kind === 'adjustment' ? '<span class="layer-kind-badge adj">ADJ</span>' : ''}
          ${lyr.kind === 'text' ? '<span class="layer-kind-badge text">T</span>' : ''}
          ${hasFx ? '<span class="layer-kind-badge fx">fx</span>' : ''}
        </div>
        <span class="layer-submeta">${bmLabel} · Opac ${Math.round((lyr.opacity ?? 1) * 100)}% · Fill ${Math.round((lyr.fill ?? 1) * 100)}%</span>
      `;
      row.appendChild(info);

      const rowActions = document.createElement('div');
      rowActions.className = 'layer-row-actions';
      if (lyr.kind !== 'adjustment') {
        const fxBtn = document.createElement('button');
        fxBtn.type = 'button';
        fxBtn.className = 'icon-btn';
        fxBtn.title = 'Blending Options & Layer Styles (fx)';
        fxBtn.innerHTML = `<span style="font-style:italic;font-weight:700;font-size:12px;">fx</span>`;
        fxBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          doc.activeLayerId = lyr.id;
          this.openLayerStylesModal();
        });
        rowActions.appendChild(fxBtn);
      }
      if (lyr.kind === 'text') {
        const editT = document.createElement('button');
        editT.type = 'button';
        editT.className = 'icon-btn';
        editT.title = 'Edit Text & Font';
        editT.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
        editT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openTextEditorModal(lyr);
        });
        rowActions.appendChild(editT);
      }

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'icon-btn';
      upBtn.title = 'Move Layer Up';
      upBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="18 15 12 9 6 15"/></svg>`;
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.activeLayerId = lyr.id;
        this.session.dispatch('layer.moveOrder', { direction: 'up' });
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'icon-btn';
      downBtn.title = 'Move Layer Down';
      downBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>`;
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.activeLayerId = lyr.id;
        this.session.dispatch('layer.moveOrder', { direction: 'down' });
      });

      rowActions.appendChild(upBtn);
      rowActions.appendChild(downBtn);
      row.appendChild(rowActions);

      row.addEventListener('click', () => {
        doc.activeLayerId = lyr.id;
        doc.editingMask = false;
        this.session.notify('layer.select');
      });

      list.appendChild(row);
    }

    body.appendChild(list);
  }

  /* --------------------------------------------------------------------------
   * 2. ADJUSTMENTS, CURVES & HISTOGRAM SHEET
   * -------------------------------------------------------------------------- */
  renderAdjustmentsSheet() {
    const doc = this.session.doc;
    if (!doc) return;

    document.getElementById('sheet-title').textContent = 'Adjustments & Scopes';
    document.getElementById('sheet-subtitle').textContent = 'Live Adjustment Layers or Direct Pixel Edits';
    document.getElementById('sheet-header-actions').innerHTML = '';

    const body = document.getElementById('sheet-body');
    body.innerHTML = '';

    const tabs = document.createElement('div');
    tabs.className = 'sub-tabs';
    for (const t of [
      { id: 'curves', label: 'Curves + Histogram' },
      { id: 'levels', label: 'Levels + Stats' },
      { id: 'color', label: 'Vibrance & Hue/Sat' },
      { id: 'tone', label: 'Brightness & Filters' }
    ]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `sub-tab-btn${this.activeAdjustTab === t.id ? ' active' : ''}`;
      b.textContent = t.label;
      b.addEventListener('click', () => {
        this.activeAdjustTab = t.id;
        this.renderAdjustmentsSheet();
      });
      tabs.appendChild(b);
    }
    body.appendChild(tabs);

    const compData = doc.compositeCanvas.getContext('2d').getImageData(0, 0, doc.width, doc.height);
    const hist = Algorithms.computeHistogram(compData);

    if (this.activeAdjustTab === 'curves') {
      const card = document.createElement('div');
      card.className = 'curves-histogram-card';

      const chRow = document.createElement('div');
      chRow.style.display = 'flex';
      chRow.style.justifyContent = 'space-between';
      chRow.style.alignItems = 'center';

      const chBtns = document.createElement('div');
      chBtns.style.display = 'flex';
      chBtns.style.gap = '5px';
      for (const ch of [
        { id: 'rgb', label: 'RGB' },
        { id: 'r', label: 'Red' },
        { id: 'g', label: 'Green' },
        { id: 'b', label: 'Blue' }
      ]) {
        const cb = document.createElement('button');
        cb.type = 'button';
        cb.className = `opt-chip${this.activeCurveChannel === ch.id ? ' active' : ''}`;
        cb.textContent = ch.label;
        cb.addEventListener('click', () => {
          this.activeCurveChannel = ch.id;
          this.renderAdjustmentsSheet();
        });
        chBtns.appendChild(cb);
      }
      chRow.appendChild(chBtns);

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'opt-chip';
      resetBtn.textContent = 'Reset Curve';
      resetBtn.addEventListener('click', () => {
        this.curvePoints = {
          rgb: [[0, 0], [255, 255]],
          r: [[0, 0], [255, 255]],
          g: [[0, 0], [255, 255]],
          b: [[0, 0], [255, 255]]
        };
        this.renderAdjustmentsSheet();
      });
      chRow.appendChild(resetBtn);
      card.appendChild(chRow);

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'curves-canvas-container';
      const cCanvas = document.createElement('canvas');
      cCanvas.id = 'curves-editor-canvas';
      cCanvas.width = 340;
      cCanvas.height = 190;
      canvasWrap.appendChild(cCanvas);
      card.appendChild(canvasWrap);

      const actRow = document.createElement('div');
      actRow.style.display = 'flex';
      actRow.style.gap = '8px';
      const btnAddLayer = document.createElement('button');
      btnAddLayer.type = 'button';
      btnAddLayer.className = 'pill-action-btn';
      btnAddLayer.style.flex = '1';
      btnAddLayer.style.justifyContent = 'center';
      btnAddLayer.textContent = '+ Add Curves Adjustment Layer';
      btnAddLayer.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'curves',
          params: this.curvePoints,
          name: 'Curves Adjustment'
        });
        this.showToast('Added Live Curves Adjustment Layer');
      });

      const btnDirect = document.createElement('button');
      btnDirect.type = 'button';
      btnDirect.className = 'pill-action-btn secondary';
      btnDirect.textContent = 'Apply to Layer';
      btnDirect.addEventListener('click', () => {
        this.session.dispatch('adjustment.applyDirect', {
          type: 'curves',
          params: this.curvePoints,
          label: 'Apply Curves'
        });
        this.showToast('Applied Curves to Active Layer');
      });

      actRow.appendChild(btnAddLayer);
      actRow.appendChild(btnDirect);
      card.appendChild(actRow);
      body.appendChild(card);

      this.initInteractiveCurvesCanvas(cCanvas, hist);
    } else if (this.activeAdjustTab === 'levels') {
      const card = document.createElement('div');
      card.className = 'curves-histogram-card';

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'curves-canvas-container';
      canvasWrap.style.height = '125px';
      const hCanvas = document.createElement('canvas');
      hCanvas.id = 'levels-histogram-canvas';
      hCanvas.width = 340;
      hCanvas.height = 125;
      canvasWrap.appendChild(hCanvas);
      card.appendChild(canvasWrap);

      const stats = document.createElement('div');
      stats.className = 'histogram-stats-row';
      stats.innerHTML = `
        <div>Mean<strong>${hist.mean}</strong></div>
        <div>Std Dev<strong>${hist.stdDev}</strong></div>
        <div>Median<strong>${hist.median}</strong></div>
        <div>Pixels<strong>${(hist.count / 1000).toFixed(0)}K</strong></div>
      `;
      card.appendChild(stats);

      const sliders = document.createElement('div');
      sliders.className = 'slider-list';
      this.appendRangeRow(sliders, 'Input Shadows (Black)', 0, 240, 1, this.levelsParams.inBlack, '', (v) => {
        this.levelsParams.inBlack = v;
        this.drawLevelsHistogram(hCanvas, hist);
      });
      this.appendRangeRow(sliders, 'Input Midtones (Gamma)', 0.2, 3.0, 0.05, this.levelsParams.gamma, '', (v) => {
        this.levelsParams.gamma = v;
        this.drawLevelsHistogram(hCanvas, hist);
      });
      this.appendRangeRow(sliders, 'Input Highlights (White)', 15, 255, 1, this.levelsParams.inWhite, '', (v) => {
        this.levelsParams.inWhite = v;
        this.drawLevelsHistogram(hCanvas, hist);
      });
      card.appendChild(sliders);

      const actRow = document.createElement('div');
      actRow.style.display = 'flex';
      actRow.style.gap = '8px';
      const btnAdd = document.createElement('button');
      btnAdd.type = 'button';
      btnAdd.className = 'pill-action-btn';
      btnAdd.style.flex = '1';
      btnAdd.style.justifyContent = 'center';
      btnAdd.textContent = '+ Add Levels Adjustment Layer';
      btnAdd.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'levels',
          params: this.levelsParams,
          name: 'Levels Adjustment'
        });
        this.showToast('Added Live Levels Adjustment Layer');
      });
      const btnDirect = document.createElement('button');
      btnDirect.type = 'button';
      btnDirect.className = 'pill-action-btn secondary';
      btnDirect.textContent = 'Apply Direct';
      btnDirect.addEventListener('click', () => {
        this.session.dispatch('adjustment.applyDirect', {
          type: 'levels',
          params: this.levelsParams,
          label: 'Apply Levels'
        });
        this.showToast('Applied Levels');
      });
      actRow.appendChild(btnAdd);
      actRow.appendChild(btnDirect);
      card.appendChild(actRow);

      body.appendChild(card);
      this.drawLevelsHistogram(hCanvas, hist);
    } else if (this.activeAdjustTab === 'color') {
      const card = document.createElement('div');
      card.className = 'curves-histogram-card';
      const sliders = document.createElement('div');
      sliders.className = 'slider-list';

      this.appendRangeRow(sliders, 'Vibrance', -100, 100, 1, this.adjSliders.vibrance, '', (v) => {
        this.adjSliders.vibrance = v;
      });
      this.appendRangeRow(sliders, 'Hue Shift (°)', -180, 180, 1, this.adjSliders.hue, '°', (v) => {
        this.adjSliders.hue = v;
      });
      this.appendRangeRow(sliders, 'Saturation', -100, 100, 1, this.adjSliders.saturation, '', (v) => {
        this.adjSliders.saturation = v;
      });
      this.appendRangeRow(sliders, 'Lightness', -100, 100, 1, this.adjSliders.lightness, '', (v) => {
        this.adjSliders.lightness = v;
      });
      card.appendChild(sliders);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.flexWrap = 'wrap';

      const bVib = document.createElement('button');
      bVib.type = 'button';
      bVib.className = 'pill-action-btn';
      bVib.textContent = '+ Vibrance Layer';
      bVib.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'vibrance',
          params: { vibrance: this.adjSliders.vibrance, saturation: this.adjSliders.saturation },
          name: `Vibrance (${this.adjSliders.vibrance >= 0 ? '+' : ''}${this.adjSliders.vibrance})`
        });
        this.showToast('Added Vibrance Adjustment Layer');
      });

      const bHue = document.createElement('button');
      bHue.type = 'button';
      bHue.className = 'pill-action-btn';
      bHue.textContent = '+ Hue/Saturation Layer';
      bHue.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'hueSaturation',
          params: {
            hue: this.adjSliders.hue,
            saturation: this.adjSliders.saturation,
            lightness: this.adjSliders.lightness
          },
          name: 'Hue/Saturation'
        });
        this.showToast('Added Hue/Saturation Adjustment Layer');
      });

      const bBW = document.createElement('button');
      bBW.type = 'button';
      bBW.className = 'pill-action-btn secondary';
      bBW.textContent = '+ Black & White Layer';
      bBW.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'blackAndWhite',
          params: { reds: 40, greens: 60, blues: 20, tint: 0 },
          name: 'Black & White'
        });
        this.showToast('Added Black & White Adjustment Layer');
      });

      row.appendChild(bVib);
      row.appendChild(bHue);
      row.appendChild(bBW);
      card.appendChild(row);
      body.appendChild(card);
    } else if (this.activeAdjustTab === 'tone') {
      const card = document.createElement('div');
      card.className = 'curves-histogram-card';
      const sliders = document.createElement('div');
      sliders.className = 'slider-list';

      this.appendRangeRow(sliders, 'Brightness', -100, 100, 1, this.adjSliders.brightness, '', (v) => {
        this.adjSliders.brightness = v;
      });
      this.appendRangeRow(sliders, 'Contrast', -100, 100, 1, this.adjSliders.contrast, '', (v) => {
        this.adjSliders.contrast = v;
      });
      this.appendRangeRow(sliders, 'Photo Filter Density', 5, 100, 1, this.adjSliders.photoDensity, '%', (v) => {
        this.adjSliders.photoDensity = v;
      });
      card.appendChild(sliders);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '6px';
      row.style.flexWrap = 'wrap';

      const bBC = document.createElement('button');
      bBC.type = 'button';
      bBC.className = 'pill-action-btn';
      bBC.textContent = '+ Brightness/Contrast Layer';
      bBC.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'brightnessContrast',
          params: { brightness: this.adjSliders.brightness, contrast: this.adjSliders.contrast },
          name: 'Brightness/Contrast'
        });
        this.showToast('Added Brightness/Contrast Layer');
      });

      const bWarm = document.createElement('button');
      bWarm.type = 'button';
      bWarm.className = 'pill-action-btn secondary';
      bWarm.textContent = '+ Warming Filter (85)';
      bWarm.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'photoFilter',
          params: { color: '#ec8a00', density: this.adjSliders.photoDensity },
          name: 'Photo Filter (Warming 85)'
        });
        this.showToast('Added Warming Photo Filter Layer');
      });

      const bInv = document.createElement('button');
      bInv.type = 'button';
      bInv.className = 'pill-action-btn secondary';
      bInv.textContent = '+ Invert Layer';
      bInv.addEventListener('click', () => {
        this.session.dispatch('adjustment.addLayer', {
          type: 'invert',
          params: {},
          name: 'Invert'
        });
        this.showToast('Added Invert Adjustment Layer');
      });

      row.appendChild(bBC);
      row.appendChild(bWarm);
      row.appendChild(bInv);
      card.appendChild(row);
      body.appendChild(card);
    }
  }

  initInteractiveCurvesCanvas(canvas, hist) {
    let draggingIdx = -1;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo((W * i) / 4, 0);
        ctx.lineTo((W * i) / 4, H);
        ctx.moveTo(0, (H * i) / 4);
        ctx.lineTo(W, (H * i) / 4);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(W, 0);
      ctx.stroke();

      let maxBin = 1;
      for (let i = 4; i < 252; i++) {
        maxBin = Math.max(maxBin, hist.r[i], hist.g[i], hist.b[i]);
      }

      const drawHistChannel = (bins, fillStyle) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let i = 0; i < 256; i++) {
          const x = (i / 255) * W;
          const hNorm = Math.min(1, bins[i] / maxBin);
          const y = H - hNorm * (H * 0.82);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      };

      drawHistChannel(hist.r, 'rgba(236, 91, 98, 0.22)');
      drawHistChannel(hist.g, 'rgba(56, 193, 114, 0.22)');
      drawHistChannel(hist.b, 'rgba(55, 142, 240, 0.26)');
      drawHistChannel(hist.lum, 'rgba(255, 255, 255, 0.14)');

      const pts = this.curvePoints[this.activeCurveChannel];
      const lut = Algorithms.buildCurveLut(pts);
      const colorMap = {
        rgb: '#ffffff',
        r: '#ff6b72',
        g: '#4ade80',
        b: '#60a5fa'
      };
      ctx.strokeStyle = colorMap[this.activeCurveChannel] || '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * W;
        const y = H - (lut[i] / 255) * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 0; i < pts.length; i++) {
        const [px, py] = pts[i];
        const cx = (px / 255) * W;
        const cy = H - (py / 255) * H;
        ctx.fillStyle = i === draggingIdx ? '#378ef0' : '#ffffff';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    const getCoord = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
      const y = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));
      return [x, y];
    };

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = getCoord(e);
      const pts = this.curvePoints[this.activeCurveChannel];
      let nearest = -1;
      let minDist = 22;
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - x, pts[i][1] - y);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
      if (nearest >= 0) {
        draggingIdx = nearest;
      } else {
        pts.push([x, y]);
        pts.sort((a, b) => a[0] - b[0]);
        draggingIdx = pts.findIndex((p) => p[0] === x && p[1] === y);
      }
      draw();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (draggingIdx < 0) return;
      const [x, y] = getCoord(e);
      const pts = this.curvePoints[this.activeCurveChannel];
      if (draggingIdx === 0) {
        pts[0] = [0, y];
      } else if (draggingIdx === pts.length - 1) {
        pts[pts.length - 1] = [255, y];
      } else {
        const minX = pts[draggingIdx - 1][0] + 4;
        const maxX = pts[draggingIdx + 1][0] - 4;
        pts[draggingIdx] = [Math.max(minX, Math.min(maxX, x)), y];
      }
      draw();

      const active = this.session.doc?.activeLayer;
      if (active && active.kind === 'adjustment' && active.adjustment?.type === 'curves') {
        active.adjustment.params = structuredClone(this.curvePoints);
        this.session.doc.compose();
      }
    });

    canvas.addEventListener('pointerup', () => {
      draggingIdx = -1;
      draw();
    });

    draw();
  }

  drawLevelsHistogram(canvas, hist) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    let maxBin = 1;
    for (let i = 3; i < 253; i++) {
      maxBin = Math.max(maxBin, hist.lum[i], hist.r[i], hist.g[i], hist.b[i]);
    }

    const drawChannel = (bins, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * W;
        const y = H - Math.min(1, bins[i] / maxBin) * (H * 0.88);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    };

    drawChannel(hist.r, 'rgba(236, 91, 98, 0.25)');
    drawChannel(hist.g, 'rgba(56, 193, 114, 0.25)');
    drawChannel(hist.b, 'rgba(55, 142, 240, 0.28)');
    drawChannel(hist.lum, 'rgba(240, 240, 245, 0.25)');

    const bx = (this.levelsParams.inBlack / 255) * W;
    const wx = (this.levelsParams.inWhite / 255) * W;
    const gx = bx + (wx - bx) * (1 / (1 + this.levelsParams.gamma));

    for (const [mx, col] of [
      [bx, '#111111'],
      [gx, '#a0a0a8'],
      [wx, '#ffffff']
    ]) {
      ctx.strokeStyle = col === '#111111' ? '#378ef0' : col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, H);
      ctx.stroke();
    }
  }

  /* --------------------------------------------------------------------------
   * 3. FILTERS SHEET
   * -------------------------------------------------------------------------- */
  renderFiltersSheet() {
    const doc = this.session.doc;
    if (!doc) return;

    document.getElementById('sheet-title').textContent = 'Filter Gallery';
    document.getElementById('sheet-subtitle').textContent = 'Live preview on canvas before committing';

    const headerActions = document.getElementById('sheet-header-actions');
    headerActions.innerHTML = '';

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = `opt-chip${this.compareOriginal ? ' active' : ''}`;
    compareBtn.textContent = this.compareOriginal ? 'Showing Original' : 'Hold Compare';
    compareBtn.addEventListener('pointerdown', () => {
      this.compareOriginal = true;
    });
    compareBtn.addEventListener('pointerup', () => {
      this.compareOriginal = false;
    });
    compareBtn.addEventListener('pointerleave', () => {
      this.compareOriginal = false;
    });
    headerActions.appendChild(compareBtn);

    const body = document.getElementById('sheet-body');
    body.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'filter-category-grid';

    for (const f of FILTER_CATALOG) {
      const tile = document.createElement('div');
      tile.className = `filter-tile${this.activeFilterId === f.id ? ' active' : ''}`;
      tile.innerHTML = `
        <div class="filter-tile-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/></svg>
        </div>
        <span class="filter-tile-name">${f.name}</span>
      `;
      tile.addEventListener('click', () => {
        this.activeFilterId = f.id;
        this.activeFilterParams = structuredClone(f.defaults);
        this.updateLiveFilterPreview();
        this.renderFiltersSheet();
      });
      grid.appendChild(tile);
    }
    body.appendChild(grid);

    const activeSpec = FILTER_CATALOG.find((f) => f.id === this.activeFilterId);
    if (activeSpec) {
      const card = document.createElement('div');
      card.className = 'curves-histogram-card';

      const sliders = document.createElement('div');
      sliders.className = 'slider-list';
      for (const ctrl of activeSpec.controls) {
        const val = this.activeFilterParams[ctrl.key] ?? activeSpec.defaults[ctrl.key];
        this.appendRangeRow(sliders, ctrl.label, ctrl.min, ctrl.max, ctrl.step, val, '', (v) => {
          this.activeFilterParams[ctrl.key] = v;
          this.updateLiveFilterPreview();
        });
      }
      card.appendChild(sliders);

      const actRow = document.createElement('div');
      actRow.style.display = 'flex';
      actRow.style.gap = '8px';

      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'pill-action-btn';
      applyBtn.style.flex = '1';
      applyBtn.style.justifyContent = 'center';
      applyBtn.textContent = `Apply ${activeSpec.name} ✓`;
      applyBtn.addEventListener('click', () => {
        if (doc.activeLayer?.kind === 'adjustment') {
          this.showToast('Select a pixel layer to apply filter');
          return;
        }
        this.session.dispatch('filter.apply', {
          id: activeSpec.id,
          params: this.activeFilterParams,
          label: `Filter: ${activeSpec.name}`
        });
        this.closeSheet();
        this.showToast(`Applied ${activeSpec.name}`);
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'pill-action-btn secondary';
      cancelBtn.textContent = 'Reset Preview';
      cancelBtn.addEventListener('click', () => {
        doc.livePreview = null;
        doc.compose();
      });

      actRow.appendChild(applyBtn);
      actRow.appendChild(cancelBtn);
      card.appendChild(actRow);
      body.appendChild(card);

      this.updateLiveFilterPreview();
    }
  }

  updateLiveFilterPreview() {
    const doc = this.session.doc;
    if (!doc || !doc.activeLayer || doc.activeLayer.kind === 'adjustment') return;
    doc.livePreview = {
      type: 'filter',
      id: this.activeFilterId,
      params: structuredClone(this.activeFilterParams)
    };
    doc.compose();
  }

  /* --------------------------------------------------------------------------
   * 4. PROJECT / PSD I/O, FONTS, HISTORY, THEMES & ANDROID APK SHEET
   * -------------------------------------------------------------------------- */
  renderProjectSheet() {
    const doc = this.session.doc;
    if (!doc) return;

    document.getElementById('sheet-title').textContent = 'PSD, Fonts, History & APK';
    document.getElementById('sheet-subtitle').textContent = 'Open/Save PSDs, import .ttf/.otf fonts & install APK';
    document.getElementById('sheet-header-actions').innerHTML = '';

    const body = document.getElementById('sheet-body');
    body.innerHTML = '';

    const ioRow = document.createElement('div');
    ioRow.style.display = 'grid';
    ioRow.style.gridTemplateColumns = '1fr 1fr';
    ioRow.style.gap = '8px';

    const btnOpen = document.createElement('button');
    btnOpen.type = 'button';
    btnOpen.className = 'pill-action-btn';
    btnOpen.style.height = '38px';
    btnOpen.style.justifyContent = 'center';
    btnOpen.textContent = '📂 Open PSD / Photo';
    btnOpen.addEventListener('click', () => document.getElementById('file-input-open').click());

    const btnPlace = document.createElement('button');
    btnPlace.type = 'button';
    btnPlace.className = 'pill-action-btn secondary';
    btnPlace.style.height = '38px';
    btnPlace.style.justifyContent = 'center';
    btnPlace.textContent = '🖼️ Place Photo as Layer';
    btnPlace.addEventListener('click', () => document.getElementById('file-input-place-layer').click());

    const btnImportFont = document.createElement('button');
    btnImportFont.type = 'button';
    btnImportFont.className = 'pill-action-btn secondary';
    btnImportFont.style.height = '38px';
    btnImportFont.style.justifyContent = 'center';
    btnImportFont.textContent = '🔤 Import Font (.ttf/.otf)';
    btnImportFont.addEventListener('click', () => document.getElementById('file-input-font').click());

    const btnExport = document.createElement('button');
    btnExport.type = 'button';
    btnExport.className = 'pill-action-btn';
    btnExport.style.height = '38px';
    btnExport.style.justifyContent = 'center';
    btnExport.textContent = '💾 Export PSD / PNG / JPG';
    btnExport.addEventListener('click', () => this.openExportModal());

    ioRow.appendChild(btnOpen);
    ioRow.appendChild(btnPlace);
    ioRow.appendChild(btnImportFont);
    ioRow.appendChild(btnExport);
    body.appendChild(ioRow);

    if (this.importedFonts.length > 0) {
      const fBox = document.createElement('div');
      fBox.className = 'curves-histogram-card';
      fBox.innerHTML = `<strong style="font-size:11.5px;color:var(--pc-accent);">LOADED CUSTOM FONTS (${this.importedFonts.length})</strong>`;
      const fTags = document.createElement('div');
      fTags.style.display = 'flex';
      fTags.style.flexWrap = 'wrap';
      fTags.style.gap = '6px';
      for (const f of this.importedFonts) {
        const chip = document.createElement('span');
        chip.className = 'opt-chip active';
        chip.style.fontFamily = f.family;
        chip.textContent = f.label;
        fTags.appendChild(chip);
      }
      fBox.appendChild(fTags);
      body.appendChild(fBox);
    }

    const apkCard = document.createElement('div');
    apkCard.className = 'curves-histogram-card';
    apkCard.style.background = 'rgba(35, 134, 54, 0.14)';
    apkCard.style.borderColor = 'rgba(46, 160, 67, 0.45)';
    apkCard.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div>
          <strong style="font-size:13px;color:var(--pc-text);display:block;">Native Android App (.APK)</strong>
          <span style="font-size:11px;color:var(--pc-text-dim);">Installable Android package built from storytold/photocraft</span>
        </div>
        <a href="photocraft-mobile.apk" download="photocraft-mobile.apk" class="apk-download-btn" style="flex-shrink:0;">
          Download APK
        </a>
      </div>
    `;
    body.appendChild(apkCard);

    const scLabel = document.createElement('div');
    scLabel.style.fontSize = '11.5px';
    scLabel.style.fontWeight = '600';
    scLabel.style.color = 'var(--pc-text-dim)';
    scLabel.textContent = 'PHOTOCRAFT MULTI-LAYER SHOWCASE DOCUMENTS';
    body.appendChild(scLabel);

    const scGrid = document.createElement('div');
    scGrid.className = 'showcase-list';

    const cardWave = document.createElement('div');
    cardWave.className = 'showcase-card';
    cardWave.innerHTML = `<strong>The Great Wave.psd</strong><span>6 layers · Curves, Vibrance, Drop Shadow, Live Type</span>`;
    cardWave.addEventListener('click', () => {
      this.loadDocument(SampleProjects.createGreatWaveShowcase());
      this.closeSheet();
      this.showToast('Loaded Great-Wave-Kanagawa.psd');
    });

    const cardEarth = document.createElement('div');
    cardEarth.className = 'showcase-card';
    cardEarth.innerHTML = `<strong>Apollo 8 Earthrise.psd</strong><span>4 layers · Outer Glow, Stroke fx &amp; Starfield</span>`;
    cardEarth.addEventListener('click', () => {
      this.loadDocument(SampleProjects.createEarthriseShowcase());
      this.closeSheet();
      this.showToast('Loaded Apollo8-Earthrise-Styles.psd');
    });

    scGrid.appendChild(cardWave);
    scGrid.appendChild(cardEarth);
    body.appendChild(scGrid);

    const thLabel = document.createElement('div');
    thLabel.style.fontSize = '11.5px';
    thLabel.style.fontWeight = '600';
    thLabel.style.color = 'var(--pc-text-dim)';
    thLabel.textContent = 'INTERFACE APPEARANCE THEME';
    body.appendChild(thLabel);

    const thRow = document.createElement('div');
    thRow.style.display = 'flex';
    thRow.style.gap = '6px';
    thRow.style.flexWrap = 'wrap';
    for (const th of [
      { id: 'pro-dark', label: 'Pro (Dark)' },
      { id: 'pro-medium', label: 'Pro (Medium Gray)' },
      { id: 'breeze-dark', label: 'Breeze Dark' },
      { id: 'pro-light', label: 'Pro (Light)' }
    ]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `opt-chip${this.theme === th.id ? ' active' : ''}`;
      b.textContent = th.label;
      b.addEventListener('click', () => {
        this.theme = th.id;
        document.documentElement.setAttribute('data-theme', th.id);
        this.renderProjectSheet();
      });
      thRow.appendChild(b);
    }
    body.appendChild(thRow);

    const histLabel = document.createElement('div');
    histLabel.style.fontSize = '11.5px';
    histLabel.style.fontWeight = '600';
    histLabel.style.color = 'var(--pc-text-dim)';
    histLabel.textContent = `HISTORY TIMELINE (${doc.history.length} STATES)`;
    body.appendChild(histLabel);

    const histList = document.createElement('div');
    histList.className = 'cmd-list';
    histList.style.maxHeight = '150px';
    for (let i = doc.history.length - 1; i >= 0; i--) {
      const h = doc.history[i];
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cmd-item';
      if (i === doc.historyIndex) {
        item.style.borderColor = 'var(--pc-accent)';
        item.style.background = 'var(--pc-accent-soft)';
      }
      item.innerHTML = `
        <span class="cmd-item-title">${i === doc.historyIndex ? '● ' : ''}${h.label}</span>
        <span class="cmd-item-id">Step #${i + 1}</span>
      `;
      item.addEventListener('click', () => {
        doc.restoreSnapshot(i);
        this.session.notify('history.jump');
      });
      histList.appendChild(item);
    }
    body.appendChild(histList);
  }

  appendRangeRow(container, label, min, max, step, value, unit, onChange) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <div class="slider-header">
        <span>${label}</span>
        <span class="val-display">${value}${unit}</span>
      </div>
      <input type="range" class="pc-range" min="${min}" max="${max}" step="${step}" value="${value}" />
    `;
    const input = row.querySelector('input');
    const disp = row.querySelector('.val-display');
    input.addEventListener('input', () => {
      const v = Number(input.value);
      disp.textContent = `${v}${unit}`;
      onChange(v);
    });
    container.appendChild(row);
  }

  /* ==========================================================================
   * Modals: Type Tool + Font Importer, Full Blending Options & Layer Styles (fx),
   * Export As, New Doc, Color Picker, Command Palette
   * ========================================================================== */
  openModal(title, renderBodyFn, renderFooterFn) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');
    body.innerHTML = '';
    footer.innerHTML = '';
    renderBodyFn(body);
    if (renderFooterFn) renderFooterFn(footer);
    overlay.hidden = false;
  }

  closeModal() {
    document.getElementById('modal-overlay').hidden = true;
  }

  /**
   * Type Layer Editor Modal with Downloaded Font Importer (.ttf/.otf/.woff/.woff2),
   * Horizontal & Vertical Type, Tracking, Leading, Weight, Italic, and Warp Text!
   */
  openTextEditorModal(existingLayer = null, defaultX = null, defaultY = null) {
    const doc = this.session.doc;
    if (!doc) return;
    const td = existingLayer?.textData || {
      text: 'PHOTOCRAFT\nMOBILE STUDIO',
      fontFamily: this.activeFontFamily || BUILTIN_FONTS[0].family,
      fontSize: 52,
      fontWeight: '700',
      italic: false,
      color: this.fgColor,
      align: 'center',
      lineHeight: 1.3,
      tracking: 0,
      orientation: 'horizontal',
      warp: 'none',
      warpBend: 35,
      x: defaultX ?? doc.width / 2,
      y: defaultY ?? doc.height / 2
    };

    let textVal = td.text;
    let fontFamily = td.fontFamily || BUILTIN_FONTS[0].family;
    let fontSize = td.fontSize || 52;
    let fontWeight = td.fontWeight || '700';
    let italic = Boolean(td.italic);
    let color = td.color || '#ffffff';
    let align = td.align || 'center';
    let tracking = td.tracking || 0;
    let lineHeight = td.lineHeight || 1.3;
    let orientation = td.orientation || 'horizontal';
    let warp = td.warp || 'none';

    this.openModal(
      existingLayer ? 'Edit Type & Font Controls' : 'Add Live Type Layer',
      (body) => {
        // 1. Font Family Dropdown + Import Downloaded Font Button
        const fontBox = document.createElement('div');
        fontBox.className = 'curves-histogram-card';
        fontBox.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <label style="font-size:11.5px;font-weight:600;color:var(--pc-text);">Font Family</label>
            <button type="button" class="pill-action-btn" id="btn-modal-import-font" style="height:26px;font-size:11px;padding:0 9px;">
              + Import Downloaded Font (.ttf/.otf)
            </button>
          </div>
          <select class="pc-select" id="modal-type-font-select"></select>
        `;
        const fontSel = fontBox.querySelector('#modal-type-font-select');
        for (const f of this.allFonts) {
          const opt = document.createElement('option');
          opt.value = f.family;
          opt.textContent = f.label;
          if (f.family === fontFamily) opt.selected = true;
          fontSel.appendChild(opt);
        }
        fontSel.addEventListener('change', () => {
          fontFamily = fontSel.value;
          this.activeFontFamily = fontFamily;
          ta.style.fontFamily = fontFamily;
        });
        fontBox.querySelector('#btn-modal-import-font').addEventListener('click', () => {
          document.getElementById('file-input-font').click();
        });
        body.appendChild(fontBox);

        // 2. Text Content
        const f1 = document.createElement('div');
        f1.className = 'ctrl-field';
        f1.innerHTML = `<label>Type Content</label>
          <textarea class="pc-input" style="height:68px;padding:8px;resize:vertical;font-family:${fontFamily};">${textVal}</textarea>`;
        const ta = f1.querySelector('textarea');
        ta.addEventListener('input', () => (textVal = ta.value));
        body.appendChild(f1);

        // 3. Orientation, Weight, Italic, Alignment, Color, Warp
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '8px';
        grid.innerHTML = `
          <div class="ctrl-field">
            <label>Orientation</label>
            <select class="pc-select" id="mt-orient">
              <option value="horizontal" ${orientation === 'horizontal' ? 'selected' : ''}>Horizontal Type</option>
              <option value="vertical" ${orientation === 'vertical' ? 'selected' : ''}>Vertical Type (縦書き)</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label>Weight &amp; Style</label>
            <div style="display:flex;gap:4px;">
              <select class="pc-select" id="mt-weight" style="flex:1;">
                <option value="400" ${fontWeight === '400' ? 'selected' : ''}>Regular</option>
                <option value="600" ${fontWeight === '600' ? 'selected' : ''}>SemiBold</option>
                <option value="700" ${fontWeight === '700' ? 'selected' : ''}>Bold</option>
                <option value="900" ${fontWeight === '900' ? 'selected' : ''}>Black</option>
              </select>
              <button type="button" class="opt-chip ${italic ? 'active' : ''}" id="mt-italic" style="padding:0 9px;font-style:italic;font-weight:700;">I</button>
            </div>
          </div>
          <div class="ctrl-field">
            <label>Text Color</label>
            <input type="color" class="pc-input" id="mt-color" value="${color}" style="padding:2px;height:30px;width:100%;" />
          </div>
          <div class="ctrl-field">
            <label>Alignment</label>
            <select class="pc-select" id="mt-align">
              <option value="left" ${align === 'left' ? 'selected' : ''}>Left</option>
              <option value="center" ${align === 'center' ? 'selected' : ''}>Center</option>
              <option value="right" ${align === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </div>
          <div class="ctrl-field" style="grid-column: span 2;">
            <label>Warp Text Style</label>
            <select class="pc-select" id="mt-warp">
              <option value="none" ${warp === 'none' ? 'selected' : ''}>None (Straight)</option>
              <option value="arcUp" ${warp === 'arcUp' ? 'selected' : ''}>Arc Upper</option>
              <option value="arcDown" ${warp === 'arcDown' ? 'selected' : ''}>Arc Lower</option>
              <option value="wave" ${warp === 'wave' ? 'selected' : ''}>Flag / Sine Wave</option>
            </select>
          </div>
        `;
        grid.querySelector('#mt-orient').addEventListener('change', (e) => (orientation = e.target.value));
        grid.querySelector('#mt-weight').addEventListener('change', (e) => (fontWeight = e.target.value));
        const itBtn = grid.querySelector('#mt-italic');
        itBtn.addEventListener('click', () => {
          italic = !italic;
          itBtn.classList.toggle('active', italic);
        });
        grid.querySelector('#mt-color').addEventListener('input', (e) => (color = e.target.value));
        grid.querySelector('#mt-align').addEventListener('change', (e) => (align = e.target.value));
        grid.querySelector('#mt-warp').addEventListener('change', (e) => (warp = e.target.value));
        body.appendChild(grid);

        // 4. Size, Tracking (Letter-Spacing), Leading (Line-Height)
        const sliders = document.createElement('div');
        sliders.className = 'slider-list';
        this.appendRangeRow(sliders, 'Font Size (px)', 12, 180, 1, fontSize, 'px', (v) => (fontSize = v));
        this.appendRangeRow(sliders, 'Tracking (Letter Spacing)', -15, 60, 1, tracking, 'px', (v) => (tracking = v));
        this.appendRangeRow(sliders, 'Leading (Line Height)', 0.8, 2.4, 0.05, lineHeight, '×', (v) => (lineHeight = v));
        body.appendChild(sliders);
      },
      (footer) => {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'pill-action-btn secondary';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => this.closeModal());

        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'pill-action-btn';
        save.textContent = existingLayer ? 'Update Type Layer' : 'Add Type Layer';
        save.addEventListener('click', () => {
          const payload = {
            text: textVal,
            fontFamily,
            fontSize,
            fontWeight,
            italic,
            color,
            align,
            tracking,
            lineHeight,
            orientation,
            warp
          };
          if (existingLayer) {
            this.session.dispatch('text.addOrUpdate', {
              layerId: existingLayer.id,
              textData: payload
            });
          } else {
            this.session.dispatch('text.addOrUpdate', {
              ...payload,
              x: td.x,
              y: td.y
            });
          }
          this.closeModal();
          this.showToast(existingLayer ? 'Updated Type Layer' : 'Added Type Layer');
        });
        footer.appendChild(cancel);
        footer.appendChild(save);
      }
    );
  }

  /**
   * ==========================================================================
   * Complete Photoshop / PhotoCraft Blending Options & Layer Styles Dialog (fx)
   * Includes: Blending Options (Blend Mode, Opacity, Fill Opacity, RGB Channels, Blend If),
   * Stroke, Color Overlay, Gradient Overlay, Pattern Overlay, Drop Shadow, Inner Shadow,
   * Outer Glow, Inner Glow, Bevel & Emboss, and Satin.
   * ==========================================================================
   */
  openLayerStylesModal() {
    const doc = this.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment') {
      this.showToast('Select a pixel, type, or shape layer to edit Blending Options & Styles');
      return;
    }

    layer.styles = doc.normalizeLayerStyles(layer.styles);
    const fx = layer.styles;
    let activeTab = 'blendingOptions';

    const TABS = [
      { id: 'blendingOptions', label: '⚙ Blending Options' },
      { id: 'stroke', label: 'Stroke', key: 'stroke' },
      { id: 'colorOverlay', label: 'Color Overlay', key: 'colorOverlay' },
      { id: 'gradientOverlay', label: 'Gradient Overlay', key: 'gradientOverlay' },
      { id: 'dropShadow', label: 'Drop Shadow', key: 'dropShadow' },
      { id: 'innerShadow', label: 'Inner Shadow', key: 'innerShadow' },
      { id: 'outerGlow', label: 'Outer Glow', key: 'outerGlow' },
      { id: 'innerGlow', label: 'Inner Glow', key: 'innerGlow' },
      { id: 'bevelEmboss', label: 'Bevel & Emboss', key: 'bevelEmboss' },
      { id: 'satin', label: 'Satin', key: 'satin' },
      { id: 'patternOverlay', label: 'Pattern Overlay', key: 'patternOverlay' }
    ];

    this.openModal(
      `Blending Options & Layer Style (fx) — ${layer.name}`,
      (body) => {
        // Quick Copy / Paste / Clear style bar
        const utilRow = document.createElement('div');
        utilRow.style.display = 'flex';
        utilRow.style.gap = '6px';
        utilRow.innerHTML = `
          <button type="button" class="opt-chip" id="fx-copy-btn">Copy Style</button>
          <button type="button" class="opt-chip" id="fx-paste-btn">Paste Style</button>
          <button type="button" class="opt-chip" id="fx-clear-btn">Clear All fx</button>
        `;
        utilRow.querySelector('#fx-copy-btn').addEventListener('click', () => {
          this.session.dispatch('layer.copyStyle');
          this.showToast('Copied Layer Style');
        });
        utilRow.querySelector('#fx-paste-btn').addEventListener('click', () => {
          this.session.dispatch('layer.pasteStyle');
          this.closeModal();
          this.openLayerStylesModal();
          this.showToast('Pasted Layer Style');
        });
        utilRow.querySelector('#fx-clear-btn').addEventListener('click', () => {
          this.session.dispatch('layer.clearStyle');
          this.closeModal();
          this.openLayerStylesModal();
          this.showToast('Cleared Layer Styles');
        });
        body.appendChild(utilRow);

        // Effect Tab Strip
        const tabBar = document.createElement('div');
        tabBar.className = 'sub-tabs';
        body.appendChild(tabBar);

        const detailContainer = document.createElement('div');
        detailContainer.className = 'curves-histogram-card';
        body.appendChild(detailContainer);

        const renderTabsAndDetail = () => {
          tabBar.innerHTML = '';
          for (const t of TABS) {
            const isEn = t.key && fx[t.key]?.enabled;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `sub-tab-btn${activeTab === t.id ? ' active' : ''}`;
            btn.textContent = `${isEn ? '✓ ' : ''}${t.label}`;
            btn.addEventListener('click', () => {
              activeTab = t.id;
              renderTabsAndDetail();
            });
            tabBar.appendChild(btn);
          }

          detailContainer.innerHTML = '';

          // Helper for enabling effect checkbox header
          const addEffectHeader = (fxKey, title, hasColor = false) => {
            const eff = fx[fxKey];
            const hdr = document.createElement('div');
            hdr.style.display = 'flex';
            hdr.style.alignItems = 'center';
            hdr.style.justifyContent = 'space-between';
            hdr.innerHTML = `
              <label style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;cursor:pointer;">
                <input type="checkbox" class="fx-en-cb" ${eff.enabled ? 'checked' : ''} />
                Enable ${title}
              </label>
              ${hasColor ? `<input type="color" class="fx-col-in" value="${eff.color || '#378ef0'}" style="width:36px;height:28px;border:none;background:none;cursor:pointer;" />` : ''}
            `;
            const cb = hdr.querySelector('.fx-en-cb');
            cb.addEventListener('change', () => {
              eff.enabled = cb.checked;
              doc.compose();
              renderTabsAndDetail();
            });
            if (hasColor) {
              hdr.querySelector('.fx-col-in').addEventListener('input', (e) => {
                eff.color = e.target.value;
                eff.enabled = true;
                cb.checked = true;
                doc.compose();
              });
            }
            detailContainer.appendChild(hdr);
            return cb;
          };

          const autoEnable = (fxKey, cb) => {
            fx[fxKey].enabled = true;
            if (cb) cb.checked = true;
            doc.compose();
          };

          if (activeTab === 'blendingOptions') {
            const bo = fx.blendOptions;
            const bmField = document.createElement('div');
            bmField.className = 'ctrl-field';
            bmField.innerHTML = `<label>Layer Blend Mode</label>`;
            const sel = document.createElement('select');
            sel.className = 'pc-select';
            for (const bm of BLEND_MODES) {
              const o = document.createElement('option');
              o.value = bm.id;
              o.textContent = bm.label;
              if (layer.blendMode === bm.id) o.selected = true;
              sel.appendChild(o);
            }
            sel.addEventListener('change', () => {
              layer.blendMode = sel.value;
              doc.compose();
            });
            bmField.appendChild(sel);
            detailContainer.appendChild(bmField);

            this.appendRangeRow(detailContainer, 'Layer Opacity (%)', 0, 100, 1, Math.round((layer.opacity ?? 1) * 100), '%', (v) => {
              layer.opacity = v / 100;
              doc.compose();
            });
            this.appendRangeRow(detailContainer, 'Fill Opacity (keeps fx at 100%)', 0, 100, 1, Math.round((layer.fill ?? 1) * 100), '%', (v) => {
              layer.fill = v / 100;
              doc.compose();
            });

            // RGB Channels Checkboxes
            const chDiv = document.createElement('div');
            chDiv.style.display = 'flex';
            chDiv.style.alignItems = 'center';
            chDiv.style.justifyContent = 'space-between';
            chDiv.innerHTML = `
              <span style="font-size:12px;font-weight:500;">Advanced Channels</span>
              <div style="display:flex;gap:10px;">
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="bo-ch-r" ${bo.channels.r !== false ? 'checked' : ''} /> R</label>
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="bo-ch-g" ${bo.channels.g !== false ? 'checked' : ''} /> G</label>
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="bo-ch-b" ${bo.channels.b !== false ? 'checked' : ''} /> B</label>
              </div>
            `;
            for (const k of ['r', 'g', 'b']) {
              chDiv.querySelector(`#bo-ch-${k}`).addEventListener('change', (e) => {
                bo.channels[k] = e.target.checked;
                doc.compose();
              });
            }
            detailContainer.appendChild(chDiv);

            this.appendRangeRow(detailContainer, 'Blend If: This Layer Shadows Clip', 0, 240, 1, bo.blendIfBlack ?? 0, '', (v) => {
              bo.blendIfBlack = v;
              doc.compose();
            });
            this.appendRangeRow(detailContainer, 'Blend If: This Layer Highlights Clip', 15, 255, 1, bo.blendIfWhite ?? 255, '', (v) => {
              bo.blendIfWhite = v;
              doc.compose();
            });
          } else if (activeTab === 'stroke') {
            const st = fx.stroke;
            const cb = addEffectHeader('stroke', 'Stroke Outline', true);

            const row = document.createElement('div');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '1fr 1fr';
            row.style.gap = '8px';
            row.innerHTML = `
              <div class="ctrl-field">
                <label>Position</label>
                <select class="pc-select" id="st-pos">
                  <option value="outside" ${st.position === 'outside' ? 'selected' : ''}>Outside</option>
                  <option value="inside" ${st.position === 'inside' ? 'selected' : ''}>Inside</option>
                  <option value="center" ${st.position === 'center' ? 'selected' : ''}>Center</option>
                </select>
              </div>
              <div class="ctrl-field">
                <label>Fill Type</label>
                <select class="pc-select" id="st-filltype">
                  <option value="color" ${st.fillType !== 'gradient' ? 'selected' : ''}>Solid Color</option>
                  <option value="gradient" ${st.fillType === 'gradient' ? 'selected' : ''}>Gradient</option>
                </select>
              </div>
            `;
            row.querySelector('#st-pos').addEventListener('change', (e) => {
              st.position = e.target.value;
              autoEnable('stroke', cb);
            });
            row.querySelector('#st-filltype').addEventListener('change', (e) => {
              st.fillType = e.target.value;
              autoEnable('stroke', cb);
              renderTabsAndDetail();
            });
            detailContainer.appendChild(row);

            if (st.fillType === 'gradient') {
              const gRow = document.createElement('div');
              gRow.style.display = 'grid';
              gRow.style.gridTemplateColumns = '1fr 1fr';
              gRow.style.gap = '8px';
              gRow.innerHTML = `
                <div class="ctrl-field"><label>Gradient Start</label><input type="color" id="st-g1" value="${st.gradientColor1 || '#378ef0'}" style="width:100%;height:30px;" /></div>
                <div class="ctrl-field"><label>Gradient End</label><input type="color" id="st-g2" value="${st.gradientColor2 || '#f59e0b'}" style="width:100%;height:30px;" /></div>
              `;
              gRow.querySelector('#st-g1').addEventListener('input', (e) => {
                st.gradientColor1 = e.target.value;
                autoEnable('stroke', cb);
              });
              gRow.querySelector('#st-g2').addEventListener('input', (e) => {
                st.gradientColor2 = e.target.value;
                autoEnable('stroke', cb);
              });
              detailContainer.appendChild(gRow);
            }

            this.appendRangeRow(detailContainer, 'Stroke Size (px)', 1, 24, 1, st.size ?? 3, 'px', (v) => {
              st.size = v;
              autoEnable('stroke', cb);
            });
            this.appendRangeRow(detailContainer, 'Stroke Opacity (%)', 0, 100, 1, Math.round((st.opacity ?? 1) * 100), '%', (v) => {
              st.opacity = v / 100;
              autoEnable('stroke', cb);
            });
          } else if (activeTab === 'colorOverlay') {
            const co = fx.colorOverlay;
            const cb = addEffectHeader('colorOverlay', 'Color Overlay', true);

            const bmField = document.createElement('div');
            bmField.className = 'ctrl-field';
            bmField.innerHTML = `<label>Blend Mode</label>`;
            const sel = document.createElement('select');
            sel.className = 'pc-select';
            for (const bm of BLEND_MODES) {
              const o = document.createElement('option');
              o.value = bm.id;
              o.textContent = bm.label;
              if (co.blendMode === bm.id) o.selected = true;
              sel.appendChild(o);
            }
            sel.addEventListener('change', () => {
              co.blendMode = sel.value;
              autoEnable('colorOverlay', cb);
            });
            bmField.appendChild(sel);
            detailContainer.appendChild(bmField);

            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((co.opacity ?? 0.85) * 100), '%', (v) => {
              co.opacity = v / 100;
              autoEnable('colorOverlay', cb);
            });
          } else if (activeTab === 'gradientOverlay') {
            const go = fx.gradientOverlay;
            const cb = addEffectHeader('gradientOverlay', 'Gradient Overlay', false);

            const row = document.createElement('div');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '1fr 1fr';
            row.style.gap = '8px';
            row.innerHTML = `
              <div class="ctrl-field"><label>Start Color</label><input type="color" id="go-c1" value="${go.color1 || '#1e4e82'}" style="width:100%;height:30px;" /></div>
              <div class="ctrl-field"><label>End Color</label><input type="color" id="go-c2" value="${go.color2 || '#f59e0b'}" style="width:100%;height:30px;" /></div>
              <div class="ctrl-field">
                <label>Style</label>
                <select class="pc-select" id="go-style">
                  <option value="linear" ${go.style === 'linear' ? 'selected' : ''}>Linear</option>
                  <option value="radial" ${go.style === 'radial' ? 'selected' : ''}>Radial</option>
                  <option value="reflected" ${go.style === 'reflected' ? 'selected' : ''}>Reflected</option>
                </select>
              </div>
              <div class="ctrl-field">
                <label>Blend Mode</label>
                <select class="pc-select" id="go-bm">
                  ${BLEND_MODES.map((b) => `<option value="${b.id}" ${go.blendMode === b.id ? 'selected' : ''}>${b.label}</option>`).join('')}
                </select>
              </div>
            `;
            row.querySelector('#go-c1').addEventListener('input', (e) => {
              go.color1 = e.target.value;
              autoEnable('gradientOverlay', cb);
            });
            row.querySelector('#go-c2').addEventListener('input', (e) => {
              go.color2 = e.target.value;
              autoEnable('gradientOverlay', cb);
            });
            row.querySelector('#go-style').addEventListener('change', (e) => {
              go.style = e.target.value;
              autoEnable('gradientOverlay', cb);
            });
            row.querySelector('#go-bm').addEventListener('change', (e) => {
              go.blendMode = e.target.value;
              autoEnable('gradientOverlay', cb);
            });
            detailContainer.appendChild(row);

            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((go.opacity ?? 0.9) * 100), '%', (v) => {
              go.opacity = v / 100;
              autoEnable('gradientOverlay', cb);
            });
            this.appendRangeRow(detailContainer, 'Angle (°)', -180, 180, 5, go.angle ?? 90, '°', (v) => {
              go.angle = v;
              autoEnable('gradientOverlay', cb);
            });
            this.appendRangeRow(detailContainer, 'Scale (%)', 25, 150, 5, go.scale ?? 100, '%', (v) => {
              go.scale = v;
              autoEnable('gradientOverlay', cb);
            });
          } else if (activeTab === 'dropShadow') {
            const ds = fx.dropShadow;
            const cb = addEffectHeader('dropShadow', 'Drop Shadow', true);
            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((ds.opacity ?? 0.72) * 100), '%', (v) => {
              ds.opacity = v / 100;
              autoEnable('dropShadow', cb);
            });
            this.appendRangeRow(detailContainer, 'Angle (°)', -180, 180, 5, ds.angle ?? 120, '°', (v) => {
              ds.angle = v;
              autoEnable('dropShadow', cb);
            });
            this.appendRangeRow(detailContainer, 'Distance (px)', 0, 60, 1, ds.distance ?? 10, 'px', (v) => {
              ds.distance = v;
              autoEnable('dropShadow', cb);
            });
            this.appendRangeRow(detailContainer, 'Size / Blur (px)', 0, 60, 1, ds.size ?? 16, 'px', (v) => {
              ds.size = v;
              autoEnable('dropShadow', cb);
            });
          } else if (activeTab === 'innerShadow') {
            const is = fx.innerShadow;
            const cb = addEffectHeader('innerShadow', 'Inner Shadow', true);
            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((is.opacity ?? 0.75) * 100), '%', (v) => {
              is.opacity = v / 100;
              autoEnable('innerShadow', cb);
            });
            this.appendRangeRow(detailContainer, 'Angle (°)', -180, 180, 5, is.angle ?? 120, '°', (v) => {
              is.angle = v;
              autoEnable('innerShadow', cb);
            });
            this.appendRangeRow(detailContainer, 'Distance (px)', 0, 50, 1, is.distance ?? 6, 'px', (v) => {
              is.distance = v;
              autoEnable('innerShadow', cb);
            });
            this.appendRangeRow(detailContainer, 'Size (px)', 1, 50, 1, is.size ?? 8, 'px', (v) => {
              is.size = v;
              autoEnable('innerShadow', cb);
            });
          } else if (activeTab === 'outerGlow') {
            const og = fx.outerGlow;
            const cb = addEffectHeader('outerGlow', 'Outer Glow', true);
            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((og.opacity ?? 0.78) * 100), '%', (v) => {
              og.opacity = v / 100;
              autoEnable('outerGlow', cb);
            });
            this.appendRangeRow(detailContainer, 'Glow Size (px)', 1, 70, 1, og.size ?? 20, 'px', (v) => {
              og.size = v;
              autoEnable('outerGlow', cb);
            });
          } else if (activeTab === 'innerGlow') {
            const ig = fx.innerGlow;
            const cb = addEffectHeader('innerGlow', 'Inner Glow', true);
            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((ig.opacity ?? 0.75) * 100), '%', (v) => {
              ig.opacity = v / 100;
              autoEnable('innerGlow', cb);
            });
            this.appendRangeRow(detailContainer, 'Glow Size (px)', 1, 60, 1, ig.size ?? 14, 'px', (v) => {
              ig.size = v;
              autoEnable('innerGlow', cb);
            });
          } else if (activeTab === 'bevelEmboss') {
            const bev = fx.bevelEmboss;
            const cb = addEffectHeader('bevelEmboss', 'Bevel & Emboss', false);
            this.appendRangeRow(detailContainer, 'Depth (%)', 10, 300, 10, bev.depth ?? 100, '%', (v) => {
              bev.depth = v;
              autoEnable('bevelEmboss', cb);
            });
            this.appendRangeRow(detailContainer, 'Size (px)', 1, 36, 1, bev.size ?? 8, 'px', (v) => {
              bev.size = v;
              autoEnable('bevelEmboss', cb);
            });
            this.appendRangeRow(detailContainer, 'Soften (px)', 0, 12, 1, bev.soften ?? 2, 'px', (v) => {
              bev.soften = v;
              autoEnable('bevelEmboss', cb);
            });
            this.appendRangeRow(detailContainer, 'Light Angle (°)', -180, 180, 5, bev.angle ?? 120, '°', (v) => {
              bev.angle = v;
              autoEnable('bevelEmboss', cb);
            });
          } else if (activeTab === 'satin') {
            const sat = fx.satin;
            const cb = addEffectHeader('satin', 'Satin Contour', true);
            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((sat.opacity ?? 0.5) * 100), '%', (v) => {
              sat.opacity = v / 100;
              autoEnable('satin', cb);
            });
            this.appendRangeRow(detailContainer, 'Distance (px)', 1, 50, 1, sat.distance ?? 14, 'px', (v) => {
              sat.distance = v;
              autoEnable('satin', cb);
            });
            this.appendRangeRow(detailContainer, 'Size (px)', 1, 50, 1, sat.size ?? 16, 'px', (v) => {
              sat.size = v;
              autoEnable('satin', cb);
            });
          } else if (activeTab === 'patternOverlay') {
            const po = fx.patternOverlay;
            const cb = addEffectHeader('patternOverlay', 'Pattern Overlay', false);
            const pSel = document.createElement('select');
            pSel.className = 'pc-select';
            for (const p of [
              { id: 'stripes', label: 'Diagonal Stripes' },
              { id: 'checker', label: 'Checkerboard' },
              { id: 'dots', label: 'Halftone Polka Dots' },
              { id: 'grid', label: 'Technical Grid' }
            ]) {
              const o = document.createElement('option');
              o.value = p.id;
              o.textContent = p.label;
              if (po.pattern === p.id) o.selected = true;
              pSel.appendChild(o);
            }
            pSel.addEventListener('change', () => {
              po.pattern = pSel.value;
              autoEnable('patternOverlay', cb);
            });
            detailContainer.appendChild(pSel);
            this.appendRangeRow(detailContainer, 'Opacity (%)', 0, 100, 1, Math.round((po.opacity ?? 0.55) * 100), '%', (v) => {
              po.opacity = v / 100;
              autoEnable('patternOverlay', cb);
            });
            this.appendRangeRow(detailContainer, 'Pattern Scale (%)', 25, 250, 5, po.scale ?? 100, '%', (v) => {
              po.scale = v;
              autoEnable('patternOverlay', cb);
            });
          }
        };

        renderTabsAndDetail();
      },
      (footer) => {
        const done = document.createElement('button');
        done.type = 'button';
        done.className = 'pill-action-btn';
        done.textContent = 'Apply Blending & Styles ✓';
        done.addEventListener('click', () => {
          doc.pushHistory(`Layer Styles (${layer.name})`);
          this.session.notify('layer.styles');
          this.closeModal();
        });
        footer.appendChild(done);
      }
    );
  }

  openExportModal() {
    const doc = this.session.doc;
    if (!doc) return;
    doc.compose();

    let format = 'psd';
    let quality = 92;
    let scalePct = 100;

    this.openModal(
      'Export As (PSD / PNG / JPG / WebP)',
      (body) => {
        const fmtGroup = document.createElement('div');
        fmtGroup.className = 'ctrl-field';
        fmtGroup.innerHTML = `<label>File Format</label>`;
        const sel = document.createElement('select');
        sel.className = 'pc-select';
        for (const f of [
          { id: 'psd', label: 'Adobe Photoshop Layered (.PSD — 8BPS Binary)' },
          { id: 'png', label: 'PNG Lossless with Transparency (.PNG)' },
          { id: 'jpeg', label: 'JPEG Photo (.JPG)' },
          { id: 'webp', label: 'WebP Modern Image (.WEBP)' }
        ]) {
          const o = document.createElement('option');
          o.value = f.id;
          o.textContent = f.label;
          sel.appendChild(o);
        }
        fmtGroup.appendChild(sel);
        body.appendChild(fmtGroup);

        const sliders = document.createElement('div');
        sliders.className = 'slider-list';
        this.appendRangeRow(sliders, 'Quality (%)', 10, 100, 1, quality, '%', (v) => {
          quality = v;
          updateEstimate();
        });
        this.appendRangeRow(sliders, 'Scale (%)', 25, 200, 25, scalePct, '%', (v) => {
          scalePct = v;
          updateEstimate();
        });
        body.appendChild(sliders);

        const estBox = document.createElement('div');
        estBox.className = 'histogram-stats-row';
        estBox.style.gridTemplateColumns = '1fr 1fr 1fr';
        body.appendChild(estBox);

        const updateEstimate = () => {
          const outW = Math.round((doc.width * scalePct) / 100);
          const outH = Math.round((doc.height * scalePct) / 100);
          let approxKB = Math.round((outW * outH * 4) / 1024);
          if (format === 'psd') {
            approxKB = Math.round((doc.width * doc.height * 4 * (doc.layers.length + 1)) / 1024);
          } else if (format === 'jpeg' || format === 'webp') {
            approxKB = Math.max(12, Math.round(approxKB * (quality / 100) * 0.14));
          } else {
            approxKB = Math.round(approxKB * 0.42);
          }
          estBox.innerHTML = `
            <div>Dimensions<strong>${outW}×${outH}</strong></div>
            <div>Layers<strong>${format === 'psd' ? doc.layers.length : '1 (Flat)'}</strong></div>
            <div>Est. Size<strong>~${approxKB > 1024 ? (approxKB / 1024).toFixed(1) + ' MB' : approxKB + ' KB'}</strong></div>
          `;
        };

        sel.addEventListener('change', () => {
          format = sel.value;
          updateEstimate();
        });
        updateEstimate();
      },
      (footer) => {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'pill-action-btn secondary';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => this.closeModal());

        const exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.className = 'pill-action-btn';
        exportBtn.textContent = 'Export & Download';
        exportBtn.addEventListener('click', () => {
          this.performExport(format, quality / 100, scalePct / 100);
          this.closeModal();
        });

        footer.appendChild(cancel);
        footer.appendChild(exportBtn);
      }
    );
  }

  performExport(format, quality = 0.92, scale = 1.0) {
    const doc = this.session.doc;
    if (!doc) return;
    doc.compose();
    const baseName = doc.title.replace(/\.(psd|png|jpg|jpeg|webp|pcraft)$/i, '') || 'photocraft-mobile';

    if (format === 'psd') {
      const psdBytes = PsdCodec.encodePsd(doc, doc.compositeCanvas);
      const blob = new Blob([psdBytes], { type: 'image/vnd.adobe.photoshop' });
      this.triggerDownloadOrAndroidShare(blob, `${baseName}.psd`, 'image/vnd.adobe.photoshop');
      this.showToast(`Exported Layered PSD (${doc.layers.length} layers)`);
      return;
    }

    const outW = Math.max(1, Math.round(doc.width * scale));
    const outH = Math.max(1, Math.round(doc.height * scale));
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const oCtx = outCanvas.getContext('2d');
    if (format === 'jpeg') {
      oCtx.fillStyle = '#ffffff';
      oCtx.fillRect(0, 0, outW, outH);
    }
    oCtx.drawImage(doc.compositeCanvas, 0, 0, outW, outH);

    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : format;

    outCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        this.triggerDownloadOrAndroidShare(blob, `${baseName}.${ext}`, mime);
        this.showToast(`Exported ${baseName}.${ext}`);
      },
      mime,
      quality
    );
  }

  triggerDownloadOrAndroidShare(blob, filename, mimeType) {
    if (window.PhotoCraftAndroid && typeof window.PhotoCraftAndroid.saveBase64File === 'function') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1] || '';
        window.PhotoCraftAndroid.saveBase64File(base64, filename, mimeType);
      };
      reader.readAsDataURL(blob);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async handleOpenFile(file) {
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.psd') || name.endsWith('.psb')) {
        const buf = await file.arrayBuffer();
        const decoded = PsdCodec.decodePsd(buf);
        const doc = new PhotoCraftDoc(decoded.width, decoded.height, file.name);
        for (const l of decoded.layers) {
          const lyr = doc.createLayerObject({
            name: l.name,
            kind: 'raster',
            blendMode: l.blendMode,
            opacity: l.opacity,
            visible: l.visible,
            clipping: l.clipping,
            sourceCanvas: l.canvas
          });
          doc.layers.push(lyr);
        }
        doc.activeLayerId = doc.layers[doc.layers.length - 1]?.id || null;
        doc.compose();
        doc.pushHistory(`Open ${file.name}`);
        this.loadDocument(doc);
        this.closeSheet();
        this.showToast(`Opened PSD (${doc.layers.length} layers)`);
        return;
      }

      const bmp = await createImageBitmap(file);
      const doc = new PhotoCraftDoc(bmp.width, bmp.height, file.name.replace(/\.[^.]+$/, '.psd'));
      const bg = doc.createLayerObject({ name: file.name, kind: 'raster' });
      bg.canvas.getContext('2d').drawImage(bmp, 0, 0);
      doc.layers.push(bg);
      doc.activeLayerId = bg.id;
      doc.compose();
      doc.pushHistory(`Open ${file.name}`);
      this.loadDocument(doc);
      this.closeSheet();
      this.showToast(`Opened ${file.name} (${bmp.width}×${bmp.height})`);
    } catch (err) {
      this.showToast(`Error opening file: ${err.message}`);
    }
  }

  async handlePlaceImageAsLayer(file) {
    const doc = this.session.doc;
    if (!doc) return;
    try {
      const bmp = await createImageBitmap(file);
      const lyr = doc.createLayerObject({ name: file.name.replace(/\.[^.]+$/, ''), kind: 'raster' });
      const ctx = lyr.canvas.getContext('2d');
      const scale = Math.min(doc.width / bmp.width, doc.height / bmp.height, 1);
      const w = bmp.width * scale;
      const h = bmp.height * scale;
      ctx.drawImage(bmp, (doc.width - w) / 2, (doc.height - h) / 2, w, h);
      doc.layers.push(lyr);
      doc.activeLayerId = lyr.id;
      doc.pushHistory(`Place ${lyr.name}`);
      this.session.notify('layer.placed');
      this.showToast(`Placed ${lyr.name} as new layer`);
    } catch (err) {
      this.showToast(`Could not place image: ${err.message}`);
    }
  }

  openNewDocumentModal() {
    let width = 1080;
    let height = 1350;
    let bg = '#ffffff';
    let title = 'Mobile-Artwork.psd';

    this.openModal(
      'New PhotoCraft Document',
      (body) => {
        const presets = document.createElement('div');
        presets.className = 'showcase-list';
        for (const p of [
          { name: 'Mobile Portrait', w: 1080, h: 1350 },
          { name: 'Mobile Story 9:16', w: 1080, h: 1920 },
          { name: 'Square 1:1', w: 1080, h: 1080 },
          { name: 'HD Landscape', w: 1920, h: 1080 }
        ]) {
          const card = document.createElement('div');
          card.className = 'showcase-card';
          card.innerHTML = `<strong>${p.name}</strong><span>${p.w} × ${p.h} px</span>`;
          card.addEventListener('click', () => {
            width = p.w;
            height = p.h;
            wIn.value = String(p.w);
            hIn.value = String(p.h);
          });
          presets.appendChild(card);
        }
        body.appendChild(presets);

        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr';
        row.style.gap = '8px';
        row.innerHTML = `
          <div class="ctrl-field"><label>Width (px)</label><input type="number" class="pc-input" id="new-doc-w" value="${width}" min="64" max="4096" /></div>
          <div class="ctrl-field"><label>Height (px)</label><input type="number" class="pc-input" id="new-doc-h" value="${height}" min="64" max="4096" /></div>
        `;
        body.appendChild(row);
        const wIn = row.querySelector('#new-doc-w');
        const hIn = row.querySelector('#new-doc-h');
        wIn.addEventListener('input', () => (width = Math.max(64, Math.min(4096, Number(wIn.value) || 1080))));
        hIn.addEventListener('input', () => (height = Math.max(64, Math.min(4096, Number(hIn.value) || 1080))));
      },
      (footer) => {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'pill-action-btn secondary';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => this.closeModal());

        const create = document.createElement('button');
        create.type = 'button';
        create.className = 'pill-action-btn';
        create.textContent = 'Create Canvas';
        create.addEventListener('click', () => {
          this.loadDocument(SampleProjects.createBlankDocument(width, height, bg, title));
          this.closeModal();
          this.closeSheet();
          this.showToast(`Created ${width}×${height} canvas`);
        });
        footer.appendChild(cancel);
        footer.appendChild(create);
      }
    );
  }

  openColorPickerModal() {
    this.openModal(
      'Color Picker & PhotoCraft Swatches',
      (body) => {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr';
        row.style.gap = '10px';
        row.innerHTML = `
          <div class="ctrl-field">
            <label>Foreground Color</label>
            <input type="color" id="modal-fg-color" value="${this.fgColor}" style="width:100%;height:42px;border-radius:8px;border:1px solid var(--pc-field-border);background:var(--pc-field);cursor:pointer;" />
          </div>
          <div class="ctrl-field">
            <label>Background Color</label>
            <input type="color" id="modal-bg-color" value="${this.bgColor}" style="width:100%;height:42px;border-radius:8px;border:1px solid var(--pc-field-border);background:var(--pc-field);cursor:pointer;" />
          </div>
        `;
        const fgIn = row.querySelector('#modal-fg-color');
        const bgIn = row.querySelector('#modal-bg-color');
        fgIn.addEventListener('input', () => {
          this.fgColor = fgIn.value;
          this.syncColorSwatches();
        });
        bgIn.addEventListener('input', () => {
          this.bgColor = bgIn.value;
          this.syncColorSwatches();
        });
        body.appendChild(row);

        const swTitle = document.createElement('div');
        swTitle.style.fontSize = '11.5px';
        swTitle.style.fontWeight = '600';
        swTitle.style.color = 'var(--pc-text-dim)';
        swTitle.textContent = 'PRESET SWATCHES (TAP FOR FOREGROUND)';
        body.appendChild(swTitle);

        const grid = document.createElement('div');
        grid.className = 'swatch-grid';
        for (const hex of PRESET_SWATCHES) {
          const cell = document.createElement('div');
          cell.className = `color-swatch-cell${this.fgColor.toLowerCase() === hex.toLowerCase() ? ' active' : ''}`;
          cell.style.background = hex;
          cell.addEventListener('click', () => {
            this.fgColor = hex;
            fgIn.value = hex;
            this.syncColorSwatches();
            grid.querySelectorAll('.color-swatch-cell').forEach((c) => c.classList.remove('active'));
            cell.classList.add('active');
          });
          grid.appendChild(cell);
        }
        body.appendChild(grid);
      },
      (footer) => {
        const done = document.createElement('button');
        done.type = 'button';
        done.className = 'pill-action-btn';
        done.textContent = 'Done';
        done.addEventListener('click', () => this.closeModal());
        footer.appendChild(done);
      }
    );
  }

  openCommandPaletteModal() {
    this.openModal(
      'PhotoCraft Engine Command Palette',
      (body) => {
        const searchIn = document.createElement('input');
        searchIn.type = 'text';
        searchIn.className = 'pc-input';
        searchIn.placeholder = 'Search commands (e.g. perspectiveCrop, slice, subject, stroke)...';
        body.appendChild(searchIn);

        const list = document.createElement('div');
        list.className = 'cmd-list';
        body.appendChild(list);

        const allCommands = Array.from(this.session.commands.values());
        const renderList = (query = '') => {
          list.innerHTML = '';
          const q = query.trim().toLowerCase();
          const filtered = allCommands.filter(
            (c) => !q || c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
          );
          for (const cmd of filtered) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cmd-item';
            btn.innerHTML = `
              <span class="cmd-item-title">${cmd.title}</span>
              <span class="cmd-item-id">${cmd.id}</span>
            `;
            btn.addEventListener('click', () => {
              this.closeModal();
              if (cmd.id === 'adjustment.addLayer') {
                this.session.dispatch(cmd.id, { type: 'vibrance', params: { vibrance: 30, saturation: 10 } });
              } else if (cmd.id === 'filter.apply') {
                this.session.dispatch(cmd.id, { id: 'gaussianBlur', params: { radius: 8 } });
              } else if (cmd.id === 'crop.apply') {
                this.selectTool('crop');
              } else if (cmd.id === 'image.perspectiveCrop') {
                this.selectTool('perspectiveCrop');
              } else {
                this.session.dispatch(cmd.id, {});
              }
              this.showToast(`Executed ${cmd.id}`);
            });
            list.appendChild(btn);
          }
        };

        searchIn.addEventListener('input', () => renderList(searchIn.value));
        renderList();
        setTimeout(() => searchIn.focus(), 50);
      },
      (footer) => {
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'pill-action-btn secondary';
        close.textContent = 'Close';
        close.addEventListener('click', () => this.closeModal());
        footer.appendChild(close);
      }
    );
  }

  hapticTick() {
    if (window.PhotoCraftAndroid && typeof window.PhotoCraftAndroid.hapticTick === 'function') {
      window.PhotoCraftAndroid.hapticTick();
    } else if (navigator.vibrate) {
      navigator.vibrate(8);
    }
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'pc-toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 2100);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.photoCraftMobile = new PhotoCraftMobileApp();
});
