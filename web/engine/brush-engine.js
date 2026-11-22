/* ============================================================================
 * PhotoCraft Mobile — Brush, Retouch, Flood-Fill & Gradient Engine
 * Mirrors crates/paint (Dabs, Hardness, Flow, Pulled-String Smoothing, Pressure)
 * ============================================================================ */

import { Algorithms } from './algorithms.js';

export const BRUSH_PRESETS = [
  { id: 'softRound', name: 'Soft Round', size: 28, hardness: 20, opacity: 100, flow: 85, spacing: 0.14, scatter: 0 },
  { id: 'hardRound', name: 'Hard Round', size: 16, hardness: 92, opacity: 100, flow: 100, spacing: 0.12, scatter: 0 },
  { id: 'airbrush', name: 'Soft Airbrush', size: 54, hardness: 0, opacity: 65, flow: 35, spacing: 0.1, scatter: 0 },
  { id: 'chalk', name: 'Dry Chalk', size: 32, hardness: 70, opacity: 90, flow: 80, spacing: 0.18, scatter: 0.18 },
  { id: 'charcoal', name: 'Charcoal Grain', size: 38, hardness: 45, opacity: 85, flow: 70, spacing: 0.16, scatter: 0.28 },
  { id: 'calligraphy', name: 'Chisel Inker', size: 22, hardness: 95, opacity: 100, flow: 100, spacing: 0.09, scatter: 0 }
];

export class BrushEngine {
  constructor() {
    this.presetId = 'softRound';
    this.size = 24;
    this.hardness = 35; // 0..100
    this.opacity = 100; // 1..100
    this.flow = 90; // 1..100
    this.smoothing = 45; // 0..100 (EMA / pulled-string)
    this.spacing = 0.14;
    this.scatter = 0; // 0..1
    this.pressureSize = true;
    this.pressureOpacity = false;
    this.bucketTolerance = 32;
    this.gradientType = 'linear'; // 'linear' | 'radial'

    // Active stroke state
    this.activeStroke = null;
  }

  applyPreset(presetId) {
    const p = BRUSH_PRESETS.find((b) => b.id === presetId);
    if (!p) return;
    this.presetId = p.id;
    this.size = p.size;
    this.hardness = p.hardness;
    this.opacity = p.opacity;
    this.flow = p.flow;
    this.spacing = p.spacing;
    this.scatter = p.scatter;
  }

  /**
   * Begin a brush/eraser/heal/dodge stroke on the target canvas (layer or mask).
   */
  beginStroke(tool, targetCanvas, x, y, pressure = 1.0, fgColor = '#378ef0', bgColor = '#ffffff', editingMask = false, selectionCanvas = null) {
    const width = targetCanvas.width;
    const height = targetCanvas.height;

    // Scratch canvas for live stroke accumulation so opacity ceiling is respected per-stroke
    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = width;
    strokeCanvas.height = height;
    const strokeCtx = strokeCanvas.getContext('2d');

    // Snapshot of target layer before stroke
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = width;
    baseCanvas.height = height;
    baseCanvas.getContext('2d').drawImage(targetCanvas, 0, 0);

    // For smudge/heal, sample neighborhood
    let healOffset = { dx: -Math.max(16, this.size * 1.2), dy: -Math.max(12, this.size * 0.8) };

    this.activeStroke = {
      tool,
      targetCanvas,
      baseCanvas,
      strokeCanvas,
      strokeCtx,
      lastX: x,
      lastY: y,
      smoothX: x,
      smoothY: y,
      carryDist: 0,
      fgColor: editingMask ? (tool === 'eraser' ? '#000000' : '#ffffff') : fgColor,
      bgColor,
      editingMask,
      selectionCanvas,
      healOffset
    };

    this.stampDab(x, y, pressure);
    this.commitStrokePreview();
  }

  /**
   * Continue stroke to (x, y) with EMA pulled-string smoothing and equidistant dab stepping.
   */
  moveStroke(x, y, pressure = 1.0) {
    const st = this.activeStroke;
    if (!st) return;

    const alpha = 1 - (this.smoothing / 100) * 0.82;
    const nx = st.smoothX + (x - st.smoothX) * alpha;
    const ny = st.smoothY + (y - st.smoothY) * alpha;

    const dx = nx - st.lastX;
    const dy = ny - st.lastY;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(1.2, this.size * this.spacing);

    if (dist + st.carryDist >= step) {
      let traveled = step - st.carryDist;
      while (traveled <= dist) {
        const t = traveled / Math.max(0.0001, dist);
        const px = st.lastX + dx * t;
        const py = st.lastY + dy * t;
        this.stampDab(px, py, pressure);
        traveled += step;
      }
      st.carryDist = dist - (traveled - step);
    } else {
      st.carryDist += dist;
    }

    st.lastX = nx;
    st.lastY = ny;
    st.smoothX = nx;
    st.smoothY = ny;

    this.commitStrokePreview();
  }

  endStroke() {
    if (!this.activeStroke) return;
    this.commitStrokePreview();
    this.activeStroke = null;
  }

  stampDab(x, y, pressure = 1.0) {
    const st = this.activeStroke;
    if (!st) return;

    const pNorm = pressure > 0 ? Math.max(0.15, Math.min(1.0, pressure)) : 1.0;
    const effSize = Math.max(1, this.pressureSize ? this.size * (0.35 + 0.65 * pNorm) : this.size);
    const radius = effSize / 2;
    const effFlow = (this.flow / 100) * (this.pressureOpacity ? pNorm : 1.0);

    // Optional scatter jitter
    let sx = x;
    let sy = y;
    if (this.scatter > 0) {
      const jitter = this.scatter * effSize * 0.9;
      sx += (Algorithms.hashCoord(Math.round(x), Math.round(y), 11) - 0.5) * jitter;
      sy += (Algorithms.hashCoord(Math.round(x), Math.round(y), 23) - 0.5) * jitter;
    }

    const ctx = st.strokeCtx;
    ctx.save();

    if (st.tool === 'heal') {
      // Spot heal / clone: draw soft-masked patch from offset neighborhood of baseCanvas
      const srcX = Math.max(radius, Math.min(st.baseCanvas.width - radius, sx + st.healOffset.dx));
      const srcY = Math.max(radius, Math.min(st.baseCanvas.height - radius, sy + st.healOffset.dy));
      const dab = document.createElement('canvas');
      const dSize = Math.ceil(effSize + 4);
      dab.width = dSize;
      dab.height = dSize;
      const dCtx = dab.getContext('2d');
      const half = dSize / 2;

      const grad = dCtx.createRadialGradient(half, half, radius * 0.15, half, half, radius);
      grad.addColorStop(0, `rgba(255,255,255,${effFlow})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      dCtx.fillStyle = grad;
      dCtx.fillRect(0, 0, dSize, dSize);
      dCtx.globalCompositeOperation = 'source-in';
      dCtx.drawImage(
        st.baseCanvas,
        srcX - half,
        srcY - half,
        dSize,
        dSize,
        0,
        0,
        dSize,
        dSize
      );
      ctx.drawImage(dab, sx - half, sy - half);
      ctx.restore();
      return;
    }

    const [r, g, b] = Algorithms.hexToRgb(
      st.tool === 'dodge' ? '#ffffff' : st.tool === 'burn' ? '#000000' : st.fgColor
    );

    if (this.presetId === 'calligraphy') {
      ctx.translate(sx, sy);
      ctx.rotate(-Math.PI / 5);
      ctx.fillStyle = `rgba(${r},${g},${b},${effFlow})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, Math.max(1.5, radius * 0.32), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const hardStop = Math.max(0, Math.min(0.96, this.hardness / 100));
    const grad = ctx.createRadialGradient(sx, sy, radius * hardStop, sx, sy, Math.max(0.5, radius));
    grad.addColorStop(0, `rgba(${r},${g},${b},${effFlow})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.5, radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  commitStrokePreview() {
    const st = this.activeStroke;
    if (!st) return;

    const targetCtx = st.targetCanvas.getContext('2d');
    targetCtx.clearRect(0, 0, st.targetCanvas.width, st.targetCanvas.height);
    targetCtx.drawImage(st.baseCanvas, 0, 0);

    // If selection is active, clip strokeCanvas to selectionCanvas
    let strokeSource = st.strokeCanvas;
    if (st.selectionCanvas) {
      const clipped = document.createElement('canvas');
      clipped.width = st.targetCanvas.width;
      clipped.height = st.targetCanvas.height;
      const cCtx = clipped.getContext('2d');
      cCtx.drawImage(st.strokeCanvas, 0, 0);
      cCtx.globalCompositeOperation = 'destination-in';
      cCtx.drawImage(st.selectionCanvas, 0, 0);
      strokeSource = clipped;
    }

    targetCtx.save();
    targetCtx.globalAlpha = this.opacity / 100;

    if (st.tool === 'eraser' && !st.editingMask) {
      targetCtx.globalCompositeOperation = 'destination-out';
    } else if (st.tool === 'dodge') {
      targetCtx.globalCompositeOperation = 'color-dodge';
      targetCtx.globalAlpha = (this.opacity / 100) * 0.45;
    } else if (st.tool === 'burn') {
      targetCtx.globalCompositeOperation = 'color-burn';
      targetCtx.globalAlpha = (this.opacity / 100) * 0.45;
    } else {
      targetCtx.globalCompositeOperation = 'source-over';
    }

    targetCtx.drawImage(strokeSource, 0, 0);
    targetCtx.restore();
  }

  /**
   * Contiguous Flood Fill (Paint Bucket) at (startX, startY) with tolerance.
   */
  floodFill(targetCanvas, startX, startY, fillHex, selectionMask = null) {
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const x0 = Math.round(startX);
    const y0 = Math.round(startY);
    if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return;

    const ctx = targetCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIdx = (y0 * width + x0) * 4;
    const sr = data[startIdx];
    const sg = data[startIdx + 1];
    const sb = data[startIdx + 2];
    const sa = data[startIdx + 3];

    const [fr, fg, fb] = Algorithms.hexToRgb(fillHex);
    const fa = Math.round((this.opacity / 100) * 255);
    const tol = this.bucketTolerance;

    if (
      Math.abs(sr - fr) <= 1 &&
      Math.abs(sg - fg) <= 1 &&
      Math.abs(sb - fb) <= 1 &&
      Math.abs(sa - fa) <= 1
    ) {
      return;
    }

    const visited = new Uint8Array(width * height);
    const stack = [y0 * width + x0];
    visited[y0 * width + x0] = 1;

    while (stack.length > 0) {
      const px = stack.pop();
      if (selectionMask && selectionMask[px] === 0) continue;

      const idx = px * 4;
      data[idx] = fr;
      data[idx + 1] = fg;
      data[idx + 2] = fb;
      data[idx + 3] = fa;

      const x = px % width;
      const y = (px / width) | 0;

      const neighbors = [];
      if (x > 0) neighbors.push(px - 1);
      if (x < width - 1) neighbors.push(px + 1);
      if (y > 0) neighbors.push(px - width);
      if (y < height - 1) neighbors.push(px + width);

      for (const n of neighbors) {
        if (visited[n]) continue;
        const nIdx = n * 4;
        const dr = Math.abs(data[nIdx] - sr);
        const dg = Math.abs(data[nIdx + 1] - sg);
        const db = Math.abs(data[nIdx + 2] - sb);
        const da = Math.abs(data[nIdx + 3] - sa);
        if (dr <= tol && dg <= tol && db <= tol && da <= tol) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Draw Linear or Radial Gradient between (x0, y0) and (x1, y1).
   */
  drawGradient(targetCanvas, x0, y0, x1, y1, fgHex, bgHex, selectionCanvas = null) {
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    const tCtx = temp.getContext('2d');

    let grad;
    if (this.gradientType === 'radial') {
      const r = Math.max(4, Math.hypot(x1 - x0, y1 - y0));
      grad = tCtx.createRadialGradient(x0, y0, 0, x0, y0, r);
    } else {
      grad = tCtx.createLinearGradient(x0, y0, x1, y1);
    }
    grad.addColorStop(0, fgHex);
    grad.addColorStop(1, bgHex);

    tCtx.fillStyle = grad;
    tCtx.fillRect(0, 0, width, height);

    if (selectionCanvas) {
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(selectionCanvas, 0, 0);
    }

    const ctx = targetCanvas.getContext('2d');
    ctx.save();
    ctx.globalAlpha = this.opacity / 100;
    ctx.drawImage(temp, 0, 0);
    ctx.restore();
  }
}
