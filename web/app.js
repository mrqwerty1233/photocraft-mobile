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
import { ImageCodecs, EXPORT_FORMATS } from './engine/image-codecs.js';
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
    this.selectMode = 'object'; // 'object' | 'quickSelect' | 'colorRange' | 'wand' | 'rect' | 'ellipse' | 'lasso'
    this.selectCombineMode = 'replace'; // 'replace' | 'add' | 'subtract' | 'intersect'
    this.selectContiguous = true;
    this.selectSampleAll = true;
    this.quickSelectRadius = 26;
    this.showSelectionTint = true;
    this.fillMode = 'bucket'; // 'bucket' | 'gradient'
    this.toneMode = 'dodge'; // 'dodge' | 'burn'
    this.shapeMode = 'rect'; // 'rect' | 'ellipse' | 'polygon' | 'star'
    this.shapeStrokeWidth = 3;
    this.shapeCornerRadius = 14;
    this.wandTolerance = 34;

    // Storage Permission & Export Location Settings
    this.storagePermissionGranted = Boolean(
      localStorage.getItem('ps_storage_granted') === 'true' ||
        (window.ProStudioAndroid && typeof window.ProStudioAndroid.hasStoragePermission === 'function' && window.ProStudioAndroid.hasStoragePermission())
    );
    this.exportLocation = localStorage.getItem('ps_export_location') || 'downloads';
    this.exportSubfolder = localStorage.getItem('ps_export_subfolder') || 'ProStudio';

    // Imported Custom Fonts Registry & Photoshop Top Type Bar Settings
    this.importedFonts = [];
    this.activeFontFamily = 'Impact, sans-serif';
    this.typeSettings = {
      fontFamily: 'Impact, sans-serif',
      fontWeight: '400',
      italic: false,
      fontSize: 72,
      antiAlias: 'sharp',
      align: 'center',
      color: '#111827',
      orientation: 'horizontal',
      tracking: 0,
      lineHeight: 1.2,
      warp: 'none',
      warpBend: 35,
      strokeWidth: 0,
      strokeColor: '#000000'
    };
    this.inlineTextSession = null;

    // Active Colors
    this.fgColor = '#378ef0';
    this.bgColor = '#f6f2e8';

    // Viewport Camera (Zoom & Pan) + View Overlays + Dirty-Flag Render Scheduler
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.showCanvasGrid = false;
    this.showRulers = false;
    this.enableSmartGuides = true;
    this.nudgeStep = 1;
    this._canvasPopoverKind = null;
    this._longPressTimer = null;
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
    this.cropDeletePixels = true;

    // Move & Free Transform Scaler State (Photoshop CC exact defaults)
    this.transformLockAspect = true;
    this.moveAutoSelect = true;
    this.moveMultiSelect = false;
    this.activeSmartGuides = [];
    this._cachedTransformBounds = null;

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
    this._initialLoadComplete = false;
    this._userCreatedOrOpenedDoc = false;
    this._autoSaveTimer = null;
    this._lastBackPressTime = 0;
    this.newDocScreen = new PhotoshopNewDocumentScreen(this);

    this.initDOM();
    this.initInlineTextEditor();
    this.initRightLayersDrawer();
    this.initToolbarFreeFloatDrag();
    this.initPinnedToolButtons();
    this.initKeyboardShortcuts();
    this.applyWorkspaceSettings();
    this.restorePersistedFonts();
    this.loadDocument(SampleProjects.createOceanWaveProject(), false);
    this.startSelectionAntsTimer();

    const hasSavedSession = Boolean(this.getSavedProjectMeta());
    // Start on Photoshop-style "New Document" screen on fresh launch; if saved work exists, restore it directly!
    if (!hasSavedSession && this.workspaceSettings.showNewDocOnStart !== false) {
      this.newDocScreen.open(true);
    }

    this.initBackNavigationAndAutoSave(hasSavedSession);
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

    this.syncBrushPillVisibility();

    const hudTop = document.getElementById('canvas-hud-top');
    if (hudTop) {
      hudTop.style.display = ws.showHudBadges === false ? 'none' : '';
    }

    this.requestRender();
  }

  syncBrushPillVisibility() {
    const brushPill = document.getElementById('floating-brush-pill');
    if (!brushPill) return;
    const ws = this.workspaceSettings || {};
    const paintTools = new Set(['brush', 'eraser', 'heal', 'tone', 'fill', 'shape', 'eyedropper']);
    const shouldShow = ws.showBrushPill !== false && paintTools.has(this.activeTool);
    brushPill.style.display = shouldShow ? '' : 'none';
    const rulerOffset = this.showRulers ? 20 : 0;
    if (!ws.toolbarFreeFloat && ws.toolbarPosition === 'left') {
      brushPill.style.left = `${(ws.toolbarCols === 2 ? 106 : 64) + rulerOffset}px`;
    } else {
      brushPill.style.left = rulerOffset ? `${8 + rulerOffset}px` : '';
    }
    brushPill.style.top = rulerOffset ? `${52 + rulerOffset}px` : '';
    const hudTop = document.getElementById('canvas-hud-top');
    if (hudTop) {
      hudTop.style.top = rulerOffset ? '24px' : '';
      hudTop.style.left = rulerOffset ? '24px' : '';
    }
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

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
      if (this.inlineTextSession) return;
      const modalOpen = !document.getElementById('modal-overlay')?.hidden;
      const ndOpen = !document.getElementById('new-doc-overlay')?.hidden;
      if (modalOpen) {
        if (e.key === 'Escape') this.closeModal();
        return;
      }
      if (ndOpen) {
        if (e.key === 'Escape') this.newDocScreen?.close();
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (this.session.doc?.canRedo()) this.session.dispatch('edit.redo');
        } else if (this.session.doc?.canUndo()) {
          this.session.dispatch('edit.undo');
        }
        return;
      }
      if (mod && k === 'y') {
        e.preventDefault();
        if (this.session.doc?.canRedo()) this.session.dispatch('edit.redo');
        return;
      }
      if (mod && k === 'd') {
        e.preventDefault();
        this.session.dispatch('selection.deselect');
        return;
      }
      if (mod && k === 'a') {
        e.preventDefault();
        this.session.dispatch('selection.all');
        return;
      }
      if (mod && k === 't') {
        e.preventDefault();
        this.selectTool('move');
        return;
      }
      if (mod && k === 'j') {
        e.preventDefault();
        this.session.dispatch('layer.viaCopy');
        return;
      }

      if (e.key === 'Enter') {
        if (this.activeTool === 'crop' && this.cropBox) {
          e.preventDefault();
          this.commitCropAction();
          return;
        }
        if (this.activeTool === 'perspectiveCrop' && this.perspectiveQuad) {
          e.preventDefault();
          this.commitPerspectiveCropAction();
          return;
        }
      }

      if (e.key === 'Escape') {
        if (this.activeTool === 'crop' || this.activeTool === 'perspectiveCrop') {
          this.cropAngle = 0;
          this.selectTool('brush');
          return;
        }
        if (this.session.doc?.hasSelection) {
          this.session.dispatch('selection.deselect');
          return;
        }
      }

      // Arrow keys nudge active layer in Move tool (1px, or 10px with Shift — exact Photoshop behavior!)
      if (this.activeTool === 'move' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0;
        const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
        this.nudgeActiveLayer(dx, dy);
        return;
      }

      if (mod) return;
      const toolKeys = {
        v: 'move',
        b: 'brush',
        e: 'eraser',
        j: 'heal',
        o: 'tone',
        m: 'select',
        l: 'select',
        w: 'select',
        c: 'crop',
        t: 'text',
        g: 'fill',
        u: 'shape',
        i: 'eyedropper',
        h: 'hand'
      };
      if (toolKeys[k]) {
        if (k === 'm') this.selectMode = 'rect';
        else if (k === 'l') this.selectMode = 'lasso';
        else if (k === 'w') this.selectMode = 'wand';
        this.selectTool(toolKeys[k]);
      }
    });
  }

  loadSampleProject(kind) {
    this._userCreatedOrOpenedDoc = true;
    this._initialLoadComplete = true;
    if (kind === 'space') {
      this.loadDocument(SampleProjects.createDeepSpaceProject(), true);
      this.showToast('Loaded Deep-Space-Horizon.psd');
    } else {
      this.loadDocument(SampleProjects.createOceanWaveProject(), true);
      this.showToast('Loaded Ocean-Wave-Poster.psd');
    }
  }

  createConfiguredDocument({ width, height, title, backgroundFill = '#ffffff', physicalLabel = '' }) {
    this._userCreatedOrOpenedDoc = true;
    this._initialLoadComplete = true;
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
    this.loadDocument(doc, true);
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

    // Top Bar Dropdown Triggers (`File ▾`, `Import ▾`, `Select ▾`, `fx ▾`)
    document.getElementById('btn-file-dropdown').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('popover-file-menu', () => this.populateFileDropdown());
    });
    document.getElementById('btn-import-dropdown')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('popover-import-menu', () => this.populateImportDropdown());
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

    // HUD Badges (Zoom/Grid/Rulers View Popover, Storage Folder, Active Layer Quick Picker)
    document.getElementById('hud-zoom-badge').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openViewControlsPopover();
    });
    document.getElementById('hud-storage-badge').addEventListener('click', () => this.openStorageSettingsModal());
    document.getElementById('hud-active-layer').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSheet('layers');
    });

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

    // Close open dropdowns & canvas control popover when clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.dropdown-anchor') && !e.target.closest('.tool-group-wrapper')) {
        this.closeAllDropdowns();
      }
      if (
        !e.target.closest('#canvas-control-popover') &&
        !e.target.closest('#floating-context-bar') &&
        !e.target.closest('#tool-options-strip') &&
        !e.target.closest('#hud-zoom-badge')
      ) {
        this.closeCanvasPopover();
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

    // File input handlers (Phone Gallery, Camera, PSD, Project JSON, and Custom Fonts)
    document.getElementById('file-input-open').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleOpenFile(file);
      e.target.value = '';
    });
    document.getElementById('file-input-phone-photo-open')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleOpenFile(file);
      e.target.value = '';
    });
    document.getElementById('file-input-place-layer').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        await this.handlePlaceImageAsLayer(file);
      }
      e.target.value = '';
    });
    document.getElementById('file-input-phone-camera')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const ndOpen = !document.getElementById('new-doc-overlay')?.hidden;
        if (ndOpen) await this.handleOpenFile(file);
        else await this.handlePlaceImageAsLayer(file);
      }
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

    this.session.onChange((event) => {
      this._cachedTransformBounds = null;
      this.syncHeaderAndHUD();
      if (this.activeSheet !== 'none') {
        this.renderActiveSheet();
      }
      if (this.rightLayersOpen) {
        this.renderRightLayersDrawer();
      }
      this.renderFloatingContextBar();
      this.requestRender();
      if (this._initialLoadComplete && event !== 'document.restored') {
        this.scheduleAutoSave();
      }
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

  populateImportDropdown() {
    const menu = document.getElementById('popover-import-menu');
    if (!menu) return;
    menu.innerHTML = `<div class="dropdown-section-label">Import from Your Phone</div>`;
    this.addDropdownMenuItem(menu, '📱 Import Photo as Layer...', 'Gallery', false, () => {
      document.getElementById('file-input-place-layer').click();
    });
    this.addDropdownMenuItem(menu, '🖼️ Open Photo as New Canvas...', 'Gallery', false, () => {
      document.getElementById('file-input-phone-photo-open').click();
    });
    this.addDropdownMenuItem(menu, '📷 Take Photo with Camera...', 'Camera', false, () => {
      document.getElementById('file-input-phone-camera').click();
    });
    this.addDropdownMenuItem(menu, '📂 Open PSD / Project File...', '.PSD', false, () => {
      document.getElementById('file-input-open').click();
    });
    this.addDropdownMenuItem(menu, '🔤 Import Downloaded Font...', '.TTF/.OTF', false, () => {
      document.getElementById('file-input-font').click();
    });

    const d = document.createElement('div');
    d.className = 'dropdown-divider';
    menu.appendChild(d);

    this.addDropdownMenuItem(menu, '💾 Save Work Now (Auto-Save)', '✓ Saved', false, () => {
      this.autoSaveCurrentProject(true);
      this.showToast('✓ Project saved to device storage');
    });
  }

  populateFileDropdown() {
    const menu = document.getElementById('popover-file-menu');
    menu.innerHTML = `<div class="dropdown-section-label">Document &amp; Import from Phone</div>`;
    this.addDropdownMenuItem(menu, '📄 New Document / Presets...', '⌘N', false, () => this.newDocScreen.open(true));
    this.addDropdownMenuItem(menu, '📱 Import Photo as Layer...', 'Gallery', false, () => document.getElementById('file-input-place-layer').click());
    this.addDropdownMenuItem(menu, '🖼️ Open Photo as New Canvas...', 'Gallery', false, () => document.getElementById('file-input-phone-photo-open').click());
    this.addDropdownMenuItem(menu, '📷 Take Photo with Camera...', 'Camera', false, () => document.getElementById('file-input-phone-camera').click());
    this.addDropdownMenuItem(menu, '📂 Open PSD or Project File...', '⌘O', false, () => document.getElementById('file-input-open').click());
    this.addDropdownMenuItem(menu, '🔤 Import Font (.ttf/.otf)...', '', false, () => document.getElementById('file-input-font').click());

    const d1 = document.createElement('div');
    d1.className = 'dropdown-divider';
    menu.appendChild(d1);

    const lbl2 = document.createElement('div');
    lbl2.className = 'dropdown-section-label';
    lbl2.textContent = 'Save, Storage & Export';
    menu.appendChild(lbl2);

    this.addDropdownMenuItem(menu, '💾 Save Project Now', 'Auto-Save', false, () => {
      this.autoSaveCurrentProject(true);
      this.showToast('✓ Work saved to device storage!');
    });
    this.addDropdownMenuItem(menu, '⚙️ Workspace & Toolbar Settings...', '', false, () => this.toggleSheet('settings'));
    this.addDropdownMenuItem(
      menu,
      '📁 Storage & Save Location...',
      this.exportLocation === 'picker' ? 'Ask' : this.exportLocation,
      false,
      () => this.openStorageSettingsModal()
    );
    this.addDropdownMenuItem(menu, '📤 Export / Save File As...', '.PSD/.PNG', false, () => this.openExportModal());

    const d2 = document.createElement('div');
    d2.className = 'dropdown-divider';
    menu.appendChild(d2);

    const lbl3 = document.createElement('div');
    lbl3.className = 'dropdown-section-label';
    lbl3.textContent = 'Sample Layered Projects';
    menu.appendChild(lbl3);

    this.addDropdownMenuItem(menu, '🌊 Ocean Wave Poster.psd', '6 Layers', false, () => {
      this.loadSampleProject('wave');
    });
    this.addDropdownMenuItem(menu, '🪐 Deep Space Horizon.psd', '4 Layers', false, () => {
      this.loadSampleProject('space');
    });
  }

  populateSelectDropdown() {
    const menu = document.getElementById('popover-select-menu');
    menu.innerHTML = `<div class="dropdown-section-label">Smart Canvas Selectors</div>`;
    this.addDropdownMenuItem(menu, '🎯 Smart Object Select', 'Box/Tap', this.activeTool === 'select' && this.selectMode === 'object', () => {
      this.selectMode = 'object';
      this.selectTool('select');
      this.showToast('Smart Object Select: Drag a box or tap any object!');
    });
    this.addDropdownMenuItem(menu, '🖌 Quick Select Smart Brush', 'Paint', this.activeTool === 'select' && this.selectMode === 'quickSelect', () => {
      this.selectMode = 'quickSelect';
      this.selectTool('select');
      this.showToast('Quick Select Brush: Paint over any area to snap edges!');
    });
    this.addDropdownMenuItem(menu, '🎨 Color Range Select', 'Global', this.activeTool === 'select' && this.selectMode === 'colorRange', () => {
      this.selectMode = 'colorRange';
      this.selectTool('select');
      this.showToast('Color Range: Tap any color on canvas!');
    });
    this.addDropdownMenuItem(menu, '✨ Select ➔ Subject', 'Auto AI', false, () => {
      this.session.dispatch('selection.subject');
      this.showToast('Select ➔ Subject applied!');
    });
    this.addDropdownMenuItem(menu, '🎯 Select Active Layer Shape', 'Alpha', false, () => {
      this.session.dispatch('selection.fromLayer');
      this.showToast('Loaded Active Layer Shape as Selection');
    });

    const d0 = document.createElement('div');
    d0.className = 'dropdown-divider';
    menu.appendChild(d0);

    this.addDropdownMenuItem(menu, '✂️ Cutout to New Layer', '⌘J', false, () => {
      if (!this.session.doc?.hasSelection) this.session.dispatch('selection.subject');
      this.session.dispatch('layer.viaCopy');
      this.showToast('Extracted Cutout to New Layer!');
    });
    this.addDropdownMenuItem(menu, '🎭 Selection to Layer Mask', 'Mask', false, () => {
      if (!this.session.doc?.hasSelection) this.session.dispatch('selection.subject');
      this.session.dispatch('layer.addMask', { fromSelection: true });
      this.showToast('Created Layer Mask from Selection');
    });
    this.addDropdownMenuItem(menu, '⚙ Refine Edge (Expand/Feather)...', '', false, () => {
      this.openSelectionRefinePopover();
    });
    this.addDropdownMenuItem(menu, '🪣 Fill Selection with FG', '', false, () => {
      this.session.dispatch('selection.fill', { color: this.fgColor, opacity: 1 });
      this.showToast('Filled Selection');
    });
    this.addDropdownMenuItem(menu, '⌫ Clear Selected Pixels', 'Del', false, () => {
      this.session.dispatch('selection.clearPixels');
      this.showToast('Cleared Selected Pixels');
    });

    const d = document.createElement('div');
    d.className = 'dropdown-divider';
    menu.appendChild(d);

    this.addDropdownMenuItem(menu, '⬜ Select All', '⌘A', false, () => this.session.dispatch('selection.all'));
    this.addDropdownMenuItem(menu, '⇄ Invert Selection', '⇧⌘I', false, () => this.session.dispatch('selection.invert'));
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

    // 2. Smart Select & Marquee Group Flyout
    document.getElementById('tool-group-select').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('flyout-select', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Smart Canvas Selectors</div>`;
        this.addDropdownMenuItem(menu, '🎯 Smart Object Select', 'W', this.activeTool === 'select' && this.selectMode === 'object', () => {
          this.selectMode = 'object';
          this.selectTool('select');
          this.showToast('Smart Object Select: Drag a box or tap any object!');
        });
        this.addDropdownMenuItem(menu, '🖌 Quick Select Brush', 'W', this.activeTool === 'select' && this.selectMode === 'quickSelect', () => {
          this.selectMode = 'quickSelect';
          this.selectTool('select');
          this.showToast('Quick Select Brush: Paint over any area!');
        });
        this.addDropdownMenuItem(menu, '🎨 Color Range Select', '', this.activeTool === 'select' && this.selectMode === 'colorRange', () => {
          this.selectMode = 'colorRange';
          this.selectTool('select');
        });
        this.addDropdownMenuItem(menu, '✨ Select ➔ Subject', 'Auto AI', false, () => {
          this.selectTool('select');
          this.session.dispatch('selection.subject');
          this.showToast('Select ➔ Subject applied!');
        });
        const div = document.createElement('div');
        div.className = 'dropdown-divider';
        menu.appendChild(div);
        this.addDropdownMenuItem(menu, '🪄 Magic Wand', 'W', this.activeTool === 'select' && this.selectMode === 'wand', () => {
          this.selectMode = 'wand';
          this.selectTool('select');
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

    // 4. Type & Font Group Flyout (Direct Click-and-Type — Zero Popup Modal!)
    document.getElementById('tool-group-text').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activeTool !== 'text') {
        this.closeAllDropdowns();
        this.selectTool('text');
        this.showToast('Type Tool active — tap anywhere on canvas to start typing');
        return;
      }
      this.toggleDropdown('flyout-text', (menu) => {
        menu.innerHTML = `<div class="dropdown-section-label">Type &amp; Custom Fonts</div>`;
        this.addDropdownMenuItem(menu, 'T Horizontal Type Tool', 'T', this.activeTool === 'text' && this.typeSettings.orientation !== 'vertical', () => {
          this.typeSettings.orientation = 'horizontal';
          if (this.inlineTextSession?.layer?.textData) {
            this.inlineTextSession.layer.textData.orientation = 'horizontal';
            this.syncInlineTextOverlay();
          }
          this.selectTool('text');
          this.showToast('Horizontal Type Tool — tap canvas to type');
        });
        this.addDropdownMenuItem(menu, '縦 Vertical Type Tool', 'T', this.activeTool === 'text' && this.typeSettings.orientation === 'vertical', () => {
          this.typeSettings.orientation = 'vertical';
          if (this.inlineTextSession?.layer?.textData) {
            this.inlineTextSession.layer.textData.orientation = 'vertical';
            this.syncInlineTextOverlay();
          }
          this.selectTool('text');
          this.showToast('Vertical Type Tool — tap canvas to type');
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
      this.typeSettings.fontFamily = lastLoadedFamily;
      if (this.inlineTextSession?.layer?.textData) {
        this.inlineTextSession.layer.textData.fontFamily = lastLoadedFamily;
        this.syncInlineTextOverlay();
      } else {
        const active = this.session.doc?.activeLayer;
        if (active && active.kind === 'text' && active.textData) {
          active.textData.fontFamily = lastLoadedFamily;
          this.session.doc.rasterizeTextLayer(active);
          this.session.doc.pushHistory(`Apply Font (${lastLoadedFamily})`);
          this.session.notify('text.fontImported');
        }
      }
      this.renderTopTypeBar();
      this.renderToolOptionsStrip();
      this.showToast('Imported Font! Applied in Top Type Bar');
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

  loadDocument(doc, triggerAutoSave = true) {
    if (this.inlineTextSession) {
      this.inlineTextSession = null;
      const wrap = document.getElementById('inline-text-editor-wrap');
      if (wrap) wrap.hidden = true;
    }
    this.session.doc = doc;
    this.resetCropBoxes(doc);
    this.resizeViewportCanvas();
    this.fitCanvasToViewport();
    this.renderTopTypeBar();
    this.session.notify(triggerAutoSave ? 'document.loaded' : 'document.restored');
    if (triggerAutoSave && this._initialLoadComplete) {
      this.scheduleAutoSave();
    }
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
      `${doc.width}×${doc.height} · ${doc.layers.length}L`;
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
    // Commit any active live on-canvas text editing when switching away from Type Tool (Photoshop UX!)
    if (this.inlineTextSession && toolId !== 'text') {
      this.commitInlineTextEdit();
    }

    this.activeTool = toolId;
    const mapping = TOOL_TO_GROUP[toolId] || { group: 'paint', label: 'Brush' };

    document.querySelectorAll('#tools-belt .tool-item-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.group === mapping.group || btn.dataset.pinTool === toolId);
    });
    const lblEl = document.getElementById(`lbl-group-${mapping.group}`);
    if (lblEl) lblEl.textContent = mapping.label;

    this.workspaceEl?.classList.toggle('tool-cursor-text', toolId === 'text');

    const doc = this.session.doc;
    if (doc) {
      if (toolId === 'crop' && !this.cropBox) {
        this.resetCropBoxes(doc);
      } else if (toolId === 'perspectiveCrop') {
        if (!this.perspectiveQuad) this.resetCropBoxes(doc);
        if (doc.hasSelection) doc.clearSelection();
      } else if (toolId === 'sliceSelect' && doc.slices.length === 0) {
        doc.addSlice({
          name: 'slice_01',
          x: Math.round(doc.width * 0.1),
          y: Math.round(doc.height * 0.1),
          w: Math.round(doc.width * 0.8),
          h: Math.round(doc.height * 0.8),
          origin: 'user'
        });
      }
    }
    this.hapticTick();
    this.syncBrushPillVisibility();
    this.renderTopTypeBar();
    this.renderToolOptionsStrip();
    this.renderFloatingContextBar();
    this.requestRender();
  }

  /* ==========================================================================
   * Photoshop-Exact Top Type Options Bar & Direct On-Canvas Click-and-Type!
   * ========================================================================== */
  initInlineTextEditor() {
    const wrap = document.getElementById('inline-text-editor-wrap');
    const input = document.getElementById('inline-text-input');
    const dragBar = document.getElementById('inline-text-drag-bar');
    if (!wrap || !input || !dragBar) return;

    // Live typing updates layer textData and auto-sizes the on-canvas text box!
    input.addEventListener('input', () => {
      if (!this.inlineTextSession) return;
      this.inlineTextSession.typed = true;
      const lyr = this.inlineTextSession.layer;
      lyr.textData.text = input.value;
      const firstLine = input.value.split('\n')[0]?.trim();
      lyr.name = firstLine ? firstLine.slice(0, 26) : 'Type Layer';
      this.syncInlineTextOverlay();
      this.syncHeaderAndHUD();
      if (this.rightLayersOpen) this.renderRightLayersDrawer();
    });

    // Keyboard shortcuts while typing (Ctrl/Cmd+Enter = Commit, Esc = Cancel; never hijack keys!)
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelInlineTextEdit();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.commitInlineTextEdit();
      }
    });

    input.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });

    // Drag the blue "✥ Move" bar above live text to reposition while typing!
    let dragging = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;
    dragBar.addEventListener('pointerdown', (e) => {
      if (!this.inlineTextSession) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      ox = this.inlineTextSession.layer.textData.x ?? 0;
      oy = this.inlineTextSession.layer.textData.y ?? 0;
      dragBar.setPointerCapture(e.pointerId);
    });
    dragBar.addEventListener('pointermove', (e) => {
      if (!dragging || !this.inlineTextSession) return;
      const td = this.inlineTextSession.layer.textData;
      td.x = Math.round(ox + (e.clientX - sx) / this.zoom);
      td.y = Math.round(oy + (e.clientY - sy) / this.zoom);
      this.syncInlineTextOverlayPosition();
    });
    const endDrag = () => {
      dragging = false;
      if (this.inlineTextSession) input.focus();
    };
    dragBar.addEventListener('pointerup', endDrag);
    dragBar.addEventListener('pointercancel', endDrag);
  }

  /**
   * Hit-test existing visible text layers from top to bottom so tapping existing text
   * edits it right in place on canvas (just like real Photoshop!).
   */
  hitTestTextLayer(docX, docY) {
    const doc = this.session.doc;
    if (!doc) return null;
    const measureCtx = document.createElement('canvas').getContext('2d');

    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const lyr = doc.layers[i];
      if (!lyr.visible || lyr.kind !== 'text' || !lyr.textData) continue;
      const td = lyr.textData;
      const size = td.fontSize || 48;
      const style = td.italic ? 'italic' : 'normal';
      const weight = td.fontWeight || '600';
      measureCtx.font = `${style} ${weight} ${size}px ${td.fontFamily || 'Inter, sans-serif'}`;

      const lines = String(td.text || ' ').split('\n');
      const lh = size * (td.lineHeight || 1.25);
      const bx = td.x ?? doc.width / 2;
      const by = td.y ?? doc.height / 2;

      let w = 0;
      let h = 0;
      if (td.orientation === 'vertical') {
        w = Math.max(size, lines.length * size * (td.lineHeight || 1.3));
        const maxChars = Math.max(1, ...lines.map((l) => Array.from(l).length));
        h = maxChars * (size + (td.tracking || 0));
      } else {
        for (const line of lines) {
          const mw = measureCtx.measureText(line).width + Math.max(0, line.length - 1) * (td.tracking || 0);
          if (mw > w) w = mw;
        }
        w = Math.max(size * 1.5, w);
        h = Math.max(size, lines.length * lh);
      }

      const pad = Math.max(18, 22 / this.zoom);
      const align = td.align || 'center';
      let x0 = bx - w / 2 - pad;
      if (td.orientation !== 'vertical') {
        if (align === 'left') x0 = bx - pad;
        else if (align === 'right') x0 = bx - w - pad;
      }
      const x1 = x0 + w + pad * 2;
      const y0 = by - h / 2 - pad;
      const y1 = by + h / 2 + pad;

      if (docX >= x0 && docX <= x1 && docY >= y0 && docY <= y1) {
        return lyr;
      }
    }
    return null;
  }

  /**
   * Begin live direct on-canvas typing on either a newly clicked position or an existing text layer.
   */
  startInlineTextEdit(layer, isNew = false) {
    const doc = this.session.doc;
    if (!doc || !layer || !layer.textData) return;

    // Commit any previous text edit session first
    if (this.inlineTextSession && this.inlineTextSession.layer !== layer) {
      this.commitInlineTextEdit();
    }

    doc.activeLayerId = layer.id;
    doc.editingMask = false;

    const td = layer.textData;
    // Sync Top Type Bar settings to this layer's textData
    this.typeSettings = {
      ...this.typeSettings,
      fontFamily: td.fontFamily || this.typeSettings.fontFamily,
      fontWeight: String(td.fontWeight || '700'),
      italic: Boolean(td.italic),
      fontSize: td.fontSize || 64,
      antiAlias: td.antiAlias || 'sharp',
      align: td.align || 'center',
      color: td.color || '#111827',
      orientation: td.orientation || 'horizontal',
      tracking: td.tracking || 0,
      lineHeight: td.lineHeight || 1.25,
      warp: td.warp || 'none',
      warpBend: td.warpBend ?? 35,
      strokeWidth: td.strokeWidth || 0,
      strokeColor: td.strokeColor || '#000000'
    };
    this.activeFontFamily = this.typeSettings.fontFamily;

    this.inlineTextSession = {
      layer,
      isNew,
      typed: false,
      startedAt: performance.now(),
      originalTextData: structuredClone(td),
      originalName: layer.name
    };

    layer._inlineEditing = true;
    doc.compose();
    this.requestRender();

    const wrap = document.getElementById('inline-text-editor-wrap');
    const input = document.getElementById('inline-text-input');
    input.value = td.text || '';
    wrap.hidden = false;

    this.syncInlineTextOverlay();
    this.renderTopTypeBar();
    this.syncHeaderAndHUD();
    if (this.rightLayersOpen) this.renderRightLayersDrawer();

    // Focus immediately and pre-select "Lorem Ipsum" for new layers (EXACT Photoshop behavior!)
    requestAnimationFrame(() => {
      input.focus();
      if (isNew) {
        input.select();
      } else {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  syncInlineTextOverlay() {
    if (!this.inlineTextSession) return;
    const td = this.inlineTextSession.layer.textData;
    const wrap = document.getElementById('inline-text-editor-wrap');
    const input = document.getElementById('inline-text-input');
    if (!wrap || !input) return;

    const zoom = Math.max(0.1, this.zoom);
    const screenFontSize = Math.max(10, (td.fontSize || 64) * zoom);
    const lh = td.lineHeight || 1.25;
    const trackingPx = (td.tracking || 0) * zoom;

    input.style.fontFamily = td.fontFamily || 'Impact, sans-serif';
    input.style.fontWeight = String(td.fontWeight || '400');
    input.style.fontStyle = td.italic ? 'italic' : 'normal';
    input.style.fontSize = `${screenFontSize}px`;
    input.style.lineHeight = `${lh}`;
    input.style.letterSpacing = `${trackingPx}px`;
    input.style.color = td.color || '#111827';
    input.style.textAlign = td.orientation === 'vertical' ? 'center' : (td.align || 'center');
    input.style.writingMode = td.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb';
    if (td.strokeWidth && td.strokeWidth > 0) {
      input.style.webkitTextStroke = `${Math.max(0.5, td.strokeWidth * zoom * 0.5)}px ${td.strokeColor || '#000000'}`;
    } else {
      input.style.webkitTextStroke = '';
    }

    // Measure exact live text dimensions so textarea expands cleanly without clipping
    const mCanvas = this._textMeasureCanvas || (this._textMeasureCanvas = document.createElement('canvas'));
    const mCtx = mCanvas.getContext('2d');
    mCtx.font = `${td.italic ? 'italic' : 'normal'} ${td.fontWeight || '400'} ${screenFontSize}px ${td.fontFamily || 'Impact, sans-serif'}`;
    const lines = String(input.value || ' ').split('\n');

    if (td.orientation === 'vertical') {
      const maxChars = Math.max(2, ...lines.map((l) => Array.from(l).length));
      input.style.width = `${Math.max(screenFontSize * 1.6, lines.length * screenFontSize * lh + 22)}px`;
      input.style.height = `${Math.max(screenFontSize * 2.5, maxChars * (screenFontSize + trackingPx) + 28)}px`;
    } else {
      let maxW = screenFontSize * 2;
      for (const line of lines) {
        const w = mCtx.measureText(line || 'M').width + Math.max(0, line.length - 1) * trackingPx;
        if (w > maxW) maxW = w;
      }
      input.rows = Math.max(1, lines.length);
      input.style.width = `${Math.ceil(maxW + 26)}px`;
      input.style.height = `${Math.ceil(lines.length * screenFontSize * lh + 12)}px`;
    }

    this.syncInlineTextOverlayPosition();
  }

  syncInlineTextOverlayPosition() {
    if (!this.inlineTextSession) return;
    const td = this.inlineTextSession.layer.textData;
    const wrap = document.getElementById('inline-text-editor-wrap');
    if (!wrap) return;

    const sx = this.panX + (td.x ?? 0) * this.zoom;
    const sy = this.panY + (td.y ?? 0) * this.zoom;
    wrap.style.left = `${sx}px`;
    wrap.style.top = `${sy}px`;

    const align = td.orientation === 'vertical' ? 'center' : (td.align || 'center');
    const tx = align === 'left' ? '0%' : align === 'right' ? '-100%' : '-50%';
    wrap.style.transform = `translate(${tx}, -50%)`;
  }

  commitInlineTextEdit() {
    if (!this.inlineTextSession) return;
    const doc = this.session.doc;
    const { layer, isNew } = this.inlineTextSession;
    const input = document.getElementById('inline-text-input');
    const wrap = document.getElementById('inline-text-editor-wrap');

    const finalText = input ? input.value : layer.textData.text;
    layer._inlineEditing = false;
    this.inlineTextSession = null;
    if (wrap) wrap.hidden = true;

    if (!doc) return;
    if (!finalText.trim()) {
      // Remove empty new layer automatically (exact Photoshop behavior!)
      if (isNew) {
        const idx = doc.layers.findIndex((l) => l.id === layer.id);
        if (idx >= 0) doc.layers.splice(idx, 1);
        doc.activeLayerId = doc.layers[doc.layers.length - 1]?.id || null;
      } else {
        layer.textData.text = ' ';
        doc.rasterizeTextLayer(layer);
      }
    } else {
      layer.textData.text = finalText;
      layer.name = finalText.split('\n')[0].trim().slice(0, 26) || 'Type Layer';
      doc.rasterizeTextLayer(layer);
      doc.pushHistory(isNew ? `Type: ${layer.name}` : `Edit Type: ${layer.name}`);
    }

    this.renderTopTypeBar();
    this.session.notify('text.commit');
  }

  cancelInlineTextEdit() {
    if (!this.inlineTextSession) return;
    const doc = this.session.doc;
    const { layer, isNew, originalTextData, originalName } = this.inlineTextSession;
    const wrap = document.getElementById('inline-text-editor-wrap');

    layer._inlineEditing = false;
    this.inlineTextSession = null;
    if (wrap) wrap.hidden = true;

    if (doc) {
      if (isNew) {
        const idx = doc.layers.findIndex((l) => l.id === layer.id);
        if (idx >= 0) doc.layers.splice(idx, 1);
        doc.activeLayerId = doc.layers[doc.layers.length - 1]?.id || null;
      } else {
        layer.textData = originalTextData;
        layer.name = originalName;
        doc.rasterizeTextLayer(layer);
      }
      this.session.notify('text.cancel');
    }
    this.renderTopTypeBar();
  }

  /**
   * Photoshop-Style Top Type Options Bar (Font, Style, Size, Anti-Alias, Alignment, Color, Warp, +Font, Cancel/Commit)
   */
  renderTopTypeBar() {
    const bar = document.getElementById('top-type-bar');
    if (!bar) return;

    const shouldShow = this.activeTool === 'text' || Boolean(this.inlineTextSession);
    bar.hidden = !shouldShow;
    if (!shouldShow) return;

    // Sync from active text layer if not currently inline-editing
    if (!this.inlineTextSession && this.session.doc?.activeLayer?.kind === 'text' && this.session.doc.activeLayer.textData) {
      const atd = this.session.doc.activeLayer.textData;
      this.typeSettings.fontFamily = atd.fontFamily || this.typeSettings.fontFamily;
      this.typeSettings.fontWeight = String(atd.fontWeight || '400');
      this.typeSettings.italic = Boolean(atd.italic);
      this.typeSettings.fontSize = atd.fontSize || 72;
      this.typeSettings.align = atd.align || 'center';
      this.typeSettings.color = atd.color || '#111827';
      this.typeSettings.orientation = atd.orientation || 'horizontal';
      this.typeSettings.tracking = atd.tracking || 0;
      this.typeSettings.lineHeight = atd.lineHeight || 1.25;
      this.typeSettings.warp = atd.warp || 'none';
      this.typeSettings.warpBend = atd.warpBend ?? 35;
      this.typeSettings.strokeWidth = atd.strokeWidth || 0;
      this.typeSettings.strokeColor = atd.strokeColor || '#000000';
    }

    const ts = this.typeSettings;
    const applyLiveTypeChange = (mutator) => {
      mutator(ts);
      this.activeFontFamily = ts.fontFamily;
      if (this.inlineTextSession?.layer?.textData) {
        Object.assign(this.inlineTextSession.layer.textData, {
          fontFamily: ts.fontFamily,
          fontWeight: ts.fontWeight,
          italic: ts.italic,
          fontSize: ts.fontSize,
          antiAlias: ts.antiAlias,
          align: ts.align,
          color: ts.color,
          orientation: ts.orientation,
          tracking: ts.tracking,
          lineHeight: ts.lineHeight,
          warp: ts.warp,
          warpBend: ts.warpBend,
          strokeWidth: ts.strokeWidth,
          strokeColor: ts.strokeColor
        });
        this.syncInlineTextOverlay();
      } else {
        const active = this.session.doc?.activeLayer;
        if (active && active.kind === 'text' && active.textData) {
          Object.assign(active.textData, {
            fontFamily: ts.fontFamily,
            fontWeight: ts.fontWeight,
            italic: ts.italic,
            fontSize: ts.fontSize,
            antiAlias: ts.antiAlias,
            align: ts.align,
            color: ts.color,
            orientation: ts.orientation,
            tracking: ts.tracking,
            lineHeight: ts.lineHeight,
            warp: ts.warp,
            warpBend: ts.warpBend,
            strokeWidth: ts.strokeWidth,
            strokeColor: ts.strokeColor
          });
          this.session.doc.rasterizeTextLayer(active);
          this.session.notify('text.styleChange');
        }
      }
    };

    const currentStyleId = ts.italic
      ? (Number(ts.fontWeight) >= 700 ? 'boldItalic' : 'italic')
      : Number(ts.fontWeight) >= 900
      ? 'black'
      : Number(ts.fontWeight) >= 700
      ? 'bold'
      : Number(ts.fontWeight) >= 500
      ? 'medium'
      : 'regular';

    bar.innerHTML = '';

    // ROW 1: Orientation, Font Family, Style, Size (tT), Anti-Alias (aa) — EXACT Photoshop Order!
    const row1 = document.createElement('div');
    row1.className = 'ttb-row';

    const oriBtn = document.createElement('button');
    oriBtn.type = 'button';
    oriBtn.className = `ttb-icon-btn${ts.orientation === 'vertical' ? ' active' : ''}`;
    oriBtn.title = 'Toggle Text Orientation (Horizontal / Vertical)';
    oriBtn.textContent = ts.orientation === 'vertical' ? 'T↕' : 'T⇄';
    oriBtn.addEventListener('click', () => {
      applyLiveTypeChange((s) => { s.orientation = s.orientation === 'vertical' ? 'horizontal' : 'vertical'; });
      this.renderTopTypeBar();
    });
    row1.appendChild(oriBtn);

    const fontSel = document.createElement('select');
    fontSel.className = 'ttb-select';
    fontSel.id = 'ttb-font-select';
    fontSel.title = 'Font Family';
    fontSel.style.flex = '1.4';
    for (const f of this.allFonts) {
      const o = document.createElement('option');
      o.value = f.family;
      o.textContent = f.label;
      if (f.family === ts.fontFamily) o.selected = true;
      fontSel.appendChild(o);
    }
    fontSel.addEventListener('change', () => applyLiveTypeChange((s) => { s.fontFamily = fontSel.value; }));
    row1.appendChild(fontSel);

    const styleSel = document.createElement('select');
    styleSel.className = 'ttb-select';
    styleSel.id = 'ttb-style-select';
    styleSel.title = 'Font Style';
    styleSel.style.width = '78px';
    for (const st of [
      { id: 'regular', label: 'Regular', w: '400', it: false },
      { id: 'medium', label: 'Medium', w: '500', it: false },
      { id: 'bold', label: 'Bold', w: '700', it: false },
      { id: 'black', label: 'Black', w: '900', it: false },
      { id: 'italic', label: 'Italic', w: '400', it: true },
      { id: 'boldItalic', label: 'Bold Italic', w: '700', it: true }
    ]) {
      const o = document.createElement('option');
      o.value = st.id;
      o.textContent = st.label;
      if (st.id === currentStyleId) o.selected = true;
      styleSel.appendChild(o);
    }
    styleSel.addEventListener('change', () => {
      const map = {
        regular: ['400', false],
        medium: ['500', false],
        bold: ['700', false],
        black: ['900', false],
        italic: ['400', true],
        boldItalic: ['700', true]
      };
      const [w, it] = map[styleSel.value] || ['400', false];
      applyLiveTypeChange((s) => { s.fontWeight = w; s.italic = it; });
    });
    row1.appendChild(styleSel);

    // tT Font Size Input + Quick Preset Dropdown
    const sizeWrap = document.createElement('div');
    sizeWrap.className = 'ttb-size-wrap';
    sizeWrap.title = 'Font Size (px)';
    sizeWrap.innerHTML = `
      <span>tT</span>
      <input type="number" class="ttb-size-input" id="ttb-size-input" min="8" max="400" value="${Math.round(ts.fontSize || 72)}" />
      <select class="ttb-size-preset" id="ttb-size-preset" title="Preset Sizes">
        <option value="">▾</option>
        ${[18, 24, 36, 48, 64, 72, 96, 128, 160, 220].map((v) => `<option value="${v}">${v} px</option>`).join('')}
      </select>
    `;
    const sizeIn = sizeWrap.querySelector('#ttb-size-input');
    const sizePre = sizeWrap.querySelector('#ttb-size-preset');
    sizeIn.addEventListener('input', () => {
      const v = Math.max(8, Math.min(400, Number(sizeIn.value) || 12));
      applyLiveTypeChange((s) => { s.fontSize = v; });
    });
    sizePre.addEventListener('change', () => {
      if (!sizePre.value) return;
      const v = Number(sizePre.value);
      sizeIn.value = String(v);
      sizePre.value = '';
      applyLiveTypeChange((s) => { s.fontSize = v; });
    });
    row1.appendChild(sizeWrap);

    bar.appendChild(row1);

    // ROW 2: Anti-Alias (aa [Sharp]), Alignment (L/C/R), Color Swatch, +Font, Warp Popover, Cancel (✕), Commit (✓)
    const row2 = document.createElement('div');
    row2.className = 'ttb-row';

    const aaWrap = document.createElement('div');
    aaWrap.className = 'ttb-aa-wrap';
    aaWrap.title = 'Anti-Aliasing Method';
    const aaLbl = document.createElement('span');
    aaLbl.textContent = 'aa';
    const aaSel = document.createElement('select');
    aaSel.className = 'ttb-aa-select';
    aaSel.id = 'ttb-aa-select';
    for (const aa of ['Sharp', 'Crisp', 'Strong', 'Smooth', 'None']) {
      const o = document.createElement('option');
      o.value = aa.toLowerCase();
      o.textContent = aa;
      if ((ts.antiAlias || 'sharp') === o.value) o.selected = true;
      aaSel.appendChild(o);
    }
    aaSel.addEventListener('change', () => applyLiveTypeChange((s) => { s.antiAlias = aaSel.value; }));
    aaWrap.appendChild(aaLbl);
    aaWrap.appendChild(aaSel);
    row2.appendChild(aaWrap);

    // Alignment Buttons (Left / Center / Right)
    const alignGrp = document.createElement('div');
    alignGrp.className = 'ttb-align-group';
    const alignIcons = {
      left: '<svg viewBox="0 0 16 16" width="13" height="13" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="3" x2="14" y2="3"/><line x1="2" y1="7" x2="10" y2="7"/><line x1="2" y1="11" x2="13" y2="11"/></svg>',
      center: '<svg viewBox="0 0 16 16" width="13" height="13" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="3" x2="14" y2="3"/><line x1="4" y1="7" x2="12" y2="7"/><line x1="3" y1="11" x2="13" y2="11"/></svg>',
      right: '<svg viewBox="0 0 16 16" width="13" height="13" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="3" x2="14" y2="3"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="3" y1="11" x2="14" y2="11"/></svg>'
    };
    for (const al of ['left', 'center', 'right']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `ttb-align-btn${ts.align === al ? ' active' : ''}`;
      b.title = `Align ${al}`;
      b.innerHTML = alignIcons[al];
      b.addEventListener('click', () => {
        applyLiveTypeChange((s) => { s.align = al; });
        this.renderTopTypeBar();
      });
      alignGrp.appendChild(b);
    }
    row2.appendChild(alignGrp);

    // Color Swatch
    const colIn = document.createElement('input');
    colIn.type = 'color';
    colIn.className = 'ttb-swatch';
    colIn.id = 'ttb-color-input';
    colIn.value = ts.color || '#111827';
    colIn.title = 'Text Color';
    colIn.addEventListener('input', () => applyLiveTypeChange((s) => { s.color = colIn.value; }));
    row2.appendChild(colIn);

    // Import Downloaded Font Button (+Font)
    const impBtn = document.createElement('button');
    impBtn.type = 'button';
    impBtn.className = 'ttb-icon-btn';
    impBtn.id = 'ttb-import-font-btn';
    impBtn.title = 'Import Downloaded Font (.ttf, .otf, .woff, .woff2)';
    impBtn.textContent = '+Font';
    impBtn.addEventListener('click', () => document.getElementById('file-input-font').click());
    row2.appendChild(impBtn);

    // Warp / Tracking / Stroke Compact Popover Dropdown (No Modal Popup!)
    const moreAnchor = document.createElement('div');
    moreAnchor.className = 'dropdown-anchor';
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'ttb-icon-btn';
    moreBtn.id = 'ttb-more-btn';
    moreBtn.title = 'Warp Text, Tracking, Line Height & Outline Stroke';
    moreBtn.textContent = 'Warp ▾';
    const morePop = document.createElement('div');
    morePop.className = 'dropdown-popover down-right';
    morePop.id = 'popover-type-more';
    morePop.hidden = true;
    morePop.style.minWidth = '220px';
    morePop.style.padding = '10px';
    morePop.addEventListener('click', (e) => e.stopPropagation());

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = morePop.hidden;
      this.closeAllDropdowns();
      if (willOpen) {
        morePop.innerHTML = '';
        const wField = document.createElement('div');
        wField.className = 'ctrl-field';
        wField.innerHTML = `<label>Warp Text</label>
          <select class="pc-select" id="ttb-warp-sel">
            <option value="none" ${ts.warp === 'none' ? 'selected' : ''}>None</option>
            <option value="arcUp" ${ts.warp === 'arcUp' ? 'selected' : ''}>Arc Up</option>
            <option value="arcDown" ${ts.warp === 'arcDown' ? 'selected' : ''}>Arc Down</option>
            <option value="wave" ${ts.warp === 'wave' ? 'selected' : ''}>Wave</option>
          </select>`;
        wField.querySelector('select').addEventListener('change', (ev) => applyLiveTypeChange((s) => { s.warp = ev.target.value; }));
        morePop.appendChild(wField);

        this.appendRangeRow(morePop, 'Tracking', -10, 40, 1, ts.tracking ?? 0, 'px', (v) => applyLiveTypeChange((s) => { s.tracking = v; }));
        this.appendRangeRow(morePop, 'Line Height', 80, 220, 5, Math.round((ts.lineHeight || 1.25) * 100), '%', (v) => applyLiveTypeChange((s) => { s.lineHeight = v / 100; }));
        this.appendRangeRow(morePop, 'Outline Stroke', 0, 14, 1, ts.strokeWidth ?? 0, 'px', (v) => applyLiveTypeChange((s) => { s.strokeWidth = v; }));

        const scRow = document.createElement('div');
        scRow.style.display = 'flex';
        scRow.style.alignItems = 'center';
        scRow.style.justifyContent = 'space-between';
        scRow.style.marginTop = '4px';
        scRow.innerHTML = `<span style="font-size:11px;color:var(--pc-text-dim);">Stroke Color</span><input type="color" class="ttb-swatch" value="${ts.strokeColor || '#000000'}" />`;
        scRow.querySelector('input').addEventListener('input', (ev) => applyLiveTypeChange((s) => { s.strokeColor = ev.target.value; }));
        morePop.appendChild(scRow);

        morePop.hidden = false;
      }
    });
    moreAnchor.appendChild(moreBtn);
    moreAnchor.appendChild(morePop);
    row2.appendChild(moreAnchor);

    // Commit (✓) & Cancel (✕) Photoshop Buttons on the Right when actively typing!
    if (this.inlineTextSession) {
      const spacer = document.createElement('div');
      spacer.style.flex = '1';
      row2.appendChild(spacer);

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'ttb-icon-btn cancel';
      cancelBtn.id = 'ttb-cancel-text';
      cancelBtn.title = 'Cancel Text Edit (Esc)';
      cancelBtn.textContent = '✕';
      cancelBtn.addEventListener('click', () => this.cancelInlineTextEdit());
      row2.appendChild(cancelBtn);

      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'ttb-icon-btn commit';
      okBtn.id = 'ttb-commit-text';
      okBtn.title = 'Commit Text Layer (Ctrl+Enter)';
      okBtn.textContent = '✓';
      okBtn.addEventListener('click', () => this.commitInlineTextEdit());
      row2.appendChild(okBtn);
    }

    bar.appendChild(row2);
  }

  /* ==========================================================================
   * Dropdown-Based Tool Options Bar (No Horizontal Sliding!)
   * ========================================================================== */
  renderToolOptionsStrip() {
    const strip = document.getElementById('tool-options-strip');
    strip.innerHTML = '';
    if (this.activeTool === 'text') {
      strip.style.display = 'none';
      return;
    }
    strip.style.display = '';

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

      // Flow Dropdown
      addSelectDropdown(
        [100, 80, 60, 40, 20].map((f) => ({ id: f, label: `Flow: ${f}%` })),
        [100, 80, 60, 40, 20].reduce((prev, curr) =>
          Math.abs(curr - (this.brush.flow ?? 90)) < Math.abs(prev - (this.brush.flow ?? 90)) ? curr : prev
        ),
        (val) => {
          this.brush.flow = Number(val);
        },
        'Brush Flow'
      );

      // Hardness Dropdown
      addSelectDropdown(
        [100, 75, 50, 25, 0].map((h) => ({ id: h, label: `Hard: ${h}%` })),
        [100, 75, 50, 25, 0].reduce((prev, curr) =>
          Math.abs(curr - (this.brush.hardness ?? 70)) < Math.abs(prev - (this.brush.hardness ?? 70)) ? curr : prev
        ),
        (val) => {
          this.brush.hardness = Number(val);
        },
        'Brush Hardness'
      );
    } else if (this.activeTool === 'select') {
      // Smart Selector & Marquee Mode Dropdown
      addSelectDropdown(
        [
          { id: 'object', label: '🎯 Smart Object' },
          { id: 'quickSelect', label: '🖌 Quick Brush' },
          { id: 'colorRange', label: '🎨 Color Range' },
          { id: 'wand', label: '🪄 Magic Wand' },
          { id: 'rect', label: '▭ Rect Marquee' },
          { id: 'ellipse', label: '◯ Ellipse' },
          { id: 'lasso', label: '➰ Lasso' }
        ],
        this.selectMode,
        (val) => {
          this.selectMode = val;
          this.renderToolOptionsStrip();
        },
        'Smart Selection Tool Mode'
      );

      // Boolean Combine Segmented Buttons (New / +Add / -Subtract / ∩Intersect)
      const seg = document.createElement('div');
      seg.className = 'opt-seg-group';
      seg.title = 'Selection Mode: New, Add (+), Subtract (−), Intersect (∩)';
      for (const cm of [
        { id: 'replace', lbl: '□', ttl: 'New Selection' },
        { id: 'add', lbl: '+', ttl: 'Add to Selection' },
        { id: 'subtract', lbl: '−', ttl: 'Subtract from Selection' },
        { id: 'intersect', lbl: '∩', ttl: 'Intersect with Selection' }
      ]) {
        const sb = document.createElement('button');
        sb.type = 'button';
        sb.className = `opt-seg-btn${this.selectCombineMode === cm.id ? ' active' : ''}`;
        sb.textContent = cm.lbl;
        sb.title = cm.ttl;
        sb.dataset.combineMode = cm.id;
        sb.addEventListener('click', () => {
          this.selectCombineMode = cm.id;
          this.renderToolOptionsStrip();
        });
        seg.appendChild(sb);
      }
      strip.appendChild(seg);

      // Sensitivity / Tolerance for smart selectors
      if (['object', 'quickSelect', 'colorRange', 'wand'].includes(this.selectMode)) {
        addSelectDropdown(
          [12, 22, 34, 48, 65, 85].map((t) => ({ id: t, label: `Sens: ${t}` })),
          [12, 22, 34, 48, 65, 85].reduce((prev, curr) =>
            Math.abs(curr - this.wandTolerance) < Math.abs(prev - this.wandTolerance) ? curr : prev
          ),
          (val) => {
            this.wandTolerance = Number(val);
          },
          'Smart Selector Tolerance / Sensitivity'
        );
      }

      if (this.selectMode === 'quickSelect') {
        addSelectDropdown(
          [14, 24, 36, 54, 80].map((r) => ({ id: r, label: `Brush: ${r}px` })),
          [14, 24, 36, 54, 80].reduce((prev, curr) =>
            Math.abs(curr - this.quickSelectRadius) < Math.abs(prev - this.quickSelectRadius) ? curr : prev
          ),
          (val) => {
            this.quickSelectRadius = Number(val);
          },
          'Quick Select Brush Radius'
        );
      }

      if (this.selectMode === 'wand') {
        addButton(this.selectContiguous ? '☑ Contig' : '☐ Contig', this.selectContiguous, () => {
          this.selectContiguous = !this.selectContiguous;
          this.renderToolOptionsStrip();
        });
      }

      addButton(this.selectSampleAll ? '☑ All Lyr' : '☐ Active Lyr', this.selectSampleAll, () => {
        this.selectSampleAll = !this.selectSampleAll;
        this.renderToolOptionsStrip();
      });

      addButton(this.showSelectionTint ? '🔵 Overlay' : '○ Ants', this.showSelectionTint, () => {
        this.showSelectionTint = !this.showSelectionTint;
        this.renderToolOptionsStrip();
        this.requestRender();
      });

      addButton('✨ Subject', true, () => {
        this.session.dispatch('selection.subject');
        this.showToast('Select ➔ Subject applied!');
      });

      addButton('🎯 Layer', false, () => {
        this.session.dispatch('selection.fromLayer', { combineMode: this.selectCombineMode });
        this.showToast('Selected Active Layer Shape');
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
          { id: 'perspectiveCrop', label: 'Tool: Persp Crop' },
          { id: 'slice', label: 'Tool: Slice' },
          { id: 'sliceSelect', label: 'Tool: Slice Sel' }
        ],
        this.activeTool,
        (val) => this.selectTool(val)
      );

      if (this.activeTool === 'crop') {
        addSelectDropdown(
          [
            { id: 'free', label: 'Ratio: Free' },
            { id: 'original', label: 'Ratio: Original' },
            { id: '1:1', label: 'Ratio: 1:1' },
            { id: '4:5', label: 'Ratio: 4:5' },
            { id: '5:4', label: 'Ratio: 5:4' },
            { id: '3:2', label: 'Ratio: 3:2' },
            { id: '4:3', label: 'Ratio: 4:3' },
            { id: '16:9', label: 'Ratio: 16:9' },
            { id: '9:16', label: 'Ratio: 9:16' }
          ],
          this.cropAspect,
          (val) => {
            this.cropAspect = val;
            this.applyCropAspectConstraint();
            this.renderFloatingContextBar();
            this.requestRender();
          },
          'Crop Aspect Ratio'
        );
        addButton('⇄', false, () => this.swapCropAspectRatio());
        addSelectDropdown(
          [
            { id: 'thirds', label: 'Grid: Thirds' },
            { id: 'grid', label: 'Grid: Dense' },
            { id: 'diagonal', label: 'Grid: Diagonal' },
            { id: 'golden', label: 'Grid: Golden' }
          ],
          this.cropGridMode,
          (val) => {
            this.cropGridMode = val;
            this.requestRender();
          },
          'Crop Overlay Grid'
        );

        // Straighten Angle control (matches Photoshop Straighten in Crop Options Bar!)
        const angWrap = document.createElement('div');
        angWrap.className = 'opt-chip';
        angWrap.style.gap = '4px';
        angWrap.style.padding = '0 6px';
        angWrap.innerHTML = `<span style="font-size:10px;font-family:var(--pc-font-mono);" id="crop-angle-lbl">∠ ${this.cropAngle.toFixed(1)}°</span>
          <input type="range" id="crop-angle-slider" min="-45" max="45" step="0.5" value="${this.cropAngle}" style="width:66px;accent-color:var(--pc-accent);" />`;
        const angSlider = angWrap.querySelector('#crop-angle-slider');
        const angLbl = angWrap.querySelector('#crop-angle-lbl');
        angSlider.addEventListener('input', () => {
          this.cropAngle = Number(angSlider.value);
          angLbl.textContent = `∠ ${this.cropAngle.toFixed(1)}°`;
          this.renderFloatingContextBar();
          this.requestRender();
        });
        angLbl.title = 'Tap to reset Straighten angle to 0°';
        angLbl.addEventListener('click', () => {
          this.cropAngle = 0;
          angSlider.value = '0';
          angLbl.textContent = '∠ 0.0°';
          this.renderFloatingContextBar();
          this.requestRender();
        });
        strip.appendChild(angWrap);

        addButton(this.cropDeletePixels ? '☑ Delete Cropped' : '☐ Keep Cropped', this.cropDeletePixels, () => {
          this.cropDeletePixels = !this.cropDeletePixels;
          this.renderToolOptionsStrip();
        });
      } else if (this.activeTool === 'perspectiveCrop') {
        addButton(this.perspectiveShowGrid ? '☑ Mesh Grid' : '☐ Mesh Grid', this.perspectiveShowGrid, () => {
          this.perspectiveShowGrid = !this.perspectiveShowGrid;
          this.renderToolOptionsStrip();
          this.requestRender();
        });
        addButton('Reset Quad', false, () => {
          this.resetCropBoxes();
          this.renderFloatingContextBar();
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
      addButton(this.moveAutoSelect ? '☑ Auto-Sel' : '☐ Auto-Sel', this.moveAutoSelect, () => {
        this.moveAutoSelect = !this.moveAutoSelect;
        this.renderToolOptionsStrip();
      });
      addButton(this.moveMultiSelect ? '☑ Multi-Sel' : '☐ Multi-Sel', this.moveMultiSelect, () => {
        this.moveMultiSelect = !this.moveMultiSelect;
        if (!this.moveMultiSelect && this.session.doc?.activeLayerId) {
          this.session.doc.setSelectedLayerIds([this.session.doc.activeLayerId]);
        }
        this.renderToolOptionsStrip();
        this.renderFloatingContextBar();
        this.requestRender();
      });
      addButton(this.transformLockAspect ? '🔗 Ratio' : '🔓 Free', this.transformLockAspect, () => {
        this.transformLockAspect = !this.transformLockAspect;
        this.renderToolOptionsStrip();
      });
      addButton('📱 +Photo', true, () => document.getElementById('file-input-place-layer').click());
      addButton('Fit', false, () => this.fitActiveLayerToCanvas());
      addButton('Center', false, () => this.centerActiveLayer());
      addButton('−10%', false, () => this.scaleActiveLayer(0.9));
      addButton('+10%', false, () => this.scaleActiveLayer(1.1));
      addButton('Flip H', false, () => this.session.dispatch('transform.flipHorizontal'));
      addButton('Flip V', false, () => this.session.dispatch('transform.flipVertical'));
      addButton('↻ 90°', false, () => this.rotateActiveLayerBy(90));
      addButton('Reset', false, () => this.resetActiveLayerTransform());
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
      addSelectDropdown(
        [100, 80, 60, 40, 20].map((o) => ({ id: o, label: `Opac: ${o}%` })),
        [100, 80, 60, 40, 20].reduce((prev, curr) =>
          Math.abs(curr - this.brush.opacity) < Math.abs(prev - this.brush.opacity) ? curr : prev
        ),
        (val) => {
          this.brush.opacity = Number(val);
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
      addSelectDropdown(
        [0, 2, 3, 6, 10, 16].map((sw) => ({ id: sw, label: `Stroke: ${sw}px` })),
        this.shapeStrokeWidth,
        (val) => {
          this.shapeStrokeWidth = Number(val);
        }
      );
      addSelectDropdown(
        [0, 8, 14, 24, 48].map((r) => ({ id: r, label: `Radius: ${r}px` })),
        this.shapeCornerRadius,
        (val) => {
          this.shapeCornerRadius = Number(val);
        }
      );
      addButton('+ Add Shape', true, () => {
        this.session.dispatch('shape.addLayer', {
          shapeType: this.shapeMode,
          fill: this.fgColor,
          stroke: this.bgColor,
          strokeWidth: this.shapeStrokeWidth,
          cornerRadius: this.shapeCornerRadius
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

  getCropTargetRatio() {
    const doc = this.session.doc;
    if (!doc || !this.cropAspect || this.cropAspect === 'free') return null;
    if (this.cropAspect === 'original') return doc.width / Math.max(1, doc.height);
    const parts = this.cropAspect.split(':').map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      return parts[0] / parts[1];
    }
    return null;
  }

  applyCropAspectConstraint() {
    const doc = this.session.doc;
    if (!doc || !this.cropBox) return;
    const ratio = this.getCropTargetRatio();
    if (!ratio) return;
    let w = doc.width * 0.88;
    let h = w / ratio;
    if (h > doc.height * 0.88) {
      h = doc.height * 0.88;
      w = h * ratio;
    }
    this.cropBox = {
      x: Math.round((doc.width - w) / 2),
      y: Math.round((doc.height - h) / 2),
      w: Math.max(24, Math.round(w)),
      h: Math.max(24, Math.round(h))
    };
  }

  swapCropAspectRatio() {
    const doc = this.session.doc;
    if (!doc || !this.cropBox) return;
    const swapMap = { '4:5': '5:4', '5:4': '4:5', '16:9': '9:16', '9:16': '16:9' };
    if (swapMap[this.cropAspect]) {
      this.cropAspect = swapMap[this.cropAspect];
      this.applyCropAspectConstraint();
    } else if (this.cropAspect === 'free' || this.cropAspect === 'original' || this.cropAspect === '3:2' || this.cropAspect === '4:3') {
      const cb = this.cropBox;
      const cx = cb.x + cb.w / 2;
      const cy = cb.y + cb.h / 2;
      let nw = cb.h;
      let nh = cb.w;
      const fit = Math.min(1, doc.width / Math.max(1, nw), doc.height / Math.max(1, nh));
      nw = Math.max(24, Math.round(nw * fit));
      nh = Math.max(24, Math.round(nh * fit));
      this.cropBox = {
        x: Math.max(0, Math.min(doc.width - nw, Math.round(cx - nw / 2))),
        y: Math.max(0, Math.min(doc.height - nh, Math.round(cy - nh / 2))),
        w: nw,
        h: nh
      };
      if (this.cropAspect === '3:2') this.cropAspect = 'free';
      if (this.cropAspect === '4:3') this.cropAspect = 'free';
    }
    this.renderToolOptionsStrip();
    this.renderFloatingContextBar();
    this.requestRender();
  }

  commitCropAction() {
    const doc = this.session.doc;
    if (!doc || !this.cropBox) return;
    this.session.dispatch('crop.apply', {
      ...this.cropBox,
      angle: this.cropAngle,
      deleteCroppedPixels: this.cropDeletePixels
    });
    this.cropAngle = 0;
    this.cropAspect = 'free';
    this.resetCropBoxes(doc);
    this.fitCanvasToViewport();
    this.selectTool('brush');
    this.showToast(`Cropped to ${doc.width}×${doc.height} px`);
  }

  commitPerspectiveCropAction() {
    const doc = this.session.doc;
    if (!doc || !this.perspectiveQuad) return;
    if (!Algorithms.isConvexQuad(this.perspectiveQuad)) {
      this.showToast('Perspective quad must be convex');
      return;
    }
    this.session.dispatch('image.perspectiveCrop', {
      corners: this.perspectiveQuad
    });
    this.resetCropBoxes(doc);
    this.fitCanvasToViewport();
    this.selectTool('brush');
    this.showToast(`Perspective Crop Rectified (${doc.width}×${doc.height} px)`);
  }

  getActiveTransformBounds() {
    const doc = this.session.doc;
    if (!doc) return null;
    const selected = doc.getSelectedLayers().filter((l) => l && l.kind !== 'adjustment' && !l.locked);
    if (selected.length > 1) {
      return doc.getCombinedTransformBounds(selected);
    }
    const layer = selected[0] || doc.activeLayer;
    if (!layer || layer.kind === 'adjustment') return null;

    if (layer.smartSource?.canvas || layer.kind === 'shape' || layer.kind === 'text') {
      return doc.getLayerTransformBounds(layer);
    }

    if (
      this._cachedTransformBounds &&
      this._cachedTransformBounds.layerId === layer.id &&
      this._cachedTransformBounds.docW === doc.width &&
      this._cachedTransformBounds.docH === doc.height
    ) {
      return this._cachedTransformBounds.bounds;
    }

    const bounds = doc.getLayerTransformBounds(layer);
    this._cachedTransformBounds = { layerId: layer.id, docW: doc.width, docH: doc.height, bounds };
    return bounds;
  }

  scaleActiveLayer(factor) {
    const doc = this.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment' || layer.locked) return;

    if (layer.kind === 'text' && layer.textData) {
      layer.textData.fontSize = Math.max(8, Math.min(600, Math.round((layer.textData.fontSize || 48) * factor)));
      doc.rasterizeTextLayer(layer);
    } else if (layer.kind === 'shape' && layer.shapeData) {
      const sd = layer.shapeData;
      const cx = sd.x + sd.w / 2;
      const cy = sd.y + sd.h / 2;
      sd.w = Math.max(12, Math.round(sd.w * factor));
      sd.h = Math.max(12, Math.round(sd.h * factor));
      sd.x = Math.round(cx - sd.w / 2);
      sd.y = Math.round(cy - sd.h / 2);
      doc.rasterizeShapeLayer(layer);
    } else {
      const ss = doc.ensureSmartSource(layer);
      if (!ss) return;
      ss.w = Math.max(12, ss.w * factor);
      ss.h = Math.max(12, ss.h * factor);
      doc.rasterizeSmartLayer(layer);
    }
    doc.pushHistory(`Scale Layer (${Math.round(factor * 100)}%)`);
    this.session.notify('transform.scale');
  }

  rotateActiveLayerBy(deg) {
    const doc = this.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment' || layer.locked) return;
    const rad = (deg * Math.PI) / 180;

    if (layer.kind === 'text' && layer.textData) {
      layer.textData.rotation = (layer.textData.rotation || 0) + rad;
      doc.rasterizeTextLayer(layer);
    } else if (layer.kind === 'shape' && layer.shapeData) {
      layer.shapeData.rotation = (layer.shapeData.rotation || 0) + rad;
      doc.rasterizeShapeLayer(layer);
    } else {
      const ss = doc.ensureSmartSource(layer);
      if (!ss) return;
      ss.rotation = (ss.rotation || 0) + rad;
      doc.rasterizeSmartLayer(layer);
    }
    doc.pushHistory(`Rotate Layer ${deg > 0 ? '+' : ''}${deg}°`);
    this.session.notify('transform.rotate');
  }

  fitActiveLayerToCanvas() {
    const doc = this.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment' || layer.locked) return;

    if (layer.kind === 'shape' && layer.shapeData) {
      const sd = layer.shapeData;
      const scale = Math.min(doc.width / Math.max(1, sd.w), doc.height / Math.max(1, sd.h));
      sd.w = Math.round(sd.w * scale);
      sd.h = Math.round(sd.h * scale);
      sd.x = Math.round((doc.width - sd.w) / 2);
      sd.y = Math.round((doc.height - sd.h) / 2);
      sd.rotation = 0;
      doc.rasterizeShapeLayer(layer);
    } else if (layer.kind === 'text' && layer.textData) {
      layer.textData.x = Math.round(doc.width / 2);
      layer.textData.y = Math.round(doc.height / 2);
      layer.textData.rotation = 0;
      doc.rasterizeTextLayer(layer);
    } else {
      const ss = doc.ensureSmartSource(layer);
      if (!ss) return;
      const scale = Math.min(doc.width / Math.max(1, ss.origW), doc.height / Math.max(1, ss.origH));
      ss.w = Math.round(ss.origW * scale);
      ss.h = Math.round(ss.origH * scale);
      ss.cx = doc.width / 2;
      ss.cy = doc.height / 2;
      ss.rotation = 0;
      doc.rasterizeSmartLayer(layer);
    }
    doc.pushHistory('Fit Layer to Canvas');
    this.session.notify('transform.fit');
    this.showToast('Fitted layer to canvas');
  }

  centerActiveLayer() {
    const doc = this.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment' || layer.locked) return;

    if (layer.kind === 'text' && layer.textData) {
      layer.textData.x = Math.round(doc.width / 2);
      layer.textData.y = Math.round(doc.height / 2);
      doc.rasterizeTextLayer(layer);
    } else if (layer.kind === 'shape' && layer.shapeData) {
      layer.shapeData.x = Math.round((doc.width - layer.shapeData.w) / 2);
      layer.shapeData.y = Math.round((doc.height - layer.shapeData.h) / 2);
      doc.rasterizeShapeLayer(layer);
    } else {
      const ss = doc.ensureSmartSource(layer);
      if (!ss) return;
      ss.cx = doc.width / 2;
      ss.cy = doc.height / 2;
      doc.rasterizeSmartLayer(layer);
    }
    doc.pushHistory('Center Layer');
    this.session.notify('transform.center');
    this.showToast('Centered layer on canvas');
  }

  resetActiveLayerTransform() {
    const doc = this.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment' || layer.locked) return;

    if (layer.smartSource?.canvas) {
      const ss = layer.smartSource;
      const fit = Math.min(doc.width / Math.max(1, ss.origW), doc.height / Math.max(1, ss.origH), 1);
      ss.w = Math.round(ss.origW * fit);
      ss.h = Math.round(ss.origH * fit);
      ss.cx = doc.width / 2;
      ss.cy = doc.height / 2;
      ss.rotation = 0;
      ss.flipX = false;
      ss.flipY = false;
      doc.rasterizeSmartLayer(layer);
    } else if (layer.kind === 'text' && layer.textData) {
      layer.textData.rotation = 0;
      layer.textData.flipX = false;
      layer.textData.flipY = false;
      doc.rasterizeTextLayer(layer);
    } else if (layer.kind === 'shape' && layer.shapeData) {
      layer.shapeData.rotation = 0;
      layer.shapeData.flipX = false;
      layer.shapeData.flipY = false;
      doc.rasterizeShapeLayer(layer);
    }
    doc.pushHistory('Reset Transform');
    this.session.notify('transform.reset');
    this.showToast('Reset layer transform');
  }

  nudgeActiveLayer(dx, dy) {
    const doc = this.session.doc;
    if (!doc) return;
    const targets = doc.getSelectedLayers().filter((l) => l && l.kind !== 'adjustment' && !l.locked);
    if (targets.length === 0) return;

    for (const layer of targets) {
      if (layer.smartSource?.canvas) {
        layer.smartSource.cx += dx;
        layer.smartSource.cy += dy;
        doc.rasterizeSmartLayer(layer);
      } else if (layer.kind === 'text' && layer.textData) {
        layer.textData.x += dx;
        layer.textData.y += dy;
        doc.rasterizeTextLayer(layer);
      } else if (layer.kind === 'shape' && layer.shapeData) {
        layer.shapeData.x += dx;
        layer.shapeData.y += dy;
        doc.rasterizeShapeLayer(layer);
      } else {
        const ss = doc.ensureSmartSource(layer);
        if (ss) {
          ss.cx += dx;
          ss.cy += dy;
          doc.rasterizeSmartLayer(layer);
        }
      }
    }
    this._cachedTransformBounds = null;
    doc.pushHistory(targets.length > 1 ? `Nudge ${targets.length} Layers` : 'Nudge Layer');
    this.session.notify('layer.moved');
  }

  /* ==========================================================================
   * Floating Contextual Action Bar & On-Canvas Precision Control Popovers
   * ========================================================================== */
  renderFloatingContextBar() {
    const bar = document.getElementById('floating-context-bar');
    const doc = this.session.doc;
    if (!doc) {
      bar.hidden = true;
      return;
    }

    bar.innerHTML = '';

    const addBtn = (label, cls, onClick, id = '') => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ctx-btn ${cls || ''}`.trim();
      if (id) btn.id = id;
      btn.textContent = label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick(e);
      });
      bar.appendChild(btn);
    };

    if (this.activeTool === 'crop' && this.cropBox) {
      bar.hidden = false;
      addBtn('Reset', '', () => {
        this.cropAspect = 'free';
        this.cropAngle = 0;
        this.resetCropBoxes(doc);
        this.renderToolOptionsStrip();
        this.renderFloatingContextBar();
        this.requestRender();
      });
      addBtn('Cancel ✕', 'danger', () => {
        this.cropAngle = 0;
        this.selectTool('brush');
      });
      const angTxt = Math.abs(this.cropAngle) > 0.05 ? ` · ${this.cropAngle.toFixed(1)}°` : '';
      addBtn(`Apply Crop (${Math.round(this.cropBox.w)}×${Math.round(this.cropBox.h)}${angTxt}) ✓`, 'primary', () => {
        this.commitCropAction();
      });
      return;
    }

    if (this.activeTool === 'perspectiveCrop' && this.perspectiveQuad) {
      bar.hidden = false;
      const valid = Algorithms.isConvexQuad(this.perspectiveQuad);
      addBtn('Reset Quad', '', () => {
        this.resetCropBoxes(doc);
        this.renderFloatingContextBar();
        this.requestRender();
      });
      addBtn('Cancel ✕', 'danger', () => this.selectTool('brush'));
      addBtn(
        valid ? 'Apply Perspective Crop ✓' : 'Quad Invalid',
        valid ? 'primary' : 'danger',
        () => this.commitPerspectiveCropAction()
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
      addBtn('✂️ Cutout', 'primary', () => {
        this.session.dispatch('layer.viaCopy');
        this.showToast('Cutout copied to new layer!');
      }, 'ctx-sel-cutout');
      addBtn('🎭 Mask', 'primary', () => {
        this.session.dispatch('layer.addMask', { fromSelection: true });
        this.showToast('Created Layer Mask from Selection');
      }, 'ctx-sel-mask');
      addBtn('🪣 Fill', '', () => {
        this.session.dispatch('selection.fill', { color: this.fgColor, opacity: 1 });
        this.showToast('Filled Selection');
      }, 'ctx-sel-fill');
      addBtn('⌫ Erase', '', () => {
        this.session.dispatch('selection.clearPixels');
        this.showToast('Erased Selected Pixels');
      }, 'ctx-sel-erase');
      addBtn('⚙ Refine', '', () => this.openSelectionRefinePopover(), 'ctx-sel-refine');
      addBtn('⇄', '', () => this.session.dispatch('selection.invert'), 'ctx-sel-invert');
      addBtn('✕', 'danger', () => {
        this.closeCanvasPopover();
        this.session.dispatch('selection.deselect');
      }, 'ctx-sel-deselect');
      return;
    }

    if (this.activeTool === 'move' && doc.activeLayer) {
      bar.hidden = false;
      const selCount = doc.getSelectedLayers().length;
      addBtn('⚙ Exact', 'primary', () => this.openPrecisionInspector(), 'ctx-move-exact');
      addBtn(selCount > 1 ? `📚 Pick (${selCount})` : '📚 Pick', '', () => this.openCanvasObjectPicker(null, null), 'ctx-move-pick');
      addBtn('fx', '', () => this.openLayerStylesModal(), 'ctx-move-fx');
      addBtn('Dup', '', () => {
        this.session.dispatch('layer.duplicate');
        this.showToast('Duplicated Layer');
      }, 'ctx-move-dup');
      if (selCount > 1) {
        addBtn(`⊞ Merge (${selCount})`, 'primary', () => {
          this.session.dispatch('layer.mergeSelected');
          this.showToast(`Merged ${selCount} Layers`);
        }, 'ctx-move-merge');
      }
      addBtn('🗑', 'danger', () => {
        if (doc.layers.length <= 1) {
          this.showToast('Cannot delete the only layer');
          return;
        }
        this.session.dispatch('layer.delete');
        this.showToast('Deleted Layer');
      }, 'ctx-move-delete');
      return;
    }

    bar.hidden = true;
  }

  closeCanvasPopover() {
    const pop = document.getElementById('canvas-control-popover');
    if (pop) {
      pop.hidden = true;
      pop.classList.remove('top-right-anchor');
    }
    this._canvasPopoverKind = null;
  }

  /**
   * On-Canvas Precision Inspector: Exact X/Y/W/H/Angle/Opacity, Blend Mode,
   * 1px/10px D-Pad Nudger, 6-Way Align, Z-Order, and Live Shape/Text Controls!
   */
  openPrecisionInspector() {
    const pop = document.getElementById('canvas-control-popover');
    const doc = this.session.doc;
    if (!pop || !doc) return;
    if (!pop.hidden && this._canvasPopoverKind === 'precision') {
      this.closeCanvasPopover();
      return;
    }

    const renderBody = () => {
      const lyr = doc.activeLayer;
      const selLayers = doc.getSelectedLayers();
      const bounds = this.getActiveTransformBounds();
      if (!lyr || !bounds) {
        this.closeCanvasPopover();
        return;
      }

      const xVal = Math.round(bounds.cx - bounds.w / 2);
      const yVal = Math.round(bounds.cy - bounds.h / 2);
      const wVal = Math.round(bounds.w);
      const hVal = Math.round(bounds.h);
      const degVal = Math.round(((bounds.rotation || 0) * 180) / Math.PI);
      const opVal = Math.round((lyr.opacity ?? 1) * 100);

      pop.classList.remove('top-right-anchor');
      pop.innerHTML = `
        <div class="ccp-header">
          <span class="ccp-title">⚙ Precision Controls · ${selLayers.length > 1 ? `${selLayers.length} Layers` : lyr.name}</span>
          <button type="button" class="ccp-btn" id="ccp-close-btn" style="height:22px;padding:0 7px;">✕</button>
        </div>
        <div class="ccp-grid-4">
          <div class="ccp-num-field"><label>X (px)</label><input type="number" id="ccp-x" value="${xVal}" /></div>
          <div class="ccp-num-field"><label>Y (px)</label><input type="number" id="ccp-y" value="${yVal}" /></div>
          <div class="ccp-num-field"><label>W (px)</label><input type="number" id="ccp-w" min="8" value="${wVal}" /></div>
          <div class="ccp-num-field"><label>H (px)</label><input type="number" id="ccp-h" min="8" value="${hVal}" /></div>
        </div>
        <div class="ccp-grid-3">
          <div class="ccp-num-field"><label>Angle (°)</label><input type="number" id="ccp-deg" value="${degVal}" /></div>
          <div class="ccp-num-field"><label>Opacity %</label><input type="number" id="ccp-op" min="0" max="100" value="${opVal}" /></div>
          <div class="ccp-num-field">
            <label>Blend</label>
            <select class="pc-select" id="ccp-blend" style="height:26px;font-size:10.5px;padding:0 4px;">
              ${BLEND_MODES.map((bm) => `<option value="${bm.id}" ${lyr.blendMode === bm.id ? 'selected' : ''}>${bm.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="ccp-dpad-row">
          <span style="font-size:10px;color:var(--pc-text-dim);font-weight:700;">NUDGE</span>
          <div style="display:flex;gap:4px;">
            <button type="button" class="ccp-btn" id="ccp-nudge-l" title="Move Left">◀</button>
            <button type="button" class="ccp-btn" id="ccp-nudge-u" title="Move Up">▲</button>
            <button type="button" class="ccp-btn" id="ccp-nudge-d" title="Move Down">▼</button>
            <button type="button" class="ccp-btn" id="ccp-nudge-r" title="Move Right">▶</button>
          </div>
          <button type="button" class="ccp-btn active" id="ccp-step-toggle" title="Toggle 1px / 10px Nudge Step">${this.nudgeStep}px</button>
        </div>
        <div class="ccp-section-lbl">Align ${selLayers.length > 1 ? 'Selected Layers' : 'to Canvas'}</div>
        <div class="ccp-grid-6">
          <button type="button" class="ccp-btn" data-align="left" title="Align Left">⇤</button>
          <button type="button" class="ccp-btn" data-align="centerH" title="Align Center Horizontal">⇹</button>
          <button type="button" class="ccp-btn" data-align="right" title="Align Right">⇥</button>
          <button type="button" class="ccp-btn" data-align="top" title="Align Top">⤒</button>
          <button type="button" class="ccp-btn" data-align="centerV" title="Align Center Vertical">⇕</button>
          <button type="button" class="ccp-btn" data-align="bottom" title="Align Bottom">⤓</button>
        </div>
        <div class="ccp-section-lbl">Layer Stack Order</div>
        <div class="ccp-grid-4">
          <button type="button" class="ccp-btn" data-zorder="front">⬆ Front</button>
          <button type="button" class="ccp-btn" data-zorder="up">↑ Up</button>
          <button type="button" class="ccp-btn" data-zorder="down">↓ Down</button>
          <button type="button" class="ccp-btn" data-zorder="back">⬇ Back</button>
        </div>
        <div id="ccp-contextual-slot"></div>
      `;

      pop.querySelector('#ccp-close-btn').addEventListener('click', () => this.closeCanvasPopover());

      const applyNumericTransform = () => {
        const nx = Number(pop.querySelector('#ccp-x').value);
        const ny = Number(pop.querySelector('#ccp-y').value);
        const nw = Math.max(8, Number(pop.querySelector('#ccp-w').value) || wVal);
        const nh = Math.max(8, Number(pop.querySelector('#ccp-h').value) || hVal);
        const ndeg = Number(pop.querySelector('#ccp-deg').value) || 0;
        const nrad = (ndeg * Math.PI) / 180;
        const ncx = nx + nw / 2;
        const ncy = ny + nh / 2;

        if (selLayers.length === 1) {
          if (lyr.kind === 'raster' && !lyr.smartSource) doc.ensureSmartSource(lyr);
          if (lyr.smartSource?.canvas) {
            lyr.smartSource.cx = ncx;
            lyr.smartSource.cy = ncy;
            lyr.smartSource.w = nw;
            lyr.smartSource.h = nh;
            lyr.smartSource.rotation = nrad;
            doc.rasterizeSmartLayer(lyr);
          } else if (lyr.kind === 'shape' && lyr.shapeData) {
            lyr.shapeData.x = nx;
            lyr.shapeData.y = ny;
            lyr.shapeData.w = nw;
            lyr.shapeData.h = nh;
            lyr.shapeData.rotation = nrad;
            doc.rasterizeShapeLayer(lyr);
          } else if (lyr.kind === 'text' && lyr.textData) {
            const sc = nh / Math.max(1, bounds.h);
            lyr.textData.fontSize = Math.max(8, Math.min(600, Math.round((lyr.textData.fontSize || 48) * sc)));
            lyr.textData.x = ncx;
            lyr.textData.y = ncy;
            lyr.textData.rotation = nrad;
            doc.rasterizeTextLayer(lyr);
          }
        } else {
          // Multi-layer delta translation
          const dx = ncx - bounds.cx;
          const dy = ncy - bounds.cy;
          this.nudgeActiveLayer(dx, dy);
          return;
        }
        this._cachedTransformBounds = null;
        doc.pushHistory('Numeric Transform');
        this.session.notify('layer.transformed');
      };

      const wIn = pop.querySelector('#ccp-w');
      const hIn = pop.querySelector('#ccp-h');
      const ratio = wVal / Math.max(1, hVal);
      wIn.addEventListener('change', () => {
        if (this.transformLockAspect) hIn.value = String(Math.max(8, Math.round(Number(wIn.value) / ratio)));
        applyNumericTransform();
      });
      hIn.addEventListener('change', () => {
        if (this.transformLockAspect) wIn.value = String(Math.max(8, Math.round(Number(hIn.value) * ratio)));
        applyNumericTransform();
      });
      pop.querySelector('#ccp-x').addEventListener('change', applyNumericTransform);
      pop.querySelector('#ccp-y').addEventListener('change', applyNumericTransform);
      pop.querySelector('#ccp-deg').addEventListener('change', applyNumericTransform);

      pop.querySelector('#ccp-op').addEventListener('change', (e) => {
        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100;
        for (const sl of selLayers) sl.opacity = val;
        doc.pushHistory('Layer Opacity');
        this.session.notify('layer.opacity');
      });
      pop.querySelector('#ccp-blend').addEventListener('change', (e) => {
        for (const sl of selLayers) sl.blendMode = e.target.value;
        doc.pushHistory('Layer Blend Mode');
        this.session.notify('layer.blendMode');
      });

      pop.querySelector('#ccp-nudge-l').addEventListener('click', () => { this.nudgeActiveLayer(-this.nudgeStep, 0); renderBody(); });
      pop.querySelector('#ccp-nudge-r').addEventListener('click', () => { this.nudgeActiveLayer(this.nudgeStep, 0); renderBody(); });
      pop.querySelector('#ccp-nudge-u').addEventListener('click', () => { this.nudgeActiveLayer(0, -this.nudgeStep); renderBody(); });
      pop.querySelector('#ccp-nudge-d').addEventListener('click', () => { this.nudgeActiveLayer(0, this.nudgeStep); renderBody(); });
      pop.querySelector('#ccp-step-toggle').addEventListener('click', () => {
        this.nudgeStep = this.nudgeStep === 1 ? 10 : 1;
        renderBody();
      });

      pop.querySelectorAll('[data-align]').forEach((b) => {
        b.addEventListener('click', () => {
          this.session.dispatch('layer.align', { alignment: b.dataset.align });
          renderBody();
        });
      });

      pop.querySelectorAll('[data-zorder]').forEach((b) => {
        b.addEventListener('click', () => {
          this.session.dispatch('layer.reorder', { direction: b.dataset.zorder });
          this.showToast(`Moved Layer ${b.dataset.zorder}`);
          renderBody();
        });
      });

      // Contextual Shape / Text Direct Controls
      const slot = pop.querySelector('#ccp-contextual-slot');
      if (selLayers.length === 1 && lyr.kind === 'shape' && lyr.shapeData) {
        const sd = lyr.shapeData;
        slot.innerHTML = `
          <div class="ccp-section-lbl">Shape Properties</div>
          <div class="ccp-grid-4">
            <div class="ccp-num-field"><label>Fill</label><input type="color" id="ccp-sh-fill" value="${sd.fill && sd.fill.startsWith('#') ? sd.fill : '#378ef0'}" style="padding:1px;" /></div>
            <div class="ccp-num-field"><label>Stroke</label><input type="color" id="ccp-sh-stroke" value="${sd.stroke && sd.stroke.startsWith('#') ? sd.stroke : '#ffffff'}" style="padding:1px;" /></div>
            <div class="ccp-num-field"><label>Strk px</label><input type="number" id="ccp-sh-sw" min="0" max="40" value="${sd.strokeWidth ?? 3}" /></div>
            <div class="ccp-num-field"><label>Radius</label><input type="number" id="ccp-sh-rad" min="0" max="200" value="${sd.cornerRadius ?? 14}" /></div>
          </div>
        `;
        const syncShape = () => {
          sd.fill = slot.querySelector('#ccp-sh-fill').value;
          sd.stroke = slot.querySelector('#ccp-sh-stroke').value;
          sd.strokeWidth = Math.max(0, Number(slot.querySelector('#ccp-sh-sw').value) || 0);
          sd.cornerRadius = Math.max(0, Number(slot.querySelector('#ccp-sh-rad').value) || 0);
          doc.rasterizeShapeLayer(lyr);
          doc.pushHistory('Edit Shape Properties');
          this.session.notify('shape.updated');
        };
        slot.querySelectorAll('input').forEach((inp) => inp.addEventListener('change', syncShape));
      } else if (selLayers.length === 1 && lyr.kind === 'text' && lyr.textData) {
        slot.innerHTML = `<div style="margin-top:6px;"><button type="button" class="ccp-btn active" id="ccp-edit-text" style="width:100%;">✎ Edit Text Directly on Canvas</button></div>`;
        slot.querySelector('#ccp-edit-text').addEventListener('click', () => {
          this.closeCanvasPopover();
          this.selectTool('text');
          this.startInlineTextEdit(lyr, false);
        });
      }
    };

    renderBody();
    pop.hidden = false;
    this._canvasPopoverKind = 'precision';
  }

  /**
   * Universal Canvas Object Picker:
   * - Long-press anywhere on canvas -> shows EVERY layer stacked under that point (even hidden/covered ones!)
   * - Tap "📚 Pick" -> shows EVERY selectable object in the entire canvas (Layers + Masks + Slices)!
   */
  openCanvasObjectPicker(docX = null, docY = null) {
    const pop = document.getElementById('canvas-control-popover');
    const doc = this.session.doc;
    if (!pop || !doc) return;
    const isPointFilter = typeof docX === 'number' && typeof docY === 'number';
    if (!isPointFilter && !pop.hidden && this._canvasPopoverKind === 'picker') {
      this.closeCanvasPopover();
      return;
    }

    const renderPicker = () => {
      const selectedIds = new Set(doc.getSelectedLayers().map((l) => l.id));
      const items = [];
      for (let i = doc.layers.length - 1; i >= 0; i--) {
        const lyr = doc.layers[i];
        let atPoint = !isPointFilter;
        if (isPointFilter) {
          if (lyr.kind === 'adjustment') {
            atPoint = true;
          } else {
            const b = doc.getLayerTransformBounds(lyr);
            if (b) {
              const cos = Math.cos(b.rotation || 0);
              const sin = Math.sin(b.rotation || 0);
              const dx = docX - b.cx;
              const dy = docY - b.cy;
              const lx = dx * cos + dy * sin;
              const ly = -dx * sin + dy * cos;
              if (Math.abs(lx) <= b.w / 2 + 12 && Math.abs(ly) <= b.h / 2 + 12) atPoint = true;
            }
          }
        }
        if (atPoint) items.push(lyr);
      }
      // If point filter found nothing, show all layers so user always has complete access
      const displayLayers = items.length > 0 ? items : [...doc.layers].reverse();

      pop.classList.remove('top-right-anchor');
      pop.innerHTML = `
        <div class="ccp-header">
          <span class="ccp-title">📚 ${isPointFilter ? 'Objects Under Tap' : 'Select Anything in Canvas'} (${displayLayers.length})</span>
          <div style="display:flex;gap:4px;">
            <button type="button" class="ccp-btn ${this.moveMultiSelect ? 'active' : ''}" id="ccp-pk-multi" style="height:22px;">${this.moveMultiSelect ? '☑ Multi' : '☐ Multi'}</button>
            <button type="button" class="ccp-btn" id="ccp-pk-close" style="height:22px;padding:0 7px;">✕</button>
          </div>
        </div>
        <div id="ccp-pk-list"></div>
      `;

      pop.querySelector('#ccp-pk-close').addEventListener('click', () => this.closeCanvasPopover());
      pop.querySelector('#ccp-pk-multi').addEventListener('click', () => {
        this.moveMultiSelect = !this.moveMultiSelect;
        this.renderToolOptionsStrip();
        renderPicker();
      });

      const list = pop.querySelector('#ccp-pk-list');
      for (const lyr of displayLayers) {
        const isSel = selectedIds.has(lyr.id);
        const row = document.createElement('div');
        row.className = `ccp-pick-item${isSel ? ' selected' : ''}`;
        row.dataset.pickLayerId = lyr.id;

        const kindIcon = lyr.kind === 'text' ? 'T' : lyr.kind === 'shape' ? '▢' : lyr.kind === 'adjustment' ? '◐' : lyr.smartSource ? '🖼️' : '🎨';
        const thumbUrl = lyr.kind !== 'adjustment' ? this.renderMiniLayerThumb(lyr) : '';
        row.innerHTML = `
          ${thumbUrl ? `<img class="ccp-pick-thumb" src="${thumbUrl}" alt="" />` : `<div class="ccp-pick-thumb" style="display:flex;align-items:center;justify-content:center;font-size:13px;">${kindIcon}</div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${kindIcon} ${lyr.name}</div>
            <div style="font-size:9.5px;color:var(--pc-text-dim);">${Math.round((lyr.opacity ?? 1) * 100)}% · ${lyr.visible ? 'Visible' : 'Hidden'}${lyr.locked ? ' · Locked' : ''}${lyr.maskCanvas ? ' · Mask' : ''}</div>
          </div>
          <button type="button" class="ccp-btn" data-act="selshape" title="Load Shape as Smart Selection" style="height:24px;padding:0 5px;">🎯</button>
          <button type="button" class="ccp-btn" data-act="vis" title="Toggle Visibility" style="height:24px;padding:0 5px;">${lyr.visible ? '👁' : '🚫'}</button>
          <button type="button" class="ccp-btn" data-act="lock" title="Toggle Lock" style="height:24px;padding:0 5px;">${lyr.locked ? '🔒' : '🔓'}</button>
        `;

        row.addEventListener('click', (e) => {
          const actBtn = e.target.closest('[data-act]');
          if (actBtn) {
            e.stopPropagation();
            const act = actBtn.dataset.act;
            if (act === 'vis') {
              lyr.visible = !lyr.visible;
              doc.compose();
              this.session.notify('layer.visibility');
              renderPicker();
            } else if (act === 'lock') {
              lyr.locked = !lyr.locked;
              this.session.notify('layer.lock');
              renderPicker();
            } else if (act === 'selshape') {
              doc.selectLayerTransparency(lyr, this.selectCombineMode);
              this.session.notify('selection.fromLayer');
              this.closeCanvasPopover();
              this.showToast(`Selected "${lyr.name}" Pixels`);
            }
            return;
          }

          if (this.moveMultiSelect) {
            doc.toggleLayerSelection(lyr.id);
          } else {
            doc.activeLayerId = lyr.id;
            doc.setSelectedLayerIds([lyr.id]);
          }
          doc.editingMask = false;
          this._cachedTransformBounds = null;
          this.syncHeaderAndHUD();
          this.renderFloatingContextBar();
          if (this.rightLayersOpen) this.renderRightLayersDrawer();
          this.requestRender();
          if (!this.moveMultiSelect) {
            this.closeCanvasPopover();
            this.showToast(`Selected "${lyr.name}"`);
          } else {
            renderPicker();
          }
        });
        list.appendChild(row);
      }

      // Also list Slices if present so literally everything in canvas is selectable!
      if (doc.slices && doc.slices.length > 0) {
        const sLbl = document.createElement('div');
        sLbl.className = 'ccp-section-lbl';
        sLbl.textContent = `Canvas Slices (${doc.slices.length})`;
        list.appendChild(sLbl);
        for (const sl of doc.slices) {
          const sBtn = document.createElement('button');
          sBtn.type = 'button';
          sBtn.className = `ccp-pick-item${doc.selectedSliceId === sl.id ? ' selected' : ''}`;
          sBtn.innerHTML = `<span style="font-weight:700;">⊞ ${sl.name || 'Slice'}</span><span style="margin-left:auto;font-size:10px;color:var(--pc-text-dim);">${sl.w}×${sl.h}</span>`;
          sBtn.addEventListener('click', () => {
            doc.selectedSliceId = sl.id;
            this.selectTool('sliceSelect');
            this.closeCanvasPopover();
          });
          list.appendChild(sBtn);
        }
      }
    };

    renderPicker();
    pop.hidden = false;
    this._canvasPopoverKind = 'picker';
  }

  renderMiniLayerThumb(layer) {
    try {
      const c = document.createElement('canvas');
      c.width = 36;
      c.height = 36;
      const ctx = c.getContext('2d');
      const src = layer.smartSource?.canvas || layer.canvas;
      if (!src) return '';
      const scale = Math.min(36 / Math.max(1, src.width), 36 / Math.max(1, src.height));
      const dw = src.width * scale;
      const dh = src.height * scale;
      ctx.drawImage(src, (36 - dw) / 2, (36 - dh) / 2, dw, dh);
      return c.toDataURL('image/png');
    } catch (_) {
      return '';
    }
  }

  /**
   * Smart Selection Refine Edge Popover (Expand, Contract, Feather, Smooth, Border, Invert, Load Layer)
   */
  openSelectionRefinePopover() {
    const pop = document.getElementById('canvas-control-popover');
    const doc = this.session.doc;
    if (!pop || !doc) return;
    if (!pop.hidden && this._canvasPopoverKind === 'refine') {
      this.closeCanvasPopover();
      return;
    }

    let radius = 6;
    pop.classList.remove('top-right-anchor');
    pop.innerHTML = `
      <div class="ccp-header">
        <span class="ccp-title">⚙ Refine Smart Selection</span>
        <button type="button" class="ccp-btn" id="ccp-ref-close" style="height:22px;padding:0 7px;">✕</button>
      </div>
      <div id="ccp-ref-slider"></div>
      <div class="ccp-grid-3" style="margin-top:6px;">
        <button type="button" class="ccp-btn" data-mod="expand">⤢ Expand</button>
        <button type="button" class="ccp-btn" data-mod="contract">⤡ Contract</button>
        <button type="button" class="ccp-btn" data-mod="feather">☁️ Feather</button>
        <button type="button" class="ccp-btn" data-mod="smooth">〰 Smooth</button>
        <button type="button" class="ccp-btn" data-mod="border">▢ Border</button>
        <button type="button" class="ccp-btn" id="ccp-ref-inv">⇄ Invert</button>
      </div>
    `;
    this.appendRangeRow(pop.querySelector('#ccp-ref-slider'), 'Refine Radius', 1, 30, 1, radius, 'px', (v) => {
      radius = v;
    });
    pop.querySelector('#ccp-ref-close').addEventListener('click', () => this.closeCanvasPopover());
    pop.querySelector('#ccp-ref-inv').addEventListener('click', () => {
      this.session.dispatch('selection.invert');
      this.showToast('Inverted Selection');
    });
    pop.querySelectorAll('[data-mod]').forEach((b) => {
      b.addEventListener('click', () => {
        const op = b.dataset.mod;
        this.session.dispatch('selection.modify', { op, radius });
        this.showToast(`Selection ${op} (${radius}px)`);
      });
    });

    pop.hidden = false;
    this._canvasPopoverKind = 'refine';
  }

  /**
   * Top-Right Zoom, Grid, Pixel Rulers & Smart Guides Control Popover (triggered by 31% Zoom HUD badge)
   */
  openViewControlsPopover() {
    const pop = document.getElementById('canvas-control-popover');
    if (!pop) return;
    if (!pop.hidden && this._canvasPopoverKind === 'view') {
      this.closeCanvasPopover();
      return;
    }

    const renderView = () => {
      pop.classList.add('top-right-anchor');
      pop.innerHTML = `
        <div class="ccp-header">
          <span class="ccp-title">🔍 View &amp; Guides (${Math.round(this.zoom * 100)}%)</span>
          <button type="button" class="ccp-btn" id="ccp-vw-close" style="height:22px;padding:0 6px;">✕</button>
        </div>
        <div class="ccp-grid-4">
          <button type="button" class="ccp-btn" id="ccp-z-fit">Fit</button>
          <button type="button" class="ccp-btn" id="ccp-z-50">50%</button>
          <button type="button" class="ccp-btn" id="ccp-z-100">100%</button>
          <button type="button" class="ccp-btn" id="ccp-z-200">200%</button>
        </div>
        <div class="ccp-grid-3">
          <button type="button" class="ccp-btn" id="ccp-z-out">− Zoom</button>
          <button type="button" class="ccp-btn" id="ccp-z-in">+ Zoom</button>
          <button type="button" class="ccp-btn" id="ccp-z-pick">📚 Pick</button>
        </div>
        <div class="ccp-section-lbl">Canvas Overlays</div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          <button type="button" class="ccp-btn ${this.showCanvasGrid ? 'active' : ''}" id="ccp-tg-grid" style="justify-content:flex-start;">${this.showCanvasGrid ? '☑' : '☐'} Alignment Grid</button>
          <button type="button" class="ccp-btn ${this.showRulers ? 'active' : ''}" id="ccp-tg-rulers" style="justify-content:flex-start;">${this.showRulers ? '☑' : '☐'} Pixel Rulers (px)</button>
          <button type="button" class="ccp-btn ${this.enableSmartGuides ? 'active' : ''}" id="ccp-tg-guides" style="justify-content:flex-start;">${this.enableSmartGuides ? '☑' : '☐'} Smart Snapping Guides</button>
        </div>
      `;

      pop.querySelector('#ccp-vw-close').addEventListener('click', () => this.closeCanvasPopover());
      pop.querySelector('#ccp-z-fit').addEventListener('click', () => { this.fitCanvasToViewport(); renderView(); });
      const setCenteredZoom = (z) => {
        const doc = this.session.doc;
        if (!doc) return;
        const rect = this.workspaceEl.getBoundingClientRect();
        this.zoom = Math.max(0.15, Math.min(16, z));
        this.panX = (rect.width - doc.width * this.zoom) / 2;
        this.panY = (rect.height - doc.height * this.zoom) / 2;
        this.syncHeaderAndHUD();
        this.requestRender();
        renderView();
      };
      pop.querySelector('#ccp-z-50').addEventListener('click', () => setCenteredZoom(0.5));
      pop.querySelector('#ccp-z-100').addEventListener('click', () => setCenteredZoom(1.0));
      pop.querySelector('#ccp-z-200').addEventListener('click', () => setCenteredZoom(2.0));
      pop.querySelector('#ccp-z-out').addEventListener('click', () => setCenteredZoom(this.zoom * 0.8));
      pop.querySelector('#ccp-z-in').addEventListener('click', () => setCenteredZoom(this.zoom * 1.25));
      pop.querySelector('#ccp-z-pick').addEventListener('click', () => this.openCanvasObjectPicker(null, null));
      pop.querySelector('#ccp-tg-grid').addEventListener('click', () => {
        this.showCanvasGrid = !this.showCanvasGrid;
        this.requestRender();
        renderView();
      });
      pop.querySelector('#ccp-tg-rulers').addEventListener('click', () => {
        this.showRulers = !this.showRulers;
        this.syncBrushPillVisibility();
        this.requestRender();
        renderView();
      });
      pop.querySelector('#ccp-tg-guides').addEventListener('click', () => {
        this.enableSmartGuides = !this.enableSmartGuides;
        renderView();
      });
    };

    renderView();
    pop.hidden = false;
    this._canvasPopoverKind = 'view';
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
        if (this._longPressTimer) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;
        }
        if (this.toolDrag?.type === 'move') {
          const drag = this.toolDrag;
          drag.targetCanvas.getContext('2d').clearRect(0, 0, drag.targetCanvas.width, drag.targetCanvas.height);
          drag.targetCanvas.getContext('2d').drawImage(drag.snapCanvas, 0, 0);
          this.session.doc?.endFastInteraction();
        } else if (this.toolDrag?.type === 'transform') {
          const drag = this.toolDrag;
          if (this.session.doc && Array.isArray(drag.targetSnapshots)) {
            for (const snap of drag.targetSnapshots) {
              const lyr = snap.layer;
              if (!lyr) continue;
              if (snap.origSmart && lyr.smartSource) {
                Object.assign(lyr.smartSource, snap.origSmart);
                this.session.doc.rasterizeSmartLayer(lyr);
              } else if (snap.origText && lyr.textData) {
                Object.assign(lyr.textData, snap.origText);
                this.session.doc.rasterizeTextLayer(lyr);
              } else if (snap.origShape && lyr.shapeData) {
                Object.assign(lyr.shapeData, snap.origShape);
                this.session.doc.rasterizeShapeLayer(lyr);
              }
            }
          }
          this.activeSmartGuides = [];
          this._cachedTransformBounds = null;
          this.session.doc?.endFastInteraction();
        } else if (this.toolDrag?.type === 'crop' && this.toolDrag.origBox) {
          this.cropBox = { ...this.toolDrag.origBox };
          if (typeof this.toolDrag.origCropAngle === 'number') {
            this.cropAngle = this.toolDrag.origCropAngle;
            const angSlider = document.getElementById('crop-angle-slider');
            const angLbl = document.getElementById('crop-angle-lbl');
            if (angSlider) angSlider.value = String(this.cropAngle);
            if (angLbl) angLbl.textContent = `∠ ${this.cropAngle.toFixed(1)}°`;
          }
        } else if (this.toolDrag?.type === 'perspectiveCrop' && this.toolDrag.origQuad) {
          this.perspectiveQuad = this.toolDrag.origQuad.map((p) => ({ ...p }));
        }
        if (
          this.inlineTextSession?.isNew &&
          !this.inlineTextSession.typed &&
          performance.now() - (this.inlineTextSession.startedAt || 0) < 320
        ) {
          this.cancelInlineTextEdit();
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

  /* ---- Geometry & Hit-Test Helpers for Transform, Auto-Select, Crop & Perspective ---- */
  isPointInPolygon(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = (yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  distToSegment(pt, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-6) return Math.hypot(pt.x - a.x, pt.y - a.y);
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
    return Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy));
  }

  hitTestTransformHandles(pt, bounds) {
    if (!bounds) return null;
    const { cx, cy, w, h, rotation } = bounds;
    const cos = Math.cos(rotation || 0);
    const sin = Math.sin(rotation || 0);
    // Transform doc point into local rotated box coordinates
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;

    const hw = w / 2;
    const hh = h / 2;
    const hr = Math.max(12, 24 / this.zoom);
    const rotStem = Math.max(22, 34 / this.zoom);

    // 1. Top rotation lollipop handle (0, -hh - rotStem)
    if (Math.hypot(lx, ly - (-hh - rotStem)) <= hr * 1.15) {
      return { mode: 'rotate', sx: 0, sy: 0 };
    }

    // 2. 4 corner handles
    const corners = [
      { mode: 'nw', x: -hw, y: -hh, sx: -1, sy: -1 },
      { mode: 'ne', x: hw, y: -hh, sx: 1, sy: -1 },
      { mode: 'se', x: hw, y: hh, sx: 1, sy: 1 },
      { mode: 'sw', x: -hw, y: hh, sx: -1, sy: 1 }
    ];
    for (const c of corners) {
      if (Math.hypot(lx - c.x, ly - c.y) <= hr) return { mode: c.mode, sx: c.sx, sy: c.sy };
    }

    // 3. 4 side midpoint handles
    const edges = [
      { mode: 'n', x: 0, y: -hh, sx: 0, sy: -1 },
      { mode: 's', x: 0, y: hh, sx: 0, sy: 1 },
      { mode: 'w', x: -hw, y: 0, sx: -1, sy: 0 },
      { mode: 'e', x: hw, y: 0, sx: 1, sy: 0 }
    ];
    for (const ed of edges) {
      if (Math.hypot(lx - ed.x, ly - ed.y) <= hr) return { mode: ed.mode, sx: ed.sx, sy: ed.sy };
    }

    // 4. Inside bounding box
    if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) {
      return { mode: 'inside', sx: 0, sy: 0 };
    }

    // 5. Just outside a corner -> rotate (Photoshop outside-corner rotate!)
    const outerR = Math.max(22, 42 / this.zoom);
    for (const c of corners) {
      const d = Math.hypot(lx - c.x, ly - c.y);
      if (d > hr && d <= outerR) return { mode: 'outerRotate', sx: 0, sy: 0 };
    }

    return null;
  }

  hitTestLayerAtPoint(docX, docY) {
    const doc = this.session.doc;
    if (!doc) return null;
    const ix = Math.round(docX);
    const iy = Math.round(docY);
    const inDoc = ix >= 0 && iy >= 0 && ix < doc.width && iy < doc.height;

    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const lyr = doc.layers[i];
      if (!lyr.visible || lyr.locked || lyr.kind === 'adjustment') continue;

      if (lyr.kind === 'text' || lyr.kind === 'shape' || lyr.smartSource?.canvas) {
        const b = doc.getLayerTransformBounds(lyr);
        if (b) {
          const cos = Math.cos(b.rotation || 0);
          const sin = Math.sin(b.rotation || 0);
          const dx = docX - b.cx;
          const dy = docY - b.cy;
          const lx = dx * cos + dy * sin;
          const ly = -dx * sin + dy * cos;
          if (Math.abs(lx) <= b.w / 2 + 4 && Math.abs(ly) <= b.h / 2 + 4) {
            // For smartSource images, verify pixel isn't fully transparent if inside canvas
            if (lyr.smartSource?.canvas && inDoc) {
              const alpha = lyr.canvas.getContext('2d').getImageData(ix, iy, 1, 1).data[3];
              if (alpha > 10) return lyr;
            } else {
              return lyr;
            }
          }
        }
      } else if (inDoc) {
        const alpha = lyr.canvas.getContext('2d').getImageData(ix, iy, 1, 1).data[3];
        if (alpha > 12) return lyr;
      }
    }
    return null;
  }

  showCornerLoupe(docX, docY, clientX, clientY, label) {
    const doc = this.session.doc;
    if (!doc) return;
    const ix = Math.max(0, Math.min(doc.width - 1, Math.round(docX)));
    const iy = Math.max(0, Math.min(doc.height - 1, Math.round(docY)));
    const loupe = document.getElementById('pixel-loupe');
    const lCanvas = document.getElementById('pixel-loupe-canvas');
    if (!loupe || !lCanvas) return;
    const lCtx = lCanvas.getContext('2d');
    const wsRect = this.workspaceEl.getBoundingClientRect();
    loupe.hidden = false;
    loupe.style.left = `${clientX - wsRect.left}px`;
    loupe.style.top = `${clientY - wsRect.top}px`;

    lCtx.imageSmoothingEnabled = false;
    lCtx.fillStyle = '#181818';
    lCtx.fillRect(0, 0, 66, 66);
    lCtx.drawImage(doc.compositeCanvas, ix - 8, iy - 8, 17, 17, 0, 0, 66, 66);

    lCtx.strokeStyle = '#38b5ff';
    lCtx.lineWidth = 1.5;
    lCtx.beginPath();
    lCtx.moveTo(33, 0);
    lCtx.lineTo(33, 66);
    lCtx.moveTo(0, 33);
    lCtx.lineTo(66, 33);
    lCtx.stroke();
    document.getElementById('pixel-loupe-hex').textContent = `${label} ${ix},${iy}`;
  }

  handleSinglePointerDown(e) {
    const doc = this.session.doc;
    if (!doc) return;
    const pt = this.screenToDoc(e.clientX, e.clientY);
    let layer = doc.activeLayer;

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
      const hitLayer = this.hitTestTextLayer(pt.x, pt.y);
      if (this.inlineTextSession) {
        const wasSame = hitLayer && hitLayer.id === this.inlineTextSession.layer.id;
        if (wasSame) return;
        this.commitInlineTextEdit();
        if (hitLayer) {
          this.startInlineTextEdit(hitLayer, false);
        }
        return;
      }

      if (hitLayer) {
        this.startInlineTextEdit(hitLayer, false);
        return;
      }

      // Click anywhere on canvas -> immediately create live text layer with pre-selected "Lorem Ipsum" and start typing!
      const ts = this.typeSettings;
      const newLayer = doc.createLayerObject({
        name: 'Lorem Ipsum',
        kind: 'text',
        textData: {
          text: 'Lorem Ipsum',
          fontFamily: ts.fontFamily || 'Impact, sans-serif',
          fontSize: ts.fontSize || 72,
          fontWeight: ts.fontWeight || '400',
          italic: Boolean(ts.italic),
          antiAlias: ts.antiAlias || 'sharp',
          color: ts.color || '#111827',
          align: ts.align || 'center',
          lineHeight: ts.lineHeight || 1.2,
          tracking: ts.tracking || 0,
          orientation: ts.orientation || 'horizontal',
          warp: ts.warp || 'none',
          warpBend: ts.warpBend ?? 35,
          strokeWidth: ts.strokeWidth || 0,
          strokeColor: ts.strokeColor || '#000000',
          x: Math.round(pt.x),
          y: Math.round(pt.y),
          rotation: 0,
          flipX: false,
          flipY: false
        }
      });
      doc.layers.push(newLayer);
      doc.activeLayerId = newLayer.id;
      this.startInlineTextEdit(newLayer, true);
      return;
    }

    // ---- Photoshop 8-Handle Crop Tool + Outside Straighten Rotation + Double-Tap Commit ----
    if (this.activeTool === 'crop' && this.cropBox) {
      const cb = this.cropBox;
      const hr = Math.max(14, 26 / this.zoom);
      let mode = 'rotate';

      if (Math.hypot(pt.x - cb.x, pt.y - cb.y) < hr) mode = 'nw';
      else if (Math.hypot(pt.x - (cb.x + cb.w), pt.y - cb.y) < hr) mode = 'ne';
      else if (Math.hypot(pt.x - cb.x, pt.y - (cb.y + cb.h)) < hr) mode = 'sw';
      else if (Math.hypot(pt.x - (cb.x + cb.w), pt.y - (cb.y + cb.h)) < hr) mode = 'se';
      else if (Math.abs(pt.y - cb.y) < hr && pt.x >= cb.x && pt.x <= cb.x + cb.w) mode = 'n';
      else if (Math.abs(pt.y - (cb.y + cb.h)) < hr && pt.x >= cb.x && pt.x <= cb.x + cb.w) mode = 's';
      else if (Math.abs(pt.x - cb.x) < hr && pt.y >= cb.y && pt.y <= cb.y + cb.h) mode = 'w';
      else if (Math.abs(pt.x - (cb.x + cb.w)) < hr && pt.y >= cb.y && pt.y <= cb.y + cb.h) mode = 'e';
      else if (pt.x >= cb.x && pt.x <= cb.x + cb.w && pt.y >= cb.y && pt.y <= cb.y + cb.h) {
        // Double-tap inside crop box commits crop (exact Photoshop UX!)
        const now = performance.now();
        if (
          this._lastCropTap &&
          now - this._lastCropTap.time < 320 &&
          Math.hypot(pt.x - this._lastCropTap.x, pt.y - this._lastCropTap.y) < 28 / this.zoom
        ) {
          this._lastCropTap = null;
          this.commitCropAction();
          return;
        }
        this._lastCropTap = { time: now, x: pt.x, y: pt.y };
        mode = 'move';
      }

      const cx = cb.x + cb.w / 2;
      const cy = cb.y + cb.h / 2;
      this.toolDrag = {
        type: 'crop',
        mode,
        startX: pt.x,
        startY: pt.y,
        origBox: { ...cb },
        origCropAngle: this.cropAngle,
        startAngle: Math.atan2(pt.y - cy, pt.x - cx)
      };
      return;
    }

    // ---- Photoshop Perspective Crop: Corners (+ Loupe), Edges, Inside Move, Outside Fresh Draw ----
    if (this.activeTool === 'perspectiveCrop' && this.perspectiveQuad) {
      const q = this.perspectiveQuad;
      const handleRadius = Math.max(16, 30 / this.zoom);
      let cornerIdx = -1;
      let minDist = handleRadius;
      for (let i = 0; i < 4; i++) {
        const d = Math.hypot(pt.x - q[i].x, pt.y - q[i].y);
        if (d < minDist) {
          minDist = d;
          cornerIdx = i;
        }
      }

      if (cornerIdx >= 0) {
        const labels = ['TL', 'TR', 'BR', 'BL'];
        this.showCornerLoupe(q[cornerIdx].x, q[cornerIdx].y, e.clientX, e.clientY, labels[cornerIdx]);
        this.toolDrag = {
          type: 'perspectiveCrop',
          mode: 'corner',
          cornerIdx,
          startX: pt.x,
          startY: pt.y,
          origQuad: q.map((p) => ({ ...p }))
        };
        return;
      }

      // Check 4 edges for parallel edge adjustment
      const edgeRadius = Math.max(12, 18 / this.zoom);
      let edgeIdx = -1;
      let minEdgeDist = edgeRadius;
      for (let i = 0; i < 4; i++) {
        const d = this.distToSegment(pt, q[i], q[(i + 1) % 4]);
        if (d < minEdgeDist) {
          minEdgeDist = d;
          edgeIdx = i;
        }
      }
      if (edgeIdx >= 0) {
        this.toolDrag = {
          type: 'perspectiveCrop',
          mode: 'edge',
          edgeIdx,
          startX: pt.x,
          startY: pt.y,
          origQuad: q.map((p) => ({ ...p }))
        };
        return;
      }

      if (this.isPointInPolygon(pt, q)) {
        this.toolDrag = {
          type: 'perspectiveCrop',
          mode: 'move',
          startX: pt.x,
          startY: pt.y,
          origQuad: q.map((p) => ({ ...p }))
        };
        return;
      }

      // Dragging outside the quad draws a fresh perspective crop box!
      this.toolDrag = {
        type: 'perspectiveCrop',
        mode: 'draw',
        startX: pt.x,
        startY: pt.y,
        origQuad: q.map((p) => ({ ...p }))
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

    // ---- Photoshop 8-Handle Slice Select Tool ----
    if (this.activeTool === 'sliceSelect') {
      const hr = Math.max(12, 22 / this.zoom);
      const sel = doc.selectedSlice;
      if (sel) {
        const handles = [
          { mode: 'nw', x: sel.x, y: sel.y },
          { mode: 'n', x: sel.x + sel.w / 2, y: sel.y },
          { mode: 'ne', x: sel.x + sel.w, y: sel.y },
          { mode: 'e', x: sel.x + sel.w, y: sel.y + sel.h / 2 },
          { mode: 'se', x: sel.x + sel.w, y: sel.y + sel.h },
          { mode: 's', x: sel.x + sel.w / 2, y: sel.y + sel.h },
          { mode: 'sw', x: sel.x, y: sel.y + sel.h },
          { mode: 'w', x: sel.x, y: sel.y + sel.h / 2 }
        ];
        for (const h of handles) {
          if (Math.hypot(pt.x - h.x, pt.y - h.y) < hr) {
            this.toolDrag = {
              type: 'sliceEdit',
              mode: h.mode,
              slice: sel,
              startX: pt.x,
              startY: pt.y,
              origRect: { x: sel.x, y: sel.y, w: sel.w, h: sel.h }
            };
            return;
          }
        }
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
        doc.selectMagicWand(pt.x, pt.y, this.wandTolerance, {
          contiguous: this.selectContiguous,
          sampleAllLayers: this.selectSampleAll,
          combineMode: this.selectCombineMode
        });
        this.session.notify('selection.wand');
        this.showToast('Magic Wand Selection');
        return;
      }
      if (this.selectMode === 'colorRange') {
        doc.selectColorRange(pt.x, pt.y, {
          fuzziness: this.wandTolerance,
          combineMode: this.selectCombineMode,
          sampleAllLayers: this.selectSampleAll
        });
        this.session.notify('selection.colorRange');
        this.showToast('Color Range Selected');
        return;
      }
      if (this.selectMode === 'quickSelect') {
        const effMode =
          this.selectCombineMode === 'subtract'
            ? 'subtract'
            : this.selectCombineMode === 'intersect'
            ? 'intersect'
            : this.selectCombineMode === 'replace' && !doc.hasSelection
            ? 'replace'
            : this.selectCombineMode === 'replace'
            ? 'replace'
            : 'add';
        this.toolDrag = {
          type: 'select',
          mode: 'quickSelect',
          combineMode: effMode,
          startX: pt.x,
          startY: pt.y,
          currX: pt.x,
          currY: pt.y,
          points: [{ x: pt.x, y: pt.y }],
          lastLiveAt: performance.now()
        };
        doc.applyQuickSelectBrush([{ x: pt.x, y: pt.y }], {
          radius: this.quickSelectRadius,
          tolerance: this.wandTolerance,
          combineMode: effMode,
          sampleAllLayers: this.selectSampleAll
        });
        this.requestRender();
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

    // ---- Photoshop Move, Universal Canvas Selection & Interactive Multi-Layer Free Transform ----
    if (this.activeTool === 'move') {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }

      // Mask moving stays fast pixel-shift on maskCanvas
      if (layer && !layer.locked && doc.editingMask && layer.maskCanvas) {
        doc.beginFastInteraction();
        const targetCanvas = layer.maskCanvas;
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
          snapCanvas: snap
        };
        return;
      }

      // 1. Always hit-test active/combined selection handles FIRST so scaling/rotating never switches layers
      let activeBounds = this.getActiveTransformBounds();
      let handleHit = activeBounds ? this.hitTestTransformHandles(pt, activeBounds) : null;
      let mode = 'move';
      let sx = 0;
      let sy = 0;

      let pendingDeselectId = null;
      const isMultiDown = this.moveMultiSelect || Boolean(e.shiftKey);

      // Double-tap anywhere on an active Text layer in Move mode -> jump straight into live on-canvas text editing!
      // Checked before edge-handle hit-testing because compact text boxes on mobile overlap top/bottom handles.
      if (
        !isMultiDown &&
        layer &&
        layer.kind === 'text' &&
        layer.textData &&
        this._lastMoveTextTap &&
        this._lastMoveTextTap.layerId === layer.id &&
        performance.now() - this._lastMoveTextTap.time < 450 &&
        Math.hypot(e.clientX - this._lastMoveTextTap.clientX, e.clientY - this._lastMoveTextTap.clientY) < 28
      ) {
        this._lastMoveTextTap = null;
        this.selectTool('text');
        this.startInlineTextEdit(layer, false);
        return;
      }

      if (handleHit && handleHit.mode !== 'inside' && handleHit.mode !== 'outerRotate') {
        mode = handleHit.mode; // 'rotate' or one of 'nw,n,ne,e,se,s,sw,w'
        sx = handleHit.sx;
        sy = handleHit.sy;
        if (!isMultiDown && layer && layer.kind === 'text' && layer.textData) {
          this._lastMoveTextTap = { layerId: layer.id, time: performance.now(), clientX: e.clientX, clientY: e.clientY };
        }
      } else {
        // 2. Auto-Select or Multi-Select layer under finger
        let switchedLayer = false;
        const isMulti = isMultiDown;
        const autoHit = this.moveAutoSelect || isMulti ? this.hitTestLayerAtPoint(pt.x, pt.y) : null;
        const isBottomBg =
          autoHit &&
          doc.layers.indexOf(autoHit) === 0 &&
          !autoHit.smartSource &&
          autoHit.kind === 'raster' &&
          /background/i.test(autoHit.name);

        // If Multi-Sel is ON and user drags from empty space / background outside active group -> Canvas Marquee Multi-Layer Select!
        if (isMulti && (!autoHit || isBottomBg) && (!handleHit || handleHit.mode !== 'inside')) {
          this.toolDrag = {
            type: 'layerMarquee',
            startX: pt.x,
            startY: pt.y,
            currX: pt.x,
            currY: pt.y
          };
          return;
        }

        if (autoHit) {
          if (isMulti) {
            if (!isBottomBg) {
              const alreadySelected = doc.getSelectedLayers().some((l) => l.id === autoHit.id);
              if (alreadySelected) {
                // Keep in group during drag; only deselect on quick tap-up without movement
                pendingDeselectId = autoHit.id;
              } else {
                doc.toggleLayerSelection(autoHit.id);
                doc.editingMask = false;
                this._cachedTransformBounds = null;
                layer = doc.activeLayer;
                activeBounds = this.getActiveTransformBounds();
                switchedLayer = true;
                this.syncHeaderAndHUD();
                this.renderFloatingContextBar();
                if (this.rightLayersOpen) this.renderRightLayersDrawer();
                this.requestRender();
              }
            }
          } else if (autoHit.id !== doc.activeLayerId || doc.getSelectedLayers().length > 1) {
            doc.activeLayerId = autoHit.id;
            doc.setSelectedLayerIds([autoHit.id]);
            doc.editingMask = false;
            this._cachedTransformBounds = null;
            layer = autoHit;
            activeBounds = this.getActiveTransformBounds();
            handleHit = activeBounds ? this.hitTestTransformHandles(pt, activeBounds) : null;
            switchedLayer = true;
            this.syncHeaderAndHUD();
            this.renderFloatingContextBar();
            if (this.rightLayersOpen) this.renderRightLayersDrawer();
            this.requestRender();
          }
        }

        if (!isMulti && layer && layer.kind === 'text' && layer.textData && (switchedLayer || handleHit?.mode === 'inside')) {
          this._lastMoveTextTap = { layerId: layer.id, time: performance.now(), clientX: e.clientX, clientY: e.clientY };
        } else {
          this._lastMoveTextTap = null;
        }

        // 3. Outside-corner rotation if we stayed on the active layer
        if (!switchedLayer && handleHit && handleHit.mode === 'outerRotate') {
          mode = 'rotate';
        } else {
          mode = 'move';
        }
      }

      const targets = doc.getSelectedLayers().filter((l) => l && !l.locked && l.kind !== 'adjustment');
      if (targets.length === 0) {
        if (!layer || layer.locked) this.showToast('Active layer is locked');
        else this.showToast('Select a pixel, image, type, or shape layer to move or scale');
        return;
      }

      // Promote raster targets to non-destructive Smart Source so moving/scaling NEVER clips or blurs!
      for (const tLyr of targets) {
        if (tLyr.kind === 'raster') {
          doc.ensureSmartSource(tLyr);
        }
      }

      activeBounds = this.getActiveTransformBounds();
      if (!activeBounds) return;

      doc.beginFastInteraction();
      const targetSnapshots = targets.map((tLyr) => ({
        layer: tLyr,
        bounds: doc.getLayerTransformBounds(tLyr),
        origSmart: tLyr.smartSource
          ? {
              cx: tLyr.smartSource.cx,
              cy: tLyr.smartSource.cy,
              w: tLyr.smartSource.w,
              h: tLyr.smartSource.h,
              rotation: tLyr.smartSource.rotation || 0,
              flipX: Boolean(tLyr.smartSource.flipX),
              flipY: Boolean(tLyr.smartSource.flipY)
            }
          : null,
        origText: tLyr.textData ? structuredClone(tLyr.textData) : null,
        origShape: tLyr.shapeData ? structuredClone(tLyr.shapeData) : null
      }));

      this.toolDrag = {
        type: 'transform',
        mode,
        sx,
        sy,
        layer: targets[targets.length - 1],
        targets,
        targetSnapshots,
        origSmart: targetSnapshots[0]?.origSmart || null,
        origText: targetSnapshots[0]?.origText || null,
        origShape: targetSnapshots[0]?.origShape || null,
        startX: pt.x,
        startY: pt.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origBounds: { ...activeBounds },
        startAngle: Math.atan2(pt.y - activeBounds.cy, pt.x - activeBounds.cx),
        pendingDeselectId,
        changed: false
      };

      // Long-press (450ms without moving) -> open "Objects Under Tap" Universal Stack Picker!
      if (mode === 'move') {
        this._longPressTimer = setTimeout(() => {
          this._longPressTimer = null;
          if (this.toolDrag?.type === 'transform' && !this.toolDrag.changed) {
            this.toolDrag = null;
            doc.endFastInteraction();
            this.hapticTick();
            this.openCanvasObjectPicker(pt.x, pt.y);
          }
        }, 450);
      }
      return;
    }

    if (!layer || layer.locked) {
      this.showToast('Active layer is locked');
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
      if (!doc.editingMask && layer.smartSource) {
        doc.bakeSmartSource(layer);
      }
      const targetCanvas = doc.editingMask && layer.maskCanvas ? layer.maskCanvas : layer.canvas;
      let fillColor = this.fgColor;
      if (doc.editingMask) {
        const rgb = Algorithms.hexToRgb(this.fgColor);
        const lum = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
        fillColor = Algorithms.rgbToHex(lum, lum, lum);
      }
      if (this.fillMode === 'bucket') {
        this.brush.floodFill(
          targetCanvas,
          pt.x,
          pt.y,
          fillColor,
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
          targetCanvas,
          isMask: Boolean(doc.editingMask)
        };
      }
      return;
    }

    // Painting tools: bake Smart Source cleanly before pixel edits & use fast sandwich cache!
    if (layer.kind === 'adjustment' && !doc.editingMask) {
      if (!layer.maskCanvas) {
        doc.addMaskToActiveLayer(false);
      } else {
        doc.editingMask = true;
      }
    }
    if (!doc.editingMask && layer.smartSource) {
      doc.bakeSmartSource(layer);
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

    if (this._longPressTimer && Math.hypot(e.clientX - (drag.startClientX || 0), e.clientY - (drag.startClientY || 0)) > 8) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

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

    if (drag.type === 'layerMarquee') {
      drag.currX = pt.x;
      drag.currY = pt.y;
      this.requestRender();
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

    // ---- Photoshop Move & Interactive Single/Multi-Layer Free Transform ----
    if (drag.type === 'transform') {
      const snapshots = drag.targetSnapshots || [];
      if (snapshots.length === 0) return;
      const ob = drag.origBounds;
      drag.changed = true;
      this.activeSmartGuides = [];

      let newCx = ob.cx;
      let newCy = ob.cy;
      let newW = ob.w;
      let newH = ob.h;
      let newRot = ob.rotation || 0;

      if (drag.mode === 'move') {
        const dx = pt.x - drag.startX;
        const dy = pt.y - drag.startY;
        newCx = ob.cx + dx;
        newCy = ob.cy + dy;

        if (this.enableSmartGuides) {
          const snapThresh = Math.max(6, 10 / this.zoom);
          const cosA = Math.abs(Math.cos(newRot));
          const sinA = Math.abs(Math.sin(newRot));
          const halfW = (ob.w * cosA + ob.h * sinA) / 2;
          const halfH = (ob.w * sinA + ob.h * cosA) / 2;

          const xTargets = [
            { test: newCx, snapVal: doc.width / 2, guide: doc.width / 2 },
            { test: newCx - halfW, snapVal: 0, guide: 0 },
            { test: newCx + halfW, snapVal: doc.width, guide: doc.width }
          ];
          for (const t of xTargets) {
            if (Math.abs(t.test - t.snapVal) < snapThresh) {
              newCx += t.snapVal - t.test;
              this.activeSmartGuides.push({ axis: 'v', pos: t.guide });
              break;
            }
          }
          const yTargets = [
            { test: newCy, snapVal: doc.height / 2, guide: doc.height / 2 },
            { test: newCy - halfH, snapVal: 0, guide: 0 },
            { test: newCy + halfH, snapVal: doc.height, guide: doc.height }
          ];
          for (const t of yTargets) {
            if (Math.abs(t.test - t.snapVal) < snapThresh) {
              newCy += t.snapVal - t.test;
              this.activeSmartGuides.push({ axis: 'h', pos: t.guide });
              break;
            }
          }
        }
      } else if (drag.mode === 'rotate') {
        const curAngle = Math.atan2(pt.y - ob.cy, pt.x - ob.cx);
        const delta = curAngle - drag.startAngle;
        newRot = (ob.rotation || 0) + delta;
        const deg = (newRot * 180) / Math.PI;
        const nearest45 = Math.round(deg / 45) * 45;
        if (Math.abs(deg - nearest45) < 3.0) {
          newRot = (nearest45 * Math.PI) / 180;
        }
      } else {
        const cos = Math.cos(ob.rotation || 0);
        const sin = Math.sin(ob.rotation || 0);
        const dx = pt.x - ob.cx;
        const dy = pt.y - ob.cy;
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;

        const sx = drag.sx;
        const sy = drag.sy;
        const ax = -sx * (ob.w / 2);
        const ay = -sy * (ob.h / 2);

        const rawW = sx !== 0 ? Math.max(12, sx * (lx - ax)) : ob.w;
        const rawH = sy !== 0 ? Math.max(12, sy * (ly - ay)) : ob.h;
        const isCorner = sx !== 0 && sy !== 0;

        if (snapshots.length === 1 && snapshots[0].layer.kind === 'text') {
          const sc = isCorner
            ? Math.max(0.08, (rawW * ob.w + rawH * ob.h) / Math.max(1, ob.w * ob.w + ob.h * ob.h))
            : sx !== 0
            ? Math.max(0.08, rawW / Math.max(1, ob.w))
            : Math.max(0.08, rawH / Math.max(1, ob.h));
          newW = Math.max(12, ob.w * sc);
          newH = Math.max(12, ob.h * sc);
        } else if (isCorner && this.transformLockAspect) {
          const sc = Math.max(12 / Math.max(1, Math.min(ob.w, ob.h)), (rawW * ob.w + rawH * ob.h) / Math.max(1, ob.w * ob.w + ob.h * ob.h));
          newW = Math.max(12, ob.w * sc);
          newH = Math.max(12, ob.h * sc);
        } else {
          newW = Math.max(12, rawW);
          newH = Math.max(12, rawH);
        }

        const newLocalCx = sx !== 0 ? ax + sx * (newW / 2) : 0;
        const newLocalCy = sy !== 0 ? ay + sy * (newH / 2) : 0;
        newCx = ob.cx + newLocalCx * cos - newLocalCy * sin;
        newCy = ob.cy + newLocalCx * sin + newLocalCy * cos;
      }

      if (snapshots.length === 1) {
        const snap = snapshots[0];
        const lyr = snap.layer;
        if (lyr.smartSource?.canvas) {
          lyr.smartSource.cx = newCx;
          lyr.smartSource.cy = newCy;
          lyr.smartSource.w = newW;
          lyr.smartSource.h = newH;
          lyr.smartSource.rotation = newRot;
          doc.rasterizeSmartLayer(lyr);
        } else if (lyr.kind === 'shape' && lyr.shapeData) {
          lyr.shapeData.w = newW;
          lyr.shapeData.h = newH;
          lyr.shapeData.x = newCx - newW / 2;
          lyr.shapeData.y = newCy - newH / 2;
          lyr.shapeData.rotation = newRot;
          doc.rasterizeShapeLayer(lyr);
        } else if (lyr.kind === 'text' && lyr.textData && snap.origText) {
          const sc = newH / Math.max(1, ob.h);
          lyr.textData.fontSize = Math.max(8, Math.min(600, Math.round((snap.origText.fontSize || 48) * sc)));
          lyr.textData.y = newCy;
          if (lyr.textData.orientation !== 'vertical' && lyr.textData.align === 'left') {
            lyr.textData.x = newCx - newW / 2;
          } else if (lyr.textData.orientation !== 'vertical' && lyr.textData.align === 'right') {
            lyr.textData.x = newCx + newW / 2;
          } else {
            lyr.textData.x = newCx;
          }
          lyr.textData.rotation = newRot;
          doc.rasterizeTextLayer(lyr);
        }
      } else {
        // Multi-Layer Group Transform around combined bounding box!
        const scaleX = newW / Math.max(1, ob.w);
        const scaleY = newH / Math.max(1, ob.h);
        const dRot = newRot - (ob.rotation || 0);
        const cosR = Math.cos(dRot);
        const sinR = Math.sin(dRot);

        for (const snap of snapshots) {
          const lyr = snap.layer;
          const lb = snap.bounds;
          if (!lb) continue;
          const relX = (lb.cx - ob.cx) * scaleX;
          const relY = (lb.cy - ob.cy) * scaleY;
          const tCx = newCx + relX * cosR - relY * sinR;
          const tCy = newCy + relX * sinR + relY * cosR;

          if (lyr.smartSource?.canvas && snap.origSmart) {
            lyr.smartSource.cx = tCx;
            lyr.smartSource.cy = tCy;
            lyr.smartSource.w = Math.max(8, snap.origSmart.w * scaleX);
            lyr.smartSource.h = Math.max(8, snap.origSmart.h * scaleY);
            lyr.smartSource.rotation = (snap.origSmart.rotation || 0) + dRot;
            doc.rasterizeSmartLayer(lyr);
          } else if (lyr.kind === 'shape' && lyr.shapeData && snap.origShape) {
            const sw = Math.max(8, snap.origShape.w * scaleX);
            const sh = Math.max(8, snap.origShape.h * scaleY);
            lyr.shapeData.w = sw;
            lyr.shapeData.h = sh;
            lyr.shapeData.x = tCx - sw / 2;
            lyr.shapeData.y = tCy - sh / 2;
            lyr.shapeData.rotation = (snap.origShape.rotation || 0) + dRot;
            doc.rasterizeShapeLayer(lyr);
          } else if (lyr.kind === 'text' && lyr.textData && snap.origText) {
            const sc = (scaleX + scaleY) * 0.5;
            lyr.textData.fontSize = Math.max(8, Math.min(600, Math.round((snap.origText.fontSize || 48) * sc)));
            lyr.textData.x = tCx;
            lyr.textData.y = tCy;
            lyr.textData.rotation = (snap.origText.rotation || 0) + dRot;
            doc.rasterizeTextLayer(lyr);
          }
        }
      }

      this._cachedTransformBounds = null;
      if (snapshots.length > 1) doc.compose();
      else doc.composeFast();
      this.requestRender();
      return;
    }

    if (drag.type === 'select') {
      drag.currX = pt.x;
      drag.currY = pt.y;
      if (drag.mode === 'lasso') {
        drag.points.push({ x: pt.x, y: pt.y });
      } else if (drag.mode === 'quickSelect') {
        const last = drag.points[drag.points.length - 1];
        if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) >= Math.max(6, this.quickSelectRadius * 0.35)) {
          drag.points.push({ x: pt.x, y: pt.y });
          const now = performance.now();
          if (now - (drag.lastLiveAt || 0) > 65) {
            drag.lastLiveAt = now;
            const liveMode = drag.combineMode === 'subtract' ? 'subtract' : 'add';
            doc.applyQuickSelectBrush([pt], {
              radius: this.quickSelectRadius,
              tolerance: this.wandTolerance,
              combineMode: liveMode,
              sampleAllLayers: this.selectSampleAll
            });
          }
        }
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

    // ---- Photoshop Perspective Crop Dragging (Corner + Loupe / Edge / Inside Move / Fresh Draw) ----
    if (drag.type === 'perspectiveCrop' && this.perspectiveQuad) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      const clampX = (v) => Math.max(-doc.width * 0.2, Math.min(doc.width * 1.2, Math.round(v)));
      const clampY = (v) => Math.max(-doc.height * 0.2, Math.min(doc.height * 1.2, Math.round(v)));

      if (drag.mode === 'corner') {
        const nx = clampX(drag.origQuad[drag.cornerIdx].x + dx);
        const ny = clampY(drag.origQuad[drag.cornerIdx].y + dy);
        this.perspectiveQuad[drag.cornerIdx] = { x: nx, y: ny };
        const labels = ['TL', 'TR', 'BR', 'BL'];
        this.showCornerLoupe(nx, ny, e.clientX, e.clientY, labels[drag.cornerIdx]);
      } else if (drag.mode === 'edge') {
        const i0 = drag.edgeIdx;
        const i1 = (drag.edgeIdx + 1) % 4;
        this.perspectiveQuad[i0] = { x: clampX(drag.origQuad[i0].x + dx), y: clampY(drag.origQuad[i0].y + dy) };
        this.perspectiveQuad[i1] = { x: clampX(drag.origQuad[i1].x + dx), y: clampY(drag.origQuad[i1].y + dy) };
      } else if (drag.mode === 'draw') {
        const x0 = clampX(Math.min(drag.startX, pt.x));
        const y0 = clampY(Math.min(drag.startY, pt.y));
        const x1 = clampX(Math.max(drag.startX, pt.x));
        const y1 = clampY(Math.max(drag.startY, pt.y));
        if (x1 - x0 >= 24 && y1 - y0 >= 24) {
          this.perspectiveQuad = [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x1, y: y1 },
            { x: x0, y: y1 }
          ];
        }
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

    // ---- Photoshop 8-Handle Slice Select Dragging ----
    if (drag.type === 'sliceEdit' && drag.slice) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      const or = drag.origRect;
      const minS = 16;

      if (drag.mode === 'move') {
        drag.slice.x = Math.max(0, Math.min(doc.width - or.w, Math.round(or.x + dx)));
        drag.slice.y = Math.max(0, Math.min(doc.height - or.h, Math.round(or.y + dy)));
      } else {
        let l = or.x;
        let t = or.y;
        let r = or.x + or.w;
        let b = or.y + or.h;

        if (drag.mode.includes('w')) l = Math.max(0, Math.min(r - minS, Math.round(or.x + dx)));
        if (drag.mode.includes('e')) r = Math.min(doc.width, Math.max(l + minS, Math.round(or.x + or.w + dx)));
        if (drag.mode.includes('n')) t = Math.max(0, Math.min(b - minS, Math.round(or.y + dy)));
        if (drag.mode.includes('s')) b = Math.min(doc.height, Math.max(t + minS, Math.round(or.y + or.h + dy)));

        drag.slice.x = l;
        drag.slice.y = t;
        drag.slice.w = Math.max(minS, r - l);
        drag.slice.h = Math.max(minS, b - t);
      }
      this.requestRender();
      return;
    }

    // ---- Photoshop 8-Handle Crop Tool + Strict Live Aspect Ratio + Outside Straighten Rotation ----
    if (drag.type === 'crop' && this.cropBox) {
      const ob = drag.origBox;
      const snapEdge = (val, targets) => {
        const thresh = Math.max(6, 9 / this.zoom);
        for (const t of targets) {
          if (Math.abs(val - t) < thresh) return t;
        }
        return val;
      };

      if (drag.mode === 'rotate') {
        const cx = ob.x + ob.w / 2;
        const cy = ob.y + ob.h / 2;
        const curAngle = Math.atan2(pt.y - cy, pt.x - cx);
        let deltaDeg = ((curAngle - drag.startAngle) * 180) / Math.PI;
        while (deltaDeg > 180) deltaDeg -= 360;
        while (deltaDeg < -180) deltaDeg += 360;
        let ang = drag.origCropAngle - deltaDeg;
        if (Math.abs(ang) < 1.2) ang = 0;
        ang = Math.max(-45, Math.min(45, Math.round(ang * 2) / 2));
        this.cropAngle = ang;
        const angSlider = document.getElementById('crop-angle-slider');
        const angLbl = document.getElementById('crop-angle-lbl');
        if (angSlider) angSlider.value = String(ang);
        if (angLbl) angLbl.textContent = `∠ ${ang.toFixed(1)}°`;
        this.renderFloatingContextBar();
        this.requestRender();
        return;
      }

      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      const minX = -doc.width * 0.5;
      const maxX = doc.width * 1.5;
      const minY = -doc.height * 0.5;
      const maxY = doc.height * 1.5;
      const minS = 24;

      if (drag.mode === 'move') {
        let nx = Math.max(minX, Math.min(maxX - ob.w, ob.x + dx));
        let ny = Math.max(minY, Math.min(maxY - ob.h, ob.y + dy));
        nx = snapEdge(nx, [0, doc.width - ob.w]);
        ny = snapEdge(ny, [0, doc.height - ob.h]);
        this.cropBox.x = Math.round(nx);
        this.cropBox.y = Math.round(ny);
      } else {
        const ratio = this.getCropTargetRatio();
        if (!ratio) {
          let l = ob.x;
          let t = ob.y;
          let r = ob.x + ob.w;
          let b = ob.y + ob.h;
          if (drag.mode.includes('w')) l = Math.min(r - minS, Math.max(minX, snapEdge(ob.x + dx, [0])));
          if (drag.mode.includes('e')) r = Math.max(l + minS, Math.min(maxX, snapEdge(ob.x + ob.w + dx, [doc.width])));
          if (drag.mode.includes('n')) t = Math.min(b - minS, Math.max(minY, snapEdge(ob.y + dy, [0])));
          if (drag.mode.includes('s')) b = Math.max(t + minS, Math.min(maxY, snapEdge(ob.y + ob.h + dy, [doc.height])));
          this.cropBox = {
            x: Math.round(l),
            y: Math.round(t),
            w: Math.max(minS, Math.round(r - l)),
            h: Math.max(minS, Math.round(b - t))
          };
        } else {
          // Strict Aspect Ratio Enforcement for ALL 4 Corners AND ALL 4 Edges!
          let x = ob.x, y = ob.y, w = ob.w, h = ob.h;
          if (drag.mode === 'nw' || drag.mode === 'ne' || drag.mode === 'sw' || drag.mode === 'se') {
            const sx = drag.mode.includes('e') ? 1 : -1;
            const sy = drag.mode.includes('s') ? 1 : -1;
            const ax = sx > 0 ? ob.x : ob.x + ob.w;
            const ay = sy > 0 ? ob.y : ob.y + ob.h;
            const rawW = Math.max(minS, sx * (pt.x - ax));
            const rawH = Math.max(minS, sy * (pt.y - ay));
            h = Math.max(minS, (rawW * ratio + rawH) / (ratio * ratio + 1));
            w = h * ratio;
            if (w < minS) {
              w = minS;
              h = w / ratio;
            }
            const maxSpan = Math.max(doc.width, doc.height) * 1.8;
            if (w > maxSpan) {
              w = maxSpan;
              h = w / ratio;
            }
            if (h > maxSpan) {
              h = maxSpan;
              w = h * ratio;
            }
            x = sx > 0 ? ax : ax - w;
            y = sy > 0 ? ay : ay - h;
          } else if (drag.mode === 'e' || drag.mode === 'w') {
            const sx = drag.mode === 'e' ? 1 : -1;
            const ax = sx > 0 ? ob.x : ob.x + ob.w;
            const cy = ob.y + ob.h / 2;
            w = Math.max(minS, Math.min(doc.width * 1.8, sx * (pt.x - ax)));
            h = w / ratio;
            x = sx > 0 ? ax : ax - w;
            y = cy - h / 2;
          } else if (drag.mode === 'n' || drag.mode === 's') {
            const sy = drag.mode === 's' ? 1 : -1;
            const ay = sy > 0 ? ob.y : ob.y + ob.h;
            const cx = ob.x + ob.w / 2;
            h = Math.max(minS, Math.min(doc.height * 1.8, sy * (pt.y - ay)));
            w = h * ratio;
            x = cx - w / 2;
            y = sy > 0 ? ay : ay - h;
          }
          const rw = Math.max(minS, Math.round(w));
          const rh = Math.max(minS, Math.round(rw / ratio));
          this.cropBox = { x: Math.round(x), y: Math.round(y), w: rw, h: rh };
        }
      }
      this.renderFloatingContextBar();
      this.requestRender();
    }
  }

  handleSinglePointerUp() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

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

    if (drag.type === 'perspectiveCrop') {
      document.getElementById('pixel-loupe').hidden = true;
      this.renderFloatingContextBar();
      this.requestRender();
      return;
    }

    if (drag.type === 'layerMarquee') {
      const hits = doc.selectLayersInRect(drag.startX, drag.startY, drag.currX - drag.startX, drag.currY - drag.startY);
      this._cachedTransformBounds = null;
      this.syncHeaderAndHUD();
      this.renderFloatingContextBar();
      if (this.rightLayersOpen) this.renderRightLayersDrawer();
      this.requestRender();
      if (hits.length > 0) {
        this.showToast(`Selected ${hits.length} object${hits.length > 1 ? 's' : ''} in canvas`);
      }
      return;
    }

    if (drag.type === 'transform') {
      this.activeSmartGuides = [];
      this._cachedTransformBounds = null;
      doc.endFastInteraction();
      if (drag.changed) {
        this._lastMoveTextTap = null;
        const multiTag = (drag.targets?.length || 1) > 1 ? ` (${drag.targets.length} Layers)` : '';
        const label =
          drag.mode === 'move' ? `Move Layer${multiTag}` : drag.mode === 'rotate' ? `Rotate Layer${multiTag}` : `Scale Layer${multiTag}`;
        doc.pushHistory(label);
        this.session.notify('layer.transformed');
      } else if (drag.pendingDeselectId) {
        doc.toggleLayerSelection(drag.pendingDeselectId);
        this._cachedTransformBounds = null;
        this.syncHeaderAndHUD();
        this.renderFloatingContextBar();
        if (this.rightLayersOpen) this.renderRightLayersDrawer();
        this.requestRender();
      } else {
        this.requestRender();
      }
      return;
    }

    if (drag.type === 'move') {
      doc.endFastInteraction();
      if (Math.abs(drag.dx) > 1 || Math.abs(drag.dy) > 1) {
        doc.pushHistory('Move Layer Mask');
      }
      this.session.notify('layer.moved');
      return;
    }

    if (drag.type === 'select') {
      const w = drag.currX - drag.startX;
      const h = drag.currY - drag.startY;
      if (drag.mode === 'object') {
        const res = doc.selectObjectSmart(drag.startX, drag.startY, w, h, {
          combineMode: this.selectCombineMode,
          sensitivity: this.wandTolerance,
          sampleAllLayers: this.selectSampleAll
        });
        if (res?.layerName) {
          this.showToast(`🎯 Smart Selected "${res.layerName}"`);
        } else {
          this.showToast('🎯 Smart Object Selected');
        }
      } else if (drag.mode === 'quickSelect') {
        doc.applyQuickSelectBrush(drag.points, {
          radius: this.quickSelectRadius,
          tolerance: this.wandTolerance,
          combineMode: drag.combineMode === 'subtract' ? 'subtract' : 'add',
          sampleAllLayers: this.selectSampleAll
        });
        this.showToast('🖌 Quick Selection Updated');
      } else if (drag.mode === 'rect') {
        doc.setRectSelection(drag.startX, drag.startY, w, h, this.selectCombineMode);
      } else if (drag.mode === 'ellipse') {
        doc.setEllipseSelection(drag.startX, drag.startY, w, h, this.selectCombineMode);
      } else if (drag.mode === 'lasso') {
        doc.setLassoSelection(drag.points, this.selectCombineMode);
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
      let c1 = this.fgColor;
      let c2 = this.bgColor;
      if (drag.isMask) {
        const r1 = Algorithms.hexToRgb(c1);
        const l1 = Math.round(0.299 * r1.r + 0.587 * r1.g + 0.114 * r1.b);
        c1 = Algorithms.rgbToHex(l1, l1, l1);
        const r2 = Algorithms.hexToRgb(c2);
        const l2 = Math.round(0.299 * r2.r + 0.587 * r2.g + 0.114 * r2.b);
        c2 = Algorithms.rgbToHex(l2, l2, l2);
      }
      this.brush.drawGradient(
        drag.targetCanvas,
        drag.startX,
        drag.startY,
        drag.currX,
        drag.currY,
        c1,
        c2,
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
        strokeWidth: this.shapeStrokeWidth,
        cornerRadius: this.shapeCornerRadius
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

    const isCropRotated = this.activeTool === 'crop' && this.cropBox && Math.abs(this.cropAngle) > 0.05;
    ctx.save();
    if (isCropRotated) {
      const rcx = this.cropBox.x + this.cropBox.w / 2;
      const rcy = this.cropBox.y + this.cropBox.h / 2;
      ctx.translate(rcx, rcy);
      ctx.rotate((-this.cropAngle * Math.PI) / 180);
      ctx.translate(-rcx, -rcy);
    }

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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(0, 0, doc.width, doc.height);
    ctx.restore();

    if (this.showCanvasGrid) {
      this.drawCanvasGrid(ctx, doc);
    }

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

    if (this.showRulers) {
      this.drawViewportRulers(ctx, canvas.width / dpr, canvas.height / dpr);
    }

    ctx.restore();

    if (this.inlineTextSession) {
      this.syncInlineTextOverlay();
    }
  }

  drawCanvasGrid(ctx, doc) {
    const step = this.zoom > 2 ? 32 : this.zoom > 0.7 ? 64 : 128;
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 181, 255, 0.22)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.beginPath();
    for (let x = step; x < doc.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, doc.height);
    }
    for (let y = step; y < doc.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(doc.width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawViewportRulers(ctx, viewW, viewH) {
    const size = 18;
    ctx.save();
    ctx.fillStyle = 'rgba(20, 22, 27, 0.9)';
    ctx.fillRect(0, 0, viewW, size);
    ctx.fillRect(0, 0, size, viewH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, size + 0.5);
    ctx.lineTo(viewW, size + 0.5);
    ctx.moveTo(size + 0.5, 0);
    ctx.lineTo(size + 0.5, viewH);
    ctx.stroke();

    const stepDoc = this.zoom > 2 ? 50 : this.zoom > 0.7 ? 100 : 200;
    const minDocX = Math.floor((-this.panX) / this.zoom / stepDoc) * stepDoc;
    const maxDocX = Math.ceil((viewW - this.panX) / this.zoom / stepDoc) * stepDoc;
    const minDocY = Math.floor((-this.panY) / this.zoom / stepDoc) * stepDoc;
    const maxDocY = Math.ceil((viewH - this.panY) / this.zoom / stepDoc) * stepDoc;

    ctx.fillStyle = 'rgba(220, 228, 242, 0.75)';
    ctx.strokeStyle = 'rgba(220, 228, 242, 0.45)';
    ctx.font = '9px "JetBrains Mono", monospace';

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let dx = minDocX; dx <= maxDocX; dx += stepDoc) {
      const sx = Math.round(this.panX + dx * this.zoom) + 0.5;
      if (sx < size || sx > viewW) continue;
      ctx.beginPath();
      ctx.moveTo(sx, size - 7);
      ctx.lineTo(sx, size);
      ctx.stroke();
      ctx.fillText(String(dx), sx + 2, 2);
    }

    for (let dy = minDocY; dy <= maxDocY; dy += stepDoc) {
      const sy = Math.round(this.panY + dy * this.zoom) + 0.5;
      if (sy < size || sy > viewH) continue;
      ctx.beginPath();
      ctx.moveTo(size - 7, sy);
      ctx.lineTo(size, sy);
      ctx.stroke();
      ctx.save();
      ctx.translate(2, sy + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.fillText(String(dy), 0, 0);
      ctx.restore();
    }

    ctx.fillStyle = '#252830';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#38b5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('px', size / 2, size / 2);
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

    // Smart Translucent Tint Overlay (cached per selectionCanvas for 60fps performance!)
    if (this.showSelectionTint && doc.selectionCanvas) {
      if (this._selTintSrc !== doc.selectionCanvas) {
        const tc = document.createElement('canvas');
        tc.width = doc.width;
        tc.height = doc.height;
        const tCtx = tc.getContext('2d');
        tCtx.drawImage(doc.selectionCanvas, 0, 0);
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = 'rgba(56, 181, 255, 0.24)';
        tCtx.fillRect(0, 0, doc.width, doc.height);
        this._selTintCanvas = tc;
        this._selTintSrc = doc.selectionCanvas;
      }
      if (this._selTintCanvas) {
        ctx.drawImage(this._selTintCanvas, 0, 0);
      }
    }

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

    if (drag.type === 'layerMarquee') {
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = '#38b5ff';
      ctx.fillStyle = 'rgba(56, 181, 255, 0.14)';
      ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
      const x = Math.min(drag.startX, drag.currX);
      const y = Math.min(drag.startY, drag.currY);
      const w = Math.abs(drag.currX - drag.startX);
      const h = Math.abs(drag.currY - drag.startY);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
      return;
    }

    if (drag.type === 'select' || drag.type === 'sliceDraw') {
      ctx.save();
      ctx.lineWidth = lw;
      if (drag.mode === 'quickSelect') {
        const isSub = drag.combineMode === 'subtract';
        ctx.strokeStyle = isSub ? '#f87171' : '#38b5ff';
        ctx.fillStyle = isSub ? 'rgba(248, 113, 113, 0.16)' : 'rgba(56, 181, 255, 0.18)';
        ctx.beginPath();
        ctx.arc(drag.currX, drag.currY, this.quickSelectRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${14 / this.zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isSub ? '−' : '+', drag.currX, drag.currY);
        ctx.restore();
        return;
      }

      const isObj = drag.mode === 'object';
      ctx.strokeStyle = isObj ? '#a855f7' : drag.type === 'sliceDraw' ? '#38b5ff' : '#378ef0';
      ctx.fillStyle = isObj ? 'rgba(168, 85, 247, 0.14)' : drag.type === 'sliceDraw' ? 'rgba(56, 181, 255, 0.16)' : 'rgba(55, 142, 240, 0.14)';
      if (isObj) ctx.setLineDash([7 / this.zoom, 4 / this.zoom]);
      ctx.beginPath();
      if (drag.type === 'sliceDraw' || drag.mode === 'rect' || isObj) {
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
      const x = Math.min(drag.startX, drag.currX);
      const y = Math.min(drag.startY, drag.currY);
      const w = Math.abs(drag.currX - drag.startX);
      const h = Math.abs(drag.currY - drag.startY);
      const cx = x + w / 2;
      const cy = y + h / 2;

      ctx.save();
      ctx.strokeStyle = '#378ef0';
      ctx.fillStyle = 'rgba(55, 142, 240, 0.25)';
      ctx.lineWidth = 2 / this.zoom;
      ctx.beginPath();
      if (this.shapeMode === 'ellipse') {
        ctx.ellipse(cx, cy, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
      } else if (this.shapeMode === 'polygon' || this.shapeMode === 'star') {
        const pts = this.shapeMode === 'star' ? 5 : 6;
        const steps = this.shapeMode === 'star' ? pts * 2 : pts;
        const orx = Math.max(1, w / 2);
        const ory = Math.max(1, h / 2);
        const irx = this.shapeMode === 'star' ? orx * 0.45 : orx;
        const iry = this.shapeMode === 'star' ? ory * 0.45 : ory;
        for (let i = 0; i < steps; i++) {
          const rx = this.shapeMode === 'star' && i % 2 === 1 ? irx : orx;
          const ry = this.shapeMode === 'star' && i % 2 === 1 ? iry : ory;
          const a = (i * Math.PI * 2) / steps - Math.PI / 2;
          const px = cx + rx * Math.cos(a);
          const py = cy + ry * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTransformHandles(ctx, doc) {
    const bounds = this.getActiveTransformBounds();
    if (!bounds) return;

    ctx.save();

    // 1. Photoshop Magenta Smart Guides during Move snap
    if (this.activeSmartGuides && this.activeSmartGuides.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#ff2bd6';
      ctx.lineWidth = 1.4 / this.zoom;
      ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
      ctx.beginPath();
      for (const g of this.activeSmartGuides) {
        if (g.axis === 'v') {
          ctx.moveTo(g.pos, -doc.height * 0.5);
          ctx.lineTo(g.pos, doc.height * 1.5);
        } else {
          ctx.moveTo(-doc.width * 0.5, g.pos);
          ctx.lineTo(doc.width * 1.5, g.pos);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    const { cx, cy, w, h, rotation } = bounds;
    const hw = w / 2;
    const hh = h / 2;
    const rotStem = Math.max(22, 34 / this.zoom);

    // 2. Rotated Transform Box, Rotation Lollipop Handle, Center Pivot & 8 Scale Handles
    ctx.save();
    ctx.translate(cx, cy);
    if (rotation) ctx.rotate(rotation);

    // Outer subtle shadow border for visibility on bright backgrounds
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 3.2 / this.zoom;
    ctx.strokeRect(-hw, -hh, w, h);

    // Crisp Photoshop Blue bounding box
    ctx.strokeStyle = '#378ef0';
    ctx.lineWidth = 1.8 / this.zoom;
    ctx.strokeRect(-hw, -hh, w, h);

    // Top Rotation Stem + Lollipop Handle (↻)
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(0, -hh - rotStem);
    ctx.stroke();

    const rotR = 9.5 / this.zoom;
    ctx.fillStyle = '#378ef0';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8 / this.zoom;
    ctx.beginPath();
    ctx.arc(0, -hh - rotStem, rotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw crisp curved arrow glyph inside rotation handle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4 / this.zoom;
    ctx.beginPath();
    ctx.arc(0, -hh - rotStem, rotR * 0.48, -Math.PI * 0.7, Math.PI * 0.65);
    ctx.stroke();

    // Center Reference Pivot Crosshair (⊕)
    const pr = 5.5 / this.zoom;
    ctx.strokeStyle = '#378ef0';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.4 / this.zoom;
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-pr * 1.4, 0);
    ctx.lineTo(pr * 1.4, 0);
    ctx.moveTo(0, -pr * 1.4);
    ctx.lineTo(0, pr * 1.4);
    ctx.stroke();

    // 8 Interactive Square Scale Handles (NW, N, NE, E, SE, S, SW, W)
    const hs = 11 / this.zoom;
    const pts = [
      [-hw, -hh], [0, -hh], [hw, -hh],
      [-hw, 0], [hw, 0],
      [-hw, hh], [0, hh], [hw, hh]
    ];
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#378ef0';
    ctx.lineWidth = 2 / this.zoom;
    for (const [hx, hy] of pts) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
    ctx.restore();

    // 3. Live Dimension & Angle HUD Pill (unrotated in screen orientation)
    const deg = Math.round(((rotation || 0) * 180) / Math.PI);
    const label = deg !== 0 ? `${Math.round(w)} × ${Math.round(h)} px · ${deg}°` : `${Math.round(w)} × ${Math.round(h)} px`;
    const fontSize = 11 / this.zoom;
    ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
    const tw = ctx.measureText(label).width;
    const padX = 7 / this.zoom;
    const padY = 4 / this.zoom;
    const cosA = Math.abs(Math.cos(rotation || 0));
    const sinA = Math.abs(Math.sin(rotation || 0));
    const aabbHalfH = (w * sinA + h * cosA) / 2;
    const pillW = tw + padX * 2;
    const pillH = fontSize + padY * 2;
    const pillX = cx - pillW / 2;
    const pillY = cy + aabbHalfH + 10 / this.zoom;

    ctx.fillStyle = 'rgba(18, 20, 26, 0.86)';
    ctx.strokeStyle = 'rgba(55, 142, 240, 0.75)';
    ctx.lineWidth = 1.2 / this.zoom;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 5 / this.zoom);
    else ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, pillY + pillH / 2);

    ctx.restore();
  }

  drawCropOverlay(ctx, doc) {
    const cb = this.cropBox;
    ctx.save();

    // Full-viewport Crop Shield using evenodd path (works even when expanding canvas outside original bounds!)
    const pad = Math.max(doc.width, doc.height) * 3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.beginPath();
    ctx.rect(-pad, -pad, doc.width + pad * 2, doc.height + pad * 2);
    ctx.rect(cb.x, cb.y, cb.w, cb.h);
    ctx.fill('evenodd');

    // Crisp White Crop Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8 / this.zoom;
    ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);

    // Composition Overlay Grid (Thirds / Dense / Diagonal / Golden)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
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

    // Photoshop Bold White Corner L-Brackets + 4 Edge Midpoint Bars
    const arm = Math.min(24 / this.zoom, cb.w * 0.28, cb.h * 0.28);
    const bar = Math.min(26 / this.zoom, cb.w * 0.26, cb.h * 0.26);
    const thick = 4.2 / this.zoom;

    const strokeHandles = (color, lw) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'square';
      ctx.beginPath();
      // NW corner L
      ctx.moveTo(cb.x, cb.y + arm);
      ctx.lineTo(cb.x, cb.y);
      ctx.lineTo(cb.x + arm, cb.y);
      // NE corner L
      ctx.moveTo(cb.x + cb.w - arm, cb.y);
      ctx.lineTo(cb.x + cb.w, cb.y);
      ctx.lineTo(cb.x + cb.w, cb.y + arm);
      // SE corner L
      ctx.moveTo(cb.x + cb.w, cb.y + cb.h - arm);
      ctx.lineTo(cb.x + cb.w, cb.y + cb.h);
      ctx.lineTo(cb.x + cb.w - arm, cb.y + cb.h);
      // SW corner L
      ctx.moveTo(cb.x + arm, cb.y + cb.h);
      ctx.lineTo(cb.x, cb.y + cb.h);
      ctx.lineTo(cb.x, cb.y + cb.h - arm);
      // N, S, W, E Edge Bars
      ctx.moveTo(cb.x + cb.w / 2 - bar / 2, cb.y);
      ctx.lineTo(cb.x + cb.w / 2 + bar / 2, cb.y);
      ctx.moveTo(cb.x + cb.w / 2 - bar / 2, cb.y + cb.h);
      ctx.lineTo(cb.x + cb.w / 2 + bar / 2, cb.y + cb.h);
      ctx.moveTo(cb.x, cb.y + cb.h / 2 - bar / 2);
      ctx.lineTo(cb.x, cb.y + cb.h / 2 + bar / 2);
      ctx.moveTo(cb.x + cb.w, cb.y + cb.h / 2 - bar / 2);
      ctx.lineTo(cb.x + cb.w, cb.y + cb.h / 2 + bar / 2);
      ctx.stroke();
    };

    strokeHandles('rgba(0, 0, 0, 0.55)', thick + 2.4 / this.zoom);
    strokeHandles('#ffffff', thick);

    // Live Crop Dimension / Ratio / Angle Badge
    const ratioTag = this.cropAspect && this.cropAspect !== 'free' ? ` (${this.cropAspect})` : '';
    const angTag = Math.abs(this.cropAngle) > 0.05 ? ` · ${this.cropAngle.toFixed(1)}°` : '';
    const cropTxt = `${Math.round(cb.w)} × ${Math.round(cb.h)} px${ratioTag}${angTag}`;
    const fs = 11 / this.zoom;
    ctx.font = `600 ${fs}px "JetBrains Mono", monospace`;
    const tw = ctx.measureText(cropTxt).width;
    const px = 8 / this.zoom;
    const py = 4 / this.zoom;
    const pw = tw + px * 2;
    const ph = fs + py * 2;
    const bx = cb.x + cb.w / 2 - pw / 2;
    const by = cb.y - ph - 10 / this.zoom;

    ctx.fillStyle = 'rgba(18, 20, 26, 0.86)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.1 / this.zoom;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, pw, ph, 5 / this.zoom);
    else ctx.rect(bx, by, pw, ph);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cropTxt, cb.x + cb.w / 2, by + ph / 2);

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

    // Draggable edge midpoint handles
    const er = 4.5 / this.zoom;
    for (let i = 0; i < 4; i++) {
      const a = q[i];
      const b = q[(i + 1) % 4];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.fillStyle = strokeCol;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4 / this.zoom;
      ctx.beginPath();
      ctx.arc(mx, my, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const labels = ['TL', 'TR', 'BR', 'BL'];
    const r = 10.5 / this.zoom;
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

      // Draw ALL 8 interactive resize handles on the selected slice (NW, N, NE, E, SE, S, SW, W)
      if (isSelected && isSliceMode) {
        const hs = 9.5 / this.zoom;
        const pts = [
          [s.x, s.y], [s.x + s.w / 2, s.y], [s.x + s.w, s.y],
          [s.x + s.w, s.y + s.h / 2], [s.x + s.w, s.y + s.h],
          [s.x + s.w / 2, s.y + s.h], [s.x, s.y + s.h], [s.x, s.y + s.h / 2]
        ];
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.setLineDash([]);
        for (const [hx, hy] of pts) {
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
          ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
        }
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
        <option value="importPhoto">📱 Import Photo Layer...</option>
        <option value="fx">Layer Style (fx)...</option>
        <option value="clip">Clipping Mask</option>
        <option value="invMask">Invert Mask</option>
        <option value="merge">Merge Down</option>
        <option value="flatten">Flatten Image</option>
      `;
      actSel.addEventListener('change', () => {
        const v = actSel.value;
        actSel.value = '';
        if (v === 'importPhoto') document.getElementById('file-input-place-layer').click();
        else if (v === 'fx') this.openLayerStylesModal();
        else if (v === 'clip') this.session.dispatch('layer.toggleClipping');
        else if (v === 'invMask') this.session.dispatch('layer.invertMask');
        else if (v === 'merge') this.session.dispatch('layer.mergeDown');
        else if (v === 'flatten') this.session.dispatch('layer.flattenImage');
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

    // Bottom Photoshop Layers Bar (fx | Mask | Adj | Import Photo | Dup | +New | Delete)
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
    mkFootBtn('🖼️', 'Import Photo from Phone as Layer', '', () => document.getElementById('file-input-place-layer').click());
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
        editT.title = 'Edit Text Directly on Canvas';
        editT.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
        editT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setRightLayersOpen(false);
          this.selectTool('text');
          this.startInlineTextEdit(lyr, false);
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
        <button type="button" class="pill-action-btn secondary" id="set-import-photo-layer" style="height:32px;justify-content:center;">📱 Import Photo Layer</button>
        <button type="button" class="pill-action-btn secondary" id="set-open-psd" style="height:32px;justify-content:center;">📂 Open Photo / PSD</button>
        <button type="button" class="pill-action-btn secondary" id="set-import-font" style="height:32px;justify-content:center;">🔤 Import Font (.ttf)</button>
        <button type="button" class="pill-action-btn secondary" id="set-save-work-now" style="height:32px;justify-content:center;">💾 Save Work Now</button>
        <button type="button" class="pill-action-btn" id="set-export-btn" style="height:32px;justify-content:center;">📤 Export / Save As</button>
        <a href="prostudio-mobile.apk" download="prostudio-mobile.apk" class="apk-download-btn" style="height:32px;justify-content:center;">⬇ Download APK</a>
      </div>
    `;
    stCard.querySelector('#sheet-btn-storage-cfg').addEventListener('click', () => this.openStorageSettingsModal());
    stCard.querySelector('#set-import-photo-layer').addEventListener('click', () => document.getElementById('file-input-place-layer').click());
    stCard.querySelector('#set-open-psd').addEventListener('click', () => document.getElementById('file-input-open').click());
    stCard.querySelector('#set-import-font').addEventListener('click', () => document.getElementById('file-input-font').click());
    stCard.querySelector('#set-save-work-now').addEventListener('click', () => {
      this.autoSaveCurrentProject(true);
      this.showToast('✓ Work saved to device storage!');
    });
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
  openLayerStylesModal(initialSection = null, initialIndex = 0) {
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
          <div style="display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);gap:8px;">
            <div class="ctrl-field">
              <label>Subfolder Name</label>
              <input type="text" class="pc-input" id="exp-subfolder-in" value="${this.exportSubfolder}" placeholder="ProStudio" />
            </div>
            <div class="ctrl-field">
              <label>File Name</label>
              <input type="text" class="pc-input" id="exp-filename-in" value="${baseFileName}" />
            </div>
          </div>
          <div id="exp-resolved-path" style="font-size:10.5px;font-family:var(--pc-font-mono);color:var(--pc-text-dim);padding-top:2px;word-break:break-all;"></div>
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
          const meta = ImageCodecs.getFormatMeta(format);
          const sub = subIn.value.trim();
          const fn = (nameIn.value.trim() || 'artwork') + '.' + meta.ext;
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

        // 2. Multi-Format File Format Dropdown (14 Professional Image & Document Formats!)
        const fmtGroup = document.createElement('div');
        fmtGroup.className = 'ctrl-field';
        fmtGroup.innerHTML = `<label>File Format (${EXPORT_FORMATS.length} Formats Supported)</label>`;
        const sel = document.createElement('select');
        sel.className = 'pc-select';
        sel.id = 'exp-format-select';
        for (const f of EXPORT_FORMATS) {
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
          const meta = ImageCodecs.getFormatMeta(format);
          const outW = format === 'ico' ? 256 : Math.round((doc.width * scalePct) / 100);
          const outH = format === 'ico' ? 256 : Math.round((doc.height * scalePct) / 100);
          let approxKB = Math.round((outW * outH * 4) / 1024);
          if (format === 'psd') {
            approxKB = Math.round((doc.width * doc.height * 4 * (doc.layers.length + 1)) / 1024);
          } else if (format === 'bmp' || format === 'tiff' || format === 'tga') {
            approxKB = Math.round((outW * outH * 4) / 1024);
          } else if (format === 'ppm') {
            approxKB = Math.round((outW * outH * 3) / 1024);
          } else if (format === 'ico') {
            approxKB = 42;
          } else if (format === 'gif') {
            approxKB = Math.max(8, Math.round((outW * outH * 0.35) / 1024));
          } else if (format === 'jpeg' || format === 'webp' || format === 'avif' || format === 'pdf') {
            approxKB = Math.max(12, Math.round(approxKB * (quality / 100) * 0.14));
          } else {
            approxKB = Math.round(approxKB * 0.42);
          }
          estBox.innerHTML = `
            <div>Dimensions<strong>${outW}×${outH}</strong></div>
            <div>Layers<strong>${meta.layered ? doc.layers.length : '1 (Flat)'}</strong></div>
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

  async performExport(format, quality = 0.92, scale = 1.0, customBaseName = null) {
    const doc = this.session.doc;
    if (!doc) return;
    doc.compose();
    const baseName =
      customBaseName ||
      doc.title.replace(/\.(psd|psb|png|jpg|jpeg|webp|avif|gif|bmp|tif|tiff|tga|ico|svg|pdf|ppm|psproj)$/i, '') ||
      'prostudio-mobile';

    const outW = Math.max(1, Math.round(doc.width * scale));
    const outH = Math.max(1, Math.round(doc.height * scale));
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const oCtx = outCanvas.getContext('2d');
    if (format === 'jpeg' || format === 'ppm') {
      oCtx.fillStyle = '#ffffff';
      oCtx.fillRect(0, 0, outW, outH);
    }
    oCtx.drawImage(doc.compositeCanvas, 0, 0, outW, outH);

    try {
      const encoded = await ImageCodecs.encodeCanvasOrDoc(format, doc, outCanvas, {
        quality,
        scale,
        psdCodec: PsdCodec,
        projectSerializer: () => this.serializeCurrentProject()
      });
      if (!encoded?.blob) return;
      if (encoded.fallbackFrom === 'avif') {
        this.showToast('AVIF encoder unavailable on this WebView — exported as .WEBP');
      }
      this.saveBlobToConfiguredLocation(encoded.blob, `${baseName}.${encoded.ext}`, encoded.mime);
    } catch (err) {
      this.showToast(`Export error: ${err.message}`);
    }
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
      const name = (file.name || '').toLowerCase();
      // Smart-route font files if picked via general file picker
      if (/\.(ttf|otf|woff2?|ttc)$/i.test(name)) {
        await this.handleImportFontFiles([file]);
        return;
      }

      this._userCreatedOrOpenedDoc = true;
      this._initialLoadComplete = true;

      if (name.endsWith('.psproj') || name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const restored = await this.deserializeProjectSnapshot(parsed);
        if (restored) {
          this.loadDocument(restored, true);
          this.newDocScreen?.close();
          this.closeSheet();
          this.showToast(`Opened Project ${restored.title} (${restored.layers.length} layers)`);
          return;
        }
      }

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
        this.loadDocument(doc, true);
        this.newDocScreen?.close();
        this.closeSheet();
        this.showToast(`Opened PSD (${doc.layers.length} layers)`);
        return;
      }

      const bmp = await this.decodeImageFileToDrawable(file);
      // Cap ultra-high-res phone camera photos to max 2048px while keeping exact aspect ratio for 60fps mobile GPU speed
      const maxDim = 2048;
      let w = bmp.width || bmp.naturalWidth || 1080;
      let h = bmp.height || bmp.naturalHeight || 1080;
      if (w > maxDim || h > maxDim) {
        const ratio = maxDim / Math.max(w, h);
        w = Math.max(64, Math.round(w * ratio));
        h = Math.max(64, Math.round(h * ratio));
      }

      const doc = new StudioDoc(w, h, (file.name || 'Phone-Photo').replace(/\.[^.]+$/, '.psd'));
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w;
      srcCanvas.height = h;
      srcCanvas.getContext('2d').drawImage(bmp, 0, 0, w, h);

      const bg = doc.createLayerObject({
        name: (file.name || 'Photo').replace(/\.[^.]+$/, ''),
        kind: 'raster',
        smartSource: {
          canvas: srcCanvas,
          cx: w / 2,
          cy: h / 2,
          w,
          h,
          origW: w,
          origH: h,
          rotation: 0,
          flipX: false,
          flipY: false
        }
      });
      doc.rasterizeSmartLayer(bg);
      doc.layers.push(bg);
      doc.activeLayerId = bg.id;
      doc.compose();
      doc.pushHistory(`Open ${file.name || 'Photo'}`);
      this.loadDocument(doc, true);
      this.newDocScreen?.close();
      this.closeSheet();
      this.showToast(`Imported ${file.name || 'Photo'} (${w}×${h})`);
    } catch (err) {
      this.showToast(`Error importing file: ${err.message}`);
    }
  }

  async decodeImageFileToDrawable(file) {
    return ImageCodecs.decodeFileToDrawable(file);
  }

  async handlePlaceImageAsLayer(file) {
    const name = (file?.name || '').toLowerCase();
    if (name.endsWith('.psd') || name.endsWith('.psb') || name.endsWith('.psproj') || name.endsWith('.json') || /\.(ttf|otf|woff2?)$/i.test(name)) {
      return this.handleOpenFile(file);
    }
    const doc = this.session.doc;
    if (!doc) return;
    try {
      this._userCreatedOrOpenedDoc = true;
      this._initialLoadComplete = true;
      const bmp = await this.decodeImageFileToDrawable(file);
      const rawW = bmp.width || bmp.naturalWidth || doc.width;
      const rawH = bmp.height || bmp.naturalHeight || doc.height;

      // Preserve crisp Smart Source capped at 2048px for 60fps mobile non-destructive scaling & rotation!
      const maxDim = 2048;
      let origW = rawW;
      let origH = rawH;
      if (origW > maxDim || origH > maxDim) {
        const capRatio = maxDim / Math.max(origW, origH);
        origW = Math.max(32, Math.round(origW * capRatio));
        origH = Math.max(32, Math.round(origH * capRatio));
      }

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = origW;
      srcCanvas.height = origH;
      const sCtx = srcCanvas.getContext('2d');
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(bmp, 0, 0, origW, origH);

      // Fit nicely inside 88% of canvas if larger than canvas so all 8 scale handles + rotation handle are immediately grabbable
      const fitScale = Math.min((doc.width * 0.88) / origW, (doc.height * 0.88) / origH, 1);
      const w = Math.max(24, Math.round(origW * fitScale));
      const h = Math.max(24, Math.round(origH * fitScale));

      const lyr = doc.createLayerObject({
        name: (file.name || 'Phone Photo').replace(/\.[^.]+$/, ''),
        kind: 'raster',
        smartSource: {
          canvas: srcCanvas,
          cx: doc.width / 2,
          cy: doc.height / 2,
          w,
          h,
          origW,
          origH,
          rotation: 0,
          flipX: false,
          flipY: false
        }
      });
      doc.rasterizeSmartLayer(lyr);

      const activeIdx = doc.layers.findIndex((l) => l.id === doc.activeLayerId);
      if (activeIdx >= 0) {
        doc.layers.splice(activeIdx + 1, 0, lyr);
      } else {
        doc.layers.push(lyr);
      }
      doc.activeLayerId = lyr.id;
      doc.setSelectedLayerIds([lyr.id]);
      doc.editingMask = false;
      this._cachedTransformBounds = null;
      doc.pushHistory(`Import ${lyr.name}`);
      this.newDocScreen?.close();
      this.closeSheet();
      // Auto-select Move & Free Transform tool so user can immediately scale, rotate & position their photo!
      this.selectTool('move');
      this.session.notify('layer.placed');
      this.showToast(`📱 Imported "${lyr.name}" — drag corners to scale, top handle to rotate!`);
    } catch (err) {
      this.showToast(`Could not import image: ${err.message}`);
    }
  }

  /* ==========================================================================
   * Android & Browser Back Button Hierarchy + IndexedDB Auto-Save & Restore
   * ========================================================================== */
  initBackNavigationAndAutoSave(hasSavedSession) {
    // 1. Register global Android native Back button handler called by MainActivity.onBackPressed()
    window.handleAndroidBack = () => this.handleBackAction();

    // 2. Push browser history guard so mobile gesture-back / browser back is also intercepted cleanly
    try {
      window.history.pushState({ prostudioGuard: true }, '');
      window.addEventListener('popstate', () => {
        const consumed = this.handleBackAction();
        if (consumed) {
          try {
            window.history.pushState({ prostudioGuard: true }, '');
          } catch (_) {}
        }
      });
    } catch (_) {}

    // 3. Auto-save immediately whenever app goes to background, tab hides, or page unloads
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this._initialLoadComplete) {
        if (this.inlineTextSession) this.commitInlineTextEdit();
        this.autoSaveCurrentProject(true);
      }
    });
    window.addEventListener('pagehide', () => {
      if (this._initialLoadComplete) {
        if (this.inlineTextSession) this.commitInlineTextEdit();
        this.autoSaveCurrentProject(true);
      }
    });
    window.addEventListener('beforeunload', () => {
      if (this._initialLoadComplete) {
        if (this.inlineTextSession) this.commitInlineTextEdit();
        this.autoSaveCurrentProject(true);
      }
    });

    // 4. Automatically restore saved work on startup if a saved session exists
    if (hasSavedSession) {
      this.restoreAutoSavedProject(false).finally(() => {
        this._initialLoadComplete = true;
      });
    } else {
      this._initialLoadComplete = true;
    }
  }

  /**
   * Smart Photoshop Mobile Back Button Hierarchy:
   * Closes open dropdowns -> canvas inspector -> modals -> live text edit -> right layers drawer -> bottom sheets -> active crop -> New Doc overlay.
   * When on the main canvas, auto-saves immediately and requires a double-Back press within 2.5s to exit!
   */
  handleBackAction() {
    // 1. Any open dropdown menu, tool flyout, or on-canvas control popover?
    const openPopovers = Array.from(document.querySelectorAll('.dropdown-popover')).filter((el) => !el.hidden);
    if (openPopovers.length > 0) {
      this.closeAllDropdowns();
      return true;
    }
    const ccp = document.getElementById('canvas-control-popover');
    if (ccp && !ccp.hidden) {
      this.closeCanvasPopover();
      return true;
    }

    // 2. Any open modal dialog (Layer Style fx, Export, Color Picker, Storage)?
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay && !modalOverlay.hidden) {
      this.closeModal();
      return true;
    }

    // 3. Active live on-canvas text editing?
    if (this.inlineTextSession) {
      this.commitInlineTextEdit();
      this.showToast('Committed Type Layer');
      return true;
    }

    // 4. Right-Side Docked Layers Drawer open?
    if (this.rightLayersOpen) {
      this.setRightLayersOpen(false);
      return true;
    }

    // 5. Any Bottom Sheet (Adjustments, Filters, Settings) open?
    if (this.activeSheet !== 'none') {
      this.closeSheet();
      return true;
    }

    // 6. Active Crop or Perspective Crop tool? Cancel back to Brush tool
    if (this.activeTool === 'crop' || this.activeTool === 'perspectiveCrop') {
      this.selectTool('brush');
      this.showToast('Exited Crop Mode');
      return true;
    }

    // 7. New Document screen open over an existing document? Close it back to canvas!
    const ndOverlay = document.getElementById('new-doc-overlay');
    if (ndOverlay && !ndOverlay.hidden && this.session.doc) {
      this.newDocScreen.close();
      return true;
    }

    // 8. On main canvas: immediately auto-save work & require double-back within 2.5s to exit app!
    this.autoSaveCurrentProject(true);
    const now = Date.now();
    if (now - (this._lastBackPressTime || 0) < 2500) {
      return false; // Allow MainActivity to moveTaskToBack(true) with work safely saved
    }
    this._lastBackPressTime = now;
    this.showToast('💾 Work Auto-Saved! Press Back again to exit');
    return true;
  }

  getSavedProjectMeta() {
    try {
      const raw = localStorage.getItem('prostudio_autosave_meta_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setAutoSaveBadgeState(saving = false) {
    const badge = document.getElementById('autosave-status-badge');
    if (!badge) return;
    if (saving) {
      badge.textContent = '⟳ Saving';
      badge.classList.add('saving');
    } else {
      badge.textContent = '✓ Saved';
      badge.classList.remove('saving');
    }
  }

  scheduleAutoSave() {
    if (!this._initialLoadComplete) return;
    this.setAutoSaveBadgeState(true);
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      this._autoSaveTimer = null;
      this.autoSaveCurrentProject(false);
    }, 420);
  }

  openAutoSaveDB() {
    if (this._idbPromise) return this._idbPromise;
    this._idbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open('ProStudioWorkDB', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this._idbPromise;
  }

  serializeCurrentProject() {
    const doc = this.session.doc;
    if (!doc) return null;
    doc.compose();

    // Generate compact 96x96 thumbnail for Resume banner
    let thumbDataUrl = '';
    try {
      const tc = document.createElement('canvas');
      tc.width = 96;
      tc.height = 96;
      const tCtx = tc.getContext('2d');
      const scale = Math.max(96 / doc.width, 96 / doc.height);
      const dw = doc.width * scale;
      const dh = doc.height * scale;
      tCtx.drawImage(doc.compositeCanvas, (96 - dw) / 2, (96 - dh) / 2, dw, dh);
      thumbDataUrl = tc.toDataURL('image/jpeg', 0.72);
    } catch (_) {}

    return {
      version: 1,
      savedAt: Date.now(),
      title: doc.title,
      width: doc.width,
      height: doc.height,
      activeLayerId: doc.activeLayerId,
      editingMask: Boolean(doc.editingMask),
      globalLight: structuredClone(doc.globalLight || { angle: 120, altitude: 30 }),
      slices: structuredClone(doc.slices || []),
      selectedSliceId: doc.selectedSliceId || null,
      hideAutoSlices: Boolean(doc.hideAutoSlices),
      fgColor: this.fgColor,
      bgColor: this.bgColor,
      zoom: this.zoom,
      panX: this.panX,
      panY: this.panY,
      typeSettings: structuredClone(this.typeSettings),
      thumbDataUrl,
      layers: doc.layers.map((l) => ({
        id: l.id,
        name: l.name,
        kind: l.kind,
        visible: l.visible !== false,
        opacity: l.opacity ?? 1,
        fill: l.fill ?? 1,
        blendMode: l.blendMode || 'source-over',
        locked: Boolean(l.locked),
        clipping: Boolean(l.clipping),
        maskEnabled: l.maskEnabled !== false,
        adjustment: l.adjustment ? structuredClone(l.adjustment) : null,
        textData: l.textData ? structuredClone(l.textData) : null,
        shapeData: l.shapeData ? structuredClone(l.shapeData) : null,
        styles: l.styles ? structuredClone(l.styles) : null,
        smartSource: l.smartSource?.canvas
          ? {
              canvasDataUrl: l.smartSource.canvas.toDataURL('image/png'),
              cx: l.smartSource.cx,
              cy: l.smartSource.cy,
              w: l.smartSource.w,
              h: l.smartSource.h,
              origW: l.smartSource.origW || l.smartSource.canvas.width,
              origH: l.smartSource.origH || l.smartSource.canvas.height,
              rotation: l.smartSource.rotation || 0,
              flipX: Boolean(l.smartSource.flipX),
              flipY: Boolean(l.smartSource.flipY)
            }
          : null,
        canvasDataUrl: l.kind === 'adjustment' ? null : l.canvas.toDataURL('image/png'),
        maskDataUrl: l.maskCanvas ? l.maskCanvas.toDataURL('image/png') : null
      }))
    };
  }

  async autoSaveCurrentProject(immediate = false) {
    if (this._autoSaveTimer && immediate) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
    const snapshot = this.serializeCurrentProject();
    if (!snapshot) return false;

    this.setAutoSaveBadgeState(true);

    const meta = {
      title: snapshot.title,
      width: snapshot.width,
      height: snapshot.height,
      layerCount: snapshot.layers.length,
      savedAt: snapshot.savedAt,
      thumbDataUrl: snapshot.thumbDataUrl
    };
    try {
      localStorage.setItem('prostudio_autosave_meta_v1', JSON.stringify(meta));
    } catch (_) {}

    // Save compact JSON fallback in localStorage if within quota
    try {
      const jsonStr = JSON.stringify(snapshot);
      if (jsonStr.length < 3800000) {
        localStorage.setItem('prostudio_autosave_fallback_v1', jsonStr);
      }
    } catch (_) {}

    // Primary high-capacity persistence in IndexedDB
    try {
      const db = await this.openAutoSaveDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('projects', 'readwrite');
        tx.objectStore('projects').put(snapshot, 'current_active_project');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {}

    this.setAutoSaveBadgeState(false);
    return true;
  }

  loadDataUrlToCanvas(dataUrl, width, height) {
    return new Promise((resolve) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      if (!dataUrl) {
        resolve(c);
        return;
      }
      const img = new Image();
      img.onload = () => {
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = () => resolve(c);
      img.src = dataUrl;
    });
  }

  async deserializeProjectSnapshot(snapshot) {
    if (!snapshot || !snapshot.width || !snapshot.height || !Array.isArray(snapshot.layers)) {
      return null;
    }
    const doc = new StudioDoc(snapshot.width, snapshot.height, snapshot.title || 'Restored-Work.psd');
    doc.globalLight = snapshot.globalLight ? structuredClone(snapshot.globalLight) : { angle: 120, altitude: 30 };
    doc.slices = Array.isArray(snapshot.slices) ? structuredClone(snapshot.slices) : [];
    doc.selectedSliceId = snapshot.selectedSliceId || null;
    doc.hideAutoSlices = Boolean(snapshot.hideAutoSlices);

    for (const lSnap of snapshot.layers) {
      const srcCanvas = lSnap.canvasDataUrl
        ? await this.loadDataUrlToCanvas(lSnap.canvasDataUrl, doc.width, doc.height)
        : null;
      const maskCanvas = lSnap.maskDataUrl
        ? await this.loadDataUrlToCanvas(lSnap.maskDataUrl, doc.width, doc.height)
        : null;

      let restoredSmart = null;
      if (lSnap.smartSource?.canvasDataUrl) {
        const sw = Math.max(1, Math.round(lSnap.smartSource.origW || doc.width));
        const sh = Math.max(1, Math.round(lSnap.smartSource.origH || doc.height));
        const ssCanvas = await this.loadDataUrlToCanvas(lSnap.smartSource.canvasDataUrl, sw, sh);
        restoredSmart = {
          canvas: ssCanvas,
          cx: lSnap.smartSource.cx ?? doc.width / 2,
          cy: lSnap.smartSource.cy ?? doc.height / 2,
          w: lSnap.smartSource.w ?? sw,
          h: lSnap.smartSource.h ?? sh,
          origW: sw,
          origH: sh,
          rotation: lSnap.smartSource.rotation || 0,
          flipX: Boolean(lSnap.smartSource.flipX),
          flipY: Boolean(lSnap.smartSource.flipY)
        };
      }

      const layer = doc.createLayerObject({
        id: lSnap.id,
        name: lSnap.name,
        kind: lSnap.kind || 'raster',
        visible: lSnap.visible !== false,
        opacity: lSnap.opacity ?? 1,
        fill: lSnap.fill ?? 1,
        blendMode: lSnap.blendMode || 'source-over',
        locked: Boolean(lSnap.locked),
        clipping: Boolean(lSnap.clipping),
        sourceCanvas: srcCanvas,
        maskCanvas,
        maskEnabled: lSnap.maskEnabled !== false,
        adjustment: lSnap.adjustment,
        textData: lSnap.textData,
        shapeData: lSnap.shapeData,
        styles: lSnap.styles,
        smartSource: restoredSmart
      });
      if (restoredSmart) {
        doc.rasterizeSmartLayer(layer);
      }
      doc.layers.push(layer);
    }

    if (doc.layers.length === 0) return null;
    doc.activeLayerId =
      doc.layers.find((l) => l.id === snapshot.activeLayerId)?.id || doc.layers[doc.layers.length - 1].id;
    doc.editingMask = Boolean(snapshot.editingMask && doc.activeLayer?.maskCanvas);
    doc.compose();
    doc.pushHistory(`Restored ${doc.title}`);
    return doc;
  }

  async restoreAutoSavedProject(force = false) {
    if (!force && this._userCreatedOrOpenedDoc) return false;
    let snapshot = null;

    try {
      const db = await this.openAutoSaveDB();
      snapshot = await new Promise((resolve) => {
        const tx = db.transaction('projects', 'readonly');
        const req = tx.objectStore('projects').get('current_active_project');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {}

    if (!snapshot) {
      try {
        const raw = localStorage.getItem('prostudio_autosave_fallback_v1');
        if (raw) snapshot = JSON.parse(raw);
      } catch (_) {}
    }

    if (!snapshot || (!force && this._userCreatedOrOpenedDoc)) return false;

    const doc = await this.deserializeProjectSnapshot(snapshot);
    if (!doc || (!force && this._userCreatedOrOpenedDoc)) return false;

    if (snapshot.fgColor) this.fgColor = snapshot.fgColor;
    if (snapshot.bgColor) this.bgColor = snapshot.bgColor;
    if (snapshot.typeSettings) {
      this.typeSettings = { ...this.typeSettings, ...snapshot.typeSettings };
    }
    this.syncColorSwatches();
    this.loadDocument(doc, false);
    this.newDocScreen?.close();
    this.setAutoSaveBadgeState(false);
    this.showToast(`✓ Restored saved work: ${doc.title} (${doc.layers.length} layer${doc.layers.length !== 1 ? 's' : ''})`);
    return true;
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
          this._userCreatedOrOpenedDoc = true;
          this._initialLoadComplete = true;
          this.loadDocument(SampleProjects.createBlankDocument(width, height, bg, title), true);
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
    if (window.ProStudioAndroid) {
      if (typeof window.ProStudioAndroid.hapticTick === 'function') {
        window.ProStudioAndroid.hapticTick();
      } else if (typeof window.ProStudioAndroid.vibrate === 'function') {
        window.ProStudioAndroid.vibrate(8);
      }
    } else if (navigator.vibrate) {
      navigator.vibrate(8);
    }
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    while (container.firstChild) container.firstChild.remove();
    const toast = document.createElement('div');
    toast.className = 'pc-toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 2000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.proStudioMobile = new ProStudioMobileApp();
});
