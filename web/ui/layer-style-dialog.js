/* ============================================================================
 * ProStudio Mobile — Adobe Photoshop-Exact Layer Style (fx) Dialog Controller
 * Implements the complete Photoshop CC Layer Style dialog:
 *  - Left Effects Tree (Styles, Blending Options, Bevel & Emboss -> Contour /
 *    Texture, Stackable (+) Stroke / Inner Shadow / Color Overlay / Gradient
 *    Overlay / Drop Shadow, Inner Glow, Satin, Pattern Overlay, Outer Glow)
 *  - Bottom Tree Controls: fx ▾, Move Up ↑, Move Down ↓, Delete 🗑
 *  - Right/Top Chrome: OK, Cancel (full rollback), New Style..., [✓] Preview
 *    toggle, and Live Layer Style Preview Square
 *  - Authentic Photoshop Controls: Slider + Numeric Boxes, Interactive Angle &
 *    Altitude Dial, Visual 12-Curve Contour Picker, Solid vs. Gradient Radio
 *    Bar, Blend If This/Underlying Split-Feather Gradient Bars, Make Default &
 *    Reset to Default
 * ============================================================================ */

import {
  LayerStylesEngine,
  PHOTOSHOP_BLEND_MODES,
  CONTOUR_PRESETS,
  PATTERN_PRESETS,
  GRADIENT_PRESETS,
  STACKABLE_EFFECT_KEYS
} from '../engine/layer-styles-engine.js';

function drawContourThumbnail(canvas, contourId) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Dark gray background matching Photoshop Contour well
  ctx.fillStyle = '#23252a';
  ctx.fillRect(0, 0, w, h);

  // Subtle grid crosshair
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Filled bright region under curve (exact Photoshop contour preview look!)
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x++) {
    const t = x / w;
    const y = h - LayerStylesEngine.evaluateContour(contourId, t) * (h - 2) - 1;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = '#e5e7eb';
  ctx.fill();

  // Crisp stroke on top
  ctx.beginPath();
  for (let x = 0; x <= w; x++) {
    const t = x / w;
    const y = h - LayerStylesEngine.evaluateContour(contourId, t) * (h - 2) - 1;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGradientBar(canvas, stops, reverse = false) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Checkerboard backdrop for transparency visibility (exact Photoshop gradient bar look!)
  const sq = 5;
  for (let y = 0; y < h; y += sq) {
    for (let x = 0; x < w; x += sq) {
      ctx.fillStyle = ((x / sq + y / sq) & 1) ? '#9ca3af' : '#e5e7eb';
      ctx.fillRect(x, y, sq, sq);
    }
  }

  const arr = Array.isArray(stops) && stops.length > 0
    ? stops
    : [
        { pos: 0, color: '#ffffbe', opacity: 1 },
        { pos: 1, color: '#ffffbe', opacity: 0 }
      ];
  const sorted = reverse
    ? arr.map((s) => ({ ...s, pos: 1 - s.pos })).sort((a, b) => a.pos - b.pos)
    : [...arr].sort((a, b) => a.pos - b.pos);

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  for (const s of sorted) {
    const clean = String(s.color || '#ffffff').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const num = parseInt(full, 16) || 0;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    grad.addColorStop(Math.max(0, Math.min(1, s.pos)), `rgba(${r},${g},${b},${s.opacity ?? 1})`);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Renders a live Photoshop-style rounded-square sample box showing the active layer styles.
 */
function renderStylePreviewCanvas(canvas, styles, layerMeta, globalLight) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Dark gray neutral stage (matching Photoshop Layer Style Preview box)
  ctx.fillStyle = '#383a3f';
  ctx.fillRect(0, 0, w, h);

  // Sample square shape in the center
  const sample = document.createElement('canvas');
  sample.width = w;
  sample.height = h;
  const sCtx = sample.getContext('2d');
  const pad = Math.round(w * 0.25);
  const sw = w - pad * 2;
  const sh = h - pad * 2;
  sCtx.fillStyle = '#8b8e94';
  if (sCtx.roundRect) {
    sCtx.beginPath();
    sCtx.roundRect(pad, pad, sw, sh, 4);
    sCtx.fill();
  } else {
    sCtx.fillRect(pad, pad, sw, sh);
  }

  // Scale down pixel radii proportionally so preview box looks crisp at small size
  const scaled = structuredClone(LayerStylesEngine.normalizeLayerStyles(styles));
  const sc = 0.42;
  if (scaled.outerGlow) scaled.outerGlow.size = Math.min(18, Math.round((scaled.outerGlow.size ?? 7) * sc));
  if (scaled.innerGlow) scaled.innerGlow.size = Math.min(14, Math.round((scaled.innerGlow.size ?? 5) * sc));
  if (scaled.bevelEmboss) scaled.bevelEmboss.size = Math.min(10, Math.round((scaled.bevelEmboss.size ?? 5) * sc));
  if (scaled.satin) {
    scaled.satin.distance = Math.min(10, Math.round((scaled.satin.distance ?? 11) * sc));
    scaled.satin.size = Math.min(10, Math.round((scaled.satin.size ?? 14) * sc));
  }
  scaled.strokes.forEach((s) => { s.size = Math.max(1, Math.min(10, Math.round((s.size ?? 3) * sc))); });
  scaled.dropShadows.forEach((s) => {
    s.distance = Math.min(14, Math.round((s.distance ?? 5) * sc));
    s.size = Math.min(14, Math.round((s.size ?? 5) * sc));
  });
  scaled.innerShadows.forEach((s) => {
    s.distance = Math.min(10, Math.round((s.distance ?? 5) * sc));
    s.size = Math.min(10, Math.round((s.size ?? 5) * sc));
  });

  const dummyLayer = {
    opacity: layerMeta?.opacity ?? 1,
    fill: layerMeta?.fill ?? 1,
    blendMode: layerMeta?.blendMode || 'source-over',
    styles: scaled
  };
  LayerStylesEngine.renderLayerWithEffects(dummyLayer, ctx, sample, w, h, globalLight);
}

export class PhotoshopLayerStyleDialog {
  constructor(app) {
    this.app = app;
  }

  open(initialSection = null, initialIndex = 0) {
    const doc = this.app.session.doc;
    const layer = doc?.activeLayer;
    if (!doc || !layer || layer.kind === 'adjustment') {
      this.app.showToast('Select a pixel, type, or shape layer to edit Layer Style (fx)');
      return;
    }

    layer.styles = LayerStylesEngine.normalizeLayerStyles(layer.styles);

    // Save complete rollback snapshot for Cancel & Preview checkbox toggle!
    const snapshot = {
      styles: structuredClone(layer.styles),
      opacity: layer.opacity ?? 1,
      fill: layer.fill ?? 1,
      blendMode: layer.blendMode || 'source-over',
      globalLight: structuredClone(doc.globalLight || { angle: 120, altitude: 30 })
    };

    // Working copy edited inside dialog
    let workingStyles = structuredClone(layer.styles);
    let workingMeta = {
      opacity: layer.opacity ?? 1,
      fill: layer.fill ?? 1,
      blendMode: layer.blendMode || 'source-over'
    };
    let previewEnabled = true;
    let peekCanvasMode = false;
    let pendingRaf = null;

    // Smart Initial Section: when opened generically (null), jump straight to the first enabled effect
    // (e.g., Drop Shadow) so users immediately see its controls instead of hunting from Blending Options!
    let resolvedSection = initialSection;
    let resolvedIndex = initialIndex || 0;
    if (!resolvedSection) {
      const activeEntries = LayerStylesEngine.listActiveEffectEntries(workingStyles);
      if (activeEntries.length > 0) {
        resolvedSection = activeEntries[0].type;
        resolvedIndex = activeEntries[0].index || 0;
      } else {
        resolvedSection = 'blendingOptions';
        resolvedIndex = 0;
      }
    }

    // Selection state in left tree: { section, index }
    let activeSelection = {
      section: resolvedSection,
      index: resolvedIndex
    };

    const overlay = document.getElementById('modal-overlay');
    const card = document.getElementById('modal-card');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    overlay.classList.add('ps-fx-overlay');
    overlay.classList.remove('ps-fx-peek-mode');
    card.classList.add('ps-fx-modal-card');
    card.classList.remove('ps-fx-peek-mode');
    titleEl.textContent = `Layer Style — ${layer.name}`;
    bodyEl.innerHTML = '';
    footerEl.innerHTML = '';

    const applyToCanvas = () => {
      if (pendingRaf) {
        cancelAnimationFrame(pendingRaf);
        pendingRaf = null;
      }
      if (previewEnabled) {
        layer.styles = workingStyles;
        layer.opacity = workingMeta.opacity;
        layer.fill = workingMeta.fill;
        layer.blendMode = workingMeta.blendMode;
      } else {
        layer.styles = structuredClone(snapshot.styles);
        layer.opacity = snapshot.opacity;
        layer.fill = snapshot.fill;
        layer.blendMode = snapshot.blendMode;
      }
      doc.compose();
      this.app.requestRender();
      if (previewCanvas) {
        renderStylePreviewCanvas(previewCanvas, workingStyles, workingMeta, doc.globalLight);
      }
    };

    const scheduleApplyToCanvas = () => {
      if (pendingRaf) return;
      pendingRaf = requestAnimationFrame(() => {
        pendingRaf = null;
        applyToCanvas();
      });
    };

    const cleanupAndClose = () => {
      if (pendingRaf) {
        cancelAnimationFrame(pendingRaf);
        pendingRaf = null;
      }
      overlay.classList.remove('ps-fx-overlay', 'ps-fx-peek-mode');
      card.classList.remove('ps-fx-modal-card', 'ps-fx-peek-mode');
      overlay.hidden = true;
    };

    const cancelAndClose = () => {
      layer.styles = structuredClone(snapshot.styles);
      layer.opacity = snapshot.opacity;
      layer.fill = snapshot.fill;
      layer.blendMode = snapshot.blendMode;
      doc.globalLight = structuredClone(snapshot.globalLight);
      doc.compose();
      this.app.requestRender();
      cleanupAndClose();
    };

    const commitAndClose = () => {
      layer.styles = structuredClone(workingStyles);
      layer.opacity = workingMeta.opacity;
      layer.fill = workingMeta.fill;
      layer.blendMode = workingMeta.blendMode;
      doc.compose();
      doc.pushHistory(`Layer Style (${layer.name})`);
      this.app.session.notify('layer.styles');
      cleanupAndClose();
    };

    // ------------------------------------------------------------------------
    // TOP PHOTOSHOP ACTION BAR (Live Preview Square + [✓] Preview + 👁 Canvas + New Style + Cancel + OK)
    // ------------------------------------------------------------------------
    const topStrip = document.createElement('div');
    topStrip.className = 'ps-fx-top-strip';

    const previewBoxWrap = document.createElement('div');
    previewBoxWrap.className = 'ps-fx-preview-wrap';
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 76;
    previewCanvas.height = 76;
    previewCanvas.className = 'ps-fx-preview-canvas';
    previewBoxWrap.appendChild(previewCanvas);

    const previewToggleLabel = document.createElement('label');
    previewToggleLabel.className = 'ps-fx-check';
    previewToggleLabel.innerHTML = `<input type="checkbox" id="ps-fx-preview-cb" checked /> <span>Preview</span>`;
    previewToggleLabel.querySelector('input').addEventListener('change', (e) => {
      previewEnabled = e.target.checked;
      applyToCanvas();
    });
    previewBoxWrap.appendChild(previewToggleLabel);
    topStrip.appendChild(previewBoxWrap);

    const topBtns = document.createElement('div');
    topBtns.className = 'ps-fx-top-btns';

    const btnPeek = document.createElement('button');
    btnPeek.type = 'button';
    btnPeek.className = 'ps-fx-btn';
    btnPeek.id = 'ps-fx-peek-btn';
    btnPeek.title = 'Dock panel to bottom half so you can see your live canvas while adjusting fx';
    btnPeek.textContent = '👁 Canvas';
    btnPeek.addEventListener('click', () => {
      peekCanvasMode = !peekCanvasMode;
      overlay.classList.toggle('ps-fx-peek-mode', peekCanvasMode);
      card.classList.toggle('ps-fx-peek-mode', peekCanvasMode);
      btnPeek.classList.toggle('active', peekCanvasMode);
      btnPeek.textContent = peekCanvasMode ? '⤢ Full' : '👁 Canvas';
    });

    const btnNewStyle = document.createElement('button');
    btnNewStyle.type = 'button';
    btnNewStyle.className = 'ps-fx-btn';
    btnNewStyle.textContent = 'New Style...';
    btnNewStyle.addEventListener('click', () => openNewStyleInlinePrompt());

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'ps-fx-btn';
    btnCancel.id = 'ps-fx-cancel-btn';
    btnCancel.textContent = 'Cancel';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = 'ps-fx-btn primary';
    btnOk.id = 'ps-fx-ok-btn';
    btnOk.textContent = 'OK';

    topBtns.appendChild(btnPeek);
    topBtns.appendChild(btnNewStyle);
    topBtns.appendChild(btnCancel);
    topBtns.appendChild(btnOk);
    topStrip.appendChild(topBtns);
    bodyEl.appendChild(topStrip);

    // Inline New Style save bar (hidden until New Style... is clicked)
    const newStyleBar = document.createElement('div');
    newStyleBar.className = 'ps-fx-new-style-bar';
    newStyleBar.hidden = true;
    bodyEl.appendChild(newStyleBar);

    const openNewStyleInlinePrompt = () => {
      newStyleBar.hidden = false;
      newStyleBar.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;width:100%;">
          <input type="text" class="ps-fx-text-in" id="ps-new-style-name" value="Style ${LayerStylesEngine.getSavedUserStyles().length + 1}" placeholder="Style Name" style="flex:1;min-width:110px;" />
          <label class="ps-fx-check"><input type="checkbox" id="ps-ns-fx" checked /> Effects</label>
          <label class="ps-fx-check"><input type="checkbox" id="ps-ns-bo" checked /> Blending</label>
          <button type="button" class="ps-fx-btn primary" id="ps-ns-save">Save</button>
          <button type="button" class="ps-fx-btn" id="ps-ns-cancel">✕</button>
        </div>
      `;
      newStyleBar.querySelector('#ps-ns-cancel').addEventListener('click', () => {
        newStyleBar.hidden = true;
      });
      newStyleBar.querySelector('#ps-ns-save').addEventListener('click', () => {
        const name = newStyleBar.querySelector('#ps-new-style-name').value.trim() || 'Custom Style';
        const incBo = newStyleBar.querySelector('#ps-ns-bo').checked;
        LayerStylesEngine.saveUserStylePreset(name, workingStyles, incBo, workingMeta);
        newStyleBar.hidden = true;
        this.app.showToast(`Saved Style "${name}"`);
        if (activeSelection.section === 'styles') renderRightPane();
      });
    };

    // ------------------------------------------------------------------------
    // MAIN 2-COLUMN PHOTOSHOP SPLIT: LEFT EFFECTS TREE | RIGHT CONTROLS PANE
    // ------------------------------------------------------------------------
    const split = document.createElement('div');
    split.className = 'ps-fx-split';

    const leftCol = document.createElement('aside');
    leftCol.className = 'ps-fx-sidebar';

    const treeList = document.createElement('div');
    treeList.className = 'ps-fx-tree';
    leftCol.appendChild(treeList);

    // Bottom Left Photoshop Sidebar Action Bar (fx ▾, ↑, ↓, 🗑)
    const treeFooter = document.createElement('div');
    treeFooter.className = 'ps-fx-tree-footer';
    treeFooter.innerHTML = `
      <div style="position:relative;">
        <button type="button" class="ps-fx-mini-btn" id="ps-tree-fx-menu" title="Effects List Options"><i>fx</i> ▾</button>
        <div class="dropdown-popover up-left" id="ps-tree-fx-popover" hidden style="min-width:170px;"></div>
      </div>
      <div style="display:flex;gap:3px;">
        <button type="button" class="ps-fx-mini-btn" id="ps-tree-up" title="Move Effect Up">↑</button>
        <button type="button" class="ps-fx-mini-btn" id="ps-tree-down" title="Move Effect Down">↓</button>
        <button type="button" class="ps-fx-mini-btn" id="ps-tree-del" title="Delete / Disable Effect">🗑</button>
      </div>
    `;
    leftCol.appendChild(treeFooter);

    const rightCol = document.createElement('div');
    rightCol.className = 'ps-fx-pane';

    split.appendChild(leftCol);
    split.appendChild(rightCol);
    bodyEl.appendChild(split);

    split.addEventListener('click', () => {
      rightCol.querySelectorAll('.ps-fx-contour-pop').forEach((p) => { p.hidden = true; });
      const fxMenuPop = treeFooter.querySelector('#ps-tree-fx-popover');
      if (fxMenuPop) fxMenuPop.hidden = true;
    });

    // Helper: Get currently active effect object (for stackable or singleton)
    const getTargetEffect = (sec = activeSelection.section, idx = activeSelection.index) => {
      if (STACKABLE_EFFECT_KEYS[sec]) {
        const arr = workingStyles[STACKABLE_EFFECT_KEYS[sec]];
        return arr[Math.max(0, Math.min(arr.length - 1, idx))];
      }
      if (sec === 'contour' || sec === 'texture') return workingStyles.bevelEmboss;
      return workingStyles[sec];
    };

    // Wire tree bottom toolbar buttons
    const fxPop = treeFooter.querySelector('#ps-tree-fx-popover');
    treeFooter.querySelector('#ps-tree-fx-menu').addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = fxPop.hidden;
      fxPop.hidden = !willOpen;
      if (willOpen) {
        fxPop.innerHTML = '';
        const addOpt = (label, fn) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'dropdown-item';
          b.textContent = label;
          b.addEventListener('click', () => {
            fxPop.hidden = true;
            fn();
          });
          fxPop.appendChild(b);
        };
        addOpt('Reset to Default List', () => {
          workingStyles = LayerStylesEngine.createDefaultLayerStyles();
          activeSelection = { section: 'blendingOptions', index: 0 };
          applyToCanvas();
          renderAll();
        });
        addOpt('Clear All Effects', () => {
          const bo = structuredClone(workingStyles.blendOptions);
          workingStyles = LayerStylesEngine.createDefaultLayerStyles();
          workingStyles.blendOptions = bo;
          applyToCanvas();
          renderAll();
        });
        addOpt('Copy Layer Style', () => {
          this.app.session.copiedLayerStyle = structuredClone(workingStyles);
          this.app.session.copiedFillOpacity = workingMeta.fill;
          this.app.showToast('Copied Layer Style');
        });
        addOpt('Paste Layer Style', () => {
          if (this.app.session.copiedLayerStyle) {
            workingStyles = LayerStylesEngine.normalizeLayerStyles(this.app.session.copiedLayerStyle);
            workingMeta.fill = this.app.session.copiedFillOpacity ?? 1;
            applyToCanvas();
            renderAll();
            this.app.showToast('Pasted Layer Style');
          }
        });
      }
    });

    treeFooter.querySelector('#ps-tree-up').addEventListener('click', () => {
      const plural = STACKABLE_EFFECT_KEYS[activeSelection.section];
      if (!plural) return;
      const arr = workingStyles[plural];
      const i = activeSelection.index;
      if (i > 0) {
        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        activeSelection.index = i - 1;
        applyToCanvas();
        renderAll();
      }
    });

    treeFooter.querySelector('#ps-tree-down').addEventListener('click', () => {
      const plural = STACKABLE_EFFECT_KEYS[activeSelection.section];
      if (!plural) return;
      const arr = workingStyles[plural];
      const i = activeSelection.index;
      if (i < arr.length - 1) {
        [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
        activeSelection.index = i + 1;
        applyToCanvas();
        renderAll();
      }
    });

    treeFooter.querySelector('#ps-tree-del').addEventListener('click', () => {
      const sec = activeSelection.section;
      const plural = STACKABLE_EFFECT_KEYS[sec];
      if (plural) {
        const arr = workingStyles[plural];
        if (arr.length > 1) {
          arr.splice(activeSelection.index, 1);
          activeSelection.index = Math.max(0, activeSelection.index - 1);
        } else {
          arr[0] = LayerStylesEngine.createDefaultEffect(sec, false);
        }
        applyToCanvas();
        renderAll();
      } else if (sec === 'contour') {
        workingStyles.bevelEmboss.contourEnabled = false;
        applyToCanvas();
        renderAll();
      } else if (sec === 'texture') {
        workingStyles.bevelEmboss.textureEnabled = false;
        applyToCanvas();
        renderAll();
      } else if (workingStyles[sec] && typeof workingStyles[sec].enabled === 'boolean') {
        workingStyles[sec].enabled = false;
        applyToCanvas();
        renderAll();
      }
    });

    // ------------------------------------------------------------------------
    // LEFT TREE RENDERER (Exact Photoshop Sidebar Hierarchy!)
    // ------------------------------------------------------------------------
    const renderTree = () => {
      treeList.innerHTML = '';

      const addRow = ({ section, index = 0, label, checkbox = false, checked = false, indent = false, stackable = false, onCheck, onDuplicate }) => {
        const isSel = activeSelection.section === section && activeSelection.index === index;
        const row = document.createElement('div');
        row.className = `ps-fx-tree-row${isSel ? ' active' : ''}${indent ? ' indent' : ''}`;
        row.dataset.section = section;
        row.dataset.index = String(index);

        if (checkbox) {
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = Boolean(checked);
          cb.className = 'ps-fx-tree-cb';
          cb.addEventListener('click', (e) => e.stopPropagation());
          cb.addEventListener('change', () => {
            onCheck(cb.checked);
            activeSelection = { section, index };
            applyToCanvas();
            renderAll();
          });
          row.appendChild(cb);
        }

        const lbl = document.createElement('span');
        lbl.className = 'ps-fx-tree-lbl';
        lbl.textContent = label;
        row.appendChild(lbl);

        if (stackable) {
          const plus = document.createElement('button');
          plus.type = 'button';
          plus.className = 'ps-fx-plus-btn';
          plus.title = `Add Another ${label} (+ )`;
          plus.textContent = '+';
          plus.addEventListener('click', (e) => {
            e.stopPropagation();
            onDuplicate();
          });
          row.appendChild(plus);
        }

        row.addEventListener('click', () => {
          activeSelection = { section, index };
          renderAll();
        });
        treeList.appendChild(row);
      };

      // 1. Styles & Blending Options
      addRow({ section: 'styles', label: 'Styles' });
      addRow({ section: 'blendingOptions', label: 'Blending Options' });

      const sep = document.createElement('div');
      sep.className = 'ps-fx-tree-sep';
      treeList.appendChild(sep);

      // 2. Bevel & Emboss + Indented Contour & Texture
      const bev = workingStyles.bevelEmboss;
      addRow({
        section: 'bevelEmboss',
        label: 'Bevel & Emboss',
        checkbox: true,
        checked: bev.enabled,
        onCheck: (v) => { bev.enabled = v; }
      });
      addRow({
        section: 'contour',
        label: 'Contour',
        indent: true,
        checkbox: true,
        checked: bev.contourEnabled,
        onCheck: (v) => {
          bev.contourEnabled = v;
          if (v) bev.enabled = true;
        }
      });
      addRow({
        section: 'texture',
        label: 'Texture',
        indent: true,
        checkbox: true,
        checked: bev.textureEnabled,
        onCheck: (v) => {
          bev.textureEnabled = v;
          if (v) bev.enabled = true;
        }
      });

      const addStackableGroup = (secKey, baseLabel) => {
        const plural = STACKABLE_EFFECT_KEYS[secKey];
        const arr = workingStyles[plural];
        arr.forEach((inst, idx) => {
          addRow({
            section: secKey,
            index: idx,
            label: arr.length > 1 ? `${baseLabel} ${idx + 1}` : baseLabel,
            checkbox: true,
            checked: inst.enabled,
            stackable: arr.length < 10,
            onCheck: (v) => { inst.enabled = v; },
            onDuplicate: () => {
              const dup = LayerStylesEngine.createDefaultEffect(secKey, true);
              dup.enabled = true;
              if (secKey === 'stroke') dup.size = Math.min(80, (inst.size ?? 3) + 4);
              if (secKey === 'dropShadow') dup.distance = Math.min(200, (inst.distance ?? 5) + 8);
              arr.splice(idx + 1, 0, dup);
              activeSelection = { section: secKey, index: idx + 1 };
              applyToCanvas();
              renderAll();
            }
          });
        });
      };

      // Exact Photoshop Order: Stroke (+), Inner Shadow (+), Inner Glow, Satin,
      // Color Overlay (+), Gradient Overlay (+), Pattern Overlay, Outer Glow, Drop Shadow (+)
      addStackableGroup('stroke', 'Stroke');
      addStackableGroup('innerShadow', 'Inner Shadow');

      addRow({
        section: 'innerGlow',
        label: 'Inner Glow',
        checkbox: true,
        checked: workingStyles.innerGlow.enabled,
        onCheck: (v) => { workingStyles.innerGlow.enabled = v; }
      });

      addRow({
        section: 'satin',
        label: 'Satin',
        checkbox: true,
        checked: workingStyles.satin.enabled,
        onCheck: (v) => { workingStyles.satin.enabled = v; }
      });

      addStackableGroup('colorOverlay', 'Color Overlay');
      addStackableGroup('gradientOverlay', 'Gradient Overlay');

      addRow({
        section: 'patternOverlay',
        label: 'Pattern Overlay',
        checkbox: true,
        checked: workingStyles.patternOverlay.enabled,
        onCheck: (v) => { workingStyles.patternOverlay.enabled = v; }
      });

      addRow({
        section: 'outerGlow',
        label: 'Outer Glow',
        checkbox: true,
        checked: workingStyles.outerGlow.enabled,
        onCheck: (v) => { workingStyles.outerGlow.enabled = v; }
      });

      addStackableGroup('dropShadow', 'Drop Shadow');

      const activeRow = treeList.querySelector('.ps-fx-tree-row.active');
      if (activeRow) activeRow.scrollIntoView({ block: 'nearest' });
    };

    // ------------------------------------------------------------------------
    // PHOTOSHOP CONTROL BUILDER HELPERS
    // ------------------------------------------------------------------------

    const markActiveEnabled = (immediate = true) => {
      const sec = activeSelection.section;
      let treeDirty = false;
      if (sec === 'contour') {
        if (!workingStyles.bevelEmboss.enabled || !workingStyles.bevelEmboss.contourEnabled) treeDirty = true;
        workingStyles.bevelEmboss.enabled = true;
        workingStyles.bevelEmboss.contourEnabled = true;
      } else if (sec === 'texture') {
        if (!workingStyles.bevelEmboss.enabled || !workingStyles.bevelEmboss.textureEnabled) treeDirty = true;
        workingStyles.bevelEmboss.enabled = true;
        workingStyles.bevelEmboss.textureEnabled = true;
      } else if (sec !== 'styles' && sec !== 'blendingOptions') {
        const eff = getTargetEffect();
        if (eff && eff.enabled === false) {
          eff.enabled = true;
          treeDirty = true;
        }
      }
      if (treeDirty) renderTree();
      if (immediate) applyToCanvas();
      else scheduleApplyToCanvas();
    };

    const addSectionHeading = (parent, title) => {
      const h = document.createElement('div');
      h.className = 'ps-fx-sec-heading';
      h.textContent = title;
      parent.appendChild(h);
    };

    const addFieldset = (parent, legendText) => {
      const box = document.createElement('div');
      box.className = 'ps-fx-fieldset';
      if (legendText) {
        const lg = document.createElement('div');
        lg.className = 'ps-fx-legend';
        lg.textContent = legendText;
        box.appendChild(lg);
      }
      parent.appendChild(box);
      return box;
    };

    const addBlendModeSelect = (parent, label, value, colorHex, onModeChange, onColorChange) => {
      const row = document.createElement('div');
      row.className = 'ps-fx-row ps-fx-row-nowrap';
      const lbl = document.createElement('label');
      lbl.className = 'ps-fx-lbl';
      lbl.textContent = `${label}:`;
      row.appendChild(lbl);

      const sel = document.createElement('select');
      sel.className = 'ps-fx-select';
      let lastGroup = null;
      for (const bm of PHOTOSHOP_BLEND_MODES) {
        if (lastGroup && lastGroup !== bm.group) {
          const sepOpt = document.createElement('option');
          sepOpt.disabled = true;
          sepOpt.textContent = '──────────';
          sel.appendChild(sepOpt);
        }
        lastGroup = bm.group;
        const opt = document.createElement('option');
        opt.value = bm.id;
        opt.textContent = bm.label;
        if (bm.id === value) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        onModeChange(sel.value);
        markActiveEnabled(true);
      });
      row.appendChild(sel);

      if (colorHex !== null && onColorChange) {
        const col = document.createElement('input');
        col.type = 'color';
        col.className = 'ps-fx-swatch';
        col.value = colorHex || '#000000';
        col.title = 'Pick Color';
        col.addEventListener('input', () => {
          onColorChange(col.value);
          markActiveEnabled(false);
        });
        row.appendChild(col);
      }
      parent.appendChild(row);
    };

    const addSelectRow = (parent, label, options, value, onChange) => {
      const row = document.createElement('div');
      row.className = 'ps-fx-row ps-fx-row-nowrap';
      const lbl = document.createElement('label');
      lbl.className = 'ps-fx-lbl';
      lbl.textContent = `${label}:`;
      row.appendChild(lbl);

      const sel = document.createElement('select');
      sel.className = 'ps-fx-select';
      for (const o of options) {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.label;
        if (o.id === value) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        onChange(sel.value);
        markActiveEnabled(true);
      });
      row.appendChild(sel);
      parent.appendChild(row);
    };

    const addSliderRow = (parent, label, min, max, step, value, unit, onChange) => {
      const row = document.createElement('div');
      row.className = 'ps-fx-slider-row';

      const head = document.createElement('div');
      head.className = 'ps-fx-slider-head';

      const lbl = document.createElement('label');
      lbl.className = 'ps-fx-lbl';
      lbl.textContent = `${label}:`;

      const valWrap = document.createElement('div');
      valWrap.className = 'ps-fx-slider-val';

      const num = document.createElement('input');
      num.type = 'number';
      num.className = 'ps-fx-num';
      num.min = String(min);
      num.max = String(max);
      num.step = String(step);
      num.value = String(value);

      const unitEl = document.createElement('span');
      unitEl.className = 'ps-fx-unit';
      unitEl.textContent = unit || '';

      valWrap.appendChild(num);
      valWrap.appendChild(unitEl);
      head.appendChild(lbl);
      head.appendChild(valWrap);

      const range = document.createElement('input');
      range.type = 'range';
      range.className = 'pc-range ps-fx-range';
      range.min = String(min);
      range.max = String(max);
      range.step = String(step);
      range.value = String(value);

      range.addEventListener('input', () => {
        const v = Number(range.value);
        num.value = String(v);
        onChange(v);
        markActiveEnabled(false);
      });
      range.addEventListener('change', () => {
        const v = Number(range.value);
        num.value = String(v);
        onChange(v);
        markActiveEnabled(true);
      });

      num.addEventListener('input', () => {
        let v = Number(num.value);
        if (!Number.isFinite(v)) return;
        v = Math.max(min, Math.min(max, v));
        range.value = String(v);
        onChange(v);
        markActiveEnabled(false);
      });
      num.addEventListener('change', () => {
        let v = Number(num.value);
        if (!Number.isFinite(v)) v = value;
        v = Math.max(min, Math.min(max, v));
        num.value = String(v);
        range.value = String(v);
        onChange(v);
        markActiveEnabled(true);
      });

      row.appendChild(head);
      row.appendChild(range);
      parent.appendChild(row);
      return { range, num };
    };

    const addCheckboxRow = (parent, label, checked, onChange) => {
      const row = document.createElement('div');
      row.className = 'ps-fx-row';
      const lbl = document.createElement('label');
      lbl.className = 'ps-fx-check';
      lbl.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} /> <span>${label}</span>`;
      lbl.querySelector('input').addEventListener('change', (e) => {
        onChange(e.target.checked);
        markActiveEnabled();
      });
      row.appendChild(lbl);
      parent.appendChild(row);
    };

    /**
     * Interactive Photoshop Circular Angle (+ optional Altitude) Dial + Global Light!
     */
    const addAngleControl = (parent, opts) => {
      const {
        angle,
        altitude = null,
        hasGlobalLight = false,
        useGlobalLight = false,
        onAngleChange,
        onAltitudeChange = null,
        onGlobalLightToggle = null
      } = opts;

      const wrap = document.createElement('div');
      wrap.className = 'ps-fx-angle-wrap';

      const dial = document.createElement('canvas');
      dial.width = 44;
      dial.height = 44;
      dial.className = 'ps-fx-dial';
      dial.title = altitude !== null ? 'Drag to set Angle & Altitude' : 'Drag to set Light Angle';

      const drawDial = (ang, alt) => {
        const ctx = dial.getContext('2d');
        const cx = 22, cy = 22, r = 18;
        ctx.clearRect(0, 0, 44, 44);

        ctx.fillStyle = '#1e2024';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        const rad = (ang * Math.PI) / 180;
        const dist = alt !== null ? Math.max(2, r * (1 - alt / 90)) : r - 3;
        const px = cx + Math.cos(rad) * dist;
        const py = cy - Math.sin(rad) * dist;

        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fill();
      };

      const curAngle = useGlobalLight ? (doc.globalLight?.angle ?? 120) : (angle ?? 120);
      const curAlt = altitude !== null
        ? (useGlobalLight ? (doc.globalLight?.altitude ?? 30) : altitude)
        : null;
      drawDial(curAngle, curAlt);

      const fields = document.createElement('div');
      fields.className = 'ps-fx-angle-fields';

      const angRow = document.createElement('div');
      angRow.className = 'ps-fx-row ps-fx-row-nowrap';
      angRow.innerHTML = `<label class="ps-fx-lbl" style="min-width:44px;">Angle:</label>`;
      const angNum = document.createElement('input');
      angNum.type = 'number';
      angNum.className = 'ps-fx-num';
      angNum.style.width = '48px';
      angNum.min = '-180';
      angNum.max = '180';
      angNum.value = String(Math.round(curAngle));
      angRow.appendChild(angNum);
      const degSpan = document.createElement('span');
      degSpan.className = 'ps-fx-unit';
      degSpan.textContent = '°';
      angRow.appendChild(degSpan);
      fields.appendChild(angRow);

      let altNum = null;
      if (altitude !== null && onAltitudeChange) {
        const altRow = document.createElement('div');
        altRow.className = 'ps-fx-row ps-fx-row-nowrap';
        altRow.innerHTML = `<label class="ps-fx-lbl" style="min-width:44px;">Altitude:</label>`;
        altNum = document.createElement('input');
        altNum.type = 'number';
        altNum.className = 'ps-fx-num';
        altNum.style.width = '48px';
        altNum.min = '0';
        altNum.max = '90';
        altNum.value = String(Math.round(curAlt));
        altRow.appendChild(altNum);
        const aDeg = document.createElement('span');
        aDeg.className = 'ps-fx-unit';
        aDeg.textContent = '°';
        altRow.appendChild(aDeg);
        fields.appendChild(altRow);

        altNum.addEventListener('input', () => {
          const v = Math.max(0, Math.min(90, Number(altNum.value) || 0));
          if (useGlobalLight) doc.globalLight.altitude = v;
          onAltitudeChange(v);
          drawDial(Number(angNum.value) || 0, v);
          markActiveEnabled();
        });
      }

      if (hasGlobalLight && onGlobalLightToggle) {
        const glLbl = document.createElement('label');
        glLbl.className = 'ps-fx-check';
        glLbl.innerHTML = `<input type="checkbox" ${useGlobalLight ? 'checked' : ''} /> <span>Use Global Light</span>`;
        glLbl.querySelector('input').addEventListener('change', (e) => {
          onGlobalLightToggle(e.target.checked);
          markActiveEnabled();
          renderRightPane();
        });
        fields.appendChild(glLbl);
      }

      const updateFromAngle = (v, immediate = false) => {
        const clamped = Math.max(-180, Math.min(180, Math.round(v)));
        angNum.value = String(clamped);
        if (useGlobalLight) doc.globalLight.angle = clamped;
        onAngleChange(clamped);
        drawDial(clamped, altNum ? Number(altNum.value) : null);
        markActiveEnabled(immediate);
      };

      angNum.addEventListener('input', () => {
        updateFromAngle(Number(angNum.value) || 0, false);
      });
      angNum.addEventListener('change', () => {
        updateFromAngle(Number(angNum.value) || 0, true);
      });

      let draggingDial = false;
      const pointerToDial = (ev, immediate = false) => {
        const rect = dial.getBoundingClientRect();
        const dx = ev.clientX - (rect.left + rect.width / 2);
        const dy = -(ev.clientY - (rect.top + rect.height / 2));
        const deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
        if (altNum && onAltitudeChange) {
          const dist = Math.hypot(dx, dy);
          const alt = Math.max(0, Math.min(90, Math.round((1 - Math.min(1, dist / (rect.width * 0.44))) * 90)));
          altNum.value = String(alt);
          if (useGlobalLight) doc.globalLight.altitude = alt;
          onAltitudeChange(alt);
        }
        updateFromAngle(deg, immediate);
      };

      dial.addEventListener('pointerdown', (e) => {
        draggingDial = true;
        dial.setPointerCapture(e.pointerId);
        pointerToDial(e, false);
      });
      dial.addEventListener('pointermove', (e) => {
        if (draggingDial) pointerToDial(e, false);
      });
      dial.addEventListener('pointerup', (e) => {
        if (draggingDial) {
          draggingDial = false;
          pointerToDial(e, true);
        }
      });

      wrap.appendChild(dial);
      wrap.appendChild(fields);
      parent.appendChild(wrap);
    };

    /**
     * Exact Photoshop Contour Curve Picker (Thumbnail Button + Visual Grid Dropdown + Anti-aliased)
     */
    const addContourControl = (parent, label, contourId, antiAliased, onContourChange, onAAChange) => {
      const row = document.createElement('div');
      row.className = 'ps-fx-row';
      row.style.position = 'relative';

      const lbl = document.createElement('label');
      lbl.className = 'ps-fx-lbl';
      lbl.textContent = `${label}:`;
      row.appendChild(lbl);

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'ps-fx-contour-btn';
      const thumb = document.createElement('canvas');
      thumb.width = 46;
      thumb.height = 24;
      drawContourThumbnail(thumb, contourId || 'linear');
      trigger.appendChild(thumb);
      const caret = document.createElement('span');
      caret.textContent = '▾';
      caret.style.fontSize = '10px';
      trigger.appendChild(caret);

      const pop = document.createElement('div');
      pop.className = 'ps-fx-contour-pop';
      pop.hidden = true;

      for (const cp of CONTOUR_PRESETS) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `ps-fx-contour-cell${cp.id === contourId ? ' active' : ''}`;
        item.title = cp.label;
        const c = document.createElement('canvas');
        c.width = 42;
        c.height = 24;
        drawContourThumbnail(c, cp.id);
        item.appendChild(c);
        const cap = document.createElement('span');
        cap.textContent = cp.label.split(' ')[0];
        item.appendChild(cap);
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          pop.hidden = true;
          pop.querySelectorAll('.ps-fx-contour-cell').forEach((btn) => btn.classList.remove('active'));
          item.classList.add('active');
          drawContourThumbnail(thumb, cp.id);
          onContourChange(cp.id);
          markActiveEnabled(true);
        });
        pop.appendChild(item);
      }

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = pop.hidden;
        rightCol.querySelectorAll('.ps-fx-contour-pop').forEach((p) => { p.hidden = true; });
        pop.hidden = !willOpen;
      });

      row.appendChild(trigger);
      row.appendChild(pop);

      if (onAAChange) {
        const aaLbl = document.createElement('label');
        aaLbl.className = 'ps-fx-check';
        aaLbl.innerHTML = `<input type="checkbox" ${antiAliased ? 'checked' : ''} /> <span>Anti-aliased</span>`;
        aaLbl.querySelector('input').addEventListener('change', (e) => {
          onAAChange(e.target.checked);
          markActiveEnabled();
        });
        row.appendChild(aaLbl);
      }

      parent.appendChild(row);
    };

    /**
     * Photoshop Gradient Bar + Preset Picker + Interactive Start/End Stop Editor
     */
    const addGradientEditor = (parent, stops, reverse, onChangeStops) => {
      const box = document.createElement('div');
      box.className = 'ps-fx-grad-box';

      const barCanvas = document.createElement('canvas');
      barCanvas.width = 210;
      barCanvas.height = 22;
      barCanvas.className = 'ps-fx-grad-bar';
      drawGradientBar(barCanvas, stops, reverse);
      box.appendChild(barCanvas);

      const presetRow = document.createElement('div');
      presetRow.className = 'ps-fx-row';
      const pSel = document.createElement('select');
      pSel.className = 'ps-fx-select';
      const customOpt = document.createElement('option');
      customOpt.value = '';
      customOpt.textContent = 'Preset Gradients ▾';
      pSel.appendChild(customOpt);
      for (const gp of GRADIENT_PRESETS) {
        const o = document.createElement('option');
        o.value = gp.id;
        o.textContent = gp.label;
        pSel.appendChild(o);
      }
      pSel.addEventListener('change', () => {
        const found = GRADIENT_PRESETS.find((g) => g.id === pSel.value);
        if (found) {
          const next = structuredClone(found.stops);
          onChangeStops(next);
          drawGradientBar(barCanvas, next, reverse);
          markActiveEnabled();
          renderRightPane();
        }
      });
      presetRow.appendChild(pSel);
      box.appendChild(presetRow);

      // Start & End Stop Quick Color + Opacity Controls
      const s0 = stops[0] || { pos: 0, color: '#ffffbe', opacity: 1 };
      const sLast = stops[stops.length - 1] || { pos: 1, color: '#ffffbe', opacity: 0 };
      const stopsRow = document.createElement('div');
      stopsRow.className = 'ps-fx-row';
      stopsRow.style.justifyContent = 'space-between';
      stopsRow.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="ps-fx-unit">Start</span>
          <input type="color" class="ps-fx-swatch" id="ps-gs-c0" value="${s0.color}" />
          <input type="number" class="ps-fx-num" id="ps-gs-a0" min="0" max="100" value="${Math.round((s0.opacity ?? 1) * 100)}" title="Start Opacity %" style="width:42px;" />%
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="ps-fx-unit">End</span>
          <input type="color" class="ps-fx-swatch" id="ps-gs-c1" value="${sLast.color}" />
          <input type="number" class="ps-fx-num" id="ps-gs-a1" min="0" max="100" value="${Math.round((sLast.opacity ?? 1) * 100)}" title="End Opacity %" style="width:42px;" />%
        </div>
      `;

      const updateEndpoints = () => {
        const next = structuredClone(stops);
        next[0] = {
          ...next[0],
          pos: 0,
          color: stopsRow.querySelector('#ps-gs-c0').value,
          opacity: Math.max(0, Math.min(100, Number(stopsRow.querySelector('#ps-gs-a0').value) || 0)) / 100
        };
        next[next.length - 1] = {
          ...next[next.length - 1],
          pos: 1,
          color: stopsRow.querySelector('#ps-gs-c1').value,
          opacity: Math.max(0, Math.min(100, Number(stopsRow.querySelector('#ps-gs-a1').value) || 0)) / 100
        };
        stops = next;
        onChangeStops(next);
        drawGradientBar(barCanvas, next, reverse);
        markActiveEnabled();
      };

      stopsRow.querySelectorAll('input').forEach((el) => el.addEventListener('input', updateEndpoints));
      box.appendChild(stopsRow);
      parent.appendChild(box);
    };

    /**
     * Exact Photoshop Solid Color vs. Gradient Radio Switcher (Outer Glow / Inner Glow)
     */
    const addSolidOrGradientControl = (parent, eff) => {
      const wrap = document.createElement('div');
      wrap.className = 'ps-fx-col';

      const radioRow = document.createElement('div');
      radioRow.className = 'ps-fx-row';
      radioRow.style.gap = '10px';

      const solidRadio = document.createElement('label');
      solidRadio.className = 'ps-fx-radio';
      solidRadio.innerHTML = `<input type="radio" name="ps-glow-coltype" value="solid" ${eff.colorType !== 'gradient' ? 'checked' : ''} />`;
      const swatch = document.createElement('input');
      swatch.type = 'color';
      swatch.className = 'ps-fx-swatch';
      swatch.value = eff.color || '#ffffbe';
      swatch.addEventListener('input', () => {
        eff.colorType = 'solid';
        eff.color = swatch.value;
        solidRadio.querySelector('input').checked = true;
        markActiveEnabled();
      });
      solidRadio.appendChild(swatch);

      const gradRadio = document.createElement('label');
      gradRadio.className = 'ps-fx-radio';
      gradRadio.style.flex = '1';
      gradRadio.innerHTML = `<input type="radio" name="ps-glow-coltype" value="gradient" ${eff.colorType === 'gradient' ? 'checked' : ''} />`;
      const miniBar = document.createElement('canvas');
      miniBar.width = 110;
      miniBar.height = 20;
      miniBar.className = 'ps-fx-grad-bar';
      drawGradientBar(miniBar, eff.gradientStops, false);
      gradRadio.appendChild(miniBar);

      solidRadio.querySelector('input').addEventListener('change', () => {
        eff.colorType = 'solid';
        markActiveEnabled();
        renderRightPane();
      });
      gradRadio.querySelector('input').addEventListener('change', () => {
        eff.colorType = 'gradient';
        markActiveEnabled();
        renderRightPane();
      });

      radioRow.appendChild(solidRadio);
      radioRow.appendChild(gradRadio);
      wrap.appendChild(radioRow);

      if (eff.colorType === 'gradient') {
        addGradientEditor(wrap, eff.gradientStops, false, (nextStops) => {
          eff.gradientStops = nextStops;
          drawGradientBar(miniBar, nextStops, false);
        });
      }

      parent.appendChild(wrap);
    };

    /**
     * Exact Photoshop Make Default / Reset to Default footer buttons
     */
    const addDefaultButtons = (parent, effectType, onReset) => {
      const row = document.createElement('div');
      row.className = 'ps-fx-defaults-row';

      const mkBtn = document.createElement('button');
      mkBtn.type = 'button';
      mkBtn.className = 'ps-fx-btn';
      mkBtn.textContent = 'Make Default';
      mkBtn.addEventListener('click', () => {
        const eff = getTargetEffect();
        LayerStylesEngine.saveUserDefault(effectType, eff);
        this.app.showToast(`Saved default settings for ${effectType}`);
      });

      const rsBtn = document.createElement('button');
      rsBtn.type = 'button';
      rsBtn.className = 'ps-fx-btn';
      rsBtn.textContent = 'Reset to Default';
      rsBtn.addEventListener('click', () => {
        onReset();
        applyToCanvas();
        renderAll();
        this.app.showToast('Reset to Default');
      });

      row.appendChild(mkBtn);
      row.appendChild(rsBtn);
      parent.appendChild(row);
    };

    /**
     * Exact Photoshop Blend If Dual-Range Bar (This Layer & Underlying Layer + Split Feather)
     */
    const addBlendIfBar = (parent, title, channel, keys) => {
      const bo = workingStyles.blendOptions;
      const box = document.createElement('div');
      box.className = 'ps-fx-blendif-box';

      const isSplit =
        (bo[keys.bMax] ?? 0) > (bo[keys.bMin] ?? 0) ||
        (bo[keys.wMin] ?? 255) < (bo[keys.wMax] ?? 255);

      const hdr = document.createElement('div');
      hdr.className = 'ps-fx-blendif-hdr';
      const valText = document.createElement('span');
      const updateReadout = () => {
        const bTxt = bo[keys.bMin] === bo[keys.bMax] ? `${bo[keys.bMin]}` : `${bo[keys.bMin]}/${bo[keys.bMax]}`;
        const wTxt = bo[keys.wMin] === bo[keys.wMax] ? `${bo[keys.wMax]}` : `${bo[keys.wMin]}/${bo[keys.wMax]}`;
        valText.textContent = `${bTxt}  ···  ${wTxt}`;
      };
      updateReadout();

      const splitBtn = document.createElement('button');
      splitBtn.type = 'button';
      splitBtn.className = `ps-fx-mini-btn${isSplit ? ' active' : ''}`;
      splitBtn.textContent = isSplit ? 'Split: ON' : 'Split (Alt)';
      splitBtn.title = 'Split black/white sliders for smooth feathered blending';

      hdr.innerHTML = `<strong>${title}:</strong>`;
      hdr.appendChild(valText);
      hdr.appendChild(splitBtn);
      box.appendChild(hdr);

      const gradBar = document.createElement('div');
      gradBar.className = 'ps-fx-blendif-grad';
      const endCol = channel === 'red' ? '#ef4444' : channel === 'green' ? '#22c55e' : channel === 'blue' ? '#3b82f6' : '#ffffff';
      gradBar.style.background = `linear-gradient(90deg, #000000 0%, ${endCol} 100%)`;
      box.appendChild(gradBar);

      const slidersWrap = document.createElement('div');
      slidersWrap.className = 'ps-fx-col';
      let showSplit = isSplit;

      const renderSliders = () => {
        slidersWrap.innerHTML = '';
        if (!showSplit) {
          addSliderRow(slidersWrap, 'Black', 0, 255, 1, bo[keys.bMin] ?? 0, '', (v) => {
            bo[keys.bMin] = v;
            bo[keys.bMax] = v;
            updateReadout();
            applyToCanvas();
          });
          addSliderRow(slidersWrap, 'White', 0, 255, 1, bo[keys.wMax] ?? 255, '', (v) => {
            bo[keys.wMin] = v;
            bo[keys.wMax] = v;
            updateReadout();
            applyToCanvas();
          });
        } else {
          addSliderRow(slidersWrap, 'Black 0%', 0, 255, 1, bo[keys.bMin] ?? 0, '', (v) => {
            bo[keys.bMin] = v;
            if (bo[keys.bMax] < v) bo[keys.bMax] = v;
            updateReadout();
            applyToCanvas();
          });
          addSliderRow(slidersWrap, 'Black 100%', 0, 255, 1, bo[keys.bMax] ?? 0, '', (v) => {
            bo[keys.bMax] = Math.max(bo[keys.bMin] ?? 0, v);
            updateReadout();
            applyToCanvas();
          });
          addSliderRow(slidersWrap, 'White 100%', 0, 255, 1, bo[keys.wMin] ?? 255, '', (v) => {
            bo[keys.wMin] = Math.min(bo[keys.wMax] ?? 255, v);
            updateReadout();
            applyToCanvas();
          });
          addSliderRow(slidersWrap, 'White 0%', 0, 255, 1, bo[keys.wMax] ?? 255, '', (v) => {
            bo[keys.wMax] = v;
            if (bo[keys.wMin] > v) bo[keys.wMin] = v;
            updateReadout();
            applyToCanvas();
          });
        }
      };

      splitBtn.addEventListener('click', () => {
        showSplit = !showSplit;
        splitBtn.textContent = showSplit ? 'Split: ON' : 'Split (Alt)';
        splitBtn.classList.toggle('active', showSplit);
        if (!showSplit) {
          bo[keys.bMax] = bo[keys.bMin];
          bo[keys.wMin] = bo[keys.wMax];
          updateReadout();
          applyToCanvas();
        }
        renderSliders();
      });

      renderSliders();
      box.appendChild(slidersWrap);
      parent.appendChild(box);
    };

    // ------------------------------------------------------------------------
    // RIGHT PANE RENDERER (All 14 Sections with 100% Photoshop CC Controls!)
    // ------------------------------------------------------------------------
    const renderRightPane = () => {
      rightCol.innerHTML = '';
      const sec = activeSelection.section;

      // 0. STYLES PRESETS GALLERY
      if (sec === 'styles') {
        addSectionHeading(rightCol, 'Styles');
        const info = document.createElement('div');
        info.className = 'ps-fx-hint';
        info.textContent = 'Tap any preset to apply instantly, or use "New Style..." above to save your own.';
        rightCol.appendChild(info);

        const allPresets = [
          ...LayerStylesEngine.getSavedUserStyles(),
          ...LayerStylesEngine.getBuiltInStylePresets()
        ];

        const grid = document.createElement('div');
        grid.className = 'ps-fx-styles-grid';

        for (const preset of allPresets) {
          const tile = document.createElement('div');
          tile.className = 'ps-fx-style-tile';
          const c = document.createElement('canvas');
          c.width = 64;
          c.height = 64;
          renderStylePreviewCanvas(c, preset.styles, preset.layerMeta || workingMeta, doc.globalLight);
          tile.appendChild(c);

          const nameEl = document.createElement('span');
          nameEl.textContent = preset.name;
          tile.appendChild(nameEl);

          if (!preset.builtin) {
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'ps-fx-tile-del';
            del.textContent = '✕';
            del.title = 'Delete Saved Style';
            del.addEventListener('click', (e) => {
              e.stopPropagation();
              LayerStylesEngine.deleteUserStylePreset(preset.id);
              renderRightPane();
            });
            tile.appendChild(del);
          }

          tile.addEventListener('click', () => {
            workingStyles = LayerStylesEngine.normalizeLayerStyles(preset.styles);
            if (preset.includeBlending && preset.layerMeta) {
              workingMeta = { ...workingMeta, ...preset.layerMeta };
            }
            applyToCanvas();
            renderTree();
            this.app.showToast(`Applied Style: ${preset.name}`);
          });
          grid.appendChild(tile);
        }
        rightCol.appendChild(grid);
        return;
      }

      // 1. BLENDING OPTIONS
      if (sec === 'blendingOptions') {
        const bo = workingStyles.blendOptions;
        addSectionHeading(rightCol, 'Blending Options');

        const gen = addFieldset(rightCol, 'General Blending');
        addBlendModeSelect(gen, 'Blend Mode', workingMeta.blendMode, null, (v) => {
          workingMeta.blendMode = v;
        });
        addSliderRow(gen, 'Opacity', 0, 100, 1, Math.round(workingMeta.opacity * 100), '%', (v) => {
          workingMeta.opacity = v / 100;
        });

        const adv = addFieldset(rightCol, 'Advanced Blending');
        addSliderRow(adv, 'Fill Opacity', 0, 100, 1, Math.round(workingMeta.fill * 100), '%', (v) => {
          workingMeta.fill = v / 100;
        });

        const chRow = document.createElement('div');
        chRow.className = 'ps-fx-row';
        chRow.innerHTML = `
          <label class="ps-fx-lbl">Channels:</label>
          <div style="display:flex;gap:10px;">
            <label class="ps-fx-check"><input type="checkbox" id="ps-ch-r" ${bo.channels.r !== false ? 'checked' : ''} /> R</label>
            <label class="ps-fx-check"><input type="checkbox" id="ps-ch-g" ${bo.channels.g !== false ? 'checked' : ''} /> G</label>
            <label class="ps-fx-check"><input type="checkbox" id="ps-ch-b" ${bo.channels.b !== false ? 'checked' : ''} /> B</label>
          </div>
        `;
        ['r', 'g', 'b'].forEach((k) => {
          chRow.querySelector(`#ps-ch-${k}`).addEventListener('change', (e) => {
            bo.channels[k] = e.target.checked;
            applyToCanvas();
          });
        });
        adv.appendChild(chRow);

        addSelectRow(
          adv,
          'Knockout',
          [
            { id: 'none', label: 'None' },
            { id: 'shallow', label: 'Shallow' },
            { id: 'deep', label: 'Deep' }
          ],
          bo.knockout || 'none',
          (v) => { bo.knockout = v; }
        );
        addCheckboxRow(adv, 'Blend Interior Effects as Group', Boolean(bo.blendInteriorAsGroup), (v) => { bo.blendInteriorAsGroup = v; });
        addCheckboxRow(adv, 'Blend Clipped Layers as Group', bo.blendClippedAsGroup !== false, (v) => { bo.blendClippedAsGroup = v; });
        addCheckboxRow(adv, 'Transparency Shapes Layer', bo.transparencyShapesLayer !== false, (v) => { bo.transparencyShapesLayer = v; });
        addCheckboxRow(adv, 'Layer Mask Hides Effects', Boolean(bo.layerMaskHidesEffects), (v) => { bo.layerMaskHidesEffects = v; });
        addCheckboxRow(adv, 'Vector Mask Hides Effects', Boolean(bo.vectorMaskHidesEffects), (v) => { bo.vectorMaskHidesEffects = v; });

        const bi = addFieldset(rightCol, 'Blend If');
        addSelectRow(
          bi,
          'Blend If',
          [
            { id: 'gray', label: 'Gray' },
            { id: 'red', label: 'Red' },
            { id: 'green', label: 'Green' },
            { id: 'blue', label: 'Blue' }
          ],
          bo.blendIfChannel || 'gray',
          (v) => {
            bo.blendIfChannel = v;
            applyToCanvas();
            renderRightPane();
          }
        );

        addBlendIfBar(bi, 'This Layer', bo.blendIfChannel || 'gray', {
          bMin: 'thisBlackMin',
          bMax: 'thisBlackMax',
          wMin: 'thisWhiteMin',
          wMax: 'thisWhiteMax'
        });
        addBlendIfBar(bi, 'Underlying Layer', bo.blendIfChannel || 'gray', {
          bMin: 'underBlackMin',
          bMax: 'underBlackMax',
          wMin: 'underWhiteMin',
          wMax: 'underWhiteMax'
        });

        addDefaultButtons(rightCol, 'blendOptions', () => {
          workingStyles.blendOptions = LayerStylesEngine.createDefaultEffect('blendOptions', false);
          workingMeta.opacity = 1;
          workingMeta.fill = 1;
          workingMeta.blendMode = 'source-over';
        });
        return;
      }

      // 2. BEVEL & EMBOSS
      if (sec === 'bevelEmboss') {
        const bev = workingStyles.bevelEmboss;
        addSectionHeading(rightCol, 'Bevel & Emboss');

        const st = addFieldset(rightCol, 'Structure');
        addSelectRow(
          st,
          'Style',
          [
            { id: 'outerBevel', label: 'Outer Bevel' },
            { id: 'innerBevel', label: 'Inner Bevel' },
            { id: 'emboss', label: 'Emboss' },
            { id: 'pillowEmboss', label: 'Pillow Emboss' },
            { id: 'strokeEmboss', label: 'Stroke Emboss' }
          ],
          bev.style || 'innerBevel',
          (v) => { bev.style = v; }
        );
        addSelectRow(
          st,
          'Technique',
          [
            { id: 'smooth', label: 'Smooth' },
            { id: 'chiselHard', label: 'Chisel Hard' },
            { id: 'chiselSoft', label: 'Chisel Soft' }
          ],
          bev.technique || 'smooth',
          (v) => { bev.technique = v; }
        );
        addSliderRow(st, 'Depth', 1, 1000, 1, bev.depth ?? 100, '%', (v) => { bev.depth = v; });

        const dirRow = document.createElement('div');
        dirRow.className = 'ps-fx-row';
        dirRow.innerHTML = `
          <label class="ps-fx-lbl">Direction:</label>
          <label class="ps-fx-radio"><input type="radio" name="ps-bev-dir" value="up" ${bev.direction !== 'down' ? 'checked' : ''} /> Up</label>
          <label class="ps-fx-radio"><input type="radio" name="ps-bev-dir" value="down" ${bev.direction === 'down' ? 'checked' : ''} /> Down</label>
        `;
        dirRow.querySelectorAll('input').forEach((r) => r.addEventListener('change', () => {
          bev.direction = r.value;
          markActiveEnabled();
        }));
        st.appendChild(dirRow);

        addSliderRow(st, 'Size', 0, 250, 1, bev.size ?? 5, 'px', (v) => { bev.size = v; });
        addSliderRow(st, 'Soften', 0, 16, 1, bev.soften ?? 0, 'px', (v) => { bev.soften = v; });

        const sh = addFieldset(rightCol, 'Shading');
        addAngleControl(sh, {
          angle: bev.angle ?? 120,
          altitude: bev.altitude ?? 30,
          hasGlobalLight: true,
          useGlobalLight: bev.useGlobalLight !== false,
          onAngleChange: (v) => { bev.angle = v; },
          onAltitudeChange: (v) => { bev.altitude = v; },
          onGlobalLightToggle: (v) => { bev.useGlobalLight = v; }
        });
        addContourControl(
          sh,
          'Gloss Contour',
          bev.glossContour || 'linear',
          Boolean(bev.glossAntiAliased),
          (v) => { bev.glossContour = v; },
          (aa) => { bev.glossAntiAliased = aa; }
        );
        addBlendModeSelect(
          sh,
          'Highlight Mode',
          bev.highlightMode || 'screen',
          bev.highlightColor || '#ffffff',
          (v) => { bev.highlightMode = v; },
          (c) => { bev.highlightColor = c; }
        );
        addSliderRow(sh, 'Opacity', 0, 100, 1, Math.round((bev.highlightOpacity ?? 0.75) * 100), '%', (v) => {
          bev.highlightOpacity = v / 100;
        });
        addBlendModeSelect(
          sh,
          'Shadow Mode',
          bev.shadowMode || 'multiply',
          bev.shadowColor || '#000000',
          (v) => { bev.shadowMode = v; },
          (c) => { bev.shadowColor = c; }
        );
        addSliderRow(sh, 'Opacity', 0, 100, 1, Math.round((bev.shadowOpacity ?? 0.75) * 100), '%', (v) => {
          bev.shadowOpacity = v / 100;
        });

        addDefaultButtons(rightCol, 'bevelEmboss', () => {
          const en = bev.enabled;
          workingStyles.bevelEmboss = LayerStylesEngine.createDefaultEffect('bevelEmboss', false);
          workingStyles.bevelEmboss.enabled = en;
        });
        return;
      }

      // 2a. BEVEL & EMBOSS -> CONTOUR
      if (sec === 'contour') {
        const bev = workingStyles.bevelEmboss;
        addSectionHeading(rightCol, 'Contour (Bevel & Emboss)');
        const el = addFieldset(rightCol, 'Elements');
        addContourControl(
          el,
          'Contour',
          bev.contour || 'linear',
          Boolean(bev.contourAntiAliased),
          (v) => { bev.contour = v; },
          (aa) => { bev.contourAntiAliased = aa; }
        );
        addSliderRow(el, 'Range', 1, 100, 1, bev.contourRange ?? 50, '%', (v) => {
          bev.contourRange = v;
        });
        addDefaultButtons(rightCol, 'bevelEmboss', () => {
          bev.contour = 'linear';
          bev.contourAntiAliased = false;
          bev.contourRange = 50;
        });
        return;
      }

      // 2b. BEVEL & EMBOSS -> TEXTURE
      if (sec === 'texture') {
        const bev = workingStyles.bevelEmboss;
        addSectionHeading(rightCol, 'Texture (Bevel & Emboss)');
        const el = addFieldset(rightCol, 'Elements');
        addSelectRow(el, 'Pattern', PATTERN_PRESETS, bev.texturePattern || 'wovenCanvas', (v) => {
          bev.texturePattern = v;
        });
        const snapRow = document.createElement('div');
        snapRow.className = 'ps-fx-row';
        const snapBtn = document.createElement('button');
        snapBtn.type = 'button';
        snapBtn.className = 'ps-fx-btn';
        snapBtn.textContent = 'Snap to Origin';
        snapBtn.addEventListener('click', () => {
          bev.textureOffsetX = 0;
          bev.textureOffsetY = 0;
          markActiveEnabled();
        });
        snapRow.appendChild(snapBtn);
        el.appendChild(snapRow);

        addSliderRow(el, 'Scale', 1, 1000, 1, bev.textureScale ?? 100, '%', (v) => { bev.textureScale = v; });
        addSliderRow(el, 'Depth', -1000, 1000, 5, bev.textureDepth ?? 100, '%', (v) => { bev.textureDepth = v; });
        addCheckboxRow(el, 'Invert', Boolean(bev.textureInvert), (v) => { bev.textureInvert = v; });
        addCheckboxRow(el, 'Link with Layer', bev.textureLinkWithLayer !== false, (v) => { bev.textureLinkWithLayer = v; });
        addDefaultButtons(rightCol, 'bevelEmboss', () => {
          bev.texturePattern = 'wovenCanvas';
          bev.textureScale = 100;
          bev.textureDepth = 100;
          bev.textureInvert = false;
          bev.textureLinkWithLayer = true;
        });
        return;
      }

      // 3. STROKE (Stackable)
      if (sec === 'stroke') {
        const st = getTargetEffect('stroke', activeSelection.index);
        addSectionHeading(rightCol, workingStyles.strokes.length > 1 ? `Stroke #${activeSelection.index + 1}` : 'Stroke');

        const sBox = addFieldset(rightCol, 'Structure');
        addSliderRow(sBox, 'Size', 1, 250, 1, st.size ?? 3, 'px', (v) => { st.size = v; });
        addSelectRow(
          sBox,
          'Position',
          [
            { id: 'outside', label: 'Outside' },
            { id: 'inside', label: 'Inside' },
            { id: 'center', label: 'Center' }
          ],
          st.position || 'outside',
          (v) => { st.position = v; }
        );
        addBlendModeSelect(sBox, 'Blend Mode', st.blendMode || 'source-over', null, (v) => { st.blendMode = v; });
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((st.opacity ?? 1) * 100), '%', (v) => { st.opacity = v / 100; });
        addCheckboxRow(sBox, 'Overprint', Boolean(st.overprint), (v) => { st.overprint = v; });

        const fBox = addFieldset(rightCol, 'Fill Type');
        addSelectRow(
          fBox,
          'Fill Type',
          [
            { id: 'color', label: 'Color' },
            { id: 'gradient', label: 'Gradient' },
            { id: 'pattern', label: 'Pattern' }
          ],
          st.fillType || 'color',
          (v) => {
            st.fillType = v;
            renderRightPane();
          }
        );

        if ((st.fillType || 'color') === 'color') {
          const cRow = document.createElement('div');
          cRow.className = 'ps-fx-row';
          cRow.innerHTML = `<label class="ps-fx-lbl">Color:</label>`;
          const col = document.createElement('input');
          col.type = 'color';
          col.className = 'ps-fx-swatch';
          col.style.width = '54px';
          col.value = st.color || '#ffffff';
          col.addEventListener('input', () => {
            st.color = col.value;
            markActiveEnabled();
          });
          cRow.appendChild(col);
          fBox.appendChild(cRow);
        } else if (st.fillType === 'gradient') {
          addGradientEditor(fBox, st.gradientStops, Boolean(st.gradientReverse), (next) => {
            st.gradientStops = next;
          });
          addCheckboxRow(fBox, 'Reverse', Boolean(st.gradientReverse), (v) => {
            st.gradientReverse = v;
            renderRightPane();
          });
          addCheckboxRow(fBox, 'Align with Layer', st.gradientAlignWithLayer !== false, (v) => {
            st.gradientAlignWithLayer = v;
          });
          addSelectRow(
            fBox,
            'Style',
            [
              { id: 'linear', label: 'Linear' },
              { id: 'radial', label: 'Radial' },
              { id: 'angle', label: 'Angle' },
              { id: 'reflected', label: 'Reflected' },
              { id: 'diamond', label: 'Diamond' },
              { id: 'shapeBurst', label: 'Shape Burst' }
            ],
            st.gradientStyle || 'linear',
            (v) => { st.gradientStyle = v; }
          );
          addAngleControl(fBox, {
            angle: st.gradientAngle ?? 90,
            onAngleChange: (v) => { st.gradientAngle = v; }
          });
          addSliderRow(fBox, 'Scale', 10, 150, 1, st.gradientScale ?? 100, '%', (v) => { st.gradientScale = v; });
          addCheckboxRow(fBox, 'Dither', Boolean(st.gradientDither), (v) => { st.gradientDither = v; });
        } else if (st.fillType === 'pattern') {
          addSelectRow(fBox, 'Pattern', PATTERN_PRESETS, st.pattern || 'stripes', (v) => { st.pattern = v; });
          addSliderRow(fBox, 'Angle', -180, 180, 1, st.patternAngle ?? 0, '°', (v) => { st.patternAngle = v; });
          addSliderRow(fBox, 'Scale', 1, 1000, 1, st.patternScale ?? 100, '%', (v) => { st.patternScale = v; });
          addCheckboxRow(fBox, 'Link with Layer', st.patternLinkWithLayer !== false, (v) => { st.patternLinkWithLayer = v; });
        }

        addDefaultButtons(rightCol, 'stroke', () => {
          const en = st.enabled;
          const fresh = LayerStylesEngine.createDefaultEffect('stroke', false);
          fresh.enabled = en;
          workingStyles.strokes[activeSelection.index] = fresh;
        });
        return;
      }

      // 4. INNER SHADOW (Stackable)
      if (sec === 'innerShadow') {
        const is = getTargetEffect('innerShadow', activeSelection.index);
        addSectionHeading(rightCol, workingStyles.innerShadows.length > 1 ? `Inner Shadow #${activeSelection.index + 1}` : 'Inner Shadow');

        const sBox = addFieldset(rightCol, 'Structure');
        addBlendModeSelect(
          sBox,
          'Blend Mode',
          is.blendMode || 'multiply',
          is.color || '#000000',
          (v) => { is.blendMode = v; },
          (c) => { is.color = c; }
        );
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((is.opacity ?? 0.75) * 100), '%', (v) => { is.opacity = v / 100; });
        addAngleControl(sBox, {
          angle: is.angle ?? 120,
          hasGlobalLight: true,
          useGlobalLight: is.useGlobalLight !== false,
          onAngleChange: (v) => { is.angle = v; },
          onGlobalLightToggle: (v) => { is.useGlobalLight = v; }
        });
        addSliderRow(sBox, 'Distance', 0, 300, 1, is.distance ?? 5, 'px', (v) => { is.distance = v; });
        addSliderRow(sBox, 'Choke', 0, 100, 1, is.choke ?? 0, '%', (v) => { is.choke = v; });
        addSliderRow(sBox, 'Size', 0, 250, 1, is.size ?? 5, 'px', (v) => { is.size = v; });

        const qBox = addFieldset(rightCol, 'Quality');
        addContourControl(
          qBox,
          'Contour',
          is.contour || 'linear',
          Boolean(is.antiAliased),
          (v) => { is.contour = v; },
          (aa) => { is.antiAliased = aa; }
        );
        addSliderRow(qBox, 'Noise', 0, 100, 1, is.noise ?? 0, '%', (v) => { is.noise = v; });

        addDefaultButtons(rightCol, 'innerShadow', () => {
          const en = is.enabled;
          const fresh = LayerStylesEngine.createDefaultEffect('innerShadow', false);
          fresh.enabled = en;
          workingStyles.innerShadows[activeSelection.index] = fresh;
        });
        return;
      }

      // 5. INNER GLOW
      if (sec === 'innerGlow') {
        const ig = workingStyles.innerGlow;
        addSectionHeading(rightCol, 'Inner Glow');

        const sBox = addFieldset(rightCol, 'Structure');
        addBlendModeSelect(sBox, 'Blend Mode', ig.blendMode || 'screen', null, (v) => { ig.blendMode = v; });
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((ig.opacity ?? 0.75) * 100), '%', (v) => { ig.opacity = v / 100; });
        addSliderRow(sBox, 'Noise', 0, 100, 1, ig.noise ?? 0, '%', (v) => { ig.noise = v; });
        addSolidOrGradientControl(sBox, ig);

        const eBox = addFieldset(rightCol, 'Elements');
        addSelectRow(
          eBox,
          'Technique',
          [
            { id: 'softer', label: 'Softer' },
            { id: 'precise', label: 'Precise' }
          ],
          ig.technique || 'softer',
          (v) => { ig.technique = v; }
        );

        const srcRow = document.createElement('div');
        srcRow.className = 'ps-fx-row';
        srcRow.innerHTML = `
          <label class="ps-fx-lbl">Source:</label>
          <label class="ps-fx-radio"><input type="radio" name="ps-ig-src" value="center" ${ig.source === 'center' ? 'checked' : ''} /> Center</label>
          <label class="ps-fx-radio"><input type="radio" name="ps-ig-src" value="edge" ${ig.source !== 'center' ? 'checked' : ''} /> Edge</label>
        `;
        srcRow.querySelectorAll('input').forEach((r) => r.addEventListener('change', () => {
          ig.source = r.value;
          markActiveEnabled();
        }));
        eBox.appendChild(srcRow);

        addSliderRow(eBox, 'Choke', 0, 100, 1, ig.choke ?? 0, '%', (v) => { ig.choke = v; });
        addSliderRow(eBox, 'Size', 0, 250, 1, ig.size ?? 5, 'px', (v) => { ig.size = v; });

        const qBox = addFieldset(rightCol, 'Quality');
        addContourControl(
          qBox,
          'Contour',
          ig.contour || 'linear',
          Boolean(ig.antiAliased),
          (v) => { ig.contour = v; },
          (aa) => { ig.antiAliased = aa; }
        );
        addSliderRow(qBox, 'Range', 1, 100, 1, ig.range ?? 50, '%', (v) => { ig.range = v; });
        addSliderRow(qBox, 'Jitter', 0, 100, 1, ig.jitter ?? 0, '%', (v) => { ig.jitter = v; });

        addDefaultButtons(rightCol, 'innerGlow', () => {
          const en = ig.enabled;
          workingStyles.innerGlow = LayerStylesEngine.createDefaultEffect('innerGlow', false);
          workingStyles.innerGlow.enabled = en;
        });
        return;
      }

      // 6. SATIN
      if (sec === 'satin') {
        const sat = workingStyles.satin;
        addSectionHeading(rightCol, 'Satin');

        const sBox = addFieldset(rightCol, 'Structure');
        addBlendModeSelect(
          sBox,
          'Blend Mode',
          sat.blendMode || 'multiply',
          sat.color || '#000000',
          (v) => { sat.blendMode = v; },
          (c) => { sat.color = c; }
        );
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((sat.opacity ?? 0.5) * 100), '%', (v) => { sat.opacity = v / 100; });
        addAngleControl(sBox, {
          angle: sat.angle ?? 19,
          onAngleChange: (v) => { sat.angle = v; }
        });
        addSliderRow(sBox, 'Distance', 0, 250, 1, sat.distance ?? 11, 'px', (v) => { sat.distance = v; });
        addSliderRow(sBox, 'Size', 0, 250, 1, sat.size ?? 14, 'px', (v) => { sat.size = v; });
        addContourControl(
          sBox,
          'Contour',
          sat.contour || 'linear',
          Boolean(sat.antiAliased),
          (v) => { sat.contour = v; },
          (aa) => { sat.antiAliased = aa; }
        );
        addCheckboxRow(sBox, 'Invert', sat.invert !== false, (v) => { sat.invert = v; });

        addDefaultButtons(rightCol, 'satin', () => {
          const en = sat.enabled;
          workingStyles.satin = LayerStylesEngine.createDefaultEffect('satin', false);
          workingStyles.satin.enabled = en;
        });
        return;
      }

      // 7. COLOR OVERLAY (Stackable)
      if (sec === 'colorOverlay') {
        const co = getTargetEffect('colorOverlay', activeSelection.index);
        addSectionHeading(rightCol, workingStyles.colorOverlays.length > 1 ? `Color Overlay #${activeSelection.index + 1}` : 'Color Overlay');

        const sBox = addFieldset(rightCol, 'Color Overlay');
        addBlendModeSelect(
          sBox,
          'Blend Mode',
          co.blendMode || 'source-over',
          co.color || '#ff0000',
          (v) => { co.blendMode = v; },
          (c) => { co.color = c; }
        );
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((co.opacity ?? 1) * 100), '%', (v) => { co.opacity = v / 100; });

        addDefaultButtons(rightCol, 'colorOverlay', () => {
          const en = co.enabled;
          const fresh = LayerStylesEngine.createDefaultEffect('colorOverlay', false);
          fresh.enabled = en;
          workingStyles.colorOverlays[activeSelection.index] = fresh;
        });
        return;
      }

      // 8. GRADIENT OVERLAY (Stackable)
      if (sec === 'gradientOverlay') {
        const go = getTargetEffect('gradientOverlay', activeSelection.index);
        addSectionHeading(rightCol, workingStyles.gradientOverlays.length > 1 ? `Gradient Overlay #${activeSelection.index + 1}` : 'Gradient Overlay');

        const sBox = addFieldset(rightCol, 'Gradient Overlay');
        addBlendModeSelect(sBox, 'Blend Mode', go.blendMode || 'source-over', null, (v) => { go.blendMode = v; });
        addCheckboxRow(sBox, 'Dither', Boolean(go.dither), (v) => { go.dither = v; });
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((go.opacity ?? 1) * 100), '%', (v) => { go.opacity = v / 100; });

        addGradientEditor(sBox, go.gradientStops, Boolean(go.reverse), (next) => {
          go.gradientStops = next;
        });
        const optRow = document.createElement('div');
        optRow.className = 'ps-fx-row';
        optRow.style.gap = '12px';
        const revLbl = document.createElement('label');
        revLbl.className = 'ps-fx-check';
        revLbl.innerHTML = `<input type="checkbox" ${go.reverse ? 'checked' : ''} /> <span>Reverse</span>`;
        revLbl.querySelector('input').addEventListener('change', (e) => {
          go.reverse = e.target.checked;
          markActiveEnabled();
          renderRightPane();
        });
        const alLbl = document.createElement('label');
        alLbl.className = 'ps-fx-check';
        alLbl.innerHTML = `<input type="checkbox" ${go.alignWithLayer !== false ? 'checked' : ''} /> <span>Align with Layer</span>`;
        alLbl.querySelector('input').addEventListener('change', (e) => {
          go.alignWithLayer = e.target.checked;
          markActiveEnabled();
        });
        optRow.appendChild(revLbl);
        optRow.appendChild(alLbl);
        sBox.appendChild(optRow);

        addSelectRow(
          sBox,
          'Style',
          [
            { id: 'linear', label: 'Linear' },
            { id: 'radial', label: 'Radial' },
            { id: 'angle', label: 'Angle' },
            { id: 'reflected', label: 'Reflected' },
            { id: 'diamond', label: 'Diamond' }
          ],
          go.style || 'linear',
          (v) => { go.style = v; }
        );
        addAngleControl(sBox, {
          angle: go.angle ?? 90,
          onAngleChange: (v) => { go.angle = v; }
        });
        addSliderRow(sBox, 'Scale', 10, 150, 1, go.scale ?? 100, '%', (v) => { go.scale = v; });

        const rsAlign = document.createElement('button');
        rsAlign.type = 'button';
        rsAlign.className = 'ps-fx-btn';
        rsAlign.textContent = 'Reset Alignment';
        rsAlign.addEventListener('click', () => {
          go.offsetX = 0;
          go.offsetY = 0;
          markActiveEnabled();
        });
        sBox.appendChild(rsAlign);

        addDefaultButtons(rightCol, 'gradientOverlay', () => {
          const en = go.enabled;
          const fresh = LayerStylesEngine.createDefaultEffect('gradientOverlay', false);
          fresh.enabled = en;
          workingStyles.gradientOverlays[activeSelection.index] = fresh;
        });
        return;
      }

      // 9. PATTERN OVERLAY
      if (sec === 'patternOverlay') {
        const po = workingStyles.patternOverlay;
        addSectionHeading(rightCol, 'Pattern Overlay');

        const sBox = addFieldset(rightCol, 'Pattern Overlay');
        addBlendModeSelect(sBox, 'Blend Mode', po.blendMode || 'source-over', null, (v) => { po.blendMode = v; });
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((po.opacity ?? 1) * 100), '%', (v) => { po.opacity = v / 100; });
        addSelectRow(sBox, 'Pattern', PATTERN_PRESETS, po.pattern || 'stripes', (v) => { po.pattern = v; });

        const snapBtn = document.createElement('button');
        snapBtn.type = 'button';
        snapBtn.className = 'ps-fx-btn';
        snapBtn.textContent = 'Snap to Origin';
        snapBtn.addEventListener('click', () => {
          po.offsetX = 0;
          po.offsetY = 0;
          markActiveEnabled();
        });
        sBox.appendChild(snapBtn);

        addSliderRow(sBox, 'Angle', -180, 180, 1, po.angle ?? 0, '°', (v) => { po.angle = v; });
        addSliderRow(sBox, 'Scale', 1, 1000, 1, po.scale ?? 100, '%', (v) => { po.scale = v; });
        addCheckboxRow(sBox, 'Link with Layer', po.linkWithLayer !== false, (v) => { po.linkWithLayer = v; });

        addDefaultButtons(rightCol, 'patternOverlay', () => {
          const en = po.enabled;
          workingStyles.patternOverlay = LayerStylesEngine.createDefaultEffect('patternOverlay', false);
          workingStyles.patternOverlay.enabled = en;
        });
        return;
      }

      // 10. OUTER GLOW (100% Exact Match to Real Photoshop Screenshot!)
      if (sec === 'outerGlow') {
        const og = workingStyles.outerGlow;
        addSectionHeading(rightCol, 'Outer Glow');

        const sBox = addFieldset(rightCol, 'Structure');
        addBlendModeSelect(sBox, 'Blend Mode', og.blendMode || 'screen', null, (v) => { og.blendMode = v; });
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((og.opacity ?? 0.35) * 100), '%', (v) => { og.opacity = v / 100; });
        addSliderRow(sBox, 'Noise', 0, 100, 1, og.noise ?? 0, '%', (v) => { og.noise = v; });
        addSolidOrGradientControl(sBox, og);

        const eBox = addFieldset(rightCol, 'Elements');
        addSelectRow(
          eBox,
          'Technique',
          [
            { id: 'softer', label: 'Softer' },
            { id: 'precise', label: 'Precise' }
          ],
          og.technique || 'softer',
          (v) => { og.technique = v; }
        );
        addSliderRow(eBox, 'Spread', 0, 100, 1, og.spread ?? 0, '%', (v) => { og.spread = v; });
        addSliderRow(eBox, 'Size', 0, 250, 1, og.size ?? 7, 'px', (v) => { og.size = v; });

        const qBox = addFieldset(rightCol, 'Quality');
        addContourControl(
          qBox,
          'Contour',
          og.contour || 'linear',
          Boolean(og.antiAliased),
          (v) => { og.contour = v; },
          (aa) => { og.antiAliased = aa; }
        );
        addSliderRow(qBox, 'Range', 1, 100, 1, og.range ?? 50, '%', (v) => { og.range = v; });
        addSliderRow(qBox, 'Jitter', 0, 100, 1, og.jitter ?? 0, '%', (v) => { og.jitter = v; });

        addDefaultButtons(rightCol, 'outerGlow', () => {
          const en = og.enabled;
          workingStyles.outerGlow = LayerStylesEngine.createDefaultEffect('outerGlow', false);
          workingStyles.outerGlow.enabled = en;
        });
        return;
      }

      // 11. DROP SHADOW (Stackable)
      if (sec === 'dropShadow') {
        const ds = getTargetEffect('dropShadow', activeSelection.index);
        addSectionHeading(rightCol, workingStyles.dropShadows.length > 1 ? `Drop Shadow #${activeSelection.index + 1}` : 'Drop Shadow');

        const sBox = addFieldset(rightCol, 'Structure');
        addBlendModeSelect(
          sBox,
          'Blend Mode',
          ds.blendMode || 'multiply',
          ds.color || '#000000',
          (v) => { ds.blendMode = v; },
          (c) => { ds.color = c; }
        );
        addSliderRow(sBox, 'Opacity', 0, 100, 1, Math.round((ds.opacity ?? 0.75) * 100), '%', (v) => { ds.opacity = v / 100; });
        addAngleControl(sBox, {
          angle: ds.angle ?? 120,
          hasGlobalLight: true,
          useGlobalLight: ds.useGlobalLight !== false,
          onAngleChange: (v) => { ds.angle = v; },
          onGlobalLightToggle: (v) => { ds.useGlobalLight = v; }
        });
        addSliderRow(sBox, 'Distance', 0, 300, 1, ds.distance ?? 5, 'px', (v) => { ds.distance = v; });
        addSliderRow(sBox, 'Spread', 0, 100, 1, ds.spread ?? 0, '%', (v) => { ds.spread = v; });
        addSliderRow(sBox, 'Size', 0, 250, 1, ds.size ?? 5, 'px', (v) => { ds.size = v; });

        const qBox = addFieldset(rightCol, 'Quality');
        addContourControl(
          qBox,
          'Contour',
          ds.contour || 'linear',
          Boolean(ds.antiAliased),
          (v) => { ds.contour = v; },
          (aa) => { ds.antiAliased = aa; }
        );
        addSliderRow(qBox, 'Noise', 0, 100, 1, ds.noise ?? 0, '%', (v) => { ds.noise = v; });
        addCheckboxRow(qBox, 'Layer Knocks Out Drop Shadow', ds.layerKnocksOut !== false, (v) => {
          ds.layerKnocksOut = v;
        });

        addDefaultButtons(rightCol, 'dropShadow', () => {
          const en = ds.enabled;
          const fresh = LayerStylesEngine.createDefaultEffect('dropShadow', false);
          fresh.enabled = en;
          workingStyles.dropShadows[activeSelection.index] = fresh;
        });
      }
    };

    const renderAll = () => {
      renderTree();
      renderRightPane();
      renderStylePreviewCanvas(previewCanvas, workingStyles, workingMeta, doc.globalLight);
    };

    // Hide default modal footer since Photoshop's OK / Cancel / New Style / Preview strip is at top
    footerEl.style.display = 'none';
    const restoreModalChrome = () => {
      footerEl.style.display = '';
      overlay.classList.remove('ps-fx-overlay', 'ps-fx-peek-mode');
      card.classList.remove('ps-fx-modal-card', 'ps-fx-peek-mode');
      this.app._modalCancelHook = null;
    };

    const wrappedCancel = () => {
      restoreModalChrome();
      cancelAndClose();
    };
    const wrappedCommit = () => {
      restoreModalChrome();
      commitAndClose();
    };

    btnCancel.onclick = wrappedCancel;
    btnOk.onclick = wrappedCommit;
    this.app._modalCancelHook = wrappedCancel;

    renderAll();
    overlay.hidden = false;
  }
}
