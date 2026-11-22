/* ============================================================================
 * ProStudio Mobile — Optimized Multi-Touch Viewport, Dropdown Menus,
 * Storage Permission & Export Location Manager, Crop/Slice Suite,
 * Custom Font Importer, and Full Blending Options & Layer Styles (fx)
 * ============================================================================ */

import { Algorithms } from './engine/algorithms.js';
import { LayerStylesEngine, STACKABLE_EFFECT_KEYS } from './engine/layer-styles-engine.js';
import { PsdCodec } from './engine/psd-codec.js';
import { BrushEngine, BRUSH_PRESETS } from './engine/brush-engine.js';
import { StudioDoc, StudioSession, BLEND_MODES } from './engine/studio-engine.js';
import { SampleProjects } from './engine/sample-projects.js';
import { PhotoshopLayerStyleDialog } from './ui/layer-style-dialog.js';
import { PhotoshopNewDocumentScreen } from './ui/new-document-screen.js';

const WORKSPACE_SETTINGS_KEY = 'prostudio_workspace_settings_v1';

const TOOLBAR_CONFIG_ITEMS = [
  { id: 'paint', label: '🖌 Brush & Retouch Group', category: 'group' },
  { id: 'select', label: '▭ Selection & Subject Group', category: 'group' },
  { id: 'crop', label: '⬠ Crop, Perspective & Slice', category: 'group' },
  { id: 'text', label: 'T Type & Custom Fonts', category: 'group' },
  { id: 'move', label: '✥ Move & Transform Group', category: 'group' },
  { id: 'fill', label: '🪣 Fill, Gradient & Shapes', category: 'group' },
  { id: 'pin_eraser', label: '⌫ Quick Eraser Button', category: 'pin' },
  { id: 'pin_subject', label: '✨ Quick Select Subject', category: 'pin' },
  { id: 'pin_perspCrop', label: '⬠ Quick Perspective Crop', category: 'pin' },
  { id: 'pin_eyedropper', label: '💧 Quick Eyedropper', category: 'pin' },
  { id: 'pin_hand', label: '✋ Quick Hand Pan', category: 'pin' },
  { id: 'pin_fx', label: 'fx Quick Layer Style', category: 'pin' }
];

const PRESET_SWATCHES = [
  '#378ef0', '#1d68c4', '#2ec4b6', '#38c172', '#f59e0b', '#ec5b62', '#e11d48', '#ffffff',
  '#d4d4d8', '#71717a', '#27272a', '#09090b', '#1e4e82', '#f6f2e8', '#e8d7b9', '#8d8b86'
];

const BUILTIN_FONTS = [
  { family: 'Inter, sans-serif', label: 'Inter (Studio Sans)' },
  { family: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
  { family: 'Georgia, serif', label: 'Georgia Serif' },
  { family: '"Times New Roman", serif', label: 'Times New Roman' },
  { family: 'Impact, sans-serif', label: 'Impact Display' },
  { family: '"Courier New", monospace', label: 'Courier Typewriter' },
  { family: 'system-ui, sans-serif', label: 'System UI' }
];

const EXPORT_LOCATIONS = [
  { id: 'picker', label: 'Ask Where to Save (Pick Custom Folder...)', pathHint: 'System Directory / File Picker' },
  { id: 'downloads', label: 'Downloads Folder', pathHint: '/storage/emulated/0/Download' },
  { id: 'pictures', label: 'Pictures / Gallery Folder', pathHint: '/storage/emulated/0/Pictures' },
  { id: 'dcim', label: 'DCIM / Camera Roll', pathHint: '/storage/emulated/0/DCIM' },
  { id: 'documents', label: 'Documents Folder', pathHint: '/storage/emulated/0/Documents' }
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

const TOOL_TO_GROUP = {
  brush: { group: 'paint', label: 'Brush' },
  eraser: { group: 'paint', label: 'Eraser' },
  heal: { group: 'paint', label: 'Heal' },
  tone: { group: 'paint', label: 'Dodge/Burn' },
  select: { group: 'select', label: 'Select' },
  crop: { group: 'crop', label: 'Crop' },
  perspectiveCrop: { group: 'crop', label: 'Persp Crop' },
  slice: { group: 'crop', label: 'Slice' },
  sliceSelect: { group: 'crop', label: 'Slice Sel' },
  text: { group: 'text', label: 'Type/Font' },
  move: { group: 'move', label: 'Transform' },
  fill: { group: 'fill', label: 'Fill/Grad' },
  shape: { group: 'fill', label: 'Shapes' },
  eyedropper: { group: 'fill', label: 'Sampler' },
  hand: { group: 'fill', label: 'Pan/Zoom' }
};

class ProStudioMobileApp {
  constructor() {
    this.session = new StudioSession();
    this.brush = new BrushEngine();

    // Active Tool & Sub-modes
    this.activeTool = 'brush';
    this.selectMode = 'rect'; // 'rect' | 'ellipse' | 'lasso' | 'wand'
    this.fillMode = 'bucket'; // 'bucket' | 'gradient'
    this.toneMode = 'dodge'; // 'dodge' | 'burn'
    this.shapeMode = 'rect'; // 'rect' | 'ellipse' | 'polygon' | 'star'
    this.wandTolerance = 34;

    // Storage Permission & Export Location Settings
    this.storagePermissionGranted = Boolean(
      localStorage.getItem('ps_storage_granted') === 'true' ||
        (window.ProStudioAndroid && typeof window.ProStudioAndroid.hasStoragePermission === 'function' && window.ProStudioAndroid.hasStoragePermission())
    );
    this.exportLocation = localStorage.getItem('ps_export_location') || 'downloads';
    this.exportSubfolder = localStorage.getItem('ps_export_subfolder') || 'ProStudio';

    // Imported Custom Fonts Registry
    this.importedFonts = [];
    this.activeFontFamily = BUILTIN_FONTS[0].family;

    // Active Colors
    this.fgColor = '#378ef0';
    this.bgColor = '#f6f2e8';

    // Viewport Camera (Zoom & Pan) + Dirty-Flag Render Scheduler
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.renderPending = false;
    this._modalCancelHook = null;
    this.layerStyleDialog = new PhotoshopLayerStyleDialog(this);

    // Active Panel Sheet ('none' | 'layers' | 'adjustments' | 'filters' | 'project')
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

    this.activeFilterId = 'gaussianBlur';
    this.activeFilterParams = { radius: 10 };
    this.compareOriginal = false;

    // Crop & Perspective Crop State
    this.cropBox = null;
    this.cropAspect = 'free';
    this.cropGridMode = 'thirds';
    this.cropAngle = 0;

    this.perspectiveQuad = null;
    this.perspectiveShowGrid = true;

    // Multi-Touch State
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

    // Native Android callback hook for storage permission result
    window.onStoragePermissionResult = (granted, msg) => {
      this.storagePermissionGranted = Boolean(granted);
      localStorage.setItem('ps_storage_granted', this.storagePermissionGranted ? 'true' : 'false');
      this.syncHeaderAndHUD();
      this.showToast(msg || (granted ? 'Storage Permission Granted' : 'Using Scoped MediaStore Storage'));
    };

    this.workspaceSettings = this.loadWorkspaceSettings();
    this.rightLayersOpen = false;
    this.rightDrawerTab = 'layers';
    this.newDocScreen = new PhotoshopNewDocumentScreen(this);

    this.initDOM();
    this.initRightLayersDrawer();
    this.initToolbarFreeFloatDrag();
    this.initPinnedToolButtons();
    this.applyWorkspaceSettings();
    this.restorePersistedFonts();
    this.loadDocument(SampleProjects.createOceanWaveProject());
    this.startSelectionAntsTimer();

    // Start on Photoshop-style "New Document" Canvas Selection Screen on launch!
    if (this.workspaceSettings.showNewDocOnStart !== false) {
      this.newDocScreen.open(true);
    }
  }

  getDefaultWorkspaceSettings() {
    return {
      toolbarPosition: 'bottom', // 'bottom' | 'top' | 'left' | 'right'
      toolbarFreeFloat: false,
      toolbarCols: 2, // 1 | 2 (for Side Left/Right & Free-Float modes)
      toolbarFloatPos: { x: 10, y: 112 },
      showBrushPill: true,
      showNewDocOnStart: true,
      showHudBadges: true,
      visibleTools: {
        paint: true,
        select: true,
        crop: true,
        text: true,
        move: true,
        fill: true,
        pin_eraser: false,
        pin_subject: false,
        pin_perspCrop: false,
        pin_eyedropper: false,
        pin_hand: false,
        pin_fx: false
      }
    };
  }

  loadWorkspaceSettings() {
    const def = this.getDefaultWorkspaceSettings();
    try {
      const raw = localStorage.getItem(WORKSPACE_SETTINGS_KEY);
      if (!raw) return def;
      const parsed = JSON.parse(raw);
      return {
        ...def,
        ...parsed,
        toolbarFloatPos: { ...def.toolbarFloatPos, ...(parsed.toolbarFloatPos || {}) },
        visibleTools: { ...def.visibleTools, ...(parsed.visibleTools || {}) }
      };
    } catch {
      return def;
    }
  }

  saveWorkspaceSettings() {
    try {
      localStorage.setItem(WORKSPACE_SETTINGS_KEY, JSON.stringify(this.workspaceSettings));
    } catch {
      // Ignore storage quota errors
    }
  }

  applyWorkspaceSettings() {
    const ws = this.workspaceSettings;
    const belt = document.getElementById('tools-belt');
    const shell = document.getElementById('mobile-app-shell');
    if (belt) {
      belt.classList.remove('tb-pos-bottom', 'tb-pos-top', 'tb-pos-left', 'tb-pos-right', 'tb-free-float', 'tb-cols-2');

      if (ws.toolbarFreeFloat) {
        belt.classList.add('tb-free-float');
        const maxW = Math.max(120, (shell?.clientWidth || 412) - 96);
        const maxH = Math.max(140, (shell?.clientHeight || 820) - 220);
        const fx = Math.max(4, Math.min(maxW, ws.toolbarFloatPos?.x ?? 10));
        const fy = Math.max(54, Math.min(maxH, ws.toolbarFloatPos?.y ?? 112));
        belt.style.left = `${fx}px`;
        belt.style.top = `${fy}px`;
        belt.style.right = 'auto';
        belt.style.bottom = 'auto';
      } else {
        belt.classList.add(`tb-pos-${ws.toolbarPosition || 'bottom'}`);
        belt.style.left = '';
        belt.style.top = '';
        belt.style.right = '';
        belt.style.bottom = '';
      }

      if (ws.toolbarCols === 2) {
        belt.classList.add('tb-cols-2');
      }

      const dockBtn = document.getElementById('btn-toolbar-dock-toggle');
      if (dockBtn) {
        dockBtn.classList.toggle('active', Boolean(ws.toolbarFreeFloat));
        dockBtn.title = ws.toolbarFreeFloat ? 'Snap Toolbar Back to Dock' : 'Detach & Move Toolbar Freely';
      }

      // Show/Hide user-configured toolbar items
      const vt = ws.visibleTools || {};
      belt.querySelectorAll('[data-tool-item]').forEach((wrap) => {
        const key = wrap.dataset.toolItem;
        wrap.hidden = vt[key] === false;
      });
    }

    // Floating brush pill visibility & offset when toolbar is docked left
    const brushPill = document.getElementById('floating-brush-pill');
    if (brushPill) {
      brushPill.style.display = ws.showBrushPill === false ? 'none' : '';
      if (!ws.toolbarFreeFloat && ws.toolbarPosition === 'left') {
        brushPill.style.left = ws.toolbarCols === 2 ? '106px' : '64px';
      } else {
        brushPill.style.left = '';
      }
    }

    const hudTop = document.getElementById('canvas-hud-top');
    if (hudTop) {
      hudTop.style.display = ws.showHudBadges === false ? 'none' : '';
    }

    this.requestRender();
  }

  initToolbarFreeFloatDrag() {
    const belt = document.getElementById('tools-belt');
    const handle = document.getElementById('toolbar-float-handle');
    const colsBtn = document.getElementById('btn-toolbar-cols');
    const dockBtn = document.getElementById('btn-toolbar-dock-toggle');
    if (!belt || !handle) return;

    colsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.workspaceSettings.toolbarCols = this.workspaceSettings.toolbarCols === 2 ? 1 : 2;
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
    });

    dockBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.workspaceSettings.toolbarFreeFloat = !this.workspaceSettings.toolbarFreeFloat;
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
      this.showToast(
        this.workspaceSettings.toolbarFreeFloat
          ? 'Free-Move Toolbar Enabled — Drag handle to move'
          : `Toolbar docked to ${this.workspaceSettings.toolbarPosition}`
      );
      if (this.activeSheet === 'settings') this.renderSettingsSheet();
    });

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      const shell = document.getElementById('mobile-app-shell');
      const shellRect = shell.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();

      // Auto-detach into free-float mode if dragged from Side Left/Right (exact Photoshop UX!)
      if (!this.workspaceSettings.toolbarFreeFloat) {
        this.workspaceSettings.toolbarFreeFloat = true;
        this.workspaceSettings.toolbarFloatPos = {
          x: Math.round(beltRect.left - shellRect.left),
          y: Math.round(beltRect.top - shellRect.top)
        };
        this.applyWorkspaceSettings();
      }

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = this.workspaceSettings.toolbarFloatPos.x;
      origY = this.workspaceSettings.toolbarFloatPos.y;
      handle.setPointerCapture(e.pointerId);
      this.closeAllDropdowns();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const shell = document.getElementById('mobile-app-shell');
      const maxX = Math.max(40, shell.clientWidth - belt.offsetWidth - 4);
      const maxY = Math.max(60, shell.clientHeight - belt.offsetHeight - 60);
      const nx = Math.max(4, Math.min(maxX, Math.round(origX + (e.clientX - startX))));
      const ny = Math.max(52, Math.min(maxY, Math.round(origY + (e.clientY - startY))));
      this.workspaceSettings.toolbarFloatPos = { x: nx, y: ny };
      belt.style.left = `${nx}px`;
      belt.style.top = `${ny}px`;
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      this.saveWorkspaceSettings();
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  initPinnedToolButtons() {
    document.querySelectorAll('[data-pin-tool]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllDropdowns();
        this.selectTool(btn.dataset.pinTool);
      });
    });
    document.querySelectorAll('[data-pin-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllDropdowns();
        const act = btn.dataset.pinAction;
        if (act === 'subject') {
          this.selectTool('select');
          this.session.dispatch('selection.subject');
          this.showToast('Select ➔ Subject applied!');
        } else if (act === 'fx') {
          this.openLayerStylesModal();
        }
      });
    });
  }

  loadSampleProject(kind) {
    if (kind === 'space') {
      this.loadDocument(SampleProjects.createDeepSpaceProject());
      this.showToast('Loaded Deep-Space-Horizon.psd');
    } else {
      this.loadDocument(SampleProjects.createOceanWaveProject());
      this.showToast('Loaded Ocean-Wave-Poster.psd');
    }
  }

  createConfiguredDocument({ width, height, title, backgroundFill = '#ffffff', physicalLabel = '' }) {
    const doc = new StudioDoc(width, height, title || 'Untitled-1.psd');
    if (backgroundFill === 'transparent') {
      const lyr = doc.createLayerObject({ name: 'Layer 1', kind: 'raster' });
      doc.layers.push(lyr);
      doc.activeLayerId = lyr.id;
    } else {
      const bg = doc.createLayerObject({ name: 'Background', kind: 'raster' });
      const ctx = bg.canvas.getContext('2d');
      ctx.fillStyle = backgroundFill || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      doc.layers.push(bg);
      doc.activeLayerId = bg.id;
    }
    doc.compose();
    doc.pushHistory('New Document');
    this.loadDocument(doc);
    this.showToast(`Created ${doc.title} (${physicalLabel || `${width}×${height} px`})`);
  }

  get allFonts() {
    return [...this.importedFonts, ...BUILTIN_FONTS];
  }

  /**
   * Schedule a single hardware-accelerated viewport redraw on the next animation frame.
   * Zero CPU/GPU waste when idle!
   */
  requestRender() {
    if (this.renderPending) return;
    this.renderPending = true;
    requestAnimationFrame(() => {
      this.renderPending = false;
      this.renderViewport();
    });
  }

  /**
   * Lightweight timer that ONLY animates marching ants when a selection is active.
   */
  startSelectionAntsTimer() {
    setInterval(() => {
      if (this.session.doc?.hasSelection) {
        this.antsOffset = (this.antsOffset + 2) % 16;
        this.requestRender();
      }
    }, 150);
  }

  initDOM() {
    this.viewportCanvas = document.getElementById('viewport-canvas');
    // Desynchronized & opaque hints for faster mobile GPU canvas blitting
    this.viewportCtx = this.viewportCanvas.getContext('2d', { alpha: false });
    this.workspaceEl = document.getElementById('canvas-workspace');

    if (window.ProStudioAndroid || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
      document.getElementById('outer-environment').classList.remove('phone-frame-mode');
      const banner = document.getElementById('desktop-host-banner');
      if (banner && window.ProStudioAndroid) banner.style.display = 'none';
    }

    document.getElementById('btn-frame-phone')?.addEventListener('click', () => {
      document.getElementById('outer-environment').classList.add('phone-frame-mode');
      document.getElementById('btn-frame-phone').classList.add('active');
      document.getElementById('btn-frame-full').classList.remove('active');
      setTimeout(() => this.fitCanvasToViewport(), 240);
    });
    document.getElementById('btn-frame-full')?.addEventListener('click', () => {
      document.getElementById('outer-environment').classList.remove('phone-frame-mode');
      document.getElementById('btn-frame-full').classList.add('active');
      document.getElementById('btn-frame-phone').classList.remove('active');
      setTimeout(() => this.fitCanvasToViewport(), 240);
    });

    // Top bar Undo/Redo/Export
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
    document.getElementById('btn-export-modal').addEventListener('click', () => {
      this.closeAllDropdowns();
      this.openExportModal();
    });

    // Top Bar Dropdown Triggers (`File ▾`, `Select ▾`, `fx ▾`)
    document.getElementById('btn-file-dropdown').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('popover-file-menu', () => this.populateFileDropdown());
    });
    document.getElementById('btn-select-dropdown').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('popover-select-menu', () => this.populateSelectDropdown());
    });
    document.getElementById('btn-fx-dropdown').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('popover-fx-menu', () => this.populateFxDropdown());
    });

    // Left Brush Settings Popover Dropdown (`24px ▾`)
    document.getElementById('btn-brush-popover').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('popover-brush-settings', () => this.populateBrushPopover());
    });

    // HUD Badges
    document.getElementById('hud-zoom-badge').addEventListener('click', () => this.fitCanvasToViewport());
    document.getElementById('hud-storage-badge').addEventListener('click', () => this.openStorageSettingsModal());
    document.getElementById('hud-active-layer').addEventListener('click', () => this.toggleSheet('layers'));

    // Color swatches & swap
    document.getElementById('btn-color-picker').addEventListener('click', () => this.openColorPickerModal());
    document.getElementById('btn-swap-colors').addEventListener('click', () => {
      const tmp = this.fgColor;
      this.fgColor = this.bgColor;
      this.bgColor = tmp;
      this.syncColorSwatches();
      this.hapticTick();
    });

    // 6-Group Tool Bar Flyout Dropdowns (`▴`)
    this.initToolGroupFlyouts();

    // Close open dropdowns when clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.dropdown-anchor') && !e.target.closest('.tool-group-wrapper')) {
        this.closeAllDropdowns();
      }
    });

    // Bottom navigation dock tabs
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.closeAllDropdowns();
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

    const ro = new ResizeObserver(() => {
      this.resizeViewportCanvas();
      this.requestRender();
    });
    ro.observe(this.workspaceEl);

    this.session.onChange(() => {
      this.syncHeaderAndHUD();
      if (this.activeSheet !== 'none') {
        this.renderActiveSheet();
      }
      if (this.rightLayersOpen) {
        this.renderRightLayersDrawer();
      }
      this.renderFloatingContextBar();
      this.requestRender();
    });

    this.syncColorSwatches();
    this.syncQuickBrushPill();
    this.renderToolOptionsStrip();
  }

  /* ==========================================================================
   * Dropdown Popover System (Replaces Sliding / Slider Menus)
   * ========================================================================== */
  closeAllDropdowns() {
    document.querySelectorAll('.dropdown-popover').forEach((el) => {
      el.hidden = true;
    });
  }

  toggleDropdown(popoverId, populateFn) {
    const el = document.getElementById(popoverId);
    if (!el) return;
    const wasOpen = !el.hidden;
    this.closeAllDropdowns();
    if (!wasOpen) {
      if (populateFn) populateFn(el);
      // Smart left/right flyout alignment when toolbar is in Free-Float mode
      el.classList.remove('float-open-left', 'float-open-right');
      const belt = document.getElementById('tools-belt');
      if (belt && belt.classList.contains('tb-free-float') && belt.contains(el)) {
        const shell = document.getElementById('mobile-app-shell');
        const beltRect = belt.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const centerX = beltRect.left - shellRect.left + beltRect.width / 2;
        el.classList.add(centerX > shellRect.width * 0.5 ? 'float-open-left' : 'float-open-right');
      }
      el.hidden = false;
    }
  }

  addDropdownMenuItem(container, label, badgeText, isActive, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dropdown-item${isActive ? ' active' : ''}`;
    btn.innerHTML = `
      <span class="dropdown-item-left">${isActive ? '✓ ' : ''}${label}</span>
      ${badgeText ? `<span class="dropdown-item-badge">${badgeText}</span>` : ''}
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllDropdowns();
      onClick();
    });
    container.appendChild(btn);
  }

  populateFileDropdown() {
    const menu = document.getElementById('popover-file-menu');
    menu.innerHTML = `<div class="dropdown-section-label">Document &amp; File I/O</div>`;
    this.addDropdownMenuItem(menu, '📄 New Document / Presets...', '⌘N', false, () => this.newDocScreen.open(true));
    this.addDropdownMenuItem(menu, '📂 Open PSD or Image...', '⌘O', false, () => document.getElementById('file-input-open').click());
    this.addDropdownMenuItem(menu, '🖼️ Place Image as Layer...', '', false, () => document.getElementById('file-input-place-layer').click());
    this.addDropdownMenuItem(menu, '🔤 Import Font (.ttf/.otf)...', '', false, () => document.getElementById('file-input-font').click());

    const d1 = document.createElement('div');
    d1.className = 'dropdown-divider';
    menu.appendChild(d1);

    const lbl2 = document.createElement('div');
    lbl2.className = 'dropdown-section-label';
    lbl2.textContent = 'Workspace, Storage & Export';
    menu.appendChild(lbl2);

    this.addDropdownMenuItem(menu, '⚙️ Workspace & Toolbar Settings...', '', false, () => this.toggleSheet('settings'));
    this.addDropdownMenuItem(
      menu,
      '📁 Storage & Save Location...',
      this.exportLocation === 'picker' ? 'Ask' : this.exportLocation,
      false,
      () => this.openStorageSettingsModal()
    );
    this.addDropdownMenuItem(menu, '💾 Export / Save As...', '.PSD/.PNG', false, () => this.openExportModal());

    const d2 = document.createElement('div');
    d2.className = 'dropdown-divider';
    menu.appendChild(d2);

    const lbl3 = document.createElement('div');
    lbl3.className = 'dropdown-section-label';
    lbl3.textContent = 'Sample Layered Projects';
    menu.appendChild(lbl3);

    this.addDropdownMenuItem(menu, '🌊 Ocean Wave Poster.psd', '6 Layers', false, () => {
      this.loadDocument(SampleProjects.createOceanWaveProject());
      this.showToast('Loaded Ocean-Wave-Poster.psd');
    });
    this.addDropdownMenuItem(menu, '🪐 Deep Space Horizon.psd', '4 Layers', false, () => {
      this.loadDocument(SampleProjects.createDeepSpaceProject());
      this.showToast('Loaded Deep-Space-Horizon.psd');
    });
  }

  populateSelectDropdown() {
    const menu = document.getElementById('popover-select-menu');
    menu.innerHTML = `<div class="dropdown-section-label">Subject AI &amp; Selection</div>`;
    this.addDropdownMenuItem(menu, '✨ Select ➔ Subject', 'Auto AI', false, () => {
      this.session.dispatch('selection.subject');
      this.showToast('Select ➔ Subject applied!');
    });
    this.addDropdownMenuItem(menu, '✂️ Cutout Subject to New Layer', '⌘J', false, () => {
      if (!this.session.doc?.hasSelection) this.session.dispatch('selection.subject');
      this.session.dispatch('layer.viaCopy');
      this.showToast('Extracted Subject Cutout to New Layer!');
    });
    this.addDropdownMenuItem(menu, '🎭 Selection to Layer Mask', 'Mask', false, () => {
      if (!this.session.doc?.hasSelection) this.session.dispatch('selection.subject');
      this.session.dispatch('layer.addMask', { fromSelection: true });
      this.showToast('Created Layer Mask from Selection');
    });

    const d = document.createElement('div');
    d.className = 'dropdown-divider';
    menu.appendChild(d);

    this.addDropdownMenuItem(menu, '⬜ Select All', '⌘A', false, () => this.session.dispatch('selection.all'));
    this.addDropdownMenuItem(menu, '⇄ Invert Selection', '⇧⌘I', false, () => this.session.dispatch('selection.invert'));
    this.addDropdownMenuItem(menu, '☁️ Feather Selection (8 px)', '', false, () => {
      this.session.dispatch('selection.feather', { radius: 8 });
      this.showToast('Selection Feathered');
    });
    this.addDropdownMenuItem(menu, '✕ Deselect', '⌘D', false, () => this.session.dispatch('selection.deselect'));
  }

  populateFxDropdown() {
    const menu = document.getElementById('popover-fx-menu');
    const fx = LayerStylesEngine.normalizeLayerStyles(this.session.doc?.activeLayer?.styles);
    menu.innerHTML = `<div class="dropdown-section-label">Layer Style (fx)</div>`;

    const items = [
      { id: 'blendingOptions', label: '⚙ Blending Options...' },
      { id: 'bevelEmboss', label: '⛰ Bevel & Emboss...', key: 'bevelEmboss' },
      { id: 'stroke', label: '▢ Stroke...', key: 'stroke' },
      { id: 'innerShadow', label: '🌒 Inner Shadow...', key: 'innerShadow' },
      { id: 'innerGlow', label: '🌟 Inner Glow...', key: 'innerGlow' },
      { id: 'satin', label: '〰 Satin...', key: 'satin' },
      { id: 'colorOverlay', label: '🎨 Color Overlay...', key: 'colorOverlay' },
      { id: 'gradientOverlay', label: '🌈 Gradient Overlay...', key: 'gradientOverlay' },
      { id: 'patternOverlay', label: '🏁 Pattern Overlay...', key: 'patternOverlay' },
      { id: 'outerGlow', label: '✨ Outer Glow...', key: 'outerGlow' },
      { id: 'dropShadow', label: '🌑 Drop Shadow...', key: 'dropShadow' },
      { id: 'styles', label: '★ Styles Presets Gallery...' }
    ];

    for (const it of items) {
      let enabled = false;
      let badge = '';
      if (it.key) {
        const plural = STACKABLE_EFFECT_KEYS[it.key];
        if (plural) {
          const cnt = (fx[plural] || []).filter((e) => e.enabled).length;
          enabled = cnt > 0;
          badge = cnt > 1 ? `ON (${cnt})` : cnt === 1 ? 'ON' : '';
        } else {
          enabled = Boolean(fx[it.key]?.enabled);
          badge = enabled ? 'ON' : '';
        }
      }
      this.addDropdownMenuItem(menu, it.label, badge, enabled, () => {
        this.openLayerStylesModal(it.id);
      });
    }

    const d = document.createElement('div');
    d.className = 'dropdown-divider';
    menu.appendChild(d);

    this.addDropdownMenuItem(menu, '📋 Copy Layer Style', '', false, () => {
      this.session.dispatch('layer.copyStyle');
      this.showToast('Copied Layer Style');
    });
    this.addDropdownMenuItem(menu, '📥 Paste Layer Style', '', false, () => {
      this.session.dispatch('layer.pasteStyle');
      this.showToast('Pasted Layer Style');
    });
    this.addDropdownMenuItem(menu, '🗑 Clear Layer Style', '', false, () => {
      this.session.dispatch('layer.clearStyle');
      this.showToast('Cleared Layer Styles');
    });
  }

  populateBrushPopover() {
    const pop = document.getElementById('popover-brush-settings');
    pop.innerHTML = `
      <div class="ctrl-field" style="margin-bottom:6px;">
        <label>Brush Tip Preset</label>
        <select class="pc-select" id="pop-brush-preset">
          ${BRUSH_PRESETS.map((p) => `<option value="${p.id}" ${this.brush.presetId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </div>
    `;
    pop.querySelector('#pop-brush-preset').addEventListener('change', (e) => {
      this.brush.applyPreset(e.target.value);
      this.syncQuickBrushPill();
      this.populateBrushPopover();
      this.renderToolOptionsStrip();
    });

    const sliders = document.createElement('div');
    sliders.className = 'slider-list';
    this.appendRangeRow(sliders, 'Size (px)', 1, 160, 1, this.brush.size, 'px', (v) => {
      this.brush.size = v;
      this.syncQuickBrushPill();
      this.renderToolOptionsStrip();
    });
    this.appendRangeRow(sliders, 'Opacity (%)', 1, 100, 1, this.brush.opacity, '%', (v) => {
      this.brush.opacity = v;
      this.syncQuickBrushPill();
      this.renderToolOptionsStrip();
    });
    this.appendRangeRow(sliders, 'Hardness (%)', 0, 100, 1, this.brush.hardness, '%', (v) => {
      this.brush.hardness = v;
    });
    this.appendRangeRow(sliders, 'Smoothing (%)', 0, 100, 1, this.brush.smoothing, '%', (v) => {
      this.brush.smoothing = v;
    });
    pop.appendChild(sliders);
  }

  initToolGroupFlyouts() {
    // 1. Paint Group Flyout
    document.getElementById('tool-group-paint').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('flyout-paint', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Paint &amp; Retouch Tools</div>`;
        this.addDropdownMenuItem(menu, '🖌 Brush Tool', 'B', this.activeTool === 'brush', () => this.selectTool('brush'));
        this.addDropdownMenuItem(menu, '⌫ Eraser Tool', 'E', this.activeTool === 'eraser', () => this.selectTool('eraser'));
        this.addDropdownMenuItem(menu, '🩹 Spot Healing Brush', 'J', this.activeTool === 'heal', () => this.selectTool('heal'));
        this.addDropdownMenuItem(menu, '☀️ Dodge (Lighten)', 'O', this.activeTool === 'tone' && this.toneMode === 'dodge', () => {
          this.toneMode = 'dodge';
          this.selectTool('tone');
        });
        this.addDropdownMenuItem(menu, '🌑 Burn (Darken)', 'O', this.activeTool === 'tone' && this.toneMode === 'burn', () => {
          this.toneMode = 'burn';
          this.selectTool('tone');
        });
      });
    });

    // 2. Select Group Flyout
    document.getElementById('tool-group-select').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('flyout-select', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Selection &amp; Subject AI</div>`;
        this.addDropdownMenuItem(menu, '✨ Select ➔ Subject', 'Auto AI', false, () => {
          this.selectTool('select');
          this.session.dispatch('selection.subject');
          this.showToast('Select ➔ Subject applied!');
        });
        this.addDropdownMenuItem(menu, '▭ Rectangular Marquee', 'M', this.activeTool === 'select' && this.selectMode === 'rect', () => {
          this.selectMode = 'rect';
          this.selectTool('select');
        });
        this.addDropdownMenuItem(menu, '◯ Elliptical Marquee', 'M', this.activeTool === 'select' && this.selectMode === 'ellipse', () => {
          this.selectMode = 'ellipse';
          this.selectTool('select');
        });
        this.addDropdownMenuItem(menu, '➰ Freehand Lasso', 'L', this.activeTool === 'select' && this.selectMode === 'lasso', () => {
          this.selectMode = 'lasso';
          this.selectTool('select');
        });
        this.addDropdownMenuItem(menu, '🪄 Magic Wand', 'W', this.activeTool === 'select' && this.selectMode === 'wand', () => {
          this.selectMode = 'wand';
          this.selectTool('select');
        });
      });
    });

    // 3. Crop, Perspective Crop & Slice Group Flyout
    document.getElementById('tool-group-crop').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('flyout-crop', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Crop &amp; Slice Tools</div>`;
        this.addDropdownMenuItem(menu, ' Crop Tool', 'C', this.activeTool === 'crop', () => this.selectTool('crop'));
        this.addDropdownMenuItem(menu, '⬠ Perspective Crop Tool', 'C', this.activeTool === 'perspectiveCrop', () => this.selectTool('perspectiveCrop'));
        this.addDropdownMenuItem(menu, '⊞ Slice Tool', 'C', this.activeTool === 'slice', () => this.selectTool('slice'));
        this.addDropdownMenuItem(menu, '↖ Slice Select Tool', 'C', this.activeTool === 'sliceSelect', () => this.selectTool('sliceSelect'));
        const d = document.createElement('div');
        d.className = 'dropdown-divider';
        menu.appendChild(d);
        this.addDropdownMenuItem(menu, '⊞ Divide Selected Slice...', '', false, () => {
          this.selectTool('sliceSelect');
          this.openDivideSliceModal();
        });
        this.addDropdownMenuItem(menu, '⬇ Export All Slices', 'PNG/JPG', false, () => this.exportAllSlices());
      });
    });

    // 4. Type & Font Group Flyout
    document.getElementById('tool-group-text').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('flyout-text', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Type &amp; Custom Fonts</div>`;
        this.addDropdownMenuItem(menu, 'T Horizontal Type Tool', 'T', this.activeTool === 'text', () => {
          this.selectTool('text');
          this.openTextEditorModal(this.session.doc?.activeLayer?.kind === 'text' ? this.session.doc.activeLayer : null);
        });
        this.addDropdownMenuItem(menu, '縦 Vertical Type Tool', 'T', false, () => {
          this.selectTool('text');
          const lyr = this.session.doc?.activeLayer?.kind === 'text' ? this.session.doc.activeLayer : null;
          if (lyr && lyr.textData) lyr.textData.orientation = 'vertical';
          this.openTextEditorModal(lyr);
        });
        this.addDropdownMenuItem(menu, '🔤 Import Downloaded Font...', '.ttf/.otf', false, () => {
          document.getElementById('file-input-font').click();
        });
        this.addDropdownMenuItem(menu, 'fx Layer Blending & Styles...', 'fx', false, () => this.openLayerStylesModal());
      });
    });

    // 5. Transform & Move Group Flyout
    document.getElementById('tool-group-move').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('flyout-move', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Move &amp; Transform</div>`;
        this.addDropdownMenuItem(menu, '✥ Move & Free Transform', 'V', this.activeTool === 'move', () => this.selectTool('move'));
        this.addDropdownMenuItem(menu, '↔ Flip Layer Horizontal', '', false, () => this.session.dispatch('transform.flipHorizontal'));
        this.addDropdownMenuItem(menu, '↕ Flip Layer Vertical', '', false, () => this.session.dispatch('transform.flipVertical'));
        this.addDropdownMenuItem(menu, '↻ Rotate Canvas 90° CW', '', false, () => {
          this.session.dispatch('transform.rotate90CW');
          this.fitCanvasToViewport();
        });
        this.addDropdownMenuItem(menu, '− Scale Layer 90%', '', false, () => this.scaleActiveLayer(0.9));
        this.addDropdownMenuItem(menu, '+ Scale Layer 110%', '', false, () => this.scaleActiveLayer(1.1));
      });
    });

    // 6. Fill, Gradient, Shapes & View Group Flyout
    document.getElementById('tool-group-fill').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('flyout-fill', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Fill, Shapes &amp; View</div>`;
        this.addDropdownMenuItem(menu, '🪣 Paint Bucket Fill', 'G', this.activeTool === 'fill' && this.fillMode === 'bucket', () => {
          this.fillMode = 'bucket';
          this.selectTool('fill');
        });
        this.addDropdownMenuItem(menu, '🌈 Linear Gradient', 'G', this.activeTool === 'fill' && this.fillMode === 'gradient' && this.brush.gradientType === 'linear', () => {
          this.fillMode = 'gradient';
          this.brush.gradientType = 'linear';
          this.selectTool('fill');
        });
        this.addDropdownMenuItem(menu, '◎ Radial Gradient', 'G', this.activeTool === 'fill' && this.fillMode === 'gradient' && this.brush.gradientType === 'radial', () => {
          this.fillMode = 'gradient';
          this.brush.gradientType = 'radial';
          this.selectTool('fill');
        });
        this.addDropdownMenuItem(menu, '▢ Vector Shape Tool', 'U', this.activeTool === 'shape', () => this.selectTool('shape'));
        const d = document.createElement('div');
        d.className = 'dropdown-divider';
        menu.appendChild(d);
        this.addDropdownMenuItem(menu, '💧 Eyedropper Pixel Loupe', 'I', this.activeTool === 'eyedropper', () => this.selectTool('eyedropper'));
        this.addDropdownMenuItem(menu, '✋ Hand Pan & Zoom Tool', 'H', this.activeTool === 'hand', () => this.selectTool('hand'));
      });
    });
  }

  /**
   * Downloaded Font Importer (.ttf, .otf, .woff, .woff2 via FontFace API)
   */
  async handleImportFontFiles(fileList) {
    let lastLoadedFamily = null;
    for (const file of Array.from(fileList)) {
      try {
        const buf = await file.arrayBuffer();
        const rawName = file.name.replace(/\.(ttf|otf|woff2?|ttc)$/i, '').replace(/[-_]+/g, ' ').trim();
        const cleanFamily = `PSFont_${rawName.replace(/[^a-zA-Z0-9]/g, '_')}`;
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

        if (buf.byteLength < 1500000) {
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          const saved = JSON.parse(localStorage.getItem('ps_imported_fonts') || '[]');
          if (!saved.some((s) => s.family === cleanFamily)) {
            saved.unshift({ family: cleanFamily, label: `★ ${rawName} (Imported)`, b64 });
            try {
              localStorage.setItem('ps_imported_fonts', JSON.stringify(saved.slice(0, 5)));
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
      this.showToast('Imported Font! Ready in Type Tool');
    }
  }

  async restorePersistedFonts() {
    try {
      const saved = JSON.parse(localStorage.getItem('ps_imported_fonts') || '[]');
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
    this.perspectiveQuad = [
      { x: Math.round(doc.width * 0.14), y: Math.round(doc.height * 0.12) },
      { x: Math.round(doc.width * 0.86), y: Math.round(doc.height * 0.16) },
      { x: Math.round(doc.width * 0.90), y: Math.round(doc.height * 0.88) },
      { x: Math.round(doc.width * 0.10), y: Math.round(doc.height * 0.86) }
    ];
  }

  resizeViewportCanvas() {
    const rect = this.workspaceEl.getBoundingClientRect();
    // Clamp DPR to max 2.0 for optimal mobile GPU fill-rate performance
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewportDpr = dpr;
    this.viewportCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.viewportCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  fitCanvasToViewport() {
    const doc = this.session.doc;
    if (!doc) return;
    const rect = this.workspaceEl.getBoundingClientRect();
    const padX = 56;
    const padY = 56;
    const availW = Math.max(120, rect.width - padX);
    const availH = Math.max(120, rect.height - padY);
    this.zoom = Math.min(availW / doc.width, availH / doc.height, 2.5);
    this.panX = (rect.width - doc.width * this.zoom) / 2;
    this.panY = (rect.height - doc.height * this.zoom) / 2;
    this.syncHeaderAndHUD();
    this.requestRender();
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

  syncColorSwatches() {
    document.getElementById('quick-swatch-fg').style.background = this.fgColor;
    document.getElementById('quick-swatch-bg').style.background = this.bgColor;
  }

  syncQuickBrushPill() {
    const el = document.getElementById('quick-size-val');
    if (el) el.textContent = `${this.brush.size}px`;
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

    const storageBadge = document.getElementById('hud-storage-badge');
    if (storageBadge) {
      const locName = this.exportLocation === 'picker' ? 'Ask Dir' : this.exportLocation;
      storageBadge.textContent = `📁 ${locName}`;
    }

    const active = doc.activeLayer;
    if (active) {
      const maskSuffix = doc.editingMask ? ' [Mask]' : '';
      document.getElementById('hud-layer-name').textContent = `${active.name}${maskSuffix}`;
      document.getElementById('hud-layer-dot').style.background =
        doc.editingMask ? '#e8b046' : active.kind === 'adjustment' ? '#7cc0ff' : '#378ef0';
    }
  }

  selectTool(toolId) {
    this.activeTool = toolId;
    const mapping = TOOL_TO_GROUP[toolId] || { group: 'paint', label: 'Brush' };

    document.querySelectorAll('#tools-belt .tool-item-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.group === mapping.group);
    });
    const lblEl = document.getElementById(`lbl-group-${mapping.group}`);
    if (lblEl) lblEl.textContent = mapping.label;

    const doc = this.session.doc;
    if (doc) {
      if (toolId === 'crop' && !this.cropBox) {
        this.resetCropBoxes(doc);
      } else if (toolId === 'perspectiveCrop') {
        if (!this.perspectiveQuad) this.resetCropBoxes(doc);
        if (doc.hasSelection) doc.clearSelection();
      } else if ((toolId === 'slice' || toolId === 'sliceSelect') && doc.slices.length === 0) {
        doc.addSlice({
          name: 'header_banner',
          x: Math.round(doc.width * 0.08),
          y: Math.round(doc.height * 0.12),
          w: Math.round(doc.width * 0.84),
          h: Math.round(doc.height * 0.48),
          origin: 'user'
        });
        doc.addSlice({
          name: 'title_card',
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
    this.requestRender();
  }

  /* ==========================================================================
   * Dropdown-Based Tool Options Bar (No Horizontal Sliding!)
   * ========================================================================== */
  renderToolOptionsStrip() {
    const strip = document.getElementById('tool-options-strip');
    strip.innerHTML = '';

    const addSelectDropdown = (options, currentValue, onChange, title = '') => {
      const sel = document.createElement('select');
      sel.className = 'opt-dropdown-select';
      if (title) sel.title = title;
      for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt.id;
        o.textContent = opt.label;
        if (String(opt.id) === String(currentValue)) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => onChange(sel.value));
      strip.appendChild(sel);
      return sel;
    };

    const addButton = (label, active, onClick) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `opt-chip${active ? ' active' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      strip.appendChild(btn);
      return btn;
    };

    if (this.activeTool === 'brush' || this.activeTool === 'eraser' || this.activeTool === 'heal') {
      // Preset Dropdown instead of horizontal scrolling pills
      addSelectDropdown(
        BRUSH_PRESETS.map((p) => ({ id: p.id, label: `Tip: ${p.name}` })),
        this.brush.presetId,
        (val) => {
          this.brush.applyPreset(val);
          this.syncQuickBrushPill();
          this.renderToolOptionsStrip();
        },
        'Brush Tip Preset'
      );

      // Size Dropdown
      addSelectDropdown(
        [4, 8, 14, 24, 36, 52, 75, 110, 150].map((s) => ({ id: s, label: `Size: ${s}px` })),
        [4, 8, 14, 24, 36, 52, 75, 110, 150].reduce((prev, curr) =>
          Math.abs(curr - this.brush.size) < Math.abs(prev - this.brush.size) ? curr : prev
        ),
        (val) => {
          this.brush.size = Number(val);
          this.syncQuickBrushPill();
        },
        'Brush Size'
      );

      // Opacity Dropdown
      addSelectDropdown(
        [100, 85, 70, 50, 35, 20].map((o) => ({ id: o, label: `Opac: ${o}%` })),
        [100, 85, 70, 50, 35, 20].reduce((prev, curr) =>
          Math.abs(curr - this.brush.opacity) < Math.abs(prev - this.brush.opacity) ? curr : prev
        ),
        (val) => {
          this.brush.opacity = Number(val);
          this.syncQuickBrushPill();
        },
        'Brush Opacity'
      );
    } else if (this.activeTool === 'select') {
      addSelectDropdown(
        [
          { id: 'rect', label: 'Mode: Rect Marquee' },
          { id: 'ellipse', label: 'Mode: Ellipse Marquee' },
          { id: 'lasso', label: 'Mode: Freehand Lasso' },
          { id: 'wand', label: 'Mode: Magic Wand' }
        ],
        this.selectMode,
        (val) => {
          this.selectMode = val;
          this.renderToolOptionsStrip();
        }
      );
      addButton('✨ Select Subject', true, () => {
        this.session.dispatch('selection.subject');
        this.showToast('Select ➔ Subject applied!');
      });
      addButton('✂️ Cutout', false, () => {
        if (!this.session.doc?.hasSelection) this.session.dispatch('selection.subject');
        this.session.dispatch('layer.viaCopy');
        this.showToast('Extracted Subject to New Layer');
      });
    } else if (
      this.activeTool === 'crop' ||
      this.activeTool === 'perspectiveCrop' ||
      this.activeTool === 'slice' ||
      this.activeTool === 'sliceSelect'
    ) {
      // Crop / Slice Tool Mode Dropdown
      addSelectDropdown(
        [
          { id: 'crop', label: 'Tool: Crop' },
          { id: 'perspectiveCrop', label: 'Tool: Perspective Crop' },
          { id: 'slice', label: 'Tool: Slice Draw' },
          { id: 'sliceSelect', label: 'Tool: Slice Select' }
        ],
        this.activeTool,
        (val) => this.selectTool(val)
      );

      if (this.activeTool === 'crop') {
        addSelectDropdown(
          [
            { id: 'free', label: 'Ratio: Freeform' },
            { id: '1:1', label: 'Ratio: 1:1 Square' },
            { id: '4:5', label: 'Ratio: 4:5 Portrait' },
            { id: '16:9', label: 'Ratio: 16:9 Wide' },
            { id: '9:16', label: 'Ratio: 9:16 Story' }
          ],
          this.cropAspect,
          (val) => {
            this.cropAspect = val;
            this.applyCropAspectConstraint();
            this.requestRender();
          }
        );
        addSelectDropdown(
          [
            { id: 'thirds', label: 'Grid: Rule of Thirds' },
            { id: 'grid', label: 'Grid: Dense Grid' },
            { id: 'diagonal', label: 'Grid: Diagonal' },
            { id: 'golden', label: 'Grid: Golden Ratio' }
          ],
          this.cropGridMode,
          (val) => {
            this.cropGridMode = val;
            this.requestRender();
          }
        );
      } else if (this.activeTool === 'perspectiveCrop') {
        addButton(this.perspectiveShowGrid ? '☑ Mesh Grid' : '☐ Mesh Grid', this.perspectiveShowGrid, () => {
          this.perspectiveShowGrid = !this.perspectiveShowGrid;
          this.renderToolOptionsStrip();
          this.requestRender();
        });
        addButton('Reset Quad', false, () => {
          this.resetCropBoxes();
          this.requestRender();
        });
      } else {
        addButton('+ From Layer', false, () => {
          this.session.dispatch('slice.fromLayer');
          this.showToast('Slice Created from Active Layer');
        });
        addButton('⊞ Divide...', false, () => this.openDivideSliceModal());
        addButton('⚙ Options...', false, () => this.openSliceOptionsModal());
      }
    } else if (this.activeTool === 'text') {
      addSelectDropdown(
        this.allFonts.map((f) => ({ id: f.family, label: f.label })),
        this.activeFontFamily,
        (val) => {
          this.activeFontFamily = val;
          const active = this.session.doc?.activeLayer;
          if (active && active.kind === 'text' && active.textData) {
            active.textData.fontFamily = val;
            this.session.doc.rasterizeTextLayer(active);
            this.session.notify('text.fontChanged');
          }
        }
      );
      addButton('🔤 +Font (.ttf/.otf)', true, () => document.getElementById('file-input-font').click());
      addButton('✎ Edit Type', false, () =>
        this.openTextEditorModal(this.session.doc?.activeLayer?.kind === 'text' ? this.session.doc.activeLayer : null)
      );
    } else if (this.activeTool === 'move') {
      addButton('Flip H', false, () => this.session.dispatch('transform.flipHorizontal'));
      addButton('Flip V', false, () => this.session.dispatch('transform.flipVertical'));
      addButton('Rotate 90°', false, () => {
        this.session.dispatch('transform.rotate90CW');
        this.fitCanvasToViewport();
      });
      addButton('Scale 90%', false, () => this.scaleActiveLayer(0.9));
      addButton('Scale 110%', false, () => this.scaleActiveLayer(1.1));
    } else if (this.activeTool === 'fill') {
      addSelectDropdown(
        [
          { id: 'bucket', label: 'Fill: Paint Bucket' },
          { id: 'linear', label: 'Fill: Linear Gradient' },
          { id: 'radial', label: 'Fill: Radial Gradient' }
        ],
        this.fillMode === 'bucket' ? 'bucket' : this.brush.gradientType,
        (val) => {
          if (val === 'bucket') {
            this.fillMode = 'bucket';
          } else {
            this.fillMode = 'gradient';
            this.brush.gradientType = val;
          }
          this.renderToolOptionsStrip();
        }
      );
    } else if (this.activeTool === 'tone') {
      addSelectDropdown(
        [
          { id: 'dodge', label: 'Mode: Dodge (Lighten)' },
          { id: 'burn', label: 'Mode: Burn (Darken)' }
        ],
        this.toneMode,
        (val) => {
          this.toneMode = val;
          this.selectTool('tone');
        }
      );
    } else if (this.activeTool === 'shape') {
      addSelectDropdown(
        [
          { id: 'rect', label: 'Shape: Rectangle' },
          { id: 'ellipse', label: 'Shape: Ellipse' },
          { id: 'polygon', label: 'Shape: Hexagon' },
          { id: 'star', label: 'Shape: 5-Pt Star' }
        ],
        this.shapeMode,
        (val) => {
          this.shapeMode = val;
        }
      );
      addButton('+ Add Shape Layer', true, () => {
        this.session.dispatch('shape.addLayer', {
          shapeType: this.shapeMode,
          fill: this.fgColor,
          stroke: this.bgColor,
          strokeWidth: 4
        });
      });
    } else if (this.activeTool === 'eyedropper') {
      addButton('Touch & drag on canvas to sample pixel color with magnifier loupe', true, () => {});
    } else if (this.activeTool === 'hand') {
      addButton('Fit Screen', false, () => this.fitCanvasToViewport());
      addButton('100% Zoom', false, () => {
        this.zoom = 1;
        this.syncHeaderAndHUD();
        this.requestRender();
      });
      addButton('200% Zoom', false, () => {
        this.zoom = 2;
        this.syncHeaderAndHUD();
        this.requestRender();
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
   * Floating Contextual Action Bar
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
      addBtn('Reset', '', () => {
        this.resetCropBoxes(doc);
        this.requestRender();
      });
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
      addBtn('Reset Quad', '', () => {
        this.resetCropBoxes(doc);
        this.requestRender();
      });
      addBtn('Cancel ✕', 'danger', () => this.selectTool('brush'));
      addBtn(
        valid ? 'Apply Perspective Crop ✓' : 'Quad Invalid',
        valid ? 'primary' : 'danger',
        () => {
          if (!valid) {
            this.showToast('Perspective quad must be convex');
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
      addBtn('Divide Slice...', '', () => this.openDivideSliceModal());
      if (sel) {
        addBtn('Slice Options...', '', () => this.openSliceOptionsModal());
        addBtn('Delete', 'danger', () => this.session.dispatch('slice.delete'));
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
      addBtn('Deselect', '', () => this.session.dispatch('selection.deselect'));
      return;
    }

    bar.hidden = true;
  }

  /* ==========================================================================
   * Multi-Touch & Pointer Canvas Interactions (Optimized On-Demand Rendering)
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
        this.requestRender();
      },
      { passive: false }
    );

    canvas.addEventListener('pointerdown', (e) => {
      this.closeAllDropdowns();
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
          this.session.doc?.endFastInteraction();
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
        this.requestRender();
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
        cornerIdx,
        startX: pt.x,
        startY: pt.y,
        origQuad: this.perspectiveQuad.map((p) => ({ ...p }))
      };
      return;
    }

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
        this.requestRender();
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
      doc.beginFastInteraction();
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

    // Painting tools: use fast layer sandwich cache during stroke!
    if (layer.kind === 'adjustment' && !doc.editingMask) {
      if (!layer.maskCanvas) {
        doc.addMaskToActiveLayer(false);
      } else {
        doc.editingMask = true;
      }
    }

    doc.beginFastInteraction();
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
    doc.composeFast();
    this.requestRender();
  }

  handleSinglePointerMove(e) {
    const doc = this.session.doc;
    if (!doc) return;
    const pt = this.screenToDoc(e.clientX, e.clientY);

    if (this.brush.activeStroke) {
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1.0;
      this.brush.moveStroke(pt.x, pt.y, pressure);
      doc.composeFast();
      this.requestRender();
      return;
    }

    const drag = this.toolDrag;
    if (!drag) return;

    if (drag.type === 'pan') {
      this.panX = drag.origPanX + (e.clientX - drag.startX);
      this.panY = drag.origPanY + (e.clientY - drag.startY);
      this.requestRender();
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
      doc.composeFast();
      this.requestRender();
      return;
    }

    if (drag.type === 'select') {
      drag.currX = pt.x;
      drag.currY = pt.y;
      if (drag.mode === 'lasso') {
        drag.points.push({ x: pt.x, y: pt.y });
      }
      this.requestRender();
      return;
    }

    if (drag.type === 'gradient' || drag.type === 'shape' || drag.type === 'sliceDraw') {
      drag.currX = pt.x;
      drag.currY = pt.y;
      this.requestRender();
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
      this.requestRender();
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
      this.requestRender();
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
      this.requestRender();
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
      doc.endFastInteraction();
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

    if (drag.type === 'move') {
      doc.endFastInteraction();
      if (Math.abs(drag.dx) > 1 || Math.abs(drag.dy) > 1) {
        const layer = doc.activeLayer;
        if (layer?.textData && drag.origTextPos && !doc.editingMask) {
          layer.textData.x = drag.origTextPos.x + drag.dx;
          layer.textData.y = drag.origTextPos.y + drag.dy;
        }
        doc.pushHistory('Move Layer');
      }
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
      } else {
        this.requestRender();
      }
      return;
    }

    if (drag.type === 'sliceEdit') {
      doc.pushHistory('Modify Slice');
      this.renderFloatingContextBar();
      this.requestRender();
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
   * Optimized On-Demand Viewport Render
   * ========================================================================== */
  renderViewport() {
    const doc = this.session.doc;
    if (!doc) return;

    const canvas = this.viewportCanvas;
    const ctx = this.viewportCtx;
    const dpr = this.viewportDpr || Math.min(window.devicePixelRatio || 1, 2);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.theme === 'pro-light' ? '#d0d0d0' : '#18191b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    this.drawCheckerboard(ctx, doc.width, doc.height);

    ctx.imageSmoothingEnabled = this.zoom < 3.0;
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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(0, 0, doc.width, doc.height);

    this.drawSelectionOverlay(ctx, doc);
    this.drawLiveToolDragOverlay(ctx);

    if (this.activeTool === 'move' && doc.activeLayer && doc.activeLayer.kind !== 'adjustment') {
      this.drawTransformHandles(ctx, doc);
    }

    if (this.activeTool === 'crop' && this.cropBox) {
      this.drawCropOverlay(ctx, doc);
    }

    if (this.activeTool === 'perspectiveCrop' && this.perspectiveQuad) {
      this.drawPerspectiveCropOverlay(ctx, doc);
    }

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
      for (const f of [0.382, 0.618]) {
        ctx.moveTo(cb.x + cb.w * f, cb.y);
        ctx.lineTo(cb.x + cb.w * f, cb.y + cb.h);
        ctx.moveTo(cb.x, cb.y + cb.h * f);
        ctx.lineTo(cb.x + cb.w, cb.y + cb.h * f);
      }
    } else {
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

  drawPerspectiveCropOverlay(ctx, doc) {
    const q = this.perspectiveQuad;
    if (!q || q.length !== 4) return;
    const isConvex = Algorithms.isConvexQuad(q);
    const strokeCol = isConvex ? '#38b5ff' : '#ec5b62';

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.rect(0, 0, doc.width, doc.height);
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[1].x, q[1].y);
    ctx.lineTo(q[2].x, q[2].y);
    ctx.lineTo(q[3].x, q[3].y);
    ctx.closePath();
    ctx.fill('evenodd');

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
      ctx.moveTo(q[0].x, q[0].y);
      ctx.lineTo(q[2].x, q[2].y);
      ctx.moveTo(q[1].x, q[1].y);
      ctx.lineTo(q[3].x, q[3].y);
      ctx.stroke();
    }

    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.2 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[1].x, q[1].y);
    ctx.lineTo(q[2].x, q[2].y);
    ctx.lineTo(q[3].x, q[3].y);
    ctx.closePath();
    ctx.stroke();

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
   * Storage Permission & Export Location Modal
   * ========================================================================== */
  requestDeviceStoragePermission(onDone) {
    if (window.ProStudioAndroid && typeof window.ProStudioAndroid.requestStoragePermission === 'function') {
      window.ProStudioAndroid.requestStoragePermission();
      this.storagePermissionGranted = true;
      localStorage.setItem('ps_storage_granted', 'true');
      if (onDone) onDone(true);
      return;
    }
    this.storagePermissionGranted = true;
    localStorage.setItem('ps_storage_granted', 'true');
    this.showToast('✓ Device Storage & Export Permission Granted');
    if (onDone) onDone(true);
  }

  openStorageSettingsModal() {
    this.openModal(
      'Storage Permission & Export File Location',
      (body) => {
        const permCard = document.createElement('div');
        permCard.className = 'curves-histogram-card';
        permCard.style.borderColor = this.storagePermissionGranted ? 'rgba(56, 193, 114, 0.5)' : 'var(--pc-accent)';
        permCard.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div>
              <strong id="perm-status-title" style="font-size:12.5px;color:${this.storagePermissionGranted ? '#4ade80' : 'var(--pc-text)'};display:block;">
                ${this.storagePermissionGranted ? '✓ Storage Access Permission Granted' : '⚠️ Device Storage Permission'}
              </strong>
              <span style="font-size:11px;color:var(--pc-text-dim);">
                Allows reading/writing PSDs, images &amp; custom export folders on device storage
              </span>
            </div>
            <button type="button" class="pill-action-btn" id="btn-grant-storage-perm" style="flex-shrink:0;">
              ${this.storagePermissionGranted ? 'Re-Verify' : 'Grant Permission'}
            </button>
          </div>
        `;
        permCard.querySelector('#btn-grant-storage-perm').addEventListener('click', () => {
          this.requestDeviceStoragePermission(() => {
            permCard.querySelector('#perm-status-title').textContent = '✓ Storage Access Permission Granted';
            permCard.querySelector('#perm-status-title').style.color = '#4ade80';
            permCard.querySelector('#btn-grant-storage-perm').textContent = 'Verified ✓';
          });
        });
        body.appendChild(permCard);

        // Export Location Dropdown
        const locGroup = document.createElement('div');
        locGroup.className = 'ctrl-field';
        locGroup.innerHTML = `<label>Default Download / Export Folder Location</label>`;
        const sel = document.createElement('select');
        sel.className = 'pc-select';
        for (const loc of EXPORT_LOCATIONS) {
          const o = document.createElement('option');
          o.value = loc.id;
          o.textContent = loc.label;
          if (this.exportLocation === loc.id) o.selected = true;
          sel.appendChild(o);
        }
        locGroup.appendChild(sel);
        body.appendChild(locGroup);

        // Subfolder input
        const subGroup = document.createElement('div');
        subGroup.className = 'ctrl-field';
        subGroup.innerHTML = `
          <label>Custom Subfolder Name (inside selected directory)</label>
          <input type="text" class="pc-input" id="inp-export-subfolder" value="${this.exportSubfolder}" placeholder="e.g. ProStudio or MyExports" />
        `;
        body.appendChild(subGroup);

        // Live Resolved Path Preview
        const pathBox = document.createElement('div');
        pathBox.className = 'histogram-stats-row';
        pathBox.style.gridTemplateColumns = '1fr';
        body.appendChild(pathBox);

        const updatePathPreview = () => {
          const loc = EXPORT_LOCATIONS.find((l) => l.id === sel.value) || EXPORT_LOCATIONS[0];
          const sub = subGroup.querySelector('#inp-export-subfolder').value.trim();
          const fullPath =
            loc.id === 'picker'
              ? 'Interactive System Folder / File Picker on every Save'
              : `${loc.pathHint}${sub ? '/' + sub : ''}/`;
          pathBox.innerHTML = `<div>Active Export Path<strong>${fullPath}</strong></div>`;
        };

        sel.addEventListener('change', () => {
          this.exportLocation = sel.value;
          localStorage.setItem('ps_export_location', this.exportLocation);
          this.syncHeaderAndHUD();
          updatePathPreview();
        });
        subGroup.querySelector('#inp-export-subfolder').addEventListener('input', (e) => {
          this.exportSubfolder = e.target.value.trim();
          localStorage.setItem('ps_export_subfolder', this.exportSubfolder);
          updatePathPreview();
        });

        updatePathPreview();
      },
      (footer) => {
        const done = document.createElement('button');
        done.type = 'button';
        done.className = 'pill-action-btn';
        done.textContent = 'Save Location Settings ✓';
        done.addEventListener('click', () => {
          this.closeModal();
          this.showToast(`Export folder set to: ${this.exportLocation}`);
        });
        footer.appendChild(done);
      }
    );
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
          this.requestRender();
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
        this.saveBlobToConfiguredLocation(blob, `${s.name}.${ext}`, mime);
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
   * Right-Side Docked Layers Drawer (Photoshop Style) & Bottom Sheets
   * ========================================================================== */
  initRightLayersDrawer() {
    const toggleBtn = document.getElementById('btn-toggle-right-layers');
    const closeBtn = document.getElementById('btn-close-right-layers');
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setRightLayersOpen(!this.rightLayersOpen);
    });
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setRightLayersOpen(false);
    });

    document.querySelectorAll('.rd-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rightDrawerTab = btn.dataset.rdtab || 'layers';
        document.querySelectorAll('.rd-tab').forEach((t) => {
          t.classList.toggle('active', t.dataset.rdtab === this.rightDrawerTab);
        });
        this.renderRightLayersDrawer();
      });
    });
  }

  setRightLayersOpen(isOpen) {
    this.rightLayersOpen = Boolean(isOpen);
    const drawer = document.getElementById('right-layers-drawer');
    const arrow = document.getElementById('right-layers-arrow');
    if (drawer) drawer.classList.toggle('open', this.rightLayersOpen);
    if (arrow) arrow.textContent = this.rightLayersOpen ? '»' : '«';

    if (this.rightLayersOpen) {
      // Close bottom sheet if open so canvas stays clean
      if (this.activeSheet !== 'none') {
        this.activeSheet = 'none';
        document.getElementById('bottom-sheet').classList.remove('open');
        document.getElementById('sheet-backdrop').classList.remove('open');
      }
      this.renderRightLayersDrawer();
    }
    this.syncBottomNavActive();
    this.hapticTick();
  }

  syncBottomNavActive() {
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      const sh = btn.dataset.sheet;
      const isAct =
        this.activeSheet !== 'none'
          ? sh === this.activeSheet
          : this.rightLayersOpen
          ? sh === 'layers'
          : sh === 'none';
      btn.classList.toggle('active', isAct);
    });
  }

  renderRightLayersDrawer() {
    const doc = this.session.doc;
    const body = document.getElementById('right-drawer-body');
    const footer = document.getElementById('right-drawer-footer');
    if (!doc || !body || !footer) return;

    body.innerHTML = '';
    footer.innerHTML = '';

    // TAB 2: SWATCHES (Matches top-right Photoshop Swatches Panel in user's photo!)
    if (this.rightDrawerTab === 'swatches') {
      const swCard = document.createElement('div');
      swCard.className = 'rd-ctrl-box';
      swCard.innerHTML = `<div style="font-size:10.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;">Color Swatches</div>`;
      const grid = document.createElement('div');
      grid.className = 'rd-swatch-grid';
      const extendedPalette = [
        '#ffffff', '#e5e7eb', '#9ca3af', '#4b5563', '#1f2937', '#000000', '#fef08a', '#fde047',
        '#facc15', '#f59e0b', '#f97316', '#ea580c', '#ef4444', '#dc2626', '#be123c', '#ec4899',
        '#f472b6', '#d946ef', '#a855f7', '#7c3aed', '#6366f1', '#3b82f6', '#2563eb', '#1d4ed8',
        '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#78350f', '#92400e',
        ...PRESET_SWATCHES
      ];
      for (const hex of extendedPalette) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `rd-swatch-cell${this.fgColor.toLowerCase() === hex.toLowerCase() ? ' active' : ''}`;
        cell.style.background = hex;
        cell.title = hex;
        cell.addEventListener('click', () => {
          this.fgColor = hex;
          this.syncColorSwatches();
          this.renderRightLayersDrawer();
        });
        grid.appendChild(cell);
      }
      swCard.appendChild(grid);

      const customRow = document.createElement('div');
      customRow.className = 'rd-ctrl-row';
      customRow.style.marginTop = '6px';
      customRow.innerHTML = `
        <label style="font-size:11px;color:#cbd5e1;flex:1;">FG / BG Color</label>
        <input type="color" class="ps-fx-swatch" id="rd-fg-in" value="${this.fgColor}" title="Foreground Color" />
        <input type="color" class="ps-fx-swatch" id="rd-bg-in" value="${this.bgColor}" title="Background Color" />
      `;
      customRow.querySelector('#rd-fg-in').addEventListener('input', (e) => {
        this.fgColor = e.target.value;
        this.syncColorSwatches();
      });
      customRow.querySelector('#rd-bg-in').addEventListener('input', (e) => {
        this.bgColor = e.target.value;
        this.syncColorSwatches();
      });
      swCard.appendChild(customRow);
      body.appendChild(swCard);

      footer.innerHTML = `<button type="button" class="rd-icon-btn" id="rd-open-full-picker">Full Color Picker...</button>`;
      footer.querySelector('#rd-open-full-picker').addEventListener('click', () => this.openColorPickerModal());
      return;
    }

    // TAB 1: LAYERS (Matches Right-Side Photoshop Layers Panel!)
    const active = doc.activeLayer;
    if (active) {
      const ctrl = document.createElement('div');
      ctrl.className = 'rd-ctrl-box';

      const row1 = document.createElement('div');
      row1.className = 'rd-ctrl-row';
      const bmSel = document.createElement('select');
      bmSel.className = 'ps-fx-select';
      for (const bm of BLEND_MODES) {
        const o = document.createElement('option');
        o.value = bm.id;
        o.textContent = bm.label;
        if (active.blendMode === bm.id) o.selected = true;
        bmSel.appendChild(o);
      }
      bmSel.addEventListener('change', () => {
        active.blendMode = bmSel.value;
        doc.pushHistory(`Blend Mode: ${bmSel.value}`);
        this.session.notify('layer.blendMode');
      });

      const actSel = document.createElement('select');
      actSel.className = 'ps-fx-select';
      actSel.style.maxWidth = '86px';
      actSel.innerHTML = `
        <option value="">More ▾</option>
        <option value="fx">Layer Style (fx)...</option>
        <option value="clip">Clipping Mask</option>
        <option value="invMask">Invert Mask</option>
        <option value="merge">Merge Down</option>
        <option value="flatten">Flatten Image</option>
      `;
      actSel.addEventListener('change', () => {
        const v = actSel.value;
        actSel.value = '';
        if (v === 'fx') this.openLayerStylesModal();
        else if (v === 'clip') this.session.dispatch('layer.toggleClipping');
        else if (v === 'invMask') this.session.dispatch('layer.invertMask');
        else if (v === 'merge') this.session.dispatch('layer.mergeDown');
        else if (v === 'flatten') this.session.dispatch('layer.flatten');
      });

      row1.appendChild(bmSel);
      row1.appendChild(actSel);
      ctrl.appendChild(row1);

      const opacVal = Math.round((active.opacity ?? 1) * 100);
      const fillVal = Math.round((active.fill ?? 1) * 100);

      const opacRow = document.createElement('div');
      opacRow.className = 'ps-fx-slider-row';
      opacRow.innerHTML = `
        <span class="ps-fx-lbl" style="min-width:44px;">Opac:</span>
        <input type="range" class="pc-range ps-fx-range" min="0" max="100" value="${opacVal}" />
        <span class="ps-fx-unit" style="min-width:30px;text-align:right;">${opacVal}%</span>
      `;
      opacRow.querySelector('input').addEventListener('input', (e) => {
        const v = Number(e.target.value);
        opacRow.querySelector('.ps-fx-unit').textContent = `${v}%`;
        active.opacity = v / 100;
        doc.compose();
        this.requestRender();
      });
      opacRow.querySelector('input').addEventListener('change', () => doc.pushHistory('Layer Opacity'));
      ctrl.appendChild(opacRow);

      const fillRow = document.createElement('div');
      fillRow.className = 'ps-fx-slider-row';
      fillRow.innerHTML = `
        <span class="ps-fx-lbl" style="min-width:44px;">Fill:</span>
        <input type="range" class="pc-range ps-fx-range" min="0" max="100" value="${fillVal}" />
        <span class="ps-fx-unit" style="min-width:30px;text-align:right;">${fillVal}%</span>
      `;
      fillRow.querySelector('input').addEventListener('input', (e) => {
        const v = Number(e.target.value);
        fillRow.querySelector('.ps-fx-unit').textContent = `${v}%`;
        active.fill = v / 100;
        doc.compose();
        this.requestRender();
      });
      fillRow.querySelector('input').addEventListener('change', () => doc.pushHistory('Fill Opacity'));
      ctrl.appendChild(fillRow);

      body.appendChild(ctrl);
    }

    // Layer List + Expandable Photoshop Effects Sub-tree
    const list = document.createElement('div');
    list.className = 'layer-list';
    this.populateLayerStackRows(list, doc);
    body.appendChild(list);

    // Bottom Photoshop Layers Bar (fx | Mask | Adj | Dup | +New | Delete) — Matches Photo 3!
    const mkFootBtn = (html, title, cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `rd-icon-btn${cls ? ' ' + cls : ''}`;
      b.title = title;
      b.innerHTML = html;
      b.addEventListener('click', fn);
      footer.appendChild(b);
    };
    mkFootBtn('<i style="font-weight:800;">fx</i>', 'Add a Layer Style', '', () => this.openLayerStylesModal());
    mkFootBtn('◉', 'Add Layer Mask', '', () => this.session.dispatch('layer.addMask', { fromSelection: doc.hasSelection }));
    mkFootBtn('◐', 'Add Adjustment Layer', '', () => {
      this.setRightLayersOpen(false);
      this.toggleSheet('adjustments');
    });
    mkFootBtn('⧉', 'Duplicate Layer', '', () => this.session.dispatch('layer.duplicate'));
    mkFootBtn('+', 'Create a New Layer', '', () => this.session.dispatch('layer.new'));
    mkFootBtn('🗑', 'Delete Layer', 'danger', () => this.session.dispatch('layer.delete'));
  }

  toggleSheet(sheetId) {
    if (sheetId === 'layers') {
      this.setRightLayersOpen(!this.rightLayersOpen);
      return;
    }
    if (sheetId === 'none') {
      this.closeSheet();
      this.setRightLayersOpen(false);
      return;
    }
    if (this.activeSheet === sheetId) {
      this.closeSheet();
      return;
    }
    if (this.rightLayersOpen) {
      this.setRightLayersOpen(false);
    }
    if (this.session.doc?.livePreview && sheetId !== 'filters') {
      this.session.doc.livePreview = null;
      this.session.doc.compose();
      this.requestRender();
    }
    this.activeSheet = sheetId;
    document.getElementById('bottom-sheet').classList.add('open');
    document.getElementById('sheet-backdrop').classList.add('open');
    this.syncBottomNavActive();
    this.hapticTick();
    this.renderActiveSheet();
  }

  closeSheet() {
    if (this.session.doc?.livePreview) {
      this.session.doc.livePreview = null;
      this.session.doc.compose();
      this.requestRender();
    }
    this.activeSheet = 'none';
    document.getElementById('bottom-sheet').classList.remove('open');
    document.getElementById('sheet-backdrop').classList.remove('open');
    this.syncBottomNavActive();
  }

  renderActiveSheet() {
    if (this.activeSheet === 'layers') this.renderRightLayersDrawer();
    else if (this.activeSheet === 'adjustments') this.renderAdjustmentsSheet();
    else if (this.activeSheet === 'filters') this.renderFiltersSheet();
    else if (this.activeSheet === 'settings' || this.activeSheet === 'project') this.renderSettingsSheet();
  }

  renderLayersSheet() {
    const doc = this.session.doc;
    if (!doc) return;
    const active = doc.activeLayer;

    document.getElementById('sheet-title').textContent = 'Layers & Blending';
    document.getElementById('sheet-subtitle').textContent = `${doc.layers.length} layers · PSD stack`;

    const headerActions = document.getElementById('sheet-header-actions');
    headerActions.innerHTML = '';

    // Layer Actions Dropdown instead of crowded horizontal strip
    const actSel = document.createElement('select');
    actSel.className = 'opt-dropdown-select';
    actSel.innerHTML = `
      <option value="">Layer Actions ▾</option>
      <option value="fx">fx Blending &amp; Styles...</option>
      <option value="dup">Duplicate Layer</option>
      <option value="mask">+ Add Layer Mask</option>
      <option value="invMask">Invert Layer Mask</option>
      <option value="clip">Toggle Clipping Mask</option>
      <option value="merge">Merge Down</option>
      <option value="flatten">Flatten Image</option>
      <option value="del">Delete Layer</option>
    `;
    actSel.addEventListener('change', () => {
      const v = actSel.value;
      actSel.value = '';
      if (v === 'fx') this.openLayerStylesModal();
      else if (v === 'dup') this.session.dispatch('layer.duplicate');
      else if (v === 'mask') this.session.dispatch('layer.addMask', { fromSelection: true });
      else if (v === 'invMask') this.session.dispatch('layer.invertMask');
      else if (v === 'clip') this.session.dispatch('layer.toggleClipping');
      else if (v === 'merge') this.session.dispatch('layer.mergeDown');
      else if (v === 'flatten') this.session.dispatch('layer.flattenImage');
      else if (v === 'del') this.session.dispatch('layer.delete');
    });
    headerActions.appendChild(actSel);

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
        this.requestRender();
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
        this.requestRender();
      });
      ctrlGrid.appendChild(fillField);

      body.appendChild(ctrlGrid);
    }

    const list = document.createElement('div');
    list.className = 'layer-list';
    this.populateLayerStackRows(list, doc);
    body.appendChild(list);
  }

  populateLayerStackRows(list, doc) {
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
        mThumb.title = 'Tap to paint on Layer Mask';
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

      // Photoshop-exact expandable "Effects" sub-tree under each layer with active styles
      const activeFxEntries = LayerStylesEngine.listActiveEffectEntries(lyr.styles);
      if (activeFxEntries.length > 0 && lyr.kind !== 'adjustment') {
        lyr.styles = LayerStylesEngine.normalizeLayerStyles(lyr.styles);
        const fxTree = document.createElement('div');
        fxTree.className = 'layer-fx-subtree';

        const fxHeader = document.createElement('div');
        fxHeader.className = 'layer-fx-subrow master';
        const eyeSvg = (on) =>
          on
            ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
            : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

        const masterEye = document.createElement('button');
        masterEye.type = 'button';
        masterEye.className = `layer-vis-btn small${lyr.styles.effectsVisible ? '' : ' hidden-layer'}`;
        masterEye.title = 'Toggle All Layer Effects Visibility';
        masterEye.innerHTML = eyeSvg(lyr.styles.effectsVisible);
        masterEye.addEventListener('click', (e) => {
          e.stopPropagation();
          lyr.styles.effectsVisible = !lyr.styles.effectsVisible;
          doc.pushHistory('Toggle Layer Effects');
          this.session.notify('layer.styles');
        });

        const expBtn = document.createElement('button');
        expBtn.type = 'button';
        expBtn.className = 'layer-fx-expand-btn';
        expBtn.innerHTML = `<span>Effects (${activeFxEntries.length})</span><span>${lyr.styles.effectsExpanded !== false ? '▾' : '▸'}</span>`;
        expBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          lyr.styles.effectsExpanded = lyr.styles.effectsExpanded === false;
          if (this.rightLayersOpen) this.renderRightLayersDrawer();
          else this.renderLayersSheet();
        });

        fxHeader.appendChild(masterEye);
        fxHeader.appendChild(expBtn);
        fxTree.appendChild(fxHeader);

        if (lyr.styles.effectsExpanded !== false) {
          for (const entry of activeFxEntries) {
            const sub = document.createElement('div');
            sub.className = `layer-fx-subrow child${lyr.styles.effectsVisible ? '' : ' muted'}`;

            const subEye = document.createElement('button');
            subEye.type = 'button';
            subEye.className = `layer-vis-btn small${entry.instance.enabled ? '' : ' hidden-layer'}`;
            subEye.title = `Disable ${entry.label}`;
            subEye.innerHTML = eyeSvg(entry.instance.enabled && lyr.styles.effectsVisible);
            subEye.addEventListener('click', (e) => {
              e.stopPropagation();
              entry.instance.enabled = !entry.instance.enabled;
              doc.pushHistory(`Toggle ${entry.label}`);
              this.session.notify('layer.styles');
            });

            const subLbl = document.createElement('button');
            subLbl.type = 'button';
            subLbl.className = 'layer-fx-item-btn';
            subLbl.textContent = entry.label;
            subLbl.title = `Edit ${entry.label} in Layer Style Dialog`;
            subLbl.addEventListener('click', (e) => {
              e.stopPropagation();
              doc.activeLayerId = lyr.id;
              this.openLayerStylesModal(entry.type, entry.index);
            });

            sub.appendChild(subEye);
            sub.appendChild(subLbl);
            fxTree.appendChild(sub);
          }
        }

        list.appendChild(fxTree);
      }
    }
  }

  renderAdjustmentsSheet() {
    const doc = this.session.doc;
    if (!doc) return;

    document.getElementById('sheet-title').textContent = 'Adjustments & Scopes';
    document.getElementById('sheet-subtitle').textContent = 'Non-destructive adjustment layers';

    const headerActions = document.getElementById('sheet-header-actions');
    headerActions.innerHTML = '';

    // Dropdown selector for Adjustment mode
    const modeSel = document.createElement('select');
    modeSel.className = 'opt-dropdown-select';
    for (const t of [
      { id: 'curves', label: 'Curves + Histogram' },
      { id: 'levels', label: 'Levels + Stats' },
      { id: 'color', label: 'Vibrance & Hue/Sat' },
      { id: 'tone', label: 'Brightness & Filters' }
    ]) {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = t.label;
      if (this.activeAdjustTab === t.id) o.selected = true;
      modeSel.appendChild(o);
    }
    modeSel.addEventListener('change', () => {
      this.activeAdjustTab = modeSel.value;
      this.renderAdjustmentsSheet();
    });
    headerActions.appendChild(modeSel);

    const body = document.getElementById('sheet-body');
    body.innerHTML = '';

    const compData = doc.compositeCanvas.getContext('2d').getImageData(0, 0, doc.width, doc.height);
    const hist = Algorithms.computeHistogram(compData);

    if (this.activeAdjustTab === 'curves') {
      const card = document.createElement('div');
      card.className = 'curves-histogram-card';

      const chRow = document.createElement('div');
      chRow.style.display = 'flex';
      chRow.style.justifyContent = 'space-between';
      chRow.style.alignItems = 'center';

      const chSel = document.createElement('select');
      chSel.className = 'opt-dropdown-select';
      for (const ch of [
        { id: 'rgb', label: 'Channel: Master RGB' },
        { id: 'r', label: 'Channel: Red' },
        { id: 'g', label: 'Channel: Green' },
        { id: 'b', label: 'Channel: Blue' }
      ]) {
        const o = document.createElement('option');
        o.value = ch.id;
        o.textContent = ch.label;
        if (this.activeCurveChannel === ch.id) o.selected = true;
        chSel.appendChild(o);
      }
      chSel.addEventListener('change', () => {
        this.activeCurveChannel = chSel.value;
        this.renderAdjustmentsSheet();
      });
      chRow.appendChild(chSel);

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
        this.requestRender();
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

  renderFiltersSheet() {
    const doc = this.session.doc;
    if (!doc) return;

    document.getElementById('sheet-title').textContent = 'Filter Gallery';
    document.getElementById('sheet-subtitle').textContent = 'Live preview on canvas';

    const headerActions = document.getElementById('sheet-header-actions');
    headerActions.innerHTML = '';

    // Filter Selector Dropdown in header for fast selection
    const fSel = document.createElement('select');
    fSel.className = 'opt-dropdown-select';
    for (const f of FILTER_CATALOG) {
      const o = document.createElement('option');
      o.value = f.id;
      o.textContent = f.name;
      if (this.activeFilterId === f.id) o.selected = true;
      fSel.appendChild(o);
    }
    fSel.addEventListener('change', () => {
      const spec = FILTER_CATALOG.find((item) => item.id === fSel.value);
      if (spec) {
        this.activeFilterId = spec.id;
        this.activeFilterParams = structuredClone(spec.defaults);
        this.updateLiveFilterPreview();
        this.renderFiltersSheet();
      }
    });
    headerActions.appendChild(fSel);

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = `opt-chip${this.compareOriginal ? ' active' : ''}`;
    compareBtn.textContent = 'Hold Compare';
    compareBtn.addEventListener('pointerdown', () => {
      this.compareOriginal = true;
      this.requestRender();
    });
    compareBtn.addEventListener('pointerup', () => {
      this.compareOriginal = false;
      this.requestRender();
    });
    compareBtn.addEventListener('pointerleave', () => {
      this.compareOriginal = false;
      this.requestRender();
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
        this.requestRender();
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
    this.requestRender();
  }

  /* --------------------------------------------------------------------------
   * 4. SETTINGS & WORKSPACE CONFIGURATION TAB (Replaces Storage/PSD Tab!)
   * -------------------------------------------------------------------------- */
  renderSettingsSheet() {
    const doc = this.session.doc;
    const ws = this.workspaceSettings;

    document.getElementById('sheet-title').textContent = 'Settings & Workspace';
    document.getElementById('sheet-subtitle').textContent = 'Toolbar layout, free move, visible tools & storage';

    const headerActions = document.getElementById('sheet-header-actions');
    headerActions.innerHTML = '';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'opt-chip';
    resetBtn.textContent = 'Reset Layout';
    resetBtn.addEventListener('click', () => {
      this.workspaceSettings = this.getDefaultWorkspaceSettings();
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
      this.renderSettingsSheet();
      this.showToast('Workspace reset to default');
    });
    headerActions.appendChild(resetBtn);

    const body = document.getElementById('sheet-body');
    body.innerHTML = '';

    // ------------------------------------------------------------------------
    // CARD 1: TOOLBAR POSITION & FREE-FLOAT MOVEMENT
    // ------------------------------------------------------------------------
    const tbCard = document.createElement('div');
    tbCard.className = 'settings-section-card';
    tbCard.innerHTML = `<div class="settings-section-title"><span>Toolbar Position &amp; Movement</span></div>`;

    const posGrid = document.createElement('div');
    posGrid.style.display = 'grid';
    posGrid.style.gridTemplateColumns = '1fr 1fr';
    posGrid.style.gap = '8px';

    posGrid.innerHTML = `
      <div class="ctrl-field">
        <label>Toolbar Dock Location</label>
        <select class="pc-select" id="set-tb-pos">
          <option value="bottom" ${ws.toolbarPosition === 'bottom' ? 'selected' : ''}>Bottom Bar</option>
          <option value="top" ${ws.toolbarPosition === 'top' ? 'selected' : ''}>Top Bar</option>
          <option value="left" ${ws.toolbarPosition === 'left' ? 'selected' : ''}>Left Side (Photoshop)</option>
          <option value="right" ${ws.toolbarPosition === 'right' ? 'selected' : ''}>Right Side</option>
        </select>
      </div>
      <div class="ctrl-field">
        <label>Side / Float Columns</label>
        <select class="pc-select" id="set-tb-cols">
          <option value="1" ${ws.toolbarCols === 1 ? 'selected' : ''}>1-Column Strip</option>
          <option value="2" ${ws.toolbarCols === 2 ? 'selected' : ''}>2-Column (Photoshop)</option>
        </select>
      </div>
    `;
    posGrid.querySelector('#set-tb-pos').addEventListener('change', (e) => {
      ws.toolbarPosition = e.target.value;
      ws.toolbarFreeFloat = false;
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
      this.renderSettingsSheet();
      this.showToast(`Toolbar moved to ${e.target.options[e.target.selectedIndex].text}`);
    });
    posGrid.querySelector('#set-tb-cols').addEventListener('change', (e) => {
      ws.toolbarCols = Number(e.target.value);
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
    });
    tbCard.appendChild(posGrid);

    // Free-Float Move Toggle
    const floatRow = document.createElement('label');
    floatRow.className = 'settings-toggle-row';
    floatRow.innerHTML = `
      <span>
        <strong>Move Toolbar Freely (Floating Mode)</strong>
        <small>Detach the toolbar and drag it anywhere over the canvas</small>
      </span>
      <input type="checkbox" id="set-tb-freefloat" ${ws.toolbarFreeFloat ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--pc-accent);" />
    `;
    floatRow.querySelector('#set-tb-freefloat').addEventListener('change', (e) => {
      ws.toolbarFreeFloat = e.target.checked;
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
      this.showToast(ws.toolbarFreeFloat ? 'Toolbar is now free-floating — drag its top grip bar!' : 'Toolbar snapped back to dock');
    });
    tbCard.appendChild(floatRow);

    const pillRow = document.createElement('label');
    pillRow.className = 'settings-toggle-row';
    pillRow.innerHTML = `
      <span>
        <strong>Show Floating Swatch &amp; Brush Pill</strong>
        <small>Quick foreground/background colors &amp; brush size dropdown</small>
      </span>
      <input type="checkbox" id="set-show-pill" ${ws.showBrushPill !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--pc-accent);" />
    `;
    pillRow.querySelector('#set-show-pill').addEventListener('change', (e) => {
      ws.showBrushPill = e.target.checked;
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
    });
    tbCard.appendChild(pillRow);

    body.appendChild(tbCard);

    // ------------------------------------------------------------------------
    // CARD 2: CUSTOMIZE TOOLBAR ITEMS (Configure what shows on the toolbar!)
    // ------------------------------------------------------------------------
    const custCard = document.createElement('div');
    custCard.className = 'settings-section-card';

    const custHead = document.createElement('div');
    custHead.className = 'settings-section-title';
    custHead.innerHTML = `<span>Customize Toolbar Tools</span>`;

    const presetSel = document.createElement('select');
    presetSel.className = 'opt-dropdown-select';
    presetSel.style.height = '24px';
    presetSel.style.fontSize = '10.5px';
    presetSel.innerHTML = `
      <option value="">Quick Preset ▾</option>
      <option value="default">Default (6 Groups)</option>
      <option value="full">All Groups + Quick Pins</option>
      <option value="retouch">Photo Retouch Focus</option>
      <option value="poster">Poster &amp; Typography</option>
    `;
    presetSel.addEventListener('change', () => {
      const v = presetSel.value;
      presetSel.value = '';
      const next = {};
      for (const it of TOOLBAR_CONFIG_ITEMS) next[it.id] = false;
      if (v === 'default') {
        ['paint', 'select', 'crop', 'text', 'move', 'fill'].forEach((k) => { next[k] = true; });
      } else if (v === 'full') {
        TOOLBAR_CONFIG_ITEMS.forEach((it) => { next[it.id] = true; });
      } else if (v === 'retouch') {
        ['paint', 'select', 'crop', 'pin_eraser', 'pin_subject', 'pin_eyedropper'].forEach((k) => { next[k] = true; });
      } else if (v === 'poster') {
        ['text', 'move', 'crop', 'fill', 'pin_fx', 'pin_perspCrop'].forEach((k) => { next[k] = true; });
      } else {
        return;
      }
      ws.visibleTools = next;
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
      this.renderSettingsSheet();
    });
    custHead.appendChild(presetSel);
    custCard.appendChild(custHead);

    const toolGrid = document.createElement('div');
    toolGrid.className = 'settings-tool-grid';

    for (const item of TOOLBAR_CONFIG_ITEMS) {
      const chip = document.createElement('label');
      chip.className = 'settings-tool-chip';
      const checked = ws.visibleTools?.[item.id] !== false;
      chip.innerHTML = `
        <input type="checkbox" data-cfg-tool="${item.id}" ${checked ? 'checked' : ''} />
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.label}</span>
      `;
      chip.querySelector('input').addEventListener('change', (e) => {
        ws.visibleTools[item.id] = e.target.checked;
        // Keep at least 1 tool visible so toolbar never vanishes
        const anyOn = Object.values(ws.visibleTools).some(Boolean);
        if (!anyOn) {
          ws.visibleTools[item.id] = true;
          e.target.checked = true;
          this.showToast('Keep at least 1 tool visible on toolbar');
          return;
        }
        this.saveWorkspaceSettings();
        this.applyWorkspaceSettings();
      });
      toolGrid.appendChild(chip);
    }
    custCard.appendChild(toolGrid);
    body.appendChild(custCard);

    // ------------------------------------------------------------------------
    // CARD 3: STARTUP CANVAS SELECTOR, RIGHT LAYERS & THEME
    // ------------------------------------------------------------------------
    const wsCard = document.createElement('div');
    wsCard.className = 'settings-section-card';
    wsCard.innerHTML = `<div class="settings-section-title"><span>Startup &amp; Workspace Panels</span></div>`;

    const startRow = document.createElement('label');
    startRow.className = 'settings-toggle-row';
    startRow.innerHTML = `
      <span>
        <strong>Start on New Document Canvas Selector</strong>
        <small>Open Photoshop-style document presets when launching</small>
      </span>
      <input type="checkbox" id="set-start-newdoc" ${ws.showNewDocOnStart !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--pc-accent);" />
    `;
    startRow.querySelector('#set-start-newdoc').addEventListener('change', (e) => {
      ws.showNewDocOnStart = e.target.checked;
      this.saveWorkspaceSettings();
    });
    wsCard.appendChild(startRow);

    const hudRow = document.createElement('label');
    hudRow.className = 'settings-toggle-row';
    hudRow.innerHTML = `
      <span>
        <strong>Show Top Canvas HUD Badges</strong>
        <small>Active layer chip, save folder indicator &amp; zoom badge</small>
      </span>
      <input type="checkbox" id="set-show-hud" ${ws.showHudBadges !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--pc-accent);" />
    `;
    hudRow.querySelector('#set-show-hud').addEventListener('change', (e) => {
      ws.showHudBadges = e.target.checked;
      this.saveWorkspaceSettings();
      this.applyWorkspaceSettings();
    });
    wsCard.appendChild(hudRow);

    const quickPanelBtns = document.createElement('div');
    quickPanelBtns.style.display = 'grid';
    quickPanelBtns.style.gridTemplateColumns = '1fr 1fr';
    quickPanelBtns.style.gap = '6px';
    quickPanelBtns.innerHTML = `
      <button type="button" class="pill-action-btn secondary" id="set-open-newdoc-now" style="height:32px;justify-content:center;">📄 New Document Screen</button>
      <button type="button" class="pill-action-btn secondary" id="set-toggle-rlayers" style="height:32px;justify-content:center;">◫ Toggle Right Layers</button>
    `;
    quickPanelBtns.querySelector('#set-open-newdoc-now').addEventListener('click', () => {
      this.closeSheet();
      this.newDocScreen.open(true);
    });
    quickPanelBtns.querySelector('#set-toggle-rlayers').addEventListener('click', () => {
      this.closeSheet();
      this.setRightLayersOpen(true);
    });
    wsCard.appendChild(quickPanelBtns);

    // Theme & History selectors
    const row2 = document.createElement('div');
    row2.style.display = 'grid';
    row2.style.gridTemplateColumns = '1fr 1fr';
    row2.style.gap = '8px';

    const thField = document.createElement('div');
    thField.className = 'ctrl-field';
    thField.innerHTML = `<label>Interface Theme</label>`;
    const thSel = document.createElement('select');
    thSel.className = 'pc-select';
    for (const th of [
      { id: 'pro-dark', label: 'Pro (Dark)' },
      { id: 'pro-medium', label: 'Pro (Medium Gray)' },
      { id: 'breeze-dark', label: 'Slate Dark' },
      { id: 'pro-light', label: 'Pro (Light)' }
    ]) {
      const o = document.createElement('option');
      o.value = th.id;
      o.textContent = th.label;
      if (this.theme === th.id) o.selected = true;
      thSel.appendChild(o);
    }
    thSel.addEventListener('change', () => {
      this.theme = thSel.value;
      document.documentElement.setAttribute('data-theme', thSel.value);
      this.requestRender();
    });
    thField.appendChild(thSel);
    row2.appendChild(thField);

    if (doc) {
      const histField = document.createElement('div');
      histField.className = 'ctrl-field';
      histField.innerHTML = `<label>History State (${doc.history.length})</label>`;
      const histSel = document.createElement('select');
      histSel.className = 'pc-select';
      for (let i = doc.history.length - 1; i >= 0; i--) {
        const h = doc.history[i];
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = `#${i + 1}: ${h.label}`;
        if (i === doc.historyIndex) o.selected = true;
        histSel.appendChild(o);
      }
      histSel.addEventListener('change', () => {
        doc.restoreSnapshot(Number(histSel.value));
        this.session.notify('history.jump');
      });
      histField.appendChild(histSel);
      row2.appendChild(histField);
    }
    wsCard.appendChild(row2);
    body.appendChild(wsCard);

    // ------------------------------------------------------------------------
    // CARD 4: STORAGE PERMISSION, EXPORT LOCATION, FONTS & APK
    // ------------------------------------------------------------------------
    const stCard = document.createElement('div');
    stCard.className = 'settings-section-card';
    stCard.innerHTML = `
      <div class="settings-section-title">
        <span>Storage Permission, Export &amp; Files</span>
        <span style="color:${this.storagePermissionGranted ? '#4ade80' : '#f59e0b'};font-size:10px;">
          ${this.storagePermissionGranted ? '● Granted' : '● Configure'}
        </span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-size:11px;color:var(--pc-text-dim);">
          Save Folder: <strong style="color:var(--pc-text);">${EXPORT_LOCATIONS.find((l) => l.id === this.exportLocation)?.label || 'Downloads'}</strong>
        </span>
        <button type="button" class="pill-action-btn" id="sheet-btn-storage-cfg">Storage &amp; Folder...</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <button type="button" class="pill-action-btn secondary" id="set-open-psd" style="height:32px;justify-content:center;">📂 Open PSD / Photo</button>
        <button type="button" class="pill-action-btn secondary" id="set-import-font" style="height:32px;justify-content:center;">🔤 Import Font (.ttf)</button>
        <button type="button" class="pill-action-btn" id="set-export-btn" style="height:32px;justify-content:center;">💾 Export / Save As</button>
        <a href="prostudio-mobile.apk" download="prostudio-mobile.apk" class="apk-download-btn" style="height:32px;justify-content:center;">⬇ Download APK</a>
      </div>
    `;
    stCard.querySelector('#sheet-btn-storage-cfg').addEventListener('click', () => this.openStorageSettingsModal());
    stCard.querySelector('#set-open-psd').addEventListener('click', () => document.getElementById('file-input-open').click());
    stCard.querySelector('#set-import-font').addEventListener('click', () => document.getElementById('file-input-font').click());
    stCard.querySelector('#set-export-btn').addEventListener('click', () => this.openExportModal());
    body.appendChild(stCard);
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
   * Modals: Type Tool, Full Blending Options & Layer Styles (fx),
   * Export As with Storage Permission & File Location Option
   * ========================================================================== */
  openModal(title, renderBodyFn, renderFooterFn) {
    this._modalCancelHook = null;
    const overlay = document.getElementById('modal-overlay');
    const card = document.getElementById('modal-card');
    card.classList.remove('ps-fx-modal-card');
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');
    footer.style.display = '';
    body.innerHTML = '';
    footer.innerHTML = '';
    renderBodyFn(body);
    if (renderFooterFn) renderFooterFn(footer);
    overlay.hidden = false;
  }

  closeModal() {
    if (typeof this._modalCancelHook === 'function') {
      const hook = this._modalCancelHook;
      this._modalCancelHook = null;
      hook();
      return;
    }
    document.getElementById('modal-card')?.classList.remove('ps-fx-modal-card');
    const footer = document.getElementById('modal-footer');
    if (footer) footer.style.display = '';
    document.getElementById('modal-overlay').hidden = true;
  }

  openTextEditorModal(existingLayer = null, defaultX = null, defaultY = null) {
    const doc = this.session.doc;
    if (!doc) return;
    const td = existingLayer?.textData || {
      text: 'PROSTUDIO\nMOBILE EDITION',
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

        const f1 = document.createElement('div');
        f1.className = 'ctrl-field';
        f1.innerHTML = `<label>Type Content</label>
          <textarea class="pc-input" style="height:68px;padding:8px;resize:vertical;font-family:${fontFamily};">${textVal}</textarea>`;
        const ta = f1.querySelector('textarea');
        ta.addEventListener('input', () => (textVal = ta.value));
        body.appendChild(f1);

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
   * Complete Adobe Photoshop-Exact Layer Style Dialog (fx)
   */
  openLayerStylesModal(initialSection = 'blendingOptions', initialIndex = 0) {
    this.layerStyleDialog.open(initialSection, initialIndex);
  }

  /**
   * Export Modal with Storage Permission Check & Download/Export File Location Selector!
   */
  openExportModal() {
    const doc = this.session.doc;
    if (!doc) return;
    doc.compose();

    let format = 'psd';
    let quality = 92;
    let scalePct = 100;
    let baseFileName = doc.title.replace(/\.(psd|png|jpg|jpeg|webp)$/i, '') || 'prostudio-artwork';

    this.openModal(
      'Export & Choose Save File Location',
      (body) => {
        // 1. Storage Permission & File Location Card
        const locCard = document.createElement('div');
        locCard.className = 'curves-histogram-card';
        locCard.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:11.5px;font-weight:600;color:var(--pc-accent);">📁 Storage &amp; Destination Folder</span>
            <button type="button" class="opt-chip ${this.storagePermissionGranted ? 'active' : ''}" id="exp-perm-btn" style="height:24px;font-size:10.5px;">
              ${this.storagePermissionGranted ? '✓ Storage Permitted' : '🔒 Grant Storage Permission'}
            </button>
          </div>
          <div class="ctrl-field">
            <label>Save Location</label>
            <select class="pc-select" id="exp-loc-select">
              ${EXPORT_LOCATIONS.map((l) => `<option value="${l.id}" ${this.exportLocation === l.id ? 'selected' : ''}>${l.label}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="ctrl-field">
              <label>Subfolder Name</label>
              <input type="text" class="pc-input" id="exp-subfolder-in" value="${this.exportSubfolder}" placeholder="ProStudio" />
            </div>
            <div class="ctrl-field">
              <label>File Name</label>
              <input type="text" class="pc-input" id="exp-filename-in" value="${baseFileName}" />
            </div>
          </div>
          <div id="exp-resolved-path" style="font-size:10.5px;font-family:var(--pc-font-mono);color:var(--pc-text-dim);padding-top:2px;"></div>
        `;

        const permBtn = locCard.querySelector('#exp-perm-btn');
        permBtn.addEventListener('click', () => {
          this.requestDeviceStoragePermission(() => {
            permBtn.textContent = '✓ Storage Permitted';
            permBtn.classList.add('active');
          });
        });

        const locSel = locCard.querySelector('#exp-loc-select');
        const subIn = locCard.querySelector('#exp-subfolder-in');
        const nameIn = locCard.querySelector('#exp-filename-in');
        const pathOut = locCard.querySelector('#exp-resolved-path');

        const refreshPathLabel = () => {
          const loc = EXPORT_LOCATIONS.find((l) => l.id === locSel.value) || EXPORT_LOCATIONS[0];
          const ext = format === 'jpeg' ? 'jpg' : format;
          const sub = subIn.value.trim();
          const fn = (nameIn.value.trim() || 'artwork') + '.' + ext;
          pathOut.textContent =
            loc.id === 'picker'
              ? `Target: System Folder Picker ➔ ${fn}`
              : `Target: ${loc.pathHint}${sub ? '/' + sub : ''}/${fn}`;
        };

        locSel.addEventListener('change', () => {
          this.exportLocation = locSel.value;
          localStorage.setItem('ps_export_location', this.exportLocation);
          this.syncHeaderAndHUD();
          refreshPathLabel();
        });
        subIn.addEventListener('input', () => {
          this.exportSubfolder = subIn.value.trim();
          localStorage.setItem('ps_export_subfolder', this.exportSubfolder);
          refreshPathLabel();
        });
        nameIn.addEventListener('input', () => {
          baseFileName = nameIn.value.trim() || 'prostudio-artwork';
          refreshPathLabel();
        });

        body.appendChild(locCard);

        // 2. File Format Dropdown
        const fmtGroup = document.createElement('div');
        fmtGroup.className = 'ctrl-field';
        fmtGroup.innerHTML = `<label>File Format</label>`;
        const sel = document.createElement('select');
        sel.className = 'pc-select';
        for (const f of [
          { id: 'psd', label: 'Layered Photoshop Document (.PSD — 8BPS Binary)' },
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
          refreshPathLabel();
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
        exportBtn.textContent = 'Export to Location ✓';
        exportBtn.addEventListener('click', () => {
          this.performExport(format, quality / 100, scalePct / 100, baseFileName);
          this.closeModal();
        });

        footer.appendChild(cancel);
        footer.appendChild(exportBtn);
      }
    );
  }

  performExport(format, quality = 0.92, scale = 1.0, customBaseName = null) {
    const doc = this.session.doc;
    if (!doc) return;
    doc.compose();
    const baseName = customBaseName || doc.title.replace(/\.(psd|png|jpg|jpeg|webp)$/i, '') || 'prostudio-mobile';

    if (format === 'psd') {
      const psdBytes = PsdCodec.encodePsd(doc, doc.compositeCanvas);
      const blob = new Blob([psdBytes], { type: 'image/vnd.adobe.photoshop' });
      this.saveBlobToConfiguredLocation(blob, `${baseName}.psd`, 'image/vnd.adobe.photoshop');
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
        this.saveBlobToConfiguredLocation(blob, `${baseName}.${ext}`, mime);
      },
      mime,
      quality
    );
  }

  /**
   * Save exported file to the user's chosen location:
   * - On Android APK (`window.ProStudioAndroid`): routes to `saveBase64ToLocation(base64, filename, mime, locationChoice, subfolder)`
   *   which supports Android's Storage Access Framework folder picker (`Intent.ACTION_CREATE_DOCUMENT`) OR
   *   `Downloads`, `Pictures`, `DCIM`, `Documents` with custom subfolders!
   * - On Web browsers: uses `window.showSaveFilePicker` when `exportLocation === 'picker'` and supported, or standard download.
   */
  async saveBlobToConfiguredLocation(blob, filename, mimeType) {
    if (window.ProStudioAndroid) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1] || '';
        if (typeof window.ProStudioAndroid.saveBase64ToLocation === 'function') {
          window.ProStudioAndroid.saveBase64ToLocation(
            base64,
            filename,
            mimeType,
            this.exportLocation,
            this.exportSubfolder || ''
          );
        } else if (typeof window.ProStudioAndroid.saveBase64File === 'function') {
          window.ProStudioAndroid.saveBase64File(base64, filename, mimeType);
        }
      };
      reader.readAsDataURL(blob);
      return;
    }

    // If user chose "Ask Where to Save (Pick Custom Folder...)" and browser supports File System Access API
    if (this.exportLocation === 'picker' && typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        this.showToast(`Saved ${filename} to chosen folder`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    const locObj = EXPORT_LOCATIONS.find((l) => l.id === this.exportLocation);
    this.showToast(`Exported ${filename} (${locObj?.label || 'Downloads'})`);
  }

  async handleOpenFile(file) {
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.psd') || name.endsWith('.psb')) {
        const buf = await file.arrayBuffer();
        const decoded = PsdCodec.decodePsd(buf);
        const doc = new StudioDoc(decoded.width, decoded.height, file.name);
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
        this.newDocScreen?.close();
        this.closeSheet();
        this.showToast(`Opened PSD (${doc.layers.length} layers)`);
        return;
      }

      const bmp = await createImageBitmap(file);
      const doc = new StudioDoc(bmp.width, bmp.height, file.name.replace(/\.[^.]+$/, '.psd'));
      const bg = doc.createLayerObject({ name: file.name, kind: 'raster' });
      bg.canvas.getContext('2d').drawImage(bmp, 0, 0);
      doc.layers.push(bg);
      doc.activeLayerId = bg.id;
      doc.compose();
      doc.pushHistory(`Open ${file.name}`);
      this.loadDocument(doc);
      this.newDocScreen?.close();
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
      'New Studio Document',
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
      'Color Picker & Studio Swatches',
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

  hapticTick() {
    if (window.ProStudioAndroid && typeof window.ProStudioAndroid.hapticTick === 'function') {
      window.ProStudioAndroid.hapticTick();
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
  window.proStudioMobile = new ProStudioMobileApp();
});
