/* ============================================================================
 * ProStudio Mobile — Core Document Model, Fast Sandwich Compositor, Slices,
 * Perspective Crop, Custom Font Type Engine, Layer Effects (fx) & Command Registry
 * ============================================================================ */

import { Algorithms } from './algorithms.js';
import { LayerStylesEngine, PHOTOSHOP_BLEND_MODES } from './layer-styles-engine.js';

let NEXT_LAYER_ID = 1;
let NEXT_SLICE_ID = 1;

export const BLEND_MODES = PHOTOSHOP_BLEND_MODES;

export class StudioDoc {
  constructor(width = 1080, height = 1080, title = 'Untitled-1.psd') {
    this.width = width;
    this.height = height;
    this.title = title;
    this.layers = []; // bottom-to-top
    this.activeLayerId = null;
    this.selectedLayerIds = [];
    this.editingMask = false;

    // Document-wide Photoshop Global Light (synced across Bevel & Emboss, Inner Shadow, Drop Shadow)
    this.globalLight = { angle: 120, altitude: 30 };

    // Selection state
    this.hasSelection = false;
    this.selectionMask = null; // Uint8Array(width * height)
    this.selectionCanvas = null; // HTMLCanvasElement with alpha = selectionMask
    this.selectionOutline = null; // { type: 'rect'|'ellipse'|'lasso'|'mask', contourPoints? }

    // Slices state
    this.slices = [];
    this.selectedSliceId = null;
    this.hideAutoSlices = false;

    // Composite output canvas
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = width;
    this.compositeCanvas.height = height;

    // Fast interactive sandwich caches (avoids re-evaluating unchanged layers during pointermove)
    this.fastModeActive = false;
    this.belowCacheCanvas = null;
    this.aboveCacheCanvas = null;
    this.hasBelowContent = false;
    this.hasAboveContent = false;

    // Live filter preview override
    this.livePreview = null;

    // History stack
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 25;
  }

  get activeLayer() {
    return this.layers.find((l) => l.id === this.activeLayerId) || this.layers[this.layers.length - 1] || null;
  }

  getSelectedLayers() {
    const valid = (this.selectedLayerIds || [])
      .map((id) => this.layers.find((l) => l.id === id))
      .filter(Boolean);
    if (valid.length > 0) return valid;
    return this.activeLayer ? [this.activeLayer] : [];
  }

  setSelectedLayerIds(ids = []) {
    const validIds = ids.filter((id) => this.layers.some((l) => l.id === id));
    this.selectedLayerIds = Array.from(new Set(validIds));
    if (this.selectedLayerIds.length > 0 && !this.selectedLayerIds.includes(this.activeLayerId)) {
      this.activeLayerId = this.selectedLayerIds[this.selectedLayerIds.length - 1];
    }
  }

  toggleLayerSelection(layerId) {
    if (!this.layers.some((l) => l.id === layerId)) return;
    const current = this.getSelectedLayers().map((l) => l.id);
    if (current.includes(layerId)) {
      if (current.length > 1) {
        this.setSelectedLayerIds(current.filter((id) => id !== layerId));
      }
    } else {
      this.setSelectedLayerIds([...current, layerId]);
      this.activeLayerId = layerId;
    }
  }

  getCombinedTransformBounds(layers = this.getSelectedLayers()) {
    const transformable = layers.filter((l) => l && l.kind !== 'adjustment' && !l.locked);
    if (transformable.length === 0) return null;
    if (transformable.length === 1) {
      return this.getLayerTransformBounds(transformable[0]);
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const lyr of transformable) {
      const b = this.getLayerTransformBounds(lyr);
      if (!b) continue;
      const cos = Math.abs(Math.cos(b.rotation || 0));
      const sin = Math.abs(Math.sin(b.rotation || 0));
      const hw = (b.w * cos + b.h * sin) / 2;
      const hh = (b.w * sin + b.h * cos) / 2;
      if (b.cx - hw < minX) minX = b.cx - hw;
      if (b.cx + hw > maxX) maxX = b.cx + hw;
      if (b.cy - hh < minY) minY = b.cy - hh;
      if (b.cy + hh > maxY) maxY = b.cy + hh;
    }
    if (!Number.isFinite(minX)) return null;
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: Math.max(12, maxX - minX),
      h: Math.max(12, maxY - minY),
      rotation: 0
    };
  }

  selectLayersInRect(x, y, w, h) {
    const rx0 = Math.min(x, x + w);
    const ry0 = Math.min(y, y + h);
    const rx1 = Math.max(x, x + w);
    const ry1 = Math.max(y, y + h);
    const hits = [];

    for (let i = 0; i < this.layers.length; i++) {
      const lyr = this.layers[i];
      if (!lyr.visible || lyr.locked || lyr.kind === 'adjustment') continue;
      // Skip solid full-canvas bottom background layer during marquee drag-select
      if (i === 0 && !lyr.smartSource && lyr.kind === 'raster' && /background/i.test(lyr.name)) continue;
      const b = this.getLayerTransformBounds(lyr);
      if (!b) continue;
      const cos = Math.abs(Math.cos(b.rotation || 0));
      const sin = Math.abs(Math.sin(b.rotation || 0));
      const hw = (b.w * cos + b.h * sin) / 2;
      const hh = (b.w * sin + b.h * cos) / 2;
      const lx0 = b.cx - hw, lx1 = b.cx + hw, ly0 = b.cy - hh, ly1 = b.cy + hh;
      if (lx1 >= rx0 && lx0 <= rx1 && ly1 >= ry0 && ly0 <= ry1) {
        hits.push(lyr.id);
      }
    }
    if (hits.length > 0) {
      this.setSelectedLayerIds(hits);
      this.activeLayerId = hits[hits.length - 1];
    }
    return hits;
  }

  alignLayers(alignment, layers = this.getSelectedLayers()) {
    const targets = layers.filter((l) => l && !l.locked && l.kind !== 'adjustment');
    if (targets.length === 0) return false;
    const ref =
      targets.length > 1
        ? this.getCombinedTransformBounds(targets)
        : { cx: this.width / 2, cy: this.height / 2, w: this.width, h: this.height };
    if (!ref) return false;

    const refLeft = ref.cx - ref.w / 2;
    const refRight = ref.cx + ref.w / 2;
    const refTop = ref.cy - ref.h / 2;
    const refBottom = ref.cy + ref.h / 2;

    for (const lyr of targets) {
      if (lyr.kind === 'raster' && !lyr.smartSource) this.ensureSmartSource(lyr);
      const b = this.getLayerTransformBounds(lyr);
      if (!b) continue;
      const cos = Math.abs(Math.cos(b.rotation || 0));
      const sin = Math.abs(Math.sin(b.rotation || 0));
      const hw = (b.w * cos + b.h * sin) / 2;
      const hh = (b.w * sin + b.h * cos) / 2;

      let dx = 0;
      let dy = 0;
      if (alignment === 'left') dx = refLeft - (b.cx - hw);
      else if (alignment === 'centerH') dx = ref.cx - b.cx;
      else if (alignment === 'right') dx = refRight - (b.cx + hw);
      else if (alignment === 'top') dy = refTop - (b.cy - hh);
      else if (alignment === 'centerV') dy = ref.cy - b.cy;
      else if (alignment === 'bottom') dy = refBottom - (b.cy + hh);

      if (lyr.smartSource?.canvas) {
        lyr.smartSource.cx += dx;
        lyr.smartSource.cy += dy;
        this.rasterizeSmartLayer(lyr);
      } else if (lyr.kind === 'shape' && lyr.shapeData) {
        lyr.shapeData.x += dx;
        lyr.shapeData.y += dy;
        this.rasterizeShapeLayer(lyr);
      } else if (lyr.kind === 'text' && lyr.textData) {
        lyr.textData.x += dx;
        lyr.textData.y += dy;
        this.rasterizeTextLayer(lyr);
      }
    }
    return true;
  }

  reorderLayer(layerId, direction) {
    const idx = this.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return false;
    let target = idx;
    if (direction === 'front') target = this.layers.length - 1;
    else if (direction === 'up') target = Math.min(this.layers.length - 1, idx + 1);
    else if (direction === 'down') target = Math.max(0, idx - 1);
    else if (direction === 'back') target = 0;
    if (target === idx) return false;
    const [lyr] = this.layers.splice(idx, 1);
    this.layers.splice(target, 0, lyr);
    return true;
  }

  get selectedSlice() {
    return this.slices.find((s) => s.id === this.selectedSliceId) || this.slices[0] || null;
  }

  normalizeLayerStyles(rawStyles) {
    return LayerStylesEngine.normalizeLayerStyles(rawStyles);
  }

  createLayerObject(opts = {}) {
    const id = opts.id || `layer_${NEXT_LAYER_ID++}`;
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    if (opts.sourceCanvas) {
      canvas.getContext('2d').drawImage(opts.sourceCanvas, 0, 0);
    }

    const layer = {
      id,
      name: opts.name || `Layer ${this.layers.length + 1}`,
      kind: opts.kind || 'raster', // 'raster' | 'adjustment' | 'text' | 'shape'
      visible: opts.visible !== false,
      opacity: opts.opacity ?? 1.0,
      fill: opts.fill ?? 1.0,
      blendMode: opts.blendMode || 'source-over',
      locked: opts.locked || false,
      clipping: opts.clipping || false,
      canvas,
      maskCanvas: null,
      maskEnabled: true,
      adjustment: opts.adjustment ? structuredClone(opts.adjustment) : null,
      textData: opts.textData ? structuredClone(opts.textData) : null,
      shapeData: opts.shapeData ? structuredClone(opts.shapeData) : null,
      smartSource: opts.smartSource
        ? {
            canvas: opts.smartSource.canvas,
            cx: opts.smartSource.cx,
            cy: opts.smartSource.cy,
            w: opts.smartSource.w,
            h: opts.smartSource.h,
            origW: opts.smartSource.origW || opts.smartSource.canvas?.width || this.width,
            origH: opts.smartSource.origH || opts.smartSource.canvas?.height || this.height,
            rotation: opts.smartSource.rotation || 0,
            flipX: Boolean(opts.smartSource.flipX),
            flipY: Boolean(opts.smartSource.flipY)
          }
        : null,
      styles: this.normalizeLayerStyles(opts.styles)
    };

    if (opts.maskCanvas) {
      const mc = document.createElement('canvas');
      mc.width = this.width;
      mc.height = this.height;
      mc.getContext('2d').drawImage(opts.maskCanvas, 0, 0);
      layer.maskCanvas = mc;
      layer.maskEnabled = opts.maskEnabled !== false;
    }

    if (!opts.sourceCanvas) {
      if (layer.smartSource?.canvas) {
        this.rasterizeSmartLayer(layer);
      } else if (layer.kind === 'text' && layer.textData) {
        this.rasterizeTextLayer(layer);
      } else if (layer.kind === 'shape' && layer.shapeData) {
        this.rasterizeShapeLayer(layer);
      }
    }

    return layer;
  }

  /**
   * Compute tight non-transparent pixel bounding box { x, y, w, h } of a canvas.
   */
  computeCanvasOpaqueBounds(canvas) {
    const W = canvas.width;
    const H = canvas.height;
    if (!W || !H) return null;
    const data = canvas.getContext('2d').getImageData(0, 0, W, H).data;
    // Fast 2px stride scan first, then exact edge refinement
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y += 2) {
      const row = y * W;
      for (let x = 0; x < W; x += 2) {
        if (data[(row + x) * 4 + 3] > 6) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      // Fallback exact 1px scan for ultra-thin strokes
      for (let y = 0; y < H; y++) {
        const row = y * W;
        for (let x = 0; x < W; x++) {
          if (data[(row + x) * 4 + 3] > 6) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    } else {
      minX = Math.max(0, minX - 2);
      minY = Math.max(0, minY - 2);
      maxX = Math.min(W - 1, maxX + 2);
      maxY = Math.min(H - 1, maxY + 2);
    }
    if (maxX < minX || maxY < minY) return null;
    return { x: minX, y: minY, w: Math.max(1, maxX - minX + 1), h: Math.max(1, maxY - minY + 1) };
  }

  /**
   * Non-destructively rasterize a Smart Source layer (imported photo or transformed image)
   * with high-quality resampling, exact scale, rotation, and flip.
   */
  rasterizeSmartLayer(layer) {
    if (!layer || !layer.smartSource || !layer.smartSource.canvas) return;
    const ss = layer.smartSource;
    const ctx = layer.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(ss.cx, ss.cy);
    if (ss.rotation) ctx.rotate(ss.rotation);
    ctx.scale(ss.flipX ? -1 : 1, ss.flipY ? -1 : 1);
    ctx.drawImage(ss.canvas, -ss.w / 2, -ss.h / 2, ss.w, ss.h);
    ctx.restore();
  }

  /**
   * Promote a raster layer to a non-destructive Smart Source tightly wrapped around its
   * actual visible pixel bounds so moving off-canvas or scaling back and forth NEVER clips or blurs!
   */
  ensureSmartSource(layer) {
    if (!layer || layer.kind !== 'raster') return null;
    if (layer.smartSource && layer.smartSource.canvas) return layer.smartSource;
    const bounds = this.computeCanvasOpaqueBounds(layer.canvas);
    if (!bounds) return null;

    const src = document.createElement('canvas');
    src.width = bounds.w;
    src.height = bounds.h;
    src.getContext('2d').drawImage(layer.canvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);

    layer.smartSource = {
      canvas: src,
      cx: bounds.x + bounds.w / 2,
      cy: bounds.y + bounds.h / 2,
      w: bounds.w,
      h: bounds.h,
      origW: bounds.w,
      origH: bounds.h,
      rotation: 0,
      flipX: false,
      flipY: false
    };
    return layer.smartSource;
  }

  /**
   * Bake a Smart Source layer into regular pixels before destructive brush/filter edits.
   */
  bakeSmartSource(layer) {
    if (!layer || !layer.smartSource) return;
    this.rasterizeSmartLayer(layer);
    layer.smartSource = null;
  }

  /**
   * Measure live bounding box { cx, cy, w, h, rotation } for ANY layer type (Smart Image, Text, Shape, Raster).
   */
  getLayerTransformBounds(layer) {
    if (!layer || layer.kind === 'adjustment') return null;

    if (layer.smartSource && layer.smartSource.canvas) {
      const ss = layer.smartSource;
      return { cx: ss.cx, cy: ss.cy, w: Math.max(8, ss.w), h: Math.max(8, ss.h), rotation: ss.rotation || 0 };
    }

    if (layer.kind === 'shape' && layer.shapeData) {
      const sd = layer.shapeData;
      const w = Math.max(8, Math.abs(sd.w ?? this.width * 0.5));
      const h = Math.max(8, Math.abs(sd.h ?? this.height * 0.5));
      const x = sd.x ?? this.width * 0.25;
      const y = sd.y ?? this.height * 0.25;
      return { cx: x + w / 2, cy: y + h / 2, w, h, rotation: sd.rotation || 0 };
    }

    if (layer.kind === 'text' && layer.textData) {
      const td = layer.textData;
      const mCtx = this._measureCtx || (this._measureCtx = document.createElement('canvas').getContext('2d'));
      const size = td.fontSize || 48;
      mCtx.font = `${td.italic ? 'italic' : 'normal'} ${td.fontWeight || '600'} ${size}px ${td.fontFamily || 'Inter, sans-serif'}`;
      const lines = String(td.text || ' ').split('\n');
      const lh = size * (td.lineHeight || 1.25);
      const bx = td.x ?? this.width / 2;
      const by = td.y ?? this.height / 2;

      let w = 0;
      let h = 0;
      if (td.orientation === 'vertical') {
        w = Math.max(size, lines.length * size * (td.lineHeight || 1.3));
        const maxChars = Math.max(1, ...lines.map((l) => Array.from(l).length));
        h = Math.max(size, maxChars * (size + (td.tracking || 0)));
      } else {
        for (const line of lines) {
          const mw = mCtx.measureText(line).width + Math.max(0, line.length - 1) * (td.tracking || 0);
          if (mw > w) w = mw;
        }
        w = Math.max(size, w + 12);
        h = Math.max(size, lines.length * lh);
      }

      let cx = bx;
      if (td.orientation !== 'vertical') {
        if (td.align === 'left') cx = bx + w / 2;
        else if (td.align === 'right') cx = bx - w / 2;
      }
      return { cx, cy: by, w, h, rotation: td.rotation || 0 };
    }

    const bounds = this.computeCanvasOpaqueBounds(layer.canvas);
    if (!bounds) {
      return { cx: this.width / 2, cy: this.height / 2, w: this.width * 0.8, h: this.height * 0.8, rotation: 0 };
    }
    return { cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h / 2, w: bounds.w, h: bounds.h, rotation: 0 };
  }

  /**
   * Rasterize live Type Layer onto its layer canvas.
   */
  rasterizeTextLayer(layer) {
    if (!layer || !layer.textData) return;
    const td = layer.textData;
    const ctx = layer.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();

    const style = td.italic ? 'italic' : 'normal';
    const weight = td.fontWeight || '600';
    const size = td.fontSize || 48;
    const family = td.fontFamily || 'Inter, sans-serif';
    ctx.font = `${style} ${weight} ${size}px ${family}`;
    ctx.fillStyle = td.color || '#ffffff';
    ctx.textBaseline = 'middle';

    const tracking = Number(td.tracking || 0);
    const orientation = td.orientation || 'horizontal';
    const warp = td.warp || 'none';
    const warpBend = Number(td.warpBend ?? 35) / 100;

    const baseX = td.x ?? this.width / 2;
    const baseY = td.y ?? this.height / 2;

    if (td.rotation || td.flipX || td.flipY) {
      let rotCx = baseX;
      if (orientation !== 'vertical' && (td.align === 'left' || td.align === 'right')) {
        const tmpLines = String(td.text || ' ').split('\n');
        let maxW = 0;
        for (const ln of tmpLines) {
          const mw = ctx.measureText(ln).width + Math.max(0, ln.length - 1) * tracking;
          if (mw > maxW) maxW = mw;
        }
        const bw = Math.max(size, maxW + 12);
        rotCx = td.align === 'left' ? baseX + bw / 2 : baseX - bw / 2;
      }
      ctx.translate(rotCx, baseY);
      if (td.rotation) ctx.rotate(td.rotation);
      ctx.scale(td.flipX ? -1 : 1, td.flipY ? -1 : 1);
      ctx.translate(-rotCx, -baseY);
    }

    if (orientation === 'vertical') {
      const cols = String(td.text || '').split('\n');
      const colSpacing = size * (td.lineHeight || 1.3);
      const stepY = size + tracking;
      ctx.textAlign = 'center';

      for (let c = 0; c < cols.length; c++) {
        const chars = Array.from(cols[c]);
        const colX = baseX + ((cols.length - 1) / 2 - c) * colSpacing;
        const totalColH = chars.length * stepY;
        const startY = baseY - totalColH / 2 + stepY / 2;
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          const cy = startY + i * stepY;
          if (td.strokeWidth && td.strokeWidth > 0) {
            ctx.lineWidth = td.strokeWidth;
            ctx.strokeStyle = td.strokeColor || '#000000';
            ctx.strokeText(ch, colX, cy);
          }
          ctx.fillText(ch, colX, cy);
        }
      }
      ctx.restore();
      return;
    }

    const lines = String(td.text || '').split('\n');
    const lineHeight = size * (td.lineHeight || 1.25);
    const totalH = lines.length * lineHeight;
    const startY = baseY - totalH / 2 + lineHeight / 2;
    const align = td.align || 'center';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const y = startY + i * lineHeight;

      if (tracking === 0 && warp === 'none') {
        ctx.textAlign = align;
        if (td.strokeWidth && td.strokeWidth > 0) {
          ctx.lineWidth = td.strokeWidth;
          ctx.strokeStyle = td.strokeColor || '#000000';
          ctx.strokeText(line, baseX, y);
        }
        ctx.fillText(line, baseX, y);
      } else {
        const chars = Array.from(line);
        const widths = chars.map((ch) => ctx.measureText(ch).width);
        const lineW =
          widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * tracking;
        let cursorX =
          align === 'left'
            ? baseX
            : align === 'right'
            ? baseX - lineW
            : baseX - lineW / 2;

        ctx.textAlign = 'center';
        for (let c = 0; c < chars.length; c++) {
          const cw = widths[c];
          const cx = cursorX + cw / 2;
          const normT = lineW > 0 ? (cx - (baseX - lineW / 2)) / lineW - 0.5 : 0;

          let dy = 0;
          let rot = 0;
          if (warp === 'arcUp') {
            dy = (normT * normT - 0.125) * lineW * warpBend;
            rot = normT * warpBend * 1.1;
          } else if (warp === 'arcDown') {
            dy = -(normT * normT - 0.125) * lineW * warpBend;
            rot = -normT * warpBend * 1.1;
          } else if (warp === 'wave') {
            dy = Math.sin(normT * Math.PI * 2) * size * 0.45 * warpBend;
            rot = Math.cos(normT * Math.PI * 2) * 0.25 * warpBend;
          }

          ctx.save();
          ctx.translate(cx, y + dy);
          if (rot !== 0) ctx.rotate(rot);
          if (td.strokeWidth && td.strokeWidth > 0) {
            ctx.lineWidth = td.strokeWidth;
            ctx.strokeStyle = td.strokeColor || '#000000';
            ctx.strokeText(chars[c], 0, 0);
          }
          ctx.fillText(chars[c], 0, 0);
          ctx.restore();

          cursorX += cw + tracking;
        }
      }
    }

    ctx.restore();
  }

  rasterizeShapeLayer(layer) {
    if (!layer || !layer.shapeData) return;
    const sd = layer.shapeData;
    const ctx = layer.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();

    const x = sd.x ?? this.width * 0.2;
    const y = sd.y ?? this.height * 0.2;
    const w = sd.w ?? this.width * 0.6;
    const h = sd.h ?? this.height * 0.6;
    const cx = x + w / 2;
    const cy = y + h / 2;

    if (sd.rotation || sd.flipX || sd.flipY) {
      ctx.translate(cx, cy);
      if (sd.rotation) ctx.rotate(sd.rotation);
      ctx.scale(sd.flipX ? -1 : 1, sd.flipY ? -1 : 1);
      ctx.translate(-cx, -cy);
    }

    ctx.beginPath();
    if (sd.shapeType === 'ellipse') {
      ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    } else if (sd.shapeType === 'polygon' || sd.shapeType === 'star') {
      const points = sd.points || (sd.shapeType === 'star' ? 5 : 6);
      const outerRx = Math.abs(w) / 2;
      const outerRy = Math.abs(h) / 2;
      const innerRx = sd.shapeType === 'star' ? outerRx * 0.45 : outerRx;
      const innerRy = sd.shapeType === 'star' ? outerRy * 0.45 : outerRy;
      const steps = sd.shapeType === 'star' ? points * 2 : points;
      for (let i = 0; i < steps; i++) {
        const rx = sd.shapeType === 'star' && i % 2 === 1 ? innerRx : outerRx;
        const ry = sd.shapeType === 'star' && i % 2 === 1 ? innerRy : outerRy;
        const a = (i * Math.PI * 2) / steps - Math.PI / 2;
        const px = cx + rx * Math.cos(a);
        const py = cy + ry * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      const r = Math.min(sd.cornerRadius ?? 14, Math.abs(w) / 2, Math.abs(h) / 2);
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
    }

    if (sd.fill && sd.fill !== 'none') {
      ctx.fillStyle = sd.fill;
      ctx.fill();
    }
    if (sd.strokeWidth && sd.strokeWidth > 0) {
      ctx.lineWidth = sd.strokeWidth;
      ctx.strokeStyle = sd.stroke || '#ffffff';
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Render a single layer (including its mask and Layer Styles fx) to a 2D context.
   */
  renderSingleLayerToContext(layer, destCtx, applyPreview = false) {
    if (!layer || !layer.visible || layer.kind === 'adjustment' || layer._inlineEditing) return;

    let srcCanvas = layer.canvas;

    if (applyPreview && this.livePreview && layer.id === this.activeLayerId) {
      const temp = document.createElement('canvas');
      temp.width = this.width;
      temp.height = this.height;
      const tCtx = temp.getContext('2d');
      tCtx.drawImage(srcCanvas, 0, 0);
      const imgData = tCtx.getImageData(0, 0, this.width, this.height);
      if (this.livePreview.type === 'filter') {
        Algorithms.applyFilterToImageData(
          imgData,
          this.livePreview.id,
          this.livePreview.params,
          this.hasSelection ? this.selectionMask : null
        );
      } else if (this.livePreview.type === 'adjustment') {
        Algorithms.applyAdjustmentToImageData(
          imgData,
          this.livePreview.id,
          this.livePreview.params,
          this.hasSelection ? this.selectionMask : null
        );
      }
      tCtx.putImageData(imgData, 0, 0);
      srcCanvas = temp;
    }

    const applyLayerMaskToCanvas = (canvasToMask) => {
      const masked = document.createElement('canvas');
      masked.width = this.width;
      masked.height = this.height;
      const mCtx = masked.getContext('2d');
      mCtx.drawImage(canvasToMask, 0, 0);

      const layerData = mCtx.getImageData(0, 0, this.width, this.height);
      const maskData = layer.maskCanvas.getContext('2d').getImageData(0, 0, this.width, this.height).data;
      const dst = layerData.data;
      for (let i = 0; i < dst.length; i += 4) {
        const maskLum = maskData[i];
        const maskAlpha = maskData[i + 3] / 255;
        dst[i + 3] = Math.round(dst[i + 3] * (maskLum / 255) * maskAlpha);
      }
      mCtx.putImageData(layerData, 0, 0);
      return masked;
    };

    const maskHidesEffects = Boolean(layer.styles?.blendOptions?.layerMaskHidesEffects);
    const hasMask = Boolean(layer.maskCanvas && layer.maskEnabled);
    const hasFx = Algorithms.hasActiveLayerEffects(layer.styles);

    if (hasMask && !maskHidesEffects) {
      srcCanvas = applyLayerMaskToCanvas(srcCanvas);
    }

    // Fast path when no layer effects are active
    if (!hasFx) {
      if (hasMask && maskHidesEffects) {
        srcCanvas = applyLayerMaskToCanvas(srcCanvas);
      }
      const alpha = Math.max(0, Math.min(1, (layer.opacity ?? 1) * (layer.fill ?? 1)));
      LayerStylesEngine.compositeCanvas(destCtx, srcCanvas, layer.blendMode || 'source-over', alpha);
      return;
    }

    if (hasMask && maskHidesEffects) {
      // Photoshop "Layer Mask Hides Effects": render effects first, then clip entire result by mask
      const fxBuf = document.createElement('canvas');
      fxBuf.width = this.width;
      fxBuf.height = this.height;
      const fxCtx = fxBuf.getContext('2d');
      LayerStylesEngine.renderLayerWithEffects(layer, fxCtx, srcCanvas, this.width, this.height, this.globalLight);
      const clipped = applyLayerMaskToCanvas(fxBuf);
      destCtx.drawImage(clipped, 0, 0);
      return;
    }

    LayerStylesEngine.renderLayerWithEffects(layer, destCtx, srcCanvas, this.width, this.height, this.globalLight);
  }

  /**
   * Pre-cache static layers below and above the active layer before an interactive
   * brush stroke or layer drag so pointermove runs at 60fps with zero per-pixel CPU loops!
   */
  beginFastInteraction() {
    const activeIdx = this.layers.findIndex((l) => l.id === this.activeLayerId);
    if (activeIdx < 0) return;

    if (!this.belowCacheCanvas) {
      this.belowCacheCanvas = document.createElement('canvas');
      this.aboveCacheCanvas = document.createElement('canvas');
    }
    this.belowCacheCanvas.width = this.width;
    this.belowCacheCanvas.height = this.height;
    this.aboveCacheCanvas.width = this.width;
    this.aboveCacheCanvas.height = this.height;

    const bCtx = this.belowCacheCanvas.getContext('2d');
    bCtx.clearRect(0, 0, this.width, this.height);
    this.hasBelowContent = false;
    for (let i = 0; i < activeIdx; i++) {
      const lyr = this.layers[i];
      if (!lyr.visible) continue;
      this.hasBelowContent = true;
      if (lyr.kind === 'adjustment' && lyr.adjustment) {
        const compData = bCtx.getImageData(0, 0, this.width, this.height);
        Algorithms.applyAdjustmentToImageData(compData, lyr.adjustment.type, lyr.adjustment.params, null);
        bCtx.putImageData(compData, 0, 0);
      } else {
        this.renderSingleLayerToContext(lyr, bCtx, false);
      }
    }

    const aCtx = this.aboveCacheCanvas.getContext('2d');
    aCtx.clearRect(0, 0, this.width, this.height);
    this.hasAboveContent = false;
    for (let i = activeIdx + 1; i < this.layers.length; i++) {
      const lyr = this.layers[i];
      if (!lyr.visible || lyr.kind === 'adjustment') continue;
      this.hasAboveContent = true;
      this.renderSingleLayerToContext(lyr, aCtx, false);
    }

    this.fastModeActive = true;
  }

  /**
   * Ultra-fast GPU drawImage composition used during active pointermove strokes/drags.
   */
  composeFast() {
    if (!this.fastModeActive) {
      return this.compose();
    }
    const ctx = this.compositeCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.hasBelowContent) {
      ctx.drawImage(this.belowCacheCanvas, 0, 0);
    }
    const active = this.activeLayer;
    if (active && active.visible && active.kind !== 'adjustment') {
      this.renderSingleLayerToContext(active, ctx, false);
    }
    if (this.hasAboveContent) {
      ctx.drawImage(this.aboveCacheCanvas, 0, 0);
    }
    return this.compositeCanvas;
  }

  endFastInteraction() {
    this.fastModeActive = false;
    return this.compose();
  }

  /**
   * Evaluate the complete layer tree into `this.compositeCanvas`.
   */
  compose() {
    if (this.fastModeActive) {
      return this.composeFast();
    }
    const ctx = this.compositeCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (!layer.visible) continue;

      if (layer.kind === 'adjustment' && layer.adjustment) {
        const compData = ctx.getImageData(0, 0, this.width, this.height);
        const origData = new Uint8ClampedArray(compData.data);

        let maskArr = null;
        if (layer.maskCanvas && layer.maskEnabled) {
          const mPixels = layer.maskCanvas.getContext('2d').getImageData(0, 0, this.width, this.height).data;
          maskArr = new Uint8Array(this.width * this.height);
          for (let p = 0, m = 0; p < maskArr.length; p++, m += 4) {
            maskArr[p] = Math.round((mPixels[m] * mPixels[m + 3]) / 255);
          }
        }

        Algorithms.applyAdjustmentToImageData(
          compData,
          layer.adjustment.type,
          layer.adjustment.params,
          maskArr
        );

        const op = layer.opacity ?? 1;
        if (op < 1) {
          const d = compData.data;
          for (let k = 0; k < d.length; k += 4) {
            d[k] = Math.round(origData[k] + (d[k] - origData[k]) * op);
            d[k + 1] = Math.round(origData[k + 1] + (d[k + 1] - origData[k + 1]) * op);
            d[k + 2] = Math.round(origData[k + 2] + (d[k + 2] - origData[k + 2]) * op);
          }
        }
        ctx.putImageData(compData, 0, 0);
      } else if (layer.clipping && i > 0) {
        let baseIdx = i - 1;
        while (baseIdx > 0 && this.layers[baseIdx].clipping) baseIdx--;
        const baseLayer = this.layers[baseIdx];
        if (baseLayer && baseLayer.visible) {
          const clipScratch = document.createElement('canvas');
          clipScratch.width = this.width;
          clipScratch.height = this.height;
          const csCtx = clipScratch.getContext('2d');
          const origBlend = layer.blendMode;
          layer.blendMode = 'source-over';
          this.renderSingleLayerToContext(layer, csCtx, true);
          layer.blendMode = origBlend;
          csCtx.globalCompositeOperation = 'destination-in';
          csCtx.drawImage(baseLayer.canvas, 0, 0);

          LayerStylesEngine.compositeCanvas(ctx, clipScratch, origBlend || 'source-over', 1.0);
        }
      } else {
        this.renderSingleLayerToContext(layer, ctx, true);
      }
    }

    return this.compositeCanvas;
  }

  /**
   * Slice Tool & Slice Select Tool Engine
   */
  addSlice(opts = {}) {
    const id = opts.id || `slice_${NEXT_SLICE_ID++}`;
    const x = Math.max(0, Math.min(this.width - 8, Math.round(opts.x ?? 0)));
    const y = Math.max(0, Math.min(this.height - 8, Math.round(opts.y ?? 0)));
    const w = Math.max(8, Math.min(this.width - x, Math.round(opts.w ?? this.width / 2)));
    const h = Math.max(8, Math.min(this.height - y, Math.round(opts.h ?? this.height / 2)));

    const slice = {
      id,
      name: opts.name || `slice_${String(this.slices.length + 1).padStart(2, '0')}`,
      x,
      y,
      w,
      h,
      origin: opts.origin || 'user',
      url: opts.url || '',
      target: opts.target || '',
      altText: opts.altText || '',
      format: opts.format || 'png'
    };
    this.slices.push(slice);
    this.selectedSliceId = slice.id;
    return slice;
  }

  divideSelectedSlice(horizCount = 2, vertCount = 2) {
    const s = this.selectedSlice;
    if (!s) return [];
    const idx = this.slices.findIndex((item) => item.id === s.id);
    if (idx < 0) return [];

    const rows = Math.max(1, Math.min(12, Math.round(horizCount)));
    const cols = Math.max(1, Math.min(12, Math.round(vertCount)));
    if (rows === 1 && cols === 1) return [s];

    this.slices.splice(idx, 1);
    const created = [];
    const cellW = s.w / cols;
    const cellH = s.h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sub = this.addSlice({
          name: `${s.name}_${r + 1}x${c + 1}`,
          x: Math.round(s.x + c * cellW),
          y: Math.round(s.y + r * cellH),
          w: Math.round(cellW),
          h: Math.round(cellH),
          origin: 'user',
          format: s.format
        });
        created.push(sub);
      }
    }
    if (created.length > 0) {
      this.selectedSliceId = created[0].id;
    }
    return created;
  }

  createSliceFromActiveLayer() {
    const layer = this.activeLayer;
    if (!layer || layer.kind === 'adjustment') return null;
    const data = layer.canvas.getContext('2d').getImageData(0, 0, this.width, this.height).data;
    let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < this.height; y++) {
      const row = y * this.width;
      for (let x = 0; x < this.width; x++) {
        if (data[(row + x) * 4 + 3] > 10) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) {
      return this.addSlice({
        name: layer.name.replace(/\s+/g, '_').toLowerCase(),
        x: Math.round(this.width * 0.15),
        y: Math.round(this.height * 0.15),
        w: Math.round(this.width * 0.7),
        h: Math.round(this.height * 0.7),
        origin: 'layer'
      });
    }
    return this.addSlice({
      name: layer.name.replace(/\s+/g, '_').toLowerCase(),
      x: minX,
      y: minY,
      w: Math.max(12, maxX - minX + 1),
      h: Math.max(12, maxY - minY + 1),
      origin: 'layer'
    });
  }

  resolveDisplaySlices() {
    if (this.slices.length === 0) {
      return [
        {
          id: 'auto_full',
          number: 1,
          name: 'auto_01',
          x: 0,
          y: 0,
          w: this.width,
          h: this.height,
          origin: 'auto'
        }
      ];
    }

    const result = [];
    if (!this.hideAutoSlices) {
      const xs = new Set([0, this.width]);
      const ys = new Set([0, this.height]);
      for (const s of this.slices) {
        xs.add(Math.max(0, Math.min(this.width, s.x)));
        xs.add(Math.max(0, Math.min(this.width, s.x + s.w)));
        ys.add(Math.max(0, Math.min(this.height, s.y)));
        ys.add(Math.max(0, Math.min(this.height, s.y + s.h)));
      }
      const xArr = Array.from(xs).sort((a, b) => a - b);
      const yArr = Array.from(ys).sort((a, b) => a - b);

      for (let yi = 0; yi < yArr.length - 1; yi++) {
        for (let xi = 0; xi < xArr.length - 1; xi++) {
          const rx = xArr[xi];
          const ry = yArr[yi];
          const rw = xArr[xi + 1] - rx;
          const rh = yArr[yi + 1] - ry;
          if (rw < 4 || rh < 4) continue;
          const cx = rx + rw / 2;
          const cy = ry + rh / 2;
          const coveredByUser = this.slices.some(
            (u) => cx >= u.x && cx <= u.x + u.w && cy >= u.y && cy <= u.y + u.h
          );
          if (!coveredByUser) {
            result.push({
              id: `auto_${ry}_${rx}`,
              name: 'auto_slice',
              x: rx,
              y: ry,
              w: rw,
              h: rh,
              origin: 'auto'
            });
          }
        }
      }
    }

    for (const u of this.slices) {
      result.push({ ...u });
    }

    result.sort((a, b) => (Math.abs(a.y - b.y) > 4 ? a.y - b.y : a.x - b.x));
    result.forEach((s, idx) => {
      s.number = idx + 1;
    });
    return result;
  }

  /**
   * Smart Canvas Selection Engine
   * Supports Boolean Combine Modes (replace, add, subtract, intersect), Smart Object Select,
   * Quick Selection Brush (edge-aware), Color Range, Magic Wand (contiguous/global, sample all),
   * Layer Transparency Load, and Selection Modification (Expand, Contract, Smooth, Border, Feather).
   */
  computeMaskContour(mask) {
    const contourPoints = [];
    const W = this.width;
    const H = this.height;
    const step = Math.max(2, Math.round(Math.min(W, H) / 170));
    for (let y = 0; y < H; y += step) {
      const row = y * W;
      const nextY = Math.min(H - 1, y + step);
      const nextRow = nextY * W;
      for (let x = 0; x < W; x += step) {
        const cur = mask[row + x] > 127;
        const nx = Math.min(W - 1, x + step);
        const right = mask[row + nx] > 127;
        const down = mask[nextRow + x] > 127;
        if (cur !== right || cur !== down || (cur && (x === 0 || y === 0 || x + step >= W || y + step >= H))) {
          contourPoints.push({ x, y });
        }
      }
    }
    return contourPoints;
  }

  getSelectionBounds() {
    if (!this.hasSelection || !this.selectionMask) return null;
    const mask = this.selectionMask;
    const W = this.width;
    const H = this.height;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y += 2) {
      const row = y * W;
      for (let x = 0; x < W; x += 2) {
        if (mask[row + x] > 16) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    return { x: minX, y: minY, w: Math.max(1, maxX - minX + 2), h: Math.max(1, maxY - minY + 2) };
  }

  combineSelectionMask(newMask, mode = 'replace', directOutline = null) {
    if (mode === 'replace' || !this.hasSelection || !this.selectionMask) {
      if (mode === 'subtract') return;
      if (mode === 'intersect' && !this.hasSelection) {
        this.clearSelection();
        return;
      }
      const outline = directOutline || { type: 'mask', contourPoints: this.computeMaskContour(newMask) };
      this.updateSelectionFromMask(newMask, outline);
      return;
    }

    const oldMask = this.selectionMask;
    const out = new Uint8Array(oldMask.length);
    if (mode === 'add') {
      for (let i = 0; i < out.length; i++) out[i] = newMask[i] > oldMask[i] ? newMask[i] : oldMask[i];
    } else if (mode === 'subtract') {
      for (let i = 0; i < out.length; i++) {
        const v = oldMask[i] - newMask[i];
        out[i] = v > 0 ? v : 0;
      }
    } else if (mode === 'intersect') {
      for (let i = 0; i < out.length; i++) out[i] = newMask[i] < oldMask[i] ? newMask[i] : oldMask[i];
    } else {
      out.set(newMask);
    }
    this.updateSelectionFromMask(out, { type: 'mask', contourPoints: this.computeMaskContour(out) });
  }

  getSampleSourceData(sampleAllLayers = true) {
    if (sampleAllLayers || !this.activeLayer || this.activeLayer.kind === 'adjustment') {
      this.compose();
      return this.compositeCanvas.getContext('2d').getImageData(0, 0, this.width, this.height).data;
    }
    return this.activeLayer.canvas.getContext('2d').getImageData(0, 0, this.width, this.height).data;
  }

  setRectSelection(x, y, w, h, combineMode = 'replace') {
    const x0 = Math.max(0, Math.min(this.width, Math.round(Math.min(x, x + w))));
    const y0 = Math.max(0, Math.min(this.height, Math.round(Math.min(y, y + h))));
    const x1 = Math.max(0, Math.min(this.width, Math.round(Math.max(x, x + w))));
    const y1 = Math.max(0, Math.min(this.height, Math.round(Math.max(y, y + h))));

    if (x1 - x0 < 2 || y1 - y0 < 2) {
      if (combineMode === 'replace') this.clearSelection();
      return;
    }

    const mask = new Uint8Array(this.width * this.height);
    for (let py = y0; py < y1; py++) {
      const row = py * this.width;
      for (let px = x0; px < x1; px++) {
        mask[row + px] = 255;
      }
    }
    this.combineSelectionMask(mask, combineMode, { type: 'rect', x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }

  setEllipseSelection(x, y, w, h, combineMode = 'replace') {
    const x0 = Math.min(x, x + w);
    const y0 = Math.min(y, y + h);
    const rw = Math.abs(w) / 2;
    const rh = Math.abs(h) / 2;
    if (rw < 2 || rh < 2) {
      if (combineMode === 'replace') this.clearSelection();
      return;
    }
    const cx = x0 + rw;
    const cy = y0 + rh;
    const mask = new Uint8Array(this.width * this.height);

    for (let py = 0; py < this.height; py++) {
      const dy = (py - cy) / rh;
      const dy2 = dy * dy;
      if (dy2 > 1) continue;
      for (let px = 0; px < this.width; px++) {
        const dx = (px - cx) / rw;
        if (dx * dx + dy2 <= 1) {
          mask[py * this.width + px] = 255;
        }
      }
    }
    this.combineSelectionMask(mask, combineMode, { type: 'ellipse', cx, cy, rw, rh });
  }

  setLassoSelection(points, combineMode = 'replace') {
    if (!points || points.length < 3) {
      if (combineMode === 'replace') this.clearSelection();
      return;
    }
    const c = document.createElement('canvas');
    c.width = this.width;
    c.height = this.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();

    const data = ctx.getImageData(0, 0, this.width, this.height).data;
    const mask = new Uint8Array(this.width * this.height);
    for (let i = 0, p = 0; p < mask.length; p++, i += 4) {
      mask[p] = data[i + 3];
    }
    this.combineSelectionMask(mask, combineMode, { type: 'lasso', points: [...points] });
  }

  selectMagicWand(startX, startY, tolerance = 32, opts = {}) {
    const { contiguous = true, sampleAllLayers = true, combineMode = 'replace' } = opts;
    const x0 = Math.round(startX);
    const y0 = Math.round(startY);
    if (x0 < 0 || x0 >= this.width || y0 < 0 || y0 >= this.height) return;

    const W = this.width;
    const H = this.height;
    const data = this.getSampleSourceData(sampleAllLayers);
    const sIdx = (y0 * W + x0) * 4;
    const sr = data[sIdx], sg = data[sIdx + 1], sb = data[sIdx + 2], sa = data[sIdx + 3];
    const mask = new Uint8Array(W * H);

    if (!contiguous) {
      for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
        if (
          Math.abs(data[i] - sr) <= tolerance &&
          Math.abs(data[i + 1] - sg) <= tolerance &&
          Math.abs(data[i + 2] - sb) <= tolerance &&
          Math.abs(data[i + 3] - sa) <= tolerance
        ) {
          mask[p] = 255;
        }
      }
    } else {
      const visited = new Uint8Array(W * H);
      const stack = new Int32Array(W * H);
      let top = 0;
      const startP = y0 * W + x0;
      stack[top++] = startP;
      visited[startP] = 1;

      while (top > 0) {
        const px = stack[--top];
        mask[px] = 255;
        const x = px % W;
        const y = (px / W) | 0;

        if (x > 0) {
          const n = px - 1;
          if (!visited[n]) {
            const ni = n * 4;
            if (Math.abs(data[ni] - sr) <= tolerance && Math.abs(data[ni + 1] - sg) <= tolerance && Math.abs(data[ni + 2] - sb) <= tolerance && Math.abs(data[ni + 3] - sa) <= tolerance) {
              visited[n] = 1;
              stack[top++] = n;
            }
          }
        }
        if (x < W - 1) {
          const n = px + 1;
          if (!visited[n]) {
            const ni = n * 4;
            if (Math.abs(data[ni] - sr) <= tolerance && Math.abs(data[ni + 1] - sg) <= tolerance && Math.abs(data[ni + 2] - sb) <= tolerance && Math.abs(data[ni + 3] - sa) <= tolerance) {
              visited[n] = 1;
              stack[top++] = n;
            }
          }
        }
        if (y > 0) {
          const n = px - W;
          if (!visited[n]) {
            const ni = n * 4;
            if (Math.abs(data[ni] - sr) <= tolerance && Math.abs(data[ni + 1] - sg) <= tolerance && Math.abs(data[ni + 2] - sb) <= tolerance && Math.abs(data[ni + 3] - sa) <= tolerance) {
              visited[n] = 1;
              stack[top++] = n;
            }
          }
        }
        if (y < H - 1) {
          const n = px + W;
          if (!visited[n]) {
            const ni = n * 4;
            if (Math.abs(data[ni] - sr) <= tolerance && Math.abs(data[ni + 1] - sg) <= tolerance && Math.abs(data[ni + 2] - sb) <= tolerance && Math.abs(data[ni + 3] - sa) <= tolerance) {
              visited[n] = 1;
              stack[top++] = n;
            }
          }
        }
      }
    }

    this.combineSelectionMask(mask, combineMode);
  }

  /**
   * Smart Object Selector inside the Canvas!
   * - Drag a loose box around any object -> models border backdrop colors & floods outside-in
   *   to snap tightly around the foreground object inside the box (preserving interior highlights!).
   * - Single tap on any object -> selects distinct transparent-backed object silhouette OR runs
   *   adaptive edge-aware region growing from the tapped point.
   */
  selectObjectSmart(x, y, w, h, opts = {}) {
    const { combineMode = 'replace', sensitivity = 36, sampleAllLayers = true } = opts;
    const W = this.width;
    const H = this.height;
    const isBox = Math.abs(w) >= 14 && Math.abs(h) >= 14;

    // Case 1: Single Smart Tap -> check if user tapped a distinct object layer (Photo/Shape/Text) first!
    if (!isBox) {
      const tx = Math.max(0, Math.min(W - 1, Math.round(x)));
      const ty = Math.max(0, Math.min(H - 1, Math.round(y)));

      // Check top-to-bottom for a non-full-canvas object layer at (tx, ty)
      for (let li = this.layers.length - 1; li >= 0; li--) {
        const lyr = this.layers[li];
        if (!lyr.visible || lyr.kind === 'adjustment') continue;
        const isBottomBg = li === 0 && !lyr.smartSource && lyr.kind === 'raster' && /background/i.test(lyr.name);
        if (isBottomBg) continue;
        const lData = lyr.canvas.getContext('2d').getImageData(0, 0, W, H).data;
        if (lData[(ty * W + tx) * 4 + 3] > 20) {
          // Verify this layer isn't an opaque full-canvas backdrop by checking corners
          const cornersOpaque =
            lData[3] > 240 &&
            lData[(W - 1) * 4 + 3] > 240 &&
            lData[((H - 1) * W) * 4 + 3] > 240 &&
            lData[(W * H - 1) * 4 + 3] > 240;
          if (!cornersOpaque) {
            // Flood contiguous opaque pixels of this exact object!
            const mask = new Uint8Array(W * H);
            const visited = new Uint8Array(W * H);
            const stack = new Int32Array(W * H);
            let top = 0;
            const startP = ty * W + tx;
            stack[top++] = startP;
            visited[startP] = 1;
            while (top > 0) {
              const p = stack[--top];
              mask[p] = lData[p * 4 + 3];
              const px = p % W;
              const py = (p / W) | 0;
              if (px > 0 && !visited[p - 1] && lData[(p - 1) * 4 + 3] > 18) { visited[p - 1] = 1; stack[top++] = p - 1; }
              if (px < W - 1 && !visited[p + 1] && lData[(p + 1) * 4 + 3] > 18) { visited[p + 1] = 1; stack[top++] = p + 1; }
              if (py > 0 && !visited[p - W] && lData[(p - W) * 4 + 3] > 18) { visited[p - W] = 1; stack[top++] = p - W; }
              if (py < H - 1 && !visited[p + W] && lData[(p + W) * 4 + 3] > 18) { visited[p + W] = 1; stack[top++] = p + W; }
            }
            this.combineSelectionMask(mask, combineMode);
            return { kind: 'layerObject', layerName: lyr.name };
          }
        }
      }

      // Fallback for single tap on opaque photo: Edge-aware adaptive smart flood!
      this.applyQuickSelectBrush([{ x: tx, y: ty }], {
        radius: 16,
        tolerance: sensitivity,
        combineMode,
        sampleAllLayers
      });
      return { kind: 'smartRegion' };
    }

    // Case 2: Box Drag Smart Object Selection (GrabCut-style Border Background Stripping!)
    const x0 = Math.max(0, Math.min(W - 1, Math.round(Math.min(x, x + w))));
    const y0 = Math.max(0, Math.min(H - 1, Math.round(Math.min(y, y + h))));
    const x1 = Math.max(0, Math.min(W - 1, Math.round(Math.max(x, x + w))));
    const y1 = Math.max(0, Math.min(H - 1, Math.round(Math.max(y, y + h))));
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    if (bw < 6 || bh < 6) return null;

    const data = this.getSampleSourceData(sampleAllLayers);

    // 1. Sample perimeter colors around the box to model the surrounding backdrop
    const borderSamples = [];
    let transparentBorderCount = 0;
    let totalBorderCount = 0;
    const step = Math.max(1, Math.floor((bw + bh) / 140));
    const samplePx = (px, py) => {
      const i = (py * W + px) * 4;
      totalBorderCount++;
      if (data[i + 3] < 24) {
        transparentBorderCount++;
        return;
      }
      borderSamples.push([data[i], data[i + 1], data[i + 2]]);
    };
    for (let px = x0; px <= x1; px += step) {
      samplePx(px, y0);
      samplePx(px, y1);
    }
    for (let py = y0; py <= y1; py += step) {
      samplePx(x0, py);
      samplePx(x1, py);
    }

    const mask = new Uint8Array(W * H);

    // Fast path: if the perimeter is mostly transparent, select crisp opaque pixels inside the box!
    if (transparentBorderCount > totalBorderCount * 0.55) {
      for (let py = y0; py <= y1; py++) {
        const row = py * W;
        for (let px = x0; px <= x1; px++) {
          const a = data[(row + px) * 4 + 3];
          if (a > 16) mask[row + px] = a;
        }
      }
      this.combineSelectionMask(mask, combineMode);
      return { kind: 'alphaObject' };
    }

    // Build up to 8 representative background color clusters from the box border
    const bgClusters = [];
    for (const col of borderSamples) {
      let merged = false;
      for (const cl of bgClusters) {
        const dist = Math.hypot(col[0] - cl.r, col[1] - cl.g, col[2] - cl.b);
        if (dist < 28) {
          cl.r = (cl.r * cl.n + col[0]) / (cl.n + 1);
          cl.g = (cl.g * cl.n + col[1]) / (cl.n + 1);
          cl.b = (cl.b * cl.n + col[2]) / (cl.n + 1);
          cl.n++;
          merged = true;
          break;
        }
      }
      if (!merged && bgClusters.length < 8) {
        bgClusters.push({ r: col[0], g: col[1], b: col[2], n: 1 });
      }
    }

    const bgThresh = Math.max(18, sensitivity * 1.35);
    const localW = bw;
    const localH = bh;
    const isBg = new Uint8Array(localW * localH);
    const queue = new Int32Array(localW * localH);
    let head = 0, tail = 0;

    const minDistToBg = (r, g, b) => {
      let best = 999;
      for (let k = 0; k < bgClusters.length; k++) {
        const cl = bgClusters[k];
        const d = Math.hypot(r - cl.r, g - cl.g, b - cl.b);
        if (d < best) best = d;
      }
      return best;
    };

    // Seed outside-in flood from every border pixel of the dragged box
    const seedBorder = (lx, ly) => {
      const lp = ly * localW + lx;
      if (isBg[lp]) return;
      const gi = ((y0 + ly) * W + (x0 + lx)) * 4;
      if (data[gi + 3] < 24 || minDistToBg(data[gi], data[gi + 1], data[gi + 2]) <= bgThresh * 1.15) {
        isBg[lp] = 1;
        queue[tail++] = lp;
      }
    };
    for (let lx = 0; lx < localW; lx++) {
      seedBorder(lx, 0);
      seedBorder(lx, localH - 1);
    }
    for (let ly = 0; ly < localH; ly++) {
      seedBorder(0, ly);
      seedBorder(localW - 1, ly);
    }

    // Outside-in flood strip of background pixels (preserves interior object details!)
    const edgeStop = Math.max(24, sensitivity * 0.95);
    while (head < tail) {
      const lp = queue[head++];
      const lx = lp % localW;
      const ly = (lp / localW) | 0;
      const ci = ((y0 + ly) * W + (x0 + lx)) * 4;
      const cr = data[ci], cg = data[ci + 1], cb = data[ci + 2];

      const tryNeighbor = (nx, ny) => {
        const np = ny * localW + nx;
        if (isBg[np]) return;
        const ni = ((y0 + ny) * W + (x0 + nx)) * 4;
        if (data[ni + 3] < 24) {
          isBg[np] = 1;
          queue[tail++] = np;
          return;
        }
        const nr = data[ni], ng = data[ni + 1], nb = data[ni + 2];
        const dBg = minDistToBg(nr, ng, nb);
        const dStep = Math.hypot(nr - cr, ng - cg, nb - cb);
        if (dBg <= bgThresh && dStep <= edgeStop) {
          isBg[np] = 1;
          queue[tail++] = np;
        }
      };

      if (lx > 0) tryNeighbor(lx - 1, ly);
      if (lx < localW - 1) tryNeighbor(lx + 1, ly);
      if (ly > 0) tryNeighbor(lx, ly - 1);
      if (ly < localH - 1) tryNeighbor(lx, ly + 1);
    }

    // Write foreground mask (everything inside box not stripped as background) + light 3x3 smoothing
    let fgCount = 0;
    for (let ly = 1; ly < localH - 1; ly++) {
      for (let lx = 1; lx < localW - 1; lx++) {
        const lp = ly * localW + lx;
        let bgNeighbors = 0;
        if (isBg[lp - 1]) bgNeighbors++;
        if (isBg[lp + 1]) bgNeighbors++;
        if (isBg[lp - localW]) bgNeighbors++;
        if (isBg[lp + localW]) bgNeighbors++;
        const fg = !isBg[lp] ? bgNeighbors < 4 : bgNeighbors <= 1;
        if (fg) {
          mask[(y0 + ly) * W + (x0 + lx)] = 255;
          fgCount++;
        }
      }
    }

    // If box had uniform color (0 foreground found), select the clean box itself
    if (fgCount < 16) {
      for (let py = y0; py <= y1; py++) {
        const row = py * W;
        for (let px = x0; px <= x1; px++) mask[row + px] = 255;
      }
    }

    this.combineSelectionMask(mask, combineMode);
    return { kind: 'smartBox', fgCount };
  }

  /**
   * Photoshop Quick Selection Brush — paints smart edge-aware selection regions along the user's stroke!
   */
  applyQuickSelectBrush(points, opts = {}) {
    if (!points || points.length === 0) return;
    const { radius = 24, tolerance = 34, combineMode = 'add', sampleAllLayers = true } = opts;
    const W = this.width;
    const H = this.height;
    const data = this.getSampleSourceData(sampleAllLayers);

    // Compute local bounding corridor around stroke for blazing 60fps performance
    const margin = Math.max(radius * 5, 190);
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (const pt of points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const bx0 = Math.max(0, Math.floor(minX - margin));
    const by0 = Math.max(0, Math.floor(minY - margin));
    const bx1 = Math.min(W - 1, Math.ceil(maxX + margin));
    const by1 = Math.min(H - 1, Math.ceil(maxY + margin));
    const bw = bx1 - bx0 + 1;
    const bh = by1 - by0 + 1;

    // Sample representative seed colors under the painted stroke
    const seedColors = [];
    const visited = new Uint8Array(bw * bh);
    const queue = new Int32Array(bw * bh);
    let head = 0, tail = 0;
    const mask = new Uint8Array(W * H);

    const seedRad = Math.max(3, Math.round(radius * 0.45));
    const sr2 = seedRad * seedRad;
    for (const pt of points) {
      const cx = Math.max(bx0, Math.min(bx1, Math.round(pt.x)));
      const cy = Math.max(by0, Math.min(by1, Math.round(pt.y)));
      const ci = (cy * W + cx) * 4;
      const col = [data[ci], data[ci + 1], data[ci + 2], data[ci + 3]];
      if (seedColors.length < 10 && !seedColors.some((s) => Math.hypot(s[0] - col[0], s[1] - col[1], s[2] - col[2], s[3] - col[3]) < 20)) {
        seedColors.push(col);
      }
      for (let dy = -seedRad; dy <= seedRad; dy += 2) {
        const py = cy + dy;
        if (py < by0 || py > by1) continue;
        for (let dx = -seedRad; dx <= seedRad; dx += 2) {
          if (dx * dx + dy * dy > sr2) continue;
          const px = cx + dx;
          if (px < bx0 || px > bx1) continue;
          const lp = (py - by0) * bw + (px - bx0);
          if (!visited[lp]) {
            visited[lp] = 1;
            queue[tail++] = lp;
            mask[py * W + px] = 255;
          }
        }
      }
    }

    const colorThresh = Math.max(14, tolerance * 1.45);
    const stepEdgeThresh = Math.max(18, tolerance * 0.9);

    while (head < tail) {
      const lp = queue[head++];
      const lx = lp % bw;
      const ly = (lp / bw) | 0;
      const gx = bx0 + lx;
      const gy = by0 + ly;
      const ci = (gy * W + gx) * 4;
      const cr = data[ci], cg = data[ci + 1], cb = data[ci + 2], ca = data[ci + 3];

      const tryN = (nx, ny) => {
        const np = ny * bw + nx;
        if (visited[np]) return;
        const ni = ((by0 + ny) * W + (bx0 + nx)) * 4;
        const nr = data[ni], ng = data[ni + 1], nb = data[ni + 2], na = data[ni + 3];
        // Stop cleanly at sharp local edge boundaries
        const stepDist = Math.hypot(nr - cr, ng - cg, nb - cb, (na - ca) * 0.8);
        if (stepDist > stepEdgeThresh) return;

        // Check match against any seed color sampled along the brush stroke
        let matched = false;
        for (let s = 0; s < seedColors.length; s++) {
          const sc = seedColors[s];
          if (Math.hypot(nr - sc[0], ng - sc[1], nb - sc[2], (na - sc[3]) * 0.8) <= colorThresh) {
            matched = true;
            break;
          }
        }
        if (matched) {
          visited[np] = 1;
          queue[tail++] = np;
          mask[(by0 + ny) * W + (bx0 + nx)] = 255;
        }
      };

      if (lx > 0) tryN(lx - 1, ly);
      if (lx < bw - 1) tryN(lx + 1, ly);
      if (ly > 0) tryN(lx, ly - 1);
      if (ly < bh - 1) tryN(lx, ly + 1);
    }

    this.combineSelectionMask(mask, combineMode);
  }

  /**
   * Photoshop Select -> Color Range (Global Smooth Color Selection with Fuzziness Falloff)
   */
  selectColorRange(startX, startY, opts = {}) {
    const { fuzziness = 45, combineMode = 'replace', sampleAllLayers = true } = opts;
    const x0 = Math.max(0, Math.min(this.width - 1, Math.round(startX)));
    const y0 = Math.max(0, Math.min(this.height - 1, Math.round(startY)));
    const W = this.width;
    const H = this.height;
    const data = this.getSampleSourceData(sampleAllLayers);
    const si = (y0 * W + x0) * 4;
    const sr = data[si], sg = data[si + 1], sb = data[si + 2], sa = data[si + 3];

    const mask = new Uint8Array(W * H);
    const inner = Math.max(6, fuzziness * 0.85);
    const outer = Math.max(inner + 10, fuzziness * 1.45);
    const span = outer - inner;

    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      const d = Math.hypot(data[i] - sr, data[i + 1] - sg, data[i + 2] - sb, (data[i + 3] - sa) * 0.8);
      if (d <= inner) mask[p] = 255;
      else if (d < outer) mask[p] = Math.round(((outer - d) / span) * 255);
    }
    this.combineSelectionMask(mask, combineMode);
  }

  /**
   * Photoshop Ctrl/Cmd+Click Layer Thumbnail -> Load Layer Transparency as Selection!
   */
  selectLayerTransparency(layer = this.activeLayer, combineMode = 'replace') {
    if (!layer || layer.kind === 'adjustment') return false;
    const W = this.width;
    const H = this.height;
    const data = layer.canvas.getContext('2d').getImageData(0, 0, W, H).data;
    const mask = new Uint8Array(W * H);
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      mask[p] = data[i + 3];
    }
    this.combineSelectionMask(mask, combineMode);
    return this.hasSelection;
  }

  selectSubject() {
    this.compose();
    const imgData = this.compositeCanvas.getContext('2d').getImageData(0, 0, this.width, this.height);
    const { mask, contourPoints } = Algorithms.computeSelectSubjectMask(imgData);
    this.updateSelectionFromMask(mask, { type: 'mask', contourPoints });
  }

  updateSelectionFromMask(mask, outline = null) {
    let any = false;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) {
        any = true;
        break;
      }
    }
    if (!any) {
      this.clearSelection();
      return;
    }

    this.hasSelection = true;
    this.selectionMask = mask;
    this.selectionOutline = outline || { type: 'mask', contourPoints: this.computeMaskContour(mask) };

    const sc = document.createElement('canvas');
    sc.width = this.width;
    sc.height = this.height;
    const sCtx = sc.getContext('2d');
    const imgData = sCtx.createImageData(this.width, this.height);
    const d = imgData.data;
    for (let i = 0, p = 0; p < mask.length; p++, i += 4) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = mask[p];
    }
    sCtx.putImageData(imgData, 0, 0);
    this.selectionCanvas = sc;
  }

  clearSelection() {
    this.hasSelection = false;
    this.selectionMask = null;
    this.selectionCanvas = null;
    this.selectionOutline = null;
  }

  invertSelection() {
    if (!this.hasSelection || !this.selectionMask) {
      const all = new Uint8Array(this.width * this.height);
      all.fill(255);
      this.updateSelectionFromMask(all, { type: 'rect', x: 0, y: 0, w: this.width, h: this.height });
      return;
    }
    const inv = new Uint8Array(this.selectionMask.length);
    for (let i = 0; i < inv.length; i++) {
      inv[i] = 255 - this.selectionMask[i];
    }
    this.updateSelectionFromMask(inv, {
      type: 'mask',
      contourPoints: this.computeMaskContour(inv)
    });
  }

  featherSelection(radius = 8) {
    if (!this.hasSelection || !this.selectionCanvas) return;
    const ctx = this.selectionCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, this.width, this.height);
    const blurred = Algorithms.fastGaussianBlur(imgData.data, this.width, this.height, radius);
    const newMask = new Uint8Array(this.width * this.height);
    for (let i = 0, p = 0; p < newMask.length; p++, i += 4) {
      newMask[p] = blurred[i + 3];
    }
    this.updateSelectionFromMask(newMask, { type: 'mask', contourPoints: this.computeMaskContour(newMask) });
  }

  /**
   * Photoshop Select -> Modify (Expand, Contract, Smooth, Border, Feather)
   */
  modifySelection(op = 'expand', radius = 6) {
    if (!this.hasSelection || !this.selectionMask) return;
    const r = Math.max(1, Math.min(40, Math.round(radius)));
    if (op === 'feather') {
      this.featherSelection(r);
      return;
    }

    const W = this.width;
    const H = this.height;
    const src = this.selectionMask;

    if (op === 'smooth') {
      this.featherSelection(r);
      if (!this.selectionMask) return;
      const out = new Uint8Array(W * H);
      for (let i = 0; i < out.length; i++) {
        const v = this.selectionMask[i];
        out[i] = v >= 145 ? 255 : v <= 110 ? 0 : Math.round(((v - 110) / 35) * 255);
      }
      this.updateSelectionFromMask(out, { type: 'mask', contourPoints: this.computeMaskContour(out) });
      return;
    }

    // Separable 1D morphological max (expand) or min (contract) filter -> O(W*H) fast!
    const morph1D = (input, isMax) => {
      const tmp = new Uint8Array(W * H);
      const out = new Uint8Array(W * H);
      // Horizontal pass
      for (let y = 0; y < H; y++) {
        const row = y * W;
        for (let x = 0; x < W; x++) {
          let best = isMax ? 0 : 255;
          const x0 = Math.max(0, x - r);
          const x1 = Math.min(W - 1, x + r);
          for (let k = x0; k <= x1; k++) {
            const v = input[row + k];
            if (isMax ? v > best : v < best) best = v;
          }
          tmp[row + x] = best;
        }
      }
      // Vertical pass
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          let best = isMax ? 0 : 255;
          const y0 = Math.max(0, y - r);
          const y1 = Math.min(H - 1, y + r);
          for (let k = y0; k <= y1; k++) {
            const v = tmp[k * W + x];
            if (isMax ? v > best : v < best) best = v;
          }
          out[y * W + x] = best;
        }
      }
      return out;
    };

    if (op === 'expand') {
      const expanded = morph1D(src, true);
      this.updateSelectionFromMask(expanded, { type: 'mask', contourPoints: this.computeMaskContour(expanded) });
    } else if (op === 'contract') {
      const contracted = morph1D(src, false);
      this.updateSelectionFromMask(contracted, { type: 'mask', contourPoints: this.computeMaskContour(contracted) });
    } else if (op === 'border') {
      const exp = morph1D(src, true);
      const con = morph1D(src, false);
      const ring = new Uint8Array(W * H);
      for (let i = 0; i < ring.length; i++) {
        const v = exp[i] - con[i];
        ring[i] = v > 0 ? v : 0;
      }
      this.updateSelectionFromMask(ring, { type: 'mask', contourPoints: this.computeMaskContour(ring) });
    }
  }

  fillSelection(hexColor = '#378ef0', opacity = 1.0) {
    const layer = this.activeLayer;
    if (!layer || layer.locked || layer.kind === 'adjustment') return false;
    if (!this.editingMask && layer.smartSource) this.bakeSmartSource(layer);
    const target = this.editingMask && layer.maskCanvas ? layer.maskCanvas : layer.canvas;

    const fillBuf = document.createElement('canvas');
    fillBuf.width = this.width;
    fillBuf.height = this.height;
    const fCtx = fillBuf.getContext('2d');
    fCtx.fillStyle = hexColor;
    fCtx.fillRect(0, 0, this.width, this.height);
    if (this.hasSelection && this.selectionCanvas) {
      fCtx.globalCompositeOperation = 'destination-in';
      fCtx.drawImage(this.selectionCanvas, 0, 0);
    }

    const tCtx = target.getContext('2d');
    tCtx.save();
    tCtx.globalAlpha = Math.max(0, Math.min(1, opacity));
    tCtx.drawImage(fillBuf, 0, 0);
    tCtx.restore();
    return true;
  }

  addMaskToActiveLayer(fromSelection = true) {
    const layer = this.activeLayer;
    if (!layer) return;

    const mc = document.createElement('canvas');
    mc.width = this.width;
    mc.height = this.height;
    const mCtx = mc.getContext('2d');

    if (fromSelection && this.hasSelection && this.selectionMask) {
      const imgData = mCtx.createImageData(this.width, this.height);
      const d = imgData.data;
      for (let i = 0, p = 0; p < this.selectionMask.length; p++, i += 4) {
        const v = this.selectionMask[p];
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      mCtx.putImageData(imgData, 0, 0);
      this.clearSelection();
    } else {
      mCtx.fillStyle = '#ffffff';
      mCtx.fillRect(0, 0, this.width, this.height);
    }

    layer.maskCanvas = mc;
    layer.maskEnabled = true;
    this.editingMask = true;
  }

  pushHistory(label = 'Edit') {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const snap = {
      label,
      timestamp: Date.now(),
      width: this.width,
      height: this.height,
      activeLayerId: this.activeLayerId,
      editingMask: this.editingMask,
      globalLight: structuredClone(this.globalLight),
      slices: structuredClone(this.slices),
      selectedSliceId: this.selectedSliceId,
      layers: this.layers.map((l) => {
        const c = document.createElement('canvas');
        c.width = this.width;
        c.height = this.height;
        c.getContext('2d').drawImage(l.canvas, 0, 0);

        let mc = null;
        if (l.maskCanvas) {
          mc = document.createElement('canvas');
          mc.width = this.width;
          mc.height = this.height;
          mc.getContext('2d').drawImage(l.maskCanvas, 0, 0);
        }

        return {
          id: l.id,
          name: l.name,
          kind: l.kind,
          visible: l.visible,
          opacity: l.opacity,
          fill: l.fill,
          blendMode: l.blendMode,
          locked: l.locked,
          clipping: l.clipping,
          canvas: c,
          maskCanvas: mc,
          maskEnabled: l.maskEnabled,
          adjustment: l.adjustment ? structuredClone(l.adjustment) : null,
          textData: l.textData ? structuredClone(l.textData) : null,
          shapeData: l.shapeData ? structuredClone(l.shapeData) : null,
          smartSource: l.smartSource
            ? { ...l.smartSource }
            : null,
          styles: l.styles ? structuredClone(l.styles) : null
        };
      })
    };

    this.history.push(snap);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  }

  restoreSnapshot(index) {
    if (index < 0 || index >= this.history.length) return false;
    const snap = this.history[index];
    this.width = snap.width;
    this.height = snap.height;
    this.compositeCanvas.width = snap.width;
    this.compositeCanvas.height = snap.height;
    this.activeLayerId = snap.activeLayerId;
    this.editingMask = snap.editingMask;
    this.globalLight = snap.globalLight ? structuredClone(snap.globalLight) : { angle: 120, altitude: 30 };
    this.slices = snap.slices ? structuredClone(snap.slices) : [];
    this.selectedSliceId = snap.selectedSliceId || null;

    this.layers = snap.layers.map((l) =>
      this.createLayerObject({
        ...l,
        sourceCanvas: l.canvas
      })
    );
    this.historyIndex = index;
    this.compose();
    return true;
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return false;
    return this.restoreSnapshot(this.historyIndex - 1);
  }

  redo() {
    if (!this.canRedo()) return false;
    return this.restoreSnapshot(this.historyIndex + 1);
  }
}

export class StudioSession {
  constructor() {
    this.doc = null;
    this.commands = new Map();
    this.listeners = new Set();
    this.copiedLayerStyle = null;
    this.copiedFillOpacity = 1.0;
    this.registerCoreCommands();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(event = 'update') {
    if (this.doc) {
      this.doc.compose();
    }
    for (const fn of this.listeners) {
      fn(event, this.doc);
    }
  }

  registerCommand(id, title, category, handler) {
    this.commands.set(id, { id, title, category, handler });
  }

  dispatch(id, params = {}) {
    const spec = this.commands.get(id);
    if (!spec) {
      throw new Error(`Unknown command: ${id}`);
    }
    const res = spec.handler(params);
    this.notify(id);
    return res;
  }

  registerCoreCommands() {
    this.registerCommand('edit.undo', 'Undo Last Action', 'Edit', () => {
      if (this.doc) this.doc.undo();
    });

    this.registerCommand('edit.redo', 'Redo Action', 'Edit', () => {
      if (this.doc) this.doc.redo();
    });

    this.registerCommand('layer.new', 'New Pixel Layer', 'Layer', (params) => {
      if (!this.doc) return;
      const lyr = this.doc.createLayerObject({
        name: params.name || `Layer ${this.doc.layers.length + 1}`,
        kind: 'raster'
      });
      const activeIdx = this.doc.layers.findIndex((l) => l.id === this.doc.activeLayerId);
      if (activeIdx >= 0) {
        this.doc.layers.splice(activeIdx + 1, 0, lyr);
      } else {
        this.doc.layers.push(lyr);
      }
      this.doc.activeLayerId = lyr.id;
      this.doc.editingMask = false;
      this.doc.pushHistory(`New Layer (${lyr.name})`);
    });

    this.registerCommand('layer.viaCopy', 'Layer via Copy (Cutout Selection / Subject)', 'Layer', () => {
      if (!this.doc) return;
      if (!this.doc.hasSelection || !this.doc.selectionCanvas) {
        this.dispatch('layer.duplicate');
        return;
      }
      this.doc.compose();
      const cutCanvas = document.createElement('canvas');
      cutCanvas.width = this.doc.width;
      cutCanvas.height = this.doc.height;
      const cCtx = cutCanvas.getContext('2d');
      const srcLayer = this.doc.activeLayer;
      const srcImg = srcLayer && srcLayer.kind !== 'adjustment' ? srcLayer.canvas : this.doc.compositeCanvas;
      cCtx.drawImage(srcImg, 0, 0);
      cCtx.globalCompositeOperation = 'destination-in';
      cCtx.drawImage(this.doc.selectionCanvas, 0, 0);

      const newLyr = this.doc.createLayerObject({
        name: 'Subject Cutout',
        kind: 'raster',
        sourceCanvas: cutCanvas
      });
      this.doc.layers.push(newLyr);
      this.doc.activeLayerId = newLyr.id;
      this.doc.clearSelection();
      this.doc.pushHistory('Layer via Copy (Subject Cutout)');
    });

    this.registerCommand('layer.duplicate', 'Duplicate Layer', 'Layer', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      const src = this.doc.activeLayer;
      const copy = this.doc.createLayerObject({
        name: `${src.name} copy`,
        kind: src.kind,
        visible: src.visible,
        opacity: src.opacity,
        fill: src.fill,
        blendMode: src.blendMode,
        clipping: src.clipping,
        sourceCanvas: src.canvas,
        maskCanvas: src.maskCanvas,
        maskEnabled: src.maskEnabled,
        adjustment: src.adjustment,
        textData: src.textData,
        shapeData: src.shapeData,
        smartSource: src.smartSource ? { ...src.smartSource } : null,
        styles: src.styles
      });
      const idx = this.doc.layers.findIndex((l) => l.id === src.id);
      this.doc.layers.splice(idx + 1, 0, copy);
      this.doc.activeLayerId = copy.id;
      this.doc.pushHistory('Duplicate Layer');
    });

    this.registerCommand('layer.delete', 'Delete Active Layer', 'Layer', () => {
      if (!this.doc || this.doc.layers.length <= 1) return;
      const idx = this.doc.layers.findIndex((l) => l.id === this.doc.activeLayerId);
      if (idx < 0) return;
      this.doc.layers.splice(idx, 1);
      const nextIdx = Math.max(0, Math.min(this.doc.layers.length - 1, idx - 1));
      this.doc.activeLayerId = this.doc.layers[nextIdx].id;
      this.doc.editingMask = false;
      this.doc.pushHistory('Delete Layer');
    });

    this.registerCommand('layer.mergeDown', 'Merge Down', 'Layer', () => {
      if (!this.doc) return;
      const idx = this.doc.layers.findIndex((l) => l.id === this.doc.activeLayerId);
      if (idx <= 0) return;
      const top = this.doc.layers[idx];
      const bottom = this.doc.layers[idx - 1];

      this.doc.bakeSmartSource(bottom);
      const bCtx = bottom.canvas.getContext('2d');
      this.doc.renderSingleLayerToContext(top, bCtx, false);
      bottom.kind = 'raster';
      bottom.textData = null;
      bottom.shapeData = null;
      this.doc.layers.splice(idx, 1);
      this.doc.activeLayerId = bottom.id;
      this.doc.pushHistory('Merge Down');
    });

    this.registerCommand('layer.flattenImage', 'Flatten Image', 'Layer', () => {
      if (!this.doc) return;
      this.doc.compose();
      const flat = this.doc.createLayerObject({
        name: 'Background',
        kind: 'raster',
        sourceCanvas: this.doc.compositeCanvas
      });
      this.doc.layers = [flat];
      this.doc.activeLayerId = flat.id;
      this.doc.editingMask = false;
      this.doc.pushHistory('Flatten Image');
    });

    this.registerCommand('layer.moveOrder', 'Reorder Layer', 'Layer', ({ direction }) => {
      if (!this.doc) return;
      const idx = this.doc.layers.findIndex((l) => l.id === this.doc.activeLayerId);
      if (idx < 0) return;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= this.doc.layers.length) return;
      const [item] = this.doc.layers.splice(idx, 1);
      this.doc.layers.splice(targetIdx, 0, item);
      this.doc.pushHistory('Reorder Layer');
    });

    this.registerCommand('layer.addMask', 'Add Layer Mask', 'Layer', ({ fromSelection = true }) => {
      if (!this.doc) return;
      this.doc.addMaskToActiveLayer(fromSelection);
      this.doc.pushHistory('Add Layer Mask');
    });

    this.registerCommand('layer.invertMask', 'Invert Layer Mask', 'Layer', () => {
      if (!this.doc || !this.doc.activeLayer?.maskCanvas) return;
      const mc = this.doc.activeLayer.maskCanvas;
      const ctx = mc.getContext('2d');
      const imgData = ctx.getImageData(0, 0, mc.width, mc.height);
      Algorithms.applyAdjustmentToImageData(imgData, 'invert', {});
      ctx.putImageData(imgData, 0, 0);
      this.doc.pushHistory('Invert Layer Mask');
    });

    this.registerCommand('layer.deleteMask', 'Delete Layer Mask', 'Layer', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      this.doc.activeLayer.maskCanvas = null;
      this.doc.editingMask = false;
      this.doc.pushHistory('Delete Layer Mask');
    });

    this.registerCommand('layer.toggleClipping', 'Create/Release Clipping Mask', 'Layer', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      this.doc.activeLayer.clipping = !this.doc.activeLayer.clipping;
      this.doc.pushHistory('Toggle Clipping Mask');
    });

    this.registerCommand('layer.copyStyle', 'Copy Layer Style (fx)', 'Layer Style', () => {
      const lyr = this.doc?.activeLayer;
      if (!lyr) return;
      this.copiedLayerStyle = structuredClone(lyr.styles);
      this.copiedFillOpacity = lyr.fill ?? 1.0;
    });

    this.registerCommand('layer.pasteStyle', 'Paste Layer Style (fx)', 'Layer Style', () => {
      const lyr = this.doc?.activeLayer;
      if (!lyr || !this.copiedLayerStyle) return;
      lyr.styles = structuredClone(this.copiedLayerStyle);
      lyr.fill = this.copiedFillOpacity;
      this.doc.pushHistory('Paste Layer Style');
    });

    this.registerCommand('layer.clearStyle', 'Clear All Layer Styles (fx)', 'Layer Style', () => {
      const lyr = this.doc?.activeLayer;
      if (!lyr) return;
      lyr.styles = Algorithms.createDefaultLayerStyles();
      lyr.fill = 1.0;
      this.doc.pushHistory('Clear Layer Style');
    });

    this.registerCommand('adjustment.addLayer', 'New Adjustment Layer', 'Adjustments', ({ type, params, name }) => {
      if (!this.doc) return;
      const adjLayer = this.doc.createLayerObject({
        name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Adjustment`,
        kind: 'adjustment',
        adjustment: { type, params: structuredClone(params) }
      });
      if (this.doc.hasSelection) {
        this.doc.layers.push(adjLayer);
        this.doc.activeLayerId = adjLayer.id;
        this.doc.addMaskToActiveLayer(true);
      } else {
        const activeIdx = this.doc.layers.findIndex((l) => l.id === this.doc.activeLayerId);
        if (activeIdx >= 0) {
          this.doc.layers.splice(activeIdx + 1, 0, adjLayer);
        } else {
          this.doc.layers.push(adjLayer);
        }
        this.doc.activeLayerId = adjLayer.id;
      }
      this.doc.pushHistory(`Add ${adjLayer.name}`);
    });

    this.registerCommand('adjustment.applyDirect', 'Apply Adjustment to Layer', 'Adjustments', ({ type, params, label }) => {
      if (!this.doc || !this.doc.activeLayer) return;
      const layer = this.doc.activeLayer;
      if (layer.kind === 'adjustment') {
        layer.adjustment = { type, params: structuredClone(params) };
        this.doc.pushHistory(`Update ${layer.name}`);
        return;
      }
      this.doc.bakeSmartSource(layer);
      const ctx = layer.canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, this.doc.width, this.doc.height);
      Algorithms.applyAdjustmentToImageData(
        imgData,
        type,
        params,
        this.doc.hasSelection ? this.doc.selectionMask : null
      );
      ctx.putImageData(imgData, 0, 0);
      this.doc.pushHistory(label || `Apply ${type}`);
    });

    this.registerCommand('filter.apply', 'Apply Filter', 'Filter', ({ id, params, label }) => {
      if (!this.doc || !this.doc.activeLayer) return;
      const layer = this.doc.activeLayer;
      if (layer.kind === 'adjustment') return;
      this.doc.bakeSmartSource(layer);
      const ctx = layer.canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, this.doc.width, this.doc.height);
      Algorithms.applyFilterToImageData(
        imgData,
        id,
        params,
        this.doc.hasSelection ? this.doc.selectionMask : null
      );
      ctx.putImageData(imgData, 0, 0);
      this.doc.livePreview = null;
      this.doc.pushHistory(label || `Filter: ${id}`);
    });

    this.registerCommand('selection.all', 'Select All', 'Select', () => {
      if (!this.doc) return;
      this.doc.setRectSelection(0, 0, this.doc.width, this.doc.height);
    });

    this.registerCommand('selection.deselect', 'Deselect', 'Select', () => {
      if (!this.doc) return;
      this.doc.clearSelection();
    });

    this.registerCommand('selection.invert', 'Invert Selection', 'Select', () => {
      if (!this.doc) return;
      this.doc.invertSelection();
    });

    this.registerCommand('selection.subject', 'Select -> Subject (Saliency & Backdrop Cut)', 'Select', () => {
      if (!this.doc) return;
      this.doc.selectSubject();
    });

    this.registerCommand('selection.feather', 'Feather Selection (8 px)', 'Select', ({ radius = 8 }) => {
      if (!this.doc) return;
      this.doc.featherSelection(radius);
    });

    this.registerCommand('selection.clearPixels', 'Clear Selected Pixels', 'Edit', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      const layer = this.doc.activeLayer;
      this.doc.bakeSmartSource(layer);
      const ctx = layer.canvas.getContext('2d');
      if (this.doc.hasSelection && this.doc.selectionCanvas) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(this.doc.selectionCanvas, 0, 0);
        ctx.restore();
      } else {
        ctx.clearRect(0, 0, this.doc.width, this.doc.height);
      }
      this.doc.pushHistory('Clear Pixels');
    });

    this.registerCommand('selection.fromLayer', 'Load Layer Transparency as Selection', 'Select', ({ layerId = null, combineMode = 'replace' } = {}) => {
      if (!this.doc) return;
      const lyr = layerId ? this.doc.layers.find((l) => l.id === layerId) : this.doc.activeLayer;
      if (lyr) this.doc.selectLayerTransparency(lyr, combineMode);
    });

    this.registerCommand('selection.modify', 'Modify Selection', 'Select', ({ op = 'expand', radius = 6 } = {}) => {
      if (!this.doc) return;
      this.doc.modifySelection(op, radius);
    });

    this.registerCommand('selection.fill', 'Fill Selection', 'Edit', ({ color = '#378ef0', opacity = 1.0 } = {}) => {
      if (!this.doc) return;
      if (this.doc.fillSelection(color, opacity)) {
        this.doc.pushHistory('Fill Selection');
      }
    });

    this.registerCommand('layer.align', 'Align Selected Layers', 'Layer', ({ alignment = 'centerH' } = {}) => {
      if (!this.doc) return;
      if (this.doc.alignLayers(alignment)) {
        this.doc.pushHistory(`Align ${alignment}`);
      }
    });

    this.registerCommand('layer.reorder', 'Reorder Layer', 'Layer', ({ layerId = null, direction = 'up' } = {}) => {
      if (!this.doc) return;
      const id = layerId || this.doc.activeLayerId;
      if (this.doc.reorderLayer(id, direction)) {
        this.doc.pushHistory(`Layer Order (${direction})`);
      }
    });

    this.registerCommand('layer.mergeSelected', 'Merge Selected Layers', 'Layer', () => {
      if (!this.doc) return;
      const sel = this.doc.getSelectedLayers().filter((l) => l.kind !== 'adjustment');
      if (sel.length < 2) return;
      const indices = sel.map((l) => this.doc.layers.indexOf(l)).filter((i) => i >= 0).sort((a, b) => a - b);
      if (indices.length < 2) return;

      const merged = this.doc.createLayerObject({ name: `${sel[sel.length - 1].name} Merged`, kind: 'raster' });
      const mCtx = merged.canvas.getContext('2d');
      for (const idx of indices) {
        const lyr = this.doc.layers[idx];
        this.doc.renderSingleLayerToContext(lyr, mCtx, false);
      }
      const insertAt = indices[0];
      for (let k = indices.length - 1; k >= 0; k--) {
        this.doc.layers.splice(indices[k], 1);
      }
      this.doc.layers.splice(insertAt, 0, merged);
      this.doc.activeLayerId = merged.id;
      this.doc.selectedLayerIds = [merged.id];
      this.doc.pushHistory('Merge Selected Layers');
    });

    this.registerCommand('layer.flatten', 'Flatten Image', 'Layer', () => {
      this.dispatch('layer.flattenImage');
    });

    this.registerCommand('transform.flipHorizontal', 'Flip Layer Horizontal', 'Transform', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      const layer = this.doc.activeLayer;
      if (layer.kind === 'adjustment') return;

      if (layer.smartSource?.canvas) {
        layer.smartSource.flipX = !layer.smartSource.flipX;
        layer.smartSource.rotation = -(layer.smartSource.rotation || 0);
        this.doc.rasterizeSmartLayer(layer);
      } else if (layer.kind === 'text' && layer.textData) {
        layer.textData.flipX = !layer.textData.flipX;
        this.doc.rasterizeTextLayer(layer);
      } else if (layer.kind === 'shape' && layer.shapeData) {
        layer.shapeData.flipX = !layer.shapeData.flipX;
        this.doc.rasterizeShapeLayer(layer);
      } else {
        const ss = this.doc.ensureSmartSource(layer);
        if (ss) {
          ss.flipX = !ss.flipX;
          this.doc.rasterizeSmartLayer(layer);
        }
      }
      this.doc.pushHistory('Flip Horizontal');
    });

    this.registerCommand('transform.flipVertical', 'Flip Layer Vertical', 'Transform', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      const layer = this.doc.activeLayer;
      if (layer.kind === 'adjustment') return;

      if (layer.smartSource?.canvas) {
        layer.smartSource.flipY = !layer.smartSource.flipY;
        layer.smartSource.rotation = -(layer.smartSource.rotation || 0);
        this.doc.rasterizeSmartLayer(layer);
      } else if (layer.kind === 'text' && layer.textData) {
        layer.textData.flipY = !layer.textData.flipY;
        this.doc.rasterizeTextLayer(layer);
      } else if (layer.kind === 'shape' && layer.shapeData) {
        layer.shapeData.flipY = !layer.shapeData.flipY;
        this.doc.rasterizeShapeLayer(layer);
      } else {
        const ss = this.doc.ensureSmartSource(layer);
        if (ss) {
          ss.flipY = !ss.flipY;
          this.doc.rasterizeSmartLayer(layer);
        }
      }
      this.doc.pushHistory('Flip Vertical');
    });

    this.registerCommand('transform.rotate90CW', 'Rotate Canvas 90° Clockwise', 'Transform', () => {
      if (!this.doc) return;
      const oldW = this.doc.width;
      const oldH = this.doc.height;
      this.doc.width = oldH;
      this.doc.height = oldW;
      this.doc.compositeCanvas.width = oldH;
      this.doc.compositeCanvas.height = oldW;

      for (const lyr of this.doc.layers) {
        const rot = (c) => {
          if (!c) return null;
          const nc = document.createElement('canvas');
          nc.width = oldH;
          nc.height = oldW;
          const nCtx = nc.getContext('2d');
          nCtx.translate(oldH, 0);
          nCtx.rotate(Math.PI / 2);
          nCtx.drawImage(c, 0, 0);
          return nc;
        };
        if (lyr.smartSource?.canvas) {
          const ss = lyr.smartSource;
          const ncx = oldH - ss.cy;
          const ncy = ss.cx;
          ss.cx = ncx;
          ss.cy = ncy;
          ss.rotation = (ss.rotation || 0) + Math.PI / 2;
          lyr.canvas = document.createElement('canvas');
          lyr.canvas.width = oldH;
          lyr.canvas.height = oldW;
          this.doc.rasterizeSmartLayer(lyr);
        } else {
          lyr.canvas = rot(lyr.canvas);
        }
        if (lyr.maskCanvas) lyr.maskCanvas = rot(lyr.maskCanvas);
        if (lyr.textData) {
          const tx = lyr.textData.x ?? oldW / 2;
          const ty = lyr.textData.y ?? oldH / 2;
          lyr.textData.x = oldH - ty;
          lyr.textData.y = tx;
          lyr.textData.rotation = (lyr.textData.rotation || 0) + Math.PI / 2;
          this.doc.rasterizeTextLayer(lyr);
        }
        if (lyr.shapeData) {
          const sx = lyr.shapeData.x ?? 0;
          const sy = lyr.shapeData.y ?? 0;
          const sw = lyr.shapeData.w ?? 100;
          const sh = lyr.shapeData.h ?? 100;
          lyr.shapeData.x = oldH - (sy + sh);
          lyr.shapeData.y = sx;
          lyr.shapeData.w = sh;
          lyr.shapeData.h = sw;
          this.doc.rasterizeShapeLayer(lyr);
        }
      }
      this.doc.clearSelection();
      this.doc.pushHistory('Rotate 90° CW');
    });

    this.registerCommand('crop.apply', 'Crop Document', 'Image', ({ x, y, w, h, angle = 0, deleteCroppedPixels = true }) => {
      if (!this.doc) return;
      const cx = Math.round(x);
      const cy = Math.round(y);
      const cw = Math.max(16, Math.min(4096, Math.round(w)));
      const ch = Math.max(16, Math.min(4096, Math.round(h)));
      const rad = (Number(angle || 0) * Math.PI) / 180;
      const boxCenterX = cx + cw / 2;
      const boxCenterY = cy + ch / 2;

      this.doc.width = cw;
      this.doc.height = ch;
      this.doc.compositeCanvas.width = cw;
      this.doc.compositeCanvas.height = ch;

      const rotatePtAroundBox = (px, py) => {
        if (Math.abs(rad) <= 0.001) return { x: px - cx, y: py - cy };
        const dx = px - boxCenterX;
        const dy = py - boxCenterY;
        const cosA = Math.cos(-rad);
        const sinA = Math.sin(-rad);
        return {
          x: cw / 2 + dx * cosA - dy * sinA,
          y: ch / 2 + dx * sinA + dy * cosA
        };
      };

      for (const lyr of this.doc.layers) {
        const cropCanvas = (c) => {
          if (!c) return null;
          const nc = document.createElement('canvas');
          nc.width = cw;
          nc.height = ch;
          const nCtx = nc.getContext('2d');
          nCtx.imageSmoothingEnabled = true;
          nCtx.imageSmoothingQuality = 'high';
          if (Math.abs(rad) > 0.001) {
            // Rotate directly around crop box center into target canvas — ZERO premature corner clipping!
            nCtx.save();
            nCtx.translate(cw / 2, ch / 2);
            nCtx.rotate(-rad);
            nCtx.drawImage(c, -boxCenterX, -boxCenterY);
            nCtx.restore();
          } else {
            nCtx.drawImage(c, -cx, -cy);
          }
          return nc;
        };

        if (!deleteCroppedPixels && lyr.kind === 'raster') {
          this.doc.ensureSmartSource(lyr);
        }

        if (lyr.smartSource?.canvas && !deleteCroppedPixels) {
          const ss = lyr.smartSource;
          const np = rotatePtAroundBox(ss.cx, ss.cy);
          ss.cx = np.x;
          ss.cy = np.y;
          ss.rotation = (ss.rotation || 0) - rad;
          lyr.canvas = document.createElement('canvas');
          lyr.canvas.width = cw;
          lyr.canvas.height = ch;
          this.doc.rasterizeSmartLayer(lyr);
        } else {
          if (lyr.smartSource) lyr.smartSource = null;
          lyr.canvas = cropCanvas(lyr.canvas);
        }

        if (lyr.maskCanvas) lyr.maskCanvas = cropCanvas(lyr.maskCanvas);

        if (lyr.textData) {
          const np = rotatePtAroundBox(lyr.textData.x ?? boxCenterX, lyr.textData.y ?? boxCenterY);
          lyr.textData.x = np.x;
          lyr.textData.y = np.y;
          if (Math.abs(rad) > 0.001) {
            lyr.textData.rotation = (lyr.textData.rotation || 0) - rad;
          }
          this.doc.rasterizeTextLayer(lyr);
        }

        if (lyr.shapeData) {
          const scx = (lyr.shapeData.x ?? 0) + (lyr.shapeData.w ?? 0) / 2;
          const scy = (lyr.shapeData.y ?? 0) + (lyr.shapeData.h ?? 0) / 2;
          const np = rotatePtAroundBox(scx, scy);
          lyr.shapeData.x = np.x - (lyr.shapeData.w ?? 0) / 2;
          lyr.shapeData.y = np.y - (lyr.shapeData.h ?? 0) / 2;
          if (Math.abs(rad) > 0.001) {
            lyr.shapeData.rotation = (lyr.shapeData.rotation || 0) - rad;
          }
          this.doc.rasterizeShapeLayer(lyr);
        }
      }

      // Update user slices to match cropped bounds
      if (this.doc.slices.length > 0) {
        this.doc.slices = this.doc.slices
          .map((s) => {
            const nx = Math.max(0, s.x - cx);
            const ny = Math.max(0, s.y - cy);
            const rx = Math.min(cw, s.x + s.w - cx);
            const by = Math.min(ch, s.y + s.h - cy);
            return { ...s, x: nx, y: ny, w: rx - nx, h: by - ny };
          })
          .filter((s) => s.w >= 8 && s.h >= 8);
      }

      this.doc.clearSelection();
      this.doc.pushHistory(`Crop (${cw}×${ch})`);
    });

    this.registerCommand('image.perspectiveCrop', 'Perspective Crop Document', 'Image', ({ corners, outWidth, outHeight }) => {
      if (!this.doc || !corners || corners.length !== 4) return;
      const topLen = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
      const botLen = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
      const leftLen = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
      const rightLen = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);

      const cw = Math.max(32, Math.min(4096, Math.round(outWidth || (topLen + botLen) / 2)));
      const ch = Math.max(32, Math.min(4096, Math.round(outHeight || (leftLen + rightLen) / 2)));

      this.doc.width = cw;
      this.doc.height = ch;
      this.doc.compositeCanvas.width = cw;
      this.doc.compositeCanvas.height = ch;

      for (const lyr of this.doc.layers) {
        if (lyr.kind === 'adjustment') continue;
        this.doc.bakeSmartSource(lyr);
        if (lyr.kind === 'text' || lyr.kind === 'shape') {
          lyr.kind = 'raster';
          lyr.textData = null;
          lyr.shapeData = null;
        }
        lyr.canvas = Algorithms.perspectiveWarpCanvas(lyr.canvas, corners, cw, ch);
        if (lyr.maskCanvas) {
          lyr.maskCanvas = Algorithms.perspectiveWarpCanvas(lyr.maskCanvas, corners, cw, ch);
        }
      }
      this.doc.slices = [];
      this.doc.selectedSliceId = null;
      this.doc.clearSelection();
      this.doc.pushHistory(`Perspective Crop (${cw}×${ch})`);
    });

    this.registerCommand('slice.new', 'Create User Slice', 'Slices', (params) => {
      if (!this.doc) return;
      this.doc.addSlice(params);
      this.doc.pushHistory('New Slice');
    });

    this.registerCommand('slice.fromLayer', 'New Slice from Active Layer Bounds', 'Slices', () => {
      if (!this.doc) return;
      this.doc.createSliceFromActiveLayer();
      this.doc.pushHistory('Slice from Layer');
    });

    this.registerCommand('slice.divide', 'Divide Selected Slice', 'Slices', ({ horizCount = 2, vertCount = 2 }) => {
      if (!this.doc) return;
      this.doc.divideSelectedSlice(horizCount, vertCount);
      this.doc.pushHistory(`Divide Slice (${horizCount}×${vertCount})`);
    });

    this.registerCommand('slice.delete', 'Delete Selected Slice', 'Slices', () => {
      if (!this.doc || !this.doc.selectedSliceId) return;
      const idx = this.doc.slices.findIndex((s) => s.id === this.doc.selectedSliceId);
      if (idx >= 0) {
        this.doc.slices.splice(idx, 1);
        this.doc.selectedSliceId = this.doc.slices[0]?.id || null;
        this.doc.pushHistory('Delete Slice');
      }
    });

    this.registerCommand('slice.clearAll', 'Clear All User Slices', 'Slices', () => {
      if (!this.doc) return;
      this.doc.slices = [];
      this.doc.selectedSliceId = null;
      this.doc.pushHistory('Clear All Slices');
    });

    this.registerCommand('text.addOrUpdate', 'Add or Update Type Layer', 'Type', (params) => {
      if (!this.doc) return;
      if (params.layerId) {
        const existing = this.doc.layers.find((l) => l.id === params.layerId);
        if (existing && existing.kind === 'text') {
          existing.textData = { ...existing.textData, ...params.textData };
          existing.name = (existing.textData.text || 'Type').split('\n')[0].slice(0, 26) || 'Type Layer';
          this.doc.rasterizeTextLayer(existing);
          this.doc.pushHistory(`Edit Type (${existing.name})`);
          return;
        }
      }
      const td = {
        text: params.text || 'PROSTUDIO',
        fontFamily: params.fontFamily || 'Inter, sans-serif',
        fontSize: params.fontSize || 56,
        fontWeight: params.fontWeight || '700',
        italic: Boolean(params.italic),
        color: params.color || '#ffffff',
        align: params.align || 'center',
        lineHeight: params.lineHeight || 1.25,
        tracking: params.tracking || 0,
        orientation: params.orientation || 'horizontal',
        warp: params.warp || 'none',
        warpBend: params.warpBend ?? 35,
        strokeWidth: params.strokeWidth || 0,
        strokeColor: params.strokeColor || '#000000',
        x: params.x ?? this.doc.width / 2,
        y: params.y ?? this.doc.height / 2
      };
      const lyr = this.doc.createLayerObject({
        name: td.text.split('\n')[0].slice(0, 26) || 'Type Layer',
        kind: 'text',
        textData: td,
        styles: params.styles
      });
      this.doc.layers.push(lyr);
      this.doc.activeLayerId = lyr.id;
      this.doc.editingMask = false;
      this.doc.pushHistory(`Add Type (${lyr.name})`);
    });

    this.registerCommand('shape.addLayer', 'Add Vector Shape Layer', 'Vector', (params) => {
      if (!this.doc) return;
      const sd = {
        shapeType: params.shapeType || 'rect',
        x: params.x ?? this.doc.width * 0.25,
        y: params.y ?? this.doc.height * 0.25,
        w: params.w ?? this.doc.width * 0.5,
        h: params.h ?? this.doc.height * 0.5,
        fill: params.fill ?? '#378ef0',
        stroke: params.stroke ?? '#ffffff',
        strokeWidth: params.strokeWidth ?? 0,
        cornerRadius: params.cornerRadius ?? 18
      };
      const labelMap = { rect: 'Rectangle', ellipse: 'Ellipse', polygon: 'Polygon', star: 'Star' };
      const lyr = this.doc.createLayerObject({
        name: params.name || `${labelMap[sd.shapeType] || 'Shape'} 1`,
        kind: 'shape',
        shapeData: sd
      });
      this.doc.layers.push(lyr);
      this.doc.activeLayerId = lyr.id;
      this.doc.editingMask = false;
      this.doc.pushHistory(`Add ${lyr.name}`);
    });
  }
}
