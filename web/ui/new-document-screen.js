/* ============================================================================
 * ProStudio Mobile — Photoshop-Style "New Document" Canvas Selection Screen
 * Matches Adobe Photoshop's New Document start screen:
 *  - Category Tabs: Recent, Saved, Photo, Print, Art & Illustration, Web, Mobile, Film & Video
 *  - "Let's start something new." hero + selectable preset cards with blueprint icons
 *  - Preset Details pane: Title, Width/Height + Units (px/in/cm/mm/pt), Portrait/Landscape
 *    Orientation toggle, Artboards checkbox, Resolution (ppi/ppc), Color Mode & Bit Depth,
 *    Background Contents (White/Black/Background/Transparent/Custom + swatch), Save Preset,
 *    Create, Open File..., and Close
 * ============================================================================ */

const RECENT_DOCS_KEY = 'prostudio_recent_doc_presets_v1';
const SAVED_DOCS_KEY = 'prostudio_saved_doc_presets_v1';

const CATEGORY_TABS = [
  { id: 'recent', label: 'Recent' },
  { id: 'saved', label: 'Saved' },
  { id: 'photo', label: 'Photo' },
  { id: 'print', label: 'Print' },
  { id: 'art', label: 'Art & Illustration' },
  { id: 'web', label: 'Web' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'film', label: 'Film & Video' }
];

const BUILTIN_PRESETS = {
  recent: [
    { id: 'r_a4', name: 'A4', width: 210, height: 297, unit: 'mm', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'print' },
    { id: 'r_ig_sq', name: 'Instagram Square', width: 1080, height: 1080, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'custom' },
    { id: 'r_ig_story', name: 'Story / Reels 9:16', width: 1080, height: 1920, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'mobile' },
    { id: 'r_c15', name: 'Custom', width: 1.5, height: 1.5, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'custom' },
    { id: 'r_c2', name: 'Custom', width: 2, height: 2, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'custom' },
    { id: 'r_banner', name: 'Poster 4:5', width: 1080, height: 1350, unit: 'px', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'print' }
  ],
  photo: [
    { id: 'ph_def', name: 'Default Photo Size', width: 7, height: 5, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'photo' },
    { id: 'ph_4x6', name: 'Landscape 4 × 6', width: 6, height: 4, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'photo' },
    { id: 'ph_5x7', name: 'Portrait 5 × 7', width: 5, height: 7, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'photo' },
    { id: 'ph_8x10', name: 'Portrait 8 × 10', width: 8, height: 10, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'photo' },
    { id: 'ph_sq', name: 'Square 1:1 Studio', width: 1600, height: 1600, unit: 'px', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'photo' }
  ],
  print: [
    { id: 'pr_a4', name: 'A4', width: 210, height: 297, unit: 'mm', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'print' },
    { id: 'pr_letter', name: 'Letter', width: 8.5, height: 11, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'print' },
    { id: 'pr_legal', name: 'Legal', width: 8.5, height: 14, unit: 'in', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'print' },
    { id: 'pr_a3', name: 'A3', width: 297, height: 420, unit: 'mm', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'print' },
    { id: 'pr_a5', name: 'A5', width: 148, height: 210, unit: 'mm', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'print' },
    { id: 'pr_poster', name: 'Poster 18 × 24', width: 18, height: 24, unit: 'in', ppi: 150, bg: 'white', bgColor: '#ffffff', icon: 'print' }
  ],
  art: [
    { id: 'ar_grid', name: '1000 px Grid', width: 1000, height: 1000, unit: 'px', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'art' },
    { id: 'ar_2k', name: '2000 px Square', width: 2000, height: 2000, unit: 'px', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'art' },
    { id: 'ar_poster', name: 'Poster Art 3:4', width: 1200, height: 1600, unit: 'px', ppi: 300, bg: 'white', bgColor: '#ffffff', icon: 'art' },
    { id: 'ar_transparent', name: 'Sticker Transparent', width: 1024, height: 1024, unit: 'px', ppi: 300, bg: 'transparent', bgColor: '#ffffff', icon: 'custom' }
  ],
  web: [
    { id: 'wb_common', name: 'Web Common', width: 1366, height: 768, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'web' },
    { id: 'wb_large', name: 'Web Large', width: 1920, height: 1080, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'web' },
    { id: 'wb_yt', name: 'YouTube Thumbnail', width: 1280, height: 720, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'web' },
    { id: 'wb_banner', name: 'Hero Banner', width: 1600, height: 600, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'web' }
  ],
  mobile: [
    { id: 'mb_android', name: 'Android Mobile', width: 1080, height: 2400, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'mobile' },
    { id: 'mb_iphone', name: 'iPhone Pro', width: 1179, height: 2556, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'mobile' },
    { id: 'mb_ipad', name: 'Tablet 3:4', width: 1536, height: 2048, unit: 'px', ppi: 72, bg: 'white', bgColor: '#ffffff', icon: 'mobile' }
  ],
  film: [
    { id: 'fm_1080', name: 'HDTV 1080p', width: 1920, height: 1080, unit: 'px', ppi: 72, bg: 'black', bgColor: '#000000', icon: 'web' },
    { id: 'fm_4k', name: 'UHD 4K (16:9)', width: 1920, height: 1080, unit: 'px', ppi: 144, bg: 'black', bgColor: '#000000', icon: 'web' },
    { id: 'fm_vert', name: 'Vertical Video 9:16', width: 1080, height: 1920, unit: 'px', ppi: 72, bg: 'black', bgColor: '#000000', icon: 'mobile' }
  ]
};

function loadStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr.slice(0, 16)));
  } catch {
    // ignore quota errors
  }
}

function unitToPixels(val, unit, ppi) {
  const n = Math.max(0.1, Number(val) || 1);
  const dpi = Math.max(36, Number(ppi) || 72);
  switch (unit) {
    case 'in':
      return n * dpi;
    case 'mm':
      return (n / 25.4) * dpi;
    case 'cm':
      return (n / 2.54) * dpi;
    case 'pt':
      return (n / 72) * dpi;
    case 'px':
    default:
      return n;
  }
}

function presetIconSvg(kind) {
  if (kind === 'print') {
    return `<svg viewBox="0 0 36 44" width="32" height="38" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="30" height="38" rx="1.5"/>
      <polygon points="18,12 11,24 25,24"/>
      <circle cx="22" cy="25" r="5" fill="#2c2d32"/>
    </svg>`;
  }
  if (kind === 'mobile') {
    return `<svg viewBox="0 0 36 44" width="32" height="38" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="6" y="3" width="24" height="38" rx="4"/>
      <line x1="15" y1="36" x2="21" y2="36"/>
    </svg>`;
  }
  if (kind === 'web') {
    return `<svg viewBox="0 0 44 36" width="36" height="30" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="4" width="38" height="28" rx="2"/>
      <line x1="3" y1="11" x2="41" y2="11"/>
    </svg>`;
  }
  if (kind === 'photo') {
    return `<svg viewBox="0 0 44 36" width="36" height="30" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="4" width="38" height="28" rx="2"/>
      <circle cx="14" cy="14" r="3"/>
      <polyline points="5,28 16,18 24,25 30,20 39,28"/>
    </svg>`;
  }
  // Photoshop Custom Pencil+Ruler blueprint icon!
  return `<svg viewBox="0 0 36 44" width="32" height="38" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="30" height="38" rx="1.5"/>
    <path d="M11 29 L25 15 M11 15 L25 29"/>
    <rect x="14" y="18" width="8" height="8" transform="rotate(45 18 22)" fill="#2c2d32"/>
  </svg>`;
}

export class PhotoshopNewDocumentScreen {
  constructor(app) {
    this.app = app;
    this.overlay = null;
    this.activeCategory = 'recent';
    this.selectedPresetId = 'r_a4';
    this.state = {
      title: 'Untitled-1',
      width: 210,
      height: 297,
      unit: 'mm',
      orientation: 'portrait', // 'portrait' | 'landscape'
      artboards: false,
      resolution: 300,
      resUnit: 'ppi', // 'ppi' | 'ppc'
      colorMode: 'rgb',
      bitDepth: '8',
      bgMode: 'white', // 'white' | 'black' | 'bgColor' | 'transparent' | 'custom'
      bgColor: '#ffffff'
    };
  }

  open(allowClose = true) {
    this.overlay = document.getElementById('new-doc-overlay');
    if (!this.overlay) return;
    this.allowClose = allowClose;
    this.render();
    this.overlay.hidden = false;
  }

  close() {
    if (this.overlay) this.overlay.hidden = true;
  }

  getPresetsForCategory(cat) {
    if (cat === 'recent') {
      const userRecents = loadStoredArray(RECENT_DOCS_KEY);
      return [...userRecents, ...BUILTIN_PRESETS.recent];
    }
    if (cat === 'saved') {
      return loadStoredArray(SAVED_DOCS_KEY);
    }
    return BUILTIN_PRESETS[cat] || [];
  }

  selectPreset(preset) {
    this.selectedPresetId = preset.id;
    this.state.width = preset.width;
    this.state.height = preset.height;
    this.state.unit = preset.unit || 'px';
    this.state.resolution = preset.ppi || 300;
    this.state.orientation = preset.width > preset.height ? 'landscape' : 'portrait';
    this.state.bgMode = preset.bg || 'white';
    this.state.bgColor = preset.bgColor || (preset.bg === 'black' ? '#000000' : '#ffffff');
    this.render();
  }

  computeCanvasPixels() {
    const effPpi = this.state.resUnit === 'ppc' ? (this.state.resolution || 72) * 2.54 : (this.state.resolution || 72);
    let pxW = Math.round(unitToPixels(this.state.width, this.state.unit, effPpi));
    let pxH = Math.round(unitToPixels(this.state.height, this.state.unit, effPpi));
    pxW = Math.max(64, pxW);
    pxH = Math.max(64, pxH);
    // Keep canvas fast & crisp on mobile GPUs while preserving exact aspect ratio
    const maxDim = 2048;
    if (pxW > maxDim || pxH > maxDim) {
      const ratio = maxDim / Math.max(pxW, pxH);
      pxW = Math.max(64, Math.round(pxW * ratio));
      pxH = Math.max(64, Math.round(pxH * ratio));
    }
    return { pxW, pxH };
  }

  handleCreateDocument() {
    const { pxW, pxH } = this.computeCanvasPixels();
    const title = (this.state.title || 'Untitled-1').trim();
    const cleanTitle = title.endsWith('.psd') ? title : `${title}.psd`;

    let fillColor = '#ffffff';
    if (this.state.bgMode === 'black') fillColor = '#000000';
    else if (this.state.bgMode === 'bgColor') fillColor = this.app.bgColor || '#f6f2e8';
    else if (this.state.bgMode === 'custom') fillColor = this.state.bgColor || '#ffffff';
    else if (this.state.bgMode === 'transparent') fillColor = 'transparent';

    // Save into Recent presets
    const recents = loadStoredArray(RECENT_DOCS_KEY).filter(
      (r) => !(r.width === this.state.width && r.height === this.state.height && r.unit === this.state.unit)
    );
    recents.unshift({
      id: `rec_${Date.now()}`,
      name: title === 'Untitled-1' ? 'Custom' : title,
      width: this.state.width,
      height: this.state.height,
      unit: this.state.unit,
      ppi: this.state.resolution,
      bg: this.state.bgMode,
      bgColor: fillColor === 'transparent' ? '#ffffff' : fillColor,
      icon: 'custom'
    });
    saveStoredArray(RECENT_DOCS_KEY, recents);

    this.app.createConfiguredDocument({
      width: pxW,
      height: pxH,
      title: cleanTitle,
      backgroundFill: fillColor,
      physicalLabel: `${this.state.width} × ${this.state.height} ${this.state.unit} @ ${this.state.resolution} ppi`
    });
    this.close();
  }

  render() {
    const el = this.overlay;
    const presets = this.getPresetsForCategory(this.activeCategory);
    const { pxW, pxH } = this.computeCanvasPixels();
    const savedMeta = this.app?.getSavedProjectMeta?.() || null;

    el.innerHTML = `
      <div class="nd-window">
        <header class="nd-titlebar">
          <div class="nd-titlebar-left">
            <img src="assets/icons/icon-64.png" alt="" style="width:18px;height:18px;border-radius:4px;" />
            <span>New Document</span>
          </div>
          <div class="nd-titlebar-actions">
            <button type="button" class="ps-fx-btn primary" id="nd-import-photo-btn" title="Open Photo from Phone Gallery">📱 Import Photo</button>
            <button type="button" class="ps-fx-btn" id="nd-open-file-btn" title="Open PSD or Project File from Phone">📂 Open PSD / File</button>
            ${this.allowClose ? `<button type="button" class="icon-btn" id="nd-close-x" title="Continue to Workspace" style="width:26px;height:26px;">✕</button>` : ''}
          </div>
        </header>

        <nav class="nd-cat-tabs" id="nd-cat-tabs">
          ${CATEGORY_TABS.map(
            (t) => `<button type="button" class="nd-cat-tab${this.activeCategory === t.id ? ' active' : ''}" data-cat="${t.id}">${t.label}</button>`
          ).join('')}
        </nav>

        <div class="nd-body">
          <!-- Left Preset Selection Area (Matches Photoshop Start Screen!) -->
          <div class="nd-presets-col">
            <div class="nd-hero">
              <h2>Let's start something new.</h2>
              <p>Create a canvas, import a photo from your phone, or resume your auto-saved project.</p>
            </div>

            ${
              savedMeta
                ? `
            <div class="nd-resume-banner" id="nd-resume-saved-btn" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border-radius:8px;background:rgba(20,115,230,0.18);border:1.5px solid #2680eb;cursor:pointer;">
              <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                ${savedMeta.thumbDataUrl ? `<img src="${savedMeta.thumbDataUrl}" alt="" style="width:36px;height:36px;border-radius:5px;object-fit:cover;border:1px solid rgba(255,255,255,0.25);flex-shrink:0;" />` : `<span style="font-size:20px;">💾</span>`}
                <div style="min-width:0;">
                  <strong style="display:block;font-size:12px;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">▶️ Resume Saved Work: ${savedMeta.title}</strong>
                  <span style="font-size:10px;color:#93c5fd;">${savedMeta.width} × ${savedMeta.height} px · ${savedMeta.layerCount || 1} layer${(savedMeta.layerCount || 1) !== 1 ? 's' : ''} · Auto-Saved</span>
                </div>
              </div>
              <span class="ps-fx-btn primary" style="flex-shrink:0;padding:0 10px;height:26px;display:inline-flex;align-items:center;">Resume ➔</span>
            </div>`
                : ''
            }

            <div class="nd-section-bar">
              <span>${this.activeCategory === 'recent' ? `YOUR RECENT ITEMS (${presets.length})` : `${this.activeCategory.toUpperCase()} PRESETS (${presets.length})`}</span>
              <div class="nd-quick-samples">
                <button type="button" class="nd-sample-pill" id="nd-import-layer-pill">📱 Photo from Phone</button>
                <button type="button" class="nd-sample-pill" id="nd-sample-wave">🌊 Ocean Sample</button>
                <button type="button" class="nd-sample-pill" id="nd-sample-space">🪐 Space Sample</button>
              </div>
            </div>

            <div class="nd-preset-grid" id="nd-preset-grid">
              ${
                presets.length === 0
                  ? `<div class="nd-empty-msg">No saved presets yet. Configure dimensions in Preset Details and tap 💾 to save one!</div>`
                  : presets
                      .map(
                        (p) => `
                <button type="button" class="nd-preset-card${this.selectedPresetId === p.id ? ' selected' : ''}" data-pid="${p.id}">
                  <div class="nd-preset-icon">${presetIconSvg(p.icon)}</div>
                  <strong class="nd-preset-name">${p.name}</strong>
                  <span class="nd-preset-meta">${p.width} × ${p.height} ${p.unit} @ ${p.ppi} ppi</span>
                </button>`
                      )
                      .join('')
              }
            </div>
          </div>

          <!-- Right Preset Details Inspector (Exact Match to Photoshop!) -->
          <aside class="nd-details-col">
            <div class="nd-details-head">
              <span>PRESET DETAILS</span>
              <button type="button" class="ps-fx-mini-btn" id="nd-save-preset-btn" title="Save Custom Document Preset">💾</button>
            </div>

            <input type="text" class="nd-title-input" id="nd-title-in" value="${this.state.title}" placeholder="Untitled-1" />

            <div class="nd-form-grid">
              <div class="nd-field">
                <label>Width</label>
                <input type="number" class="nd-input" id="nd-width-in" step="any" min="1" value="${this.state.width}" />
              </div>
              <div class="nd-field">
                <label>Units</label>
                <select class="nd-select" id="nd-unit-sel">
                  <option value="px" ${this.state.unit === 'px' ? 'selected' : ''}>Pixels</option>
                  <option value="in" ${this.state.unit === 'in' ? 'selected' : ''}>Inches</option>
                  <option value="cm" ${this.state.unit === 'cm' ? 'selected' : ''}>Centimeters</option>
                  <option value="mm" ${this.state.unit === 'mm' ? 'selected' : ''}>Millimeters</option>
                  <option value="pt" ${this.state.unit === 'pt' ? 'selected' : ''}>Points</option>
                </select>
              </div>
            </div>

            <div class="nd-form-grid">
              <div class="nd-field">
                <label>Height</label>
                <input type="number" class="nd-input" id="nd-height-in" step="any" min="1" value="${this.state.height}" />
              </div>
              <div class="nd-field">
                <label>Orientation</label>
                <div class="nd-orient-row">
                  <button type="button" class="nd-orient-btn${this.state.orientation === 'portrait' ? ' active' : ''}" id="nd-ori-port" title="Portrait">▯</button>
                  <button type="button" class="nd-orient-btn${this.state.orientation === 'landscape' ? ' active' : ''}" id="nd-ori-land" title="Landscape">▭</button>
                  <label class="ps-fx-check" style="margin-left:auto;font-size:10px;">
                    <input type="checkbox" id="nd-artboards-cb" ${this.state.artboards ? 'checked' : ''} /> Artboards
                  </label>
                </div>
              </div>
            </div>

            <div class="nd-form-grid">
              <div class="nd-field">
                <label>Resolution</label>
                <input type="number" class="nd-input" id="nd-res-in" min="36" max="1200" value="${this.state.resolution}" />
              </div>
              <div class="nd-field">
                <label>&nbsp;</label>
                <select class="nd-select" id="nd-resunit-sel">
                  <option value="ppi" ${this.state.resUnit === 'ppi' ? 'selected' : ''}>Pixels/Inch</option>
                  <option value="ppc" ${this.state.resUnit === 'ppc' ? 'selected' : ''}>Pixels/Centimeter</option>
                </select>
              </div>
            </div>

            <div class="nd-form-grid">
              <div class="nd-field">
                <label>Color Mode</label>
                <select class="nd-select" id="nd-cmode-sel">
                  <option value="rgb" ${this.state.colorMode === 'rgb' ? 'selected' : ''}>RGB Color</option>
                  <option value="gray" ${this.state.colorMode === 'gray' ? 'selected' : ''}>Grayscale</option>
                  <option value="cmyk" ${this.state.colorMode === 'cmyk' ? 'selected' : ''}>CMYK Color</option>
                  <option value="lab" ${this.state.colorMode === 'lab' ? 'selected' : ''}>Lab Color</option>
                </select>
              </div>
              <div class="nd-field">
                <label>Bit Depth</label>
                <select class="nd-select" id="nd-bit-sel">
                  <option value="8" ${this.state.bitDepth === '8' ? 'selected' : ''}>8 bit</option>
                  <option value="16" ${this.state.bitDepth === '16' ? 'selected' : ''}>16 bit</option>
                  <option value="32" ${this.state.bitDepth === '32' ? 'selected' : ''}>32 bit</option>
                </select>
              </div>
            </div>

            <div class="nd-field">
              <label>Background Contents</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <select class="nd-select" id="nd-bg-sel" style="flex:1;">
                  <option value="white" ${this.state.bgMode === 'white' ? 'selected' : ''}>White</option>
                  <option value="black" ${this.state.bgMode === 'black' ? 'selected' : ''}>Black</option>
                  <option value="bgColor" ${this.state.bgMode === 'bgColor' ? 'selected' : ''}>Background Color</option>
                  <option value="transparent" ${this.state.bgMode === 'transparent' ? 'selected' : ''}>Transparent</option>
                  <option value="custom" ${this.state.bgMode === 'custom' ? 'selected' : ''}>Custom</option>
                </select>
                <input type="color" class="ps-fx-swatch" id="nd-bg-col" value="${this.state.bgMode === 'black' ? '#000000' : this.state.bgColor}" title="Background Color" />
              </div>
            </div>

            <div class="nd-px-preview" id="nd-px-preview">
              Output Canvas: <strong>${pxW} × ${pxH} px</strong> (${this.state.colorMode.toUpperCase()}/${this.state.bitDepth})
            </div>

            <div class="nd-details-footer">
              <button type="button" class="ps-fx-btn" id="nd-close-btn">Close</button>
              <button type="button" class="ps-fx-btn primary" id="nd-create-btn">Create</button>
            </div>
          </aside>
        </div>
      </div>
    `;

    // Wire Category Tabs
    el.querySelectorAll('.nd-cat-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.cat;
        this.render();
      });
    });

    // Wire Preset Cards
    el.querySelectorAll('.nd-preset-card').forEach((card) => {
      card.addEventListener('click', () => {
        const found = presets.find((p) => p.id === card.dataset.pid);
        if (found) this.selectPreset(found);
      });
      card.addEventListener('dblclick', () => {
        const found = presets.find((p) => p.id === card.dataset.pid);
        if (found) {
          this.selectPreset(found);
          this.handleCreateDocument();
        }
      });
    });

    // Wire Import Photo from Phone, Open File, Resume Saved Work & Sample Projects
    el.querySelector('#nd-import-photo-btn')?.addEventListener('click', () => {
      document.getElementById('file-input-phone-photo-open').click();
    });
    el.querySelector('#nd-import-layer-pill')?.addEventListener('click', () => {
      document.getElementById('file-input-phone-photo-open').click();
    });
    el.querySelector('#nd-open-file-btn').addEventListener('click', () => {
      document.getElementById('file-input-open').click();
    });
    el.querySelector('#nd-resume-saved-btn')?.addEventListener('click', async () => {
      const ok = await this.app.restoreAutoSavedProject(true);
      if (ok) this.close();
    });
    el.querySelector('#nd-sample-wave').addEventListener('click', () => {
      this.app.loadSampleProject('wave');
      this.close();
    });
    el.querySelector('#nd-sample-space').addEventListener('click', () => {
      this.app.loadSampleProject('space');
      this.close();
    });

    const updatePreviewLabel = () => {
      const { pxW: w, pxH: h } = this.computeCanvasPixels();
      const lbl = el.querySelector('#nd-px-preview');
      if (lbl) lbl.innerHTML = `Output Canvas: <strong>${w} × ${h} px</strong> (${this.state.colorMode.toUpperCase()}/${this.state.bitDepth})`;
    };

    el.querySelector('#nd-title-in').addEventListener('input', (e) => { this.state.title = e.target.value; });
    el.querySelector('#nd-width-in').addEventListener('input', (e) => {
      this.state.width = Math.max(1, Number(e.target.value) || 1);
      this.state.orientation = this.state.width > this.state.height ? 'landscape' : 'portrait';
      updatePreviewLabel();
    });
    el.querySelector('#nd-height-in').addEventListener('input', (e) => {
      this.state.height = Math.max(1, Number(e.target.value) || 1);
      this.state.orientation = this.state.width > this.state.height ? 'landscape' : 'portrait';
      updatePreviewLabel();
    });
    el.querySelector('#nd-unit-sel').addEventListener('change', (e) => {
      this.state.unit = e.target.value;
      updatePreviewLabel();
    });
    el.querySelector('#nd-ori-port').addEventListener('click', () => {
      if (this.state.width > this.state.height) {
        [this.state.width, this.state.height] = [this.state.height, this.state.width];
      }
      this.state.orientation = 'portrait';
      this.render();
    });
    el.querySelector('#nd-ori-land').addEventListener('click', () => {
      if (this.state.height > this.state.width) {
        [this.state.width, this.state.height] = [this.state.height, this.state.width];
      }
      this.state.orientation = 'landscape';
      this.render();
    });
    el.querySelector('#nd-artboards-cb').addEventListener('change', (e) => { this.state.artboards = e.target.checked; });
    el.querySelector('#nd-res-in').addEventListener('input', (e) => {
      this.state.resolution = Math.max(36, Number(e.target.value) || 72);
      updatePreviewLabel();
    });
    el.querySelector('#nd-resunit-sel').addEventListener('change', (e) => {
      this.state.resUnit = e.target.value;
      updatePreviewLabel();
    });
    el.querySelector('#nd-cmode-sel').addEventListener('change', (e) => {
      this.state.colorMode = e.target.value;
      updatePreviewLabel();
    });
    el.querySelector('#nd-bit-sel').addEventListener('change', (e) => {
      this.state.bitDepth = e.target.value;
      updatePreviewLabel();
    });
    el.querySelector('#nd-bg-sel').addEventListener('change', (e) => {
      this.state.bgMode = e.target.value;
      if (this.state.bgMode === 'white') this.state.bgColor = '#ffffff';
      if (this.state.bgMode === 'black') this.state.bgColor = '#000000';
      el.querySelector('#nd-bg-col').value = this.state.bgColor;
    });
    el.querySelector('#nd-bg-col').addEventListener('input', (e) => {
      this.state.bgColor = e.target.value;
      this.state.bgMode = 'custom';
      el.querySelector('#nd-bg-sel').value = 'custom';
    });

    // Save Custom Preset
    el.querySelector('#nd-save-preset-btn').addEventListener('click', () => {
      const saved = loadStoredArray(SAVED_DOCS_KEY);
      saved.unshift({
        id: `sav_${Date.now()}`,
        name: this.state.title || 'Custom Preset',
        width: this.state.width,
        height: this.state.height,
        unit: this.state.unit,
        ppi: this.state.resolution,
        bg: this.state.bgMode,
        bgColor: this.state.bgColor,
        icon: 'custom'
      });
      saveStoredArray(SAVED_DOCS_KEY, saved);
      this.activeCategory = 'saved';
      this.app.showToast(`Saved Preset "${this.state.title || 'Custom Preset'}"`);
      this.render();
    });

    // Create & Close buttons
    el.querySelector('#nd-create-btn').addEventListener('click', () => this.handleCreateDocument());
    el.querySelector('#nd-close-btn').addEventListener('click', () => this.close());
    const closeX = el.querySelector('#nd-close-x');
    if (closeX) closeX.addEventListener('click', () => this.close());
  }
}
