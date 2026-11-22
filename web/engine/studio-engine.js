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

    if (layer.kind === 'text' && layer.textData) {
      this.rasterizeTextLayer(layer);
    } else if (layer.kind === 'shape' && layer.shapeData) {
      this.rasterizeShapeLayer(layer);
    }

    return layer;
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

    ctx.beginPath();
    if (sd.shapeType === 'ellipse') {
      ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    } else if (sd.shapeType === 'polygon' || sd.shapeType === 'star') {
      const points = sd.points || (sd.shapeType === 'star' ? 5 : 6);
      const outerR = Math.min(Math.abs(w), Math.abs(h)) / 2;
      const innerR = sd.shapeType === 'star' ? outerR * 0.45 : outerR;
      const steps = sd.shapeType === 'star' ? points * 2 : points;
      for (let i = 0; i < steps; i++) {
        const r = sd.shapeType === 'star' && i % 2 === 1 ? innerR : outerR;
        const a = (i * Math.PI * 2) / steps - Math.PI / 2;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
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
    if (!layer || !layer.visible || layer.kind === 'adjustment') return;

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
          this.renderSingleLayerToContext(layer, csCtx, true);
          csCtx.globalCompositeOperation = 'destination-in';
          csCtx.drawImage(baseLayer.canvas, 0, 0);

          ctx.save();
          ctx.globalCompositeOperation = layer.blendMode || 'source-over';
          ctx.drawImage(clipScratch, 0, 0);
          ctx.restore();
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
   * Selection Helpers
   */
  setRectSelection(x, y, w, h) {
    const x0 = Math.max(0, Math.min(this.width, Math.round(Math.min(x, x + w))));
    const y0 = Math.max(0, Math.min(this.height, Math.round(Math.min(y, y + h))));
    const x1 = Math.max(0, Math.min(this.width, Math.round(Math.max(x, x + w))));
    const y1 = Math.max(0, Math.min(this.height, Math.round(Math.max(y, y + h))));

    if (x1 - x0 < 2 || y1 - y0 < 2) {
      this.clearSelection();
      return;
    }

    const mask = new Uint8Array(this.width * this.height);
    for (let py = y0; py < y1; py++) {
      const row = py * this.width;
      for (let px = x0; px < x1; px++) {
        mask[row + px] = 255;
      }
    }
    this.updateSelectionFromMask(mask, { type: 'rect', x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }

  setEllipseSelection(x, y, w, h) {
    const x0 = Math.min(x, x + w);
    const y0 = Math.min(y, y + h);
    const rw = Math.abs(w) / 2;
    const rh = Math.abs(h) / 2;
    if (rw < 2 || rh < 2) {
      this.clearSelection();
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
    this.updateSelectionFromMask(mask, { type: 'ellipse', cx, cy, rw, rh });
  }

  setLassoSelection(points) {
    if (!points || points.length < 3) {
      this.clearSelection();
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
    this.updateSelectionFromMask(mask, { type: 'lasso', points: [...points] });
  }

  selectMagicWand(startX, startY, tolerance = 32) {
    const x0 = Math.round(startX);
    const y0 = Math.round(startY);
    if (x0 < 0 || x0 >= this.width || y0 < 0 || y0 >= this.height) return;

    this.compose();
    const data = this.compositeCanvas.getContext('2d').getImageData(0, 0, this.width, this.height).data;
    const sIdx = (y0 * this.width + x0) * 4;
    const sr = data[sIdx], sg = data[sIdx + 1], sb = data[sIdx + 2], sa = data[sIdx + 3];

    const mask = new Uint8Array(this.width * this.height);
    const visited = new Uint8Array(this.width * this.height);
    const stack = [y0 * this.width + x0];
    visited[y0 * this.width + x0] = 1;

    while (stack.length > 0) {
      const px = stack.pop();
      mask[px] = 255;

      const x = px % this.width;
      const y = (px / this.width) | 0;
      const neighbors = [];
      if (x > 0) neighbors.push(px - 1);
      if (x < this.width - 1) neighbors.push(px + 1);
      if (y > 0) neighbors.push(px - this.width);
      if (y < this.height - 1) neighbors.push(px + this.width);

      for (const n of neighbors) {
        if (visited[n]) continue;
        const nIdx = n * 4;
        if (
          Math.abs(data[nIdx] - sr) <= tolerance &&
          Math.abs(data[nIdx + 1] - sg) <= tolerance &&
          Math.abs(data[nIdx + 2] - sb) <= tolerance &&
          Math.abs(data[nIdx + 3] - sa) <= tolerance
        ) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }

    const contourPoints = [];
    const step = Math.max(2, Math.round(Math.min(this.width, this.height) / 140));
    for (let y = step; y < this.height - step; y += step) {
      for (let x = step; x < this.width - step; x += step) {
        const p = y * this.width + x;
        if ((mask[p] > 127) !== (mask[p + step] > 127) || (mask[p] > 127) !== (mask[p + step * this.width] > 127)) {
          contourPoints.push({ x, y });
        }
      }
    }

    this.updateSelectionFromMask(mask, { type: 'mask', contourPoints });
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
    this.selectionOutline = outline || { type: 'mask' };

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
      contourPoints: this.selectionOutline?.contourPoints
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
    this.updateSelectionFromMask(newMask, this.selectionOutline);
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

    this.registerCommand('transform.flipHorizontal', 'Flip Layer Horizontal', 'Transform', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      const layer = this.doc.activeLayer;
      const temp = document.createElement('canvas');
      temp.width = this.doc.width;
      temp.height = this.doc.height;
      const tCtx = temp.getContext('2d');
      tCtx.translate(this.doc.width, 0);
      tCtx.scale(-1, 1);
      tCtx.drawImage(layer.canvas, 0, 0);
      const ctx = layer.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.doc.width, this.doc.height);
      ctx.drawImage(temp, 0, 0);
      this.doc.pushHistory('Flip Horizontal');
    });

    this.registerCommand('transform.flipVertical', 'Flip Layer Vertical', 'Transform', () => {
      if (!this.doc || !this.doc.activeLayer) return;
      const layer = this.doc.activeLayer;
      const temp = document.createElement('canvas');
      temp.width = this.doc.width;
      temp.height = this.doc.height;
      const tCtx = temp.getContext('2d');
      tCtx.translate(0, this.doc.height);
      tCtx.scale(1, -1);
      tCtx.drawImage(layer.canvas, 0, 0);
      const ctx = layer.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.doc.width, this.doc.height);
      ctx.drawImage(temp, 0, 0);
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
        lyr.canvas = rot(lyr.canvas);
        if (lyr.maskCanvas) lyr.maskCanvas = rot(lyr.maskCanvas);
      }
      this.doc.clearSelection();
      this.doc.pushHistory('Rotate 90° CW');
    });

    this.registerCommand('crop.apply', 'Crop Document', 'Image', ({ x, y, w, h, angle = 0 }) => {
      if (!this.doc) return;
      const cx = Math.max(0, Math.round(x));
      const cy = Math.max(0, Math.round(y));
      const cw = Math.max(16, Math.min(this.doc.width - cx, Math.round(w)));
      const ch = Math.max(16, Math.min(this.doc.height - cy, Math.round(h)));
      const rad = (Number(angle || 0) * Math.PI) / 180;

      const oldW = this.doc.width;
      const oldH = this.doc.height;
      this.doc.width = cw;
      this.doc.height = ch;
      this.doc.compositeCanvas.width = cw;
      this.doc.compositeCanvas.height = ch;

      for (const lyr of this.doc.layers) {
        const cropCanvas = (c) => {
          if (!c) return null;
          let src = c;
          if (Math.abs(rad) > 0.001) {
            const rotC = document.createElement('canvas');
            rotC.width = oldW;
            rotC.height = oldH;
            const rCtx = rotC.getContext('2d');
            rCtx.translate(oldW / 2, oldH / 2);
            rCtx.rotate(-rad);
            rCtx.drawImage(c, -oldW / 2, -oldH / 2);
            src = rotC;
          }
          const nc = document.createElement('canvas');
          nc.width = cw;
          nc.height = ch;
          nc.getContext('2d').drawImage(src, cx, cy, cw, ch, 0, 0, cw, ch);
          return nc;
        };
        lyr.canvas = cropCanvas(lyr.canvas);
        if (lyr.maskCanvas) lyr.maskCanvas = cropCanvas(lyr.maskCanvas);
        if (lyr.textData) {
          lyr.textData.x -= cx;
          lyr.textData.y -= cy;
        }
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

      const cw = Math.max(32, Math.round(outWidth || (topLen + botLen) / 2));
      const ch = Math.max(32, Math.round(outHeight || (leftLen + rightLen) / 2));

      this.doc.width = cw;
      this.doc.height = ch;
      this.doc.compositeCanvas.width = cw;
      this.doc.compositeCanvas.height = ch;

      for (const lyr of this.doc.layers) {
        if (lyr.kind === 'adjustment') continue;
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
