/* ============================================================================
 * ProStudio Mobile — Image Processing Algorithms, Adjustments, Filters,
 * Perspective Homography Crop, Select Subject & Layer Effects
 * ============================================================================ */

import { LayerStylesEngine } from './layer-styles-engine.js';

function clamp8(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

export class Algorithms {
  /**
   * Compute 256-bin RGB + Luminance histogram and summary statistics
   * (Mean, Std Dev, Median, Pixels).
   */
  static computeHistogram(imageData) {
    const data = imageData.data;
    const rHist = new Uint32Array(256);
    const gHist = new Uint32Array(256);
    const bHist = new Uint32Array(256);
    const lumHist = new Uint32Array(256);

    let count = 0;
    let sumLum = 0;
    let sumLumSq = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = clamp8(Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b));

      rHist[r]++;
      gHist[g]++;
      bHist[b]++;
      lumHist[lum]++;

      count++;
      sumLum += lum;
      sumLumSq += lum * lum;
    }

    if (count === 0) {
      return {
        r: rHist,
        g: gHist,
        b: bHist,
        lum: lumHist,
        mean: 0,
        stdDev: 0,
        median: 0,
        count: 0
      };
    }

    const mean = sumLum / count;
    const variance = Math.max(0, sumLumSq / count - mean * mean);
    const stdDev = Math.sqrt(variance);

    let cumulative = 0;
    const half = count / 2;
    let median = 0;
    for (let i = 0; i < 256; i++) {
      cumulative += lumHist[i];
      if (cumulative >= half) {
        median = i;
        break;
      }
    }

    return {
      r: rHist,
      g: gHist,
      b: bHist,
      lum: lumHist,
      mean: Number(mean.toFixed(1)),
      stdDev: Number(stdDev.toFixed(1)),
      median,
      count
    };
  }

  /**
   * Build a 256-entry lookup table from sorted control points [[x0,y0], [x1,y1], ...]
   * using smooth monotonic cubic Hermite interpolation (Fritsch-Carlson).
   */
  static buildCurveLut(points) {
    const lut = new Uint8Array(256);
    if (!points || points.length === 0) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }

    const pts = [...points]
      .map(([x, y]) => [Math.max(0, Math.min(255, x)), Math.max(0, Math.min(255, y))])
      .sort((a, b) => a[0] - b[0]);

    const uniq = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] > uniq[uniq.length - 1][0]) {
        uniq.push(pts[i]);
      } else {
        uniq[uniq.length - 1][1] = pts[i][1];
      }
    }

    const n = uniq.length;
    if (n === 1) {
      lut.fill(clamp8(uniq[0][1]));
      return lut;
    }

    for (let x = 0; x <= uniq[0][0]; x++) {
      lut[x] = clamp8(Math.round(uniq[0][1]));
    }
    for (let x = uniq[n - 1][0]; x < 256; x++) {
      lut[x] = clamp8(Math.round(uniq[n - 1][1]));
    }

    if (n === 2) {
      const [x0, y0] = uniq[0];
      const [x1, y1] = uniq[1];
      for (let x = x0; x <= x1; x++) {
        const t = (x - x0) / Math.max(1, x1 - x0);
        lut[x] = clamp8(Math.round(y0 + t * (y1 - y0)));
      }
      return lut;
    }

    const dx = new Float64Array(n - 1);
    const dy = new Float64Array(n - 1);
    const m = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      dx[i] = uniq[i + 1][0] - uniq[i][0];
      dy[i] = uniq[i + 1][1] - uniq[i][1];
      m[i] = dy[i] / dx[i];
    }

    const c1 = new Float64Array(n);
    c1[0] = m[0];
    c1[n - 1] = m[n - 2];
    for (let i = 0; i < n - 2; i++) {
      if (m[i] * m[i + 1] <= 0) {
        c1[i + 1] = 0;
      } else {
        const common = dx[i] + dx[i + 1];
        c1[i + 1] = (3 * common) / ((common + dx[i + 1]) / m[i] + (common + dx[i]) / m[i + 1]);
      }
    }

    for (let i = 0; i < n - 1; i++) {
      const x0 = uniq[i][0];
      const y0 = uniq[i][1];
      const y1 = uniq[i + 1][1];
      const h = dx[i];
      for (let x = Math.round(x0); x <= Math.round(uniq[i + 1][0]); x++) {
        const t = (x - x0) / h;
        const t2 = t * t;
        const t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;
        const y = h00 * y0 + h10 * h * c1[i] + h01 * y1 + h11 * h * c1[i + 1];
        lut[x] = clamp8(Math.round(y));
      }
    }

    return lut;
  }

  /**
   * Apply a non-destructive adjustment configuration to an ImageData buffer in-place.
   */
  static applyAdjustmentToImageData(imageData, adjType, params, selectionMask = null) {
    const data = imageData.data;
    const len = data.length;

    let lutRGB = null, lutR = null, lutG = null, lutB = null;
    if (adjType === 'curves') {
      lutRGB = Algorithms.buildCurveLut(params.rgb || [[0, 0], [255, 255]]);
      lutR = Algorithms.buildCurveLut(params.r || [[0, 0], [255, 255]]);
      lutG = Algorithms.buildCurveLut(params.g || [[0, 0], [255, 255]]);
      lutB = Algorithms.buildCurveLut(params.b || [[0, 0], [255, 255]]);
    } else if (adjType === 'levels') {
      const inBlack = params.inBlack ?? 0;
      const inWhite = Math.max(inBlack + 1, params.inWhite ?? 255);
      const gamma = Math.max(0.1, Math.min(9.99, params.gamma ?? 1.0));
      const outBlack = params.outBlack ?? 0;
      const outWhite = params.outWhite ?? 255;
      lutRGB = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        let norm = (i - inBlack) / (inWhite - inBlack);
        norm = Math.max(0, Math.min(1, norm));
        const gVal = Math.pow(norm, 1 / gamma);
        lutRGB[i] = clamp8(Math.round(outBlack + gVal * (outWhite - outBlack)));
      }
    }

    for (let i = 0, px = 0; i < len; i += 4, px++) {
      const a = data[i + 3];
      if (a === 0) continue;

      const selWeight = selectionMask ? selectionMask[px] / 255 : 1;
      if (selWeight <= 0) continue;

      const origR = data[i];
      const origG = data[i + 1];
      const origB = data[i + 2];

      let r = origR;
      let g = origG;
      let b = origB;

      switch (adjType) {
        case 'curves': {
          r = lutR[lutRGB[r]];
          g = lutG[lutRGB[g]];
          b = lutB[lutRGB[b]];
          break;
        }
        case 'levels': {
          r = lutRGB[r];
          g = lutRGB[g];
          b = lutRGB[b];
          break;
        }
        case 'brightnessContrast': {
          const br = (params.brightness ?? 0) * 1.4;
          const ct = params.contrast ?? 0;
          const factor = (259 * (ct + 255)) / (255 * (259 - ct));
          r = clamp8(factor * (r + br - 128) + 128);
          g = clamp8(factor * (g + br - 128) + 128);
          b = clamp8(factor * (b + br - 128) + 128);
          break;
        }
        case 'hueSaturation': {
          const hueShift = ((params.hue ?? 0) % 360) / 360;
          const satMult = 1 + (params.saturation ?? 0) / 100;
          const lightOffset = (params.lightness ?? 0) / 100;
          const [h, s, l] = Algorithms.rgbToHsl(r, g, b);
          let nh = (h + hueShift) % 1;
          if (nh < 0) nh += 1;
          const ns = Math.max(0, Math.min(1, s * satMult));
          const nl = lightOffset >= 0 ? l + (1 - l) * lightOffset : l * (1 + lightOffset);
          [r, g, b] = Algorithms.hslToRgb(nh, ns, Math.max(0, Math.min(1, nl)));
          break;
        }
        case 'vibrance': {
          const vib = (params.vibrance ?? 0) / 100;
          const sat = (params.saturation ?? 0) / 100;
          const avg = (r + g + b) / 3;
          const maxCh = Math.max(r, g, b);
          const amt = ((Math.abs(maxCh - avg) * 2) / 255) * -vib + vib;
          r = clamp8(r + (r - maxCh) * -amt);
          g = clamp8(g + (g - maxCh) * -amt);
          b = clamp8(b + (b - maxCh) * -amt);
          if (sat !== 0) {
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = clamp8(lum + (r - lum) * (1 + sat));
            g = clamp8(lum + (g - lum) * (1 + sat));
            b = clamp8(lum + (b - lum) * (1 + sat));
          }
          break;
        }
        case 'colorBalance': {
          const cr = (params.cyanRed ?? 0) * 1.2;
          const mg = (params.magentaGreen ?? 0) * 1.2;
          const yb = (params.yellowBlue ?? 0) * 1.2;
          const lum = (r + g + b) / (3 * 255);
          const midWeight = 1 - Math.abs(lum - 0.5) * 1.4;
          r = clamp8(r + cr * midWeight);
          g = clamp8(g + mg * midWeight);
          b = clamp8(b + yb * midWeight);
          break;
        }
        case 'blackAndWhite': {
          const rw = (params.reds ?? 40) / 100;
          const gw = (params.greens ?? 60) / 100;
          const bw = (params.blues ?? 20) / 100;
          const tintAmt = (params.tint ?? 0) / 100;
          const gray = clamp8(r * rw + g * gw + b * bw);
          r = clamp8(gray + tintAmt * 28);
          g = clamp8(gray + tintAmt * 12);
          b = clamp8(gray - tintAmt * 18);
          break;
        }
        case 'photoFilter': {
          const density = (params.density ?? 25) / 100;
          const hex = params.color || '#ec8a00';
          const [fr, fg, fb] = Algorithms.hexToRgb(hex);
          const origLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const tr = (r * fr) / 255;
          const tg = (g * fg) / 255;
          const tb = (b * fb) / 255;
          const newLum = Math.max(1, 0.2126 * tr + 0.7152 * tg + 0.0722 * tb);
          const scale = origLum / newLum;
          r = clamp8(r * (1 - density) + tr * scale * density);
          g = clamp8(g * (1 - density) + tg * scale * density);
          b = clamp8(b * (1 - density) + tb * scale * density);
          break;
        }
        case 'posterize': {
          const levels = Math.max(2, Math.min(64, params.levels ?? 4));
          const step = 255 / (levels - 1);
          r = clamp8(Math.round(Math.floor((r / 256) * levels) * step));
          g = clamp8(Math.round(Math.floor((g / 256) * levels) * step));
          b = clamp8(Math.round(Math.floor((b / 256) * levels) * step));
          break;
        }
        case 'threshold': {
          const th = params.level ?? 128;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = g = b = lum >= th ? 255 : 0;
          break;
        }
        case 'invert': {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
          break;
        }
        default:
          break;
      }

      if (selWeight < 1) {
        data[i] = clamp8(origR + (r - origR) * selWeight);
        data[i + 1] = clamp8(origG + (g - origG) * selWeight);
        data[i + 2] = clamp8(origB + (b - origB) * selWeight);
      } else {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }

    return imageData;
  }

  /**
   * Apply a ProStudio Filter to an ImageData buffer and return modified ImageData.
   */
  static applyFilterToImageData(imageData, filterId, params, selectionMask = null) {
    const width = imageData.width;
    const height = imageData.height;
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    switch (filterId) {
      case 'gaussianBlur': {
        const radius = Math.max(1, Math.min(100, Math.round(params.radius ?? 8)));
        const blurred = Algorithms.fastGaussianBlur(src, width, height, radius);
        Algorithms.blendFilteredResult(src, blurred, dst, selectionMask);
        break;
      }
      case 'motionBlur': {
        const distance = Math.max(1, Math.min(120, Math.round(params.distance ?? 18)));
        const angleRad = ((params.angle ?? 0) * Math.PI) / 180;
        const dx = Math.cos(angleRad);
        const dy = Math.sin(angleRad);
        const out = new Uint8ClampedArray(src.length);
        const samples = Math.min(31, Math.max(3, distance));
        const half = (samples - 1) / 2;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let sr = 0, sg = 0, sb = 0, sa = 0;
            for (let s = 0; s < samples; s++) {
              const offset = ((s - half) / Math.max(1, half)) * (distance / 2);
              const sx = Math.min(width - 1, Math.max(0, Math.round(x + dx * offset)));
              const sy = Math.min(height - 1, Math.max(0, Math.round(y + dy * offset)));
              const idx = (sy * width + sx) * 4;
              sr += src[idx];
              sg += src[idx + 1];
              sb += src[idx + 2];
              sa += src[idx + 3];
            }
            const oIdx = (y * width + x) * 4;
            out[oIdx] = sr / samples;
            out[oIdx + 1] = sg / samples;
            out[oIdx + 2] = sb / samples;
            out[oIdx + 3] = sa / samples;
          }
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      case 'unsharpMask': {
        const amount = (params.amount ?? 120) / 100;
        const radius = Math.max(1, Math.min(40, Math.round(params.radius ?? 3)));
        const threshold = params.threshold ?? 2;
        const blurred = Algorithms.fastGaussianBlur(src, width, height, radius);
        const out = new Uint8ClampedArray(src.length);
        for (let i = 0; i < src.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            const diff = src[i + c] - blurred[i + c];
            if (Math.abs(diff) >= threshold) {
              out[i + c] = clamp8(src[i + c] + diff * amount);
            } else {
              out[i + c] = src[i + c];
            }
          }
          out[i + 3] = src[i + 3];
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      case 'twirl': {
        const angleRad = ((params.angle ?? 140) * Math.PI) / 180;
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = (Math.min(width, height) / 2) * ((params.radiusPct ?? 85) / 100);
        const out = new Uint8ClampedArray(src.length);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let sx = x;
            let sy = y;
            if (dist < maxRadius) {
              const factor = 1 - dist / maxRadius;
              const theta = Math.atan2(dy, dx) + angleRad * factor * factor;
              sx = cx + dist * Math.cos(theta);
              sy = cy + dist * Math.sin(theta);
            }
            const ix = Math.min(width - 1, Math.max(0, Math.round(sx)));
            const iy = Math.min(height - 1, Math.max(0, Math.round(sy)));
            const sIdx = (iy * width + ix) * 4;
            const dIdx = (y * width + x) * 4;
            out[dIdx] = src[sIdx];
            out[dIdx + 1] = src[sIdx + 1];
            out[dIdx + 2] = src[sIdx + 2];
            out[dIdx + 3] = src[sIdx + 3];
          }
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      case 'wave': {
        const amp = params.amplitude ?? 14;
        const wavelength = Math.max(8, params.wavelength ?? 48);
        const out = new Uint8ClampedArray(src.length);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const sx = Math.min(
              width - 1,
              Math.max(0, Math.round(x + Math.sin((y / wavelength) * Math.PI * 2) * amp))
            );
            const sy = Math.min(
              height - 1,
              Math.max(0, Math.round(y + Math.cos((x / wavelength) * Math.PI * 2) * (amp * 0.6)))
            );
            const sIdx = (sy * width + sx) * 4;
            const dIdx = (y * width + x) * 4;
            out[dIdx] = src[sIdx];
            out[dIdx + 1] = src[sIdx + 1];
            out[dIdx + 2] = src[sIdx + 2];
            out[dIdx + 3] = src[sIdx + 3];
          }
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      case 'pixelate': {
        const cellSize = Math.max(2, Math.min(80, Math.round(params.cellSize ?? 12)));
        const out = new Uint8ClampedArray(src.length);
        for (let by = 0; by < height; by += cellSize) {
          for (let bx = 0; bx < width; bx += cellSize) {
            const cx = Math.min(width - 1, bx + (cellSize >> 1));
            const cy = Math.min(height - 1, by + (cellSize >> 1));
            const sIdx = (cy * width + cx) * 4;
            const r = src[sIdx], g = src[sIdx + 1], b = src[sIdx + 2], a = src[sIdx + 3];
            const maxY = Math.min(height, by + cellSize);
            const maxX = Math.min(width, bx + cellSize);
            for (let y = by; y < maxY; y++) {
              for (let x = bx; x < maxX; x++) {
                const dIdx = (y * width + x) * 4;
                out[dIdx] = r;
                out[dIdx + 1] = g;
                out[dIdx + 2] = b;
                out[dIdx + 3] = a;
              }
            }
          }
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      case 'vignette': {
        const amount = (params.amount ?? 55) / 100;
        const midpoint = (params.midpoint ?? 50) / 100;
        const cx = width / 2;
        const cy = height / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        const out = new Uint8ClampedArray(src.length);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.sqrt(dx * dx + dy * dy) / maxDist;
            const t = Math.max(0, (d - midpoint * 0.6) / Math.max(0.05, 1 - midpoint * 0.6));
            const dark = 1 - Math.min(1, t * t) * amount;
            const idx = (y * width + x) * 4;
            out[idx] = clamp8(src[idx] * dark);
            out[idx + 1] = clamp8(src[idx + 1] * dark);
            out[idx + 2] = clamp8(src[idx + 2] * dark);
            out[idx + 3] = src[idx + 3];
          }
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      case 'noise': {
        const amount = (params.amount ?? 25) * 2.2;
        const mono = params.monochromatic !== false;
        const out = new Uint8ClampedArray(src.length);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const h1 = Algorithms.hashCoord(x, y, 1) - 0.5;
            if (mono) {
              const n = h1 * amount;
              out[idx] = clamp8(src[idx] + n);
              out[idx + 1] = clamp8(src[idx + 1] + n);
              out[idx + 2] = clamp8(src[idx + 2] + n);
            } else {
              out[idx] = clamp8(src[idx] + h1 * amount);
              out[idx + 1] = clamp8(src[idx + 1] + (Algorithms.hashCoord(x, y, 2) - 0.5) * amount);
              out[idx + 2] = clamp8(src[idx + 2] + (Algorithms.hashCoord(x, y, 3) - 0.5) * amount);
            }
            out[idx + 3] = src[idx + 3];
          }
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      case 'emboss': {
        const heightPx = Math.max(1, Math.min(6, Math.round(params.height ?? 2)));
        const amount = (params.amount ?? 120) / 100;
        const out = new Uint8ClampedArray(src.length);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const x1 = Math.min(width - 1, x + heightPx);
            const y1 = Math.min(height - 1, y + heightPx);
            const x0 = Math.max(0, x - heightPx);
            const y0 = Math.max(0, y - heightPx);
            const iA = (y0 * width + x0) * 4;
            const iB = (y1 * width + x1) * 4;
            const idx = (y * width + x) * 4;
            out[idx] = clamp8(128 + (src[iA] - src[iB]) * amount);
            out[idx + 1] = clamp8(128 + (src[iA + 1] - src[iB + 1]) * amount);
            out[idx + 2] = clamp8(128 + (src[iA + 2] - src[iB + 2]) * amount);
            out[idx + 3] = src[idx + 3];
          }
        }
        Algorithms.blendFilteredResult(src, out, dst, selectionMask);
        break;
      }
      default:
        break;
    }

    return imageData;
  }

  /**
   * Running-sum separable box-pass approximation of Gaussian blur.
   */
  static fastGaussianBlur(src, width, height, radius) {
    let curr = new Uint8ClampedArray(src);
    let temp = new Uint8ClampedArray(src.length);
    const passes = 2;
    const r = Math.max(1, Math.round(radius));
    const diam = r * 2 + 1;

    for (let pass = 0; pass < passes; pass++) {
      for (let y = 0; y < height; y++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
        const rowOff = y * width;
        for (let k = -r; k <= r; k++) {
          const x = Math.min(width - 1, Math.max(0, k));
          const idx = (rowOff + x) * 4;
          sumR += curr[idx];
          sumG += curr[idx + 1];
          sumB += curr[idx + 2];
          sumA += curr[idx + 3];
        }
        for (let x = 0; x < width; x++) {
          const outIdx = (rowOff + x) * 4;
          temp[outIdx] = sumR / diam;
          temp[outIdx + 1] = sumG / diam;
          temp[outIdx + 2] = sumB / diam;
          temp[outIdx + 3] = sumA / diam;

          const removeX = Math.max(0, x - r);
          const addX = Math.min(width - 1, x + r + 1);
          const rIdx = (rowOff + removeX) * 4;
          const aIdx = (rowOff + addX) * 4;
          sumR += curr[aIdx] - curr[rIdx];
          sumG += curr[aIdx + 1] - curr[rIdx + 1];
          sumB += curr[aIdx + 2] - curr[rIdx + 2];
          sumA += curr[aIdx + 3] - curr[rIdx + 3];
        }
      }

      for (let x = 0; x < width; x++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
        for (let k = -r; k <= r; k++) {
          const y = Math.min(height - 1, Math.max(0, k));
          const idx = (y * width + x) * 4;
          sumR += temp[idx];
          sumG += temp[idx + 1];
          sumB += temp[idx + 2];
          sumA += temp[idx + 3];
        }
        for (let y = 0; y < height; y++) {
          const outIdx = (y * width + x) * 4;
          curr[outIdx] = sumR / diam;
          curr[outIdx + 1] = sumG / diam;
          curr[outIdx + 2] = sumB / diam;
          curr[outIdx + 3] = sumA / diam;

          const removeY = Math.max(0, y - r);
          const addY = Math.min(height - 1, y + r + 1);
          const rIdx = (removeY * width + x) * 4;
          const aIdx = (addY * width + x) * 4;
          sumR += temp[aIdx] - temp[rIdx];
          sumG += temp[aIdx + 1] - temp[rIdx + 1];
          sumB += temp[aIdx + 2] - temp[rIdx + 2];
          sumA += temp[aIdx + 3] - temp[rIdx + 3];
        }
      }
    }

    return curr;
  }

  /**
   * ============================================================================
   * Perspective Crop Projective Homography Warper 
   * Maps the 4 quad corners [TL, TR, BR, BL] onto an upright rectangle [0..outW, 0..outH]
   * using a 3x3 projective homography and sub-pixel bilinear sampling.
   * ============================================================================
   */
  static isConvexQuad(corners) {
    if (!corners || corners.length !== 4) return false;
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      const c = corners[(i + 2) % 4];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 1e-3) return false;
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (sign !== s) return false;
    }
    return true;
  }

  static solveHomographyRectToQuad(outW, outH, corners) {
    // Destination rect corners: (0,0), (outW,0), (outW,outH), (0,outH)
    // Map (u, v) -> (x, y) in source canvas where:
    // x = (h0*u + h1*v + h2) / (h6*u + h7*v + 1)
    // y = (h3*u + h4*v + h5) / (h6*u + h7*v + 1)
    const srcPts = [
      [0, 0],
      [outW, 0],
      [outW, outH],
      [0, outH]
    ];
    const dstPts = corners.map((p) => [p.x, p.y]);

    const A = [];
    const b = [];
    for (let i = 0; i < 4; i++) {
      const [u, v] = srcPts[i];
      const [x, y] = dstPts[i];
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
      b.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
      b.push(y);
    }

    // Solve 8x8 linear system A * h = b via Gaussian elimination with partial pivoting
    const n = 8;
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      let maxVal = Math.abs(A[col][col]);
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(A[row][col]) > maxVal) {
          maxVal = Math.abs(A[row][col]);
          maxRow = row;
        }
      }
      if (maxVal < 1e-10) return null;
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      [b[col], b[maxRow]] = [b[maxRow], b[col]];

      const pivot = A[col][col];
      for (let j = col; j < n; j++) A[col][j] /= pivot;
      b[col] /= pivot;

      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = A[row][col];
        for (let j = col; j < n; j++) {
          A[row][j] -= factor * A[col][j];
        }
        b[row] -= factor * b[col];
      }
    }
    return b; // [h0, h1, h2, h3, h4, h5, h6, h7]
  }

  static perspectiveWarpCanvas(sourceCanvas, quadCorners, outWidth, outHeight) {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const outW = Math.max(16, Math.round(outWidth));
    const outH = Math.max(16, Math.round(outHeight));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');

    const H = Algorithms.solveHomographyRectToQuad(outW, outH, quadCorners);
    if (!H) {
      outCtx.drawImage(sourceCanvas, 0, 0, outW, outH);
      return outCanvas;
    }

    const srcData = sourceCanvas.getContext('2d').getImageData(0, 0, srcW, srcH).data;
    const dstImg = outCtx.createImageData(outW, outH);
    const dstData = dstImg.data;

    const [h0, h1, h2, h3, h4, h5, h6, h7] = H;

    for (let v = 0; v < outH; v++) {
      for (let u = 0; u < outW; u++) {
        const denom = h6 * u + h7 * v + 1;
        if (Math.abs(denom) < 1e-7) continue;
        const sx = (h0 * u + h1 * v + h2) / denom;
        const sy = (h3 * u + h4 * v + h5) / denom;

        if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) continue;

        const x0 = sx | 0;
        const y0 = sy | 0;
        const fx = sx - x0;
        const fy = sy - y0;
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const i00 = (y0 * srcW + x0) * 4;
        const i10 = i00 + 4;
        const i01 = i00 + srcW * 4;
        const i11 = i01 + 4;

        const dIdx = (v * outW + u) * 4;
        dstData[dIdx] = clamp8(
          srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11
        );
        dstData[dIdx + 1] = clamp8(
          srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11
        );
        dstData[dIdx + 2] = clamp8(
          srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11
        );
        dstData[dIdx + 3] = clamp8(
          srcData[i00 + 3] * w00 + srcData[i10 + 3] * w10 + srcData[i01 + 3] * w01 + srcData[i11 + 3] * w11
        );
      }
    }

    outCtx.putImageData(dstImg, 0, 0);
    return outCanvas;
  }

  /**
   * ============================================================================
   * Select -> Subject 
   * Multi-cluster backdrop model from image frame + frequency-tuned CIELAB saliency
   * + Otsu threshold + exterior background flood-fill + interior hole filling + contour extraction.
   * ============================================================================
   */
  static computeSelectSubjectMask(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const total = width * height;

    // 1. Sample border pixels to build K=4 backdrop color clusters (Top, Left, Right, Bottom frame)
    const frameW = Math.max(2, Math.round(Math.min(width, height) * 0.05));
    const clusters = [
      { r: 0, g: 0, b: 0, count: 0 }, // Top edge
      { r: 0, g: 0, b: 0, count: 0 }, // Left edge
      { r: 0, g: 0, b: 0, count: 0 }, // Right edge
      { r: 0, g: 0, b: 0, count: 0 }  // Bottom corners
    ];

    for (let y = 0; y < frameW; y++) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 20) {
          clusters[0].r += data[idx];
          clusters[0].g += data[idx + 1];
          clusters[0].b += data[idx + 2];
          clusters[0].count++;
        }
      }
    }
    for (let y = 0; y < height * 0.7; y += 2) {
      for (let x = 0; x < frameW; x++) {
        const idxL = (y * width + x) * 4;
        if (data[idxL + 3] > 20) {
          clusters[1].r += data[idxL];
          clusters[1].g += data[idxL + 1];
          clusters[1].b += data[idxL + 2];
          clusters[1].count++;
        }
        const idxR = (y * width + (width - 1 - x)) * 4;
        if (data[idxR + 3] > 20) {
          clusters[2].r += data[idxR];
          clusters[2].g += data[idxR + 1];
          clusters[2].b += data[idxR + 2];
          clusters[2].count++;
        }
      }
    }
    for (let y = height - frameW; y < height; y++) {
      for (let x = 0; x < width; x += 4) {
        if (x > width * 0.2 && x < width * 0.8) continue; // Ignore bottom center where torso/wave exits frame
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 20) {
          clusters[3].r += data[idx];
          clusters[3].g += data[idx + 1];
          clusters[3].b += data[idx + 2];
          clusters[3].count++;
        }
      }
    }

    const validClusters = clusters
      .filter((c) => c.count > 0)
      .map((c) => [c.r / c.count, c.g / c.count, c.b / c.count]);

    if (validClusters.length === 0) {
      validClusters.push([230, 220, 200]);
    }

    // 2. Compute per-pixel backdrop dissimilarity + spatial saliency score (0..255)
    const sal = new Uint8Array(total);
    const salHist = new Uint32Array(256);
    const cx = width * 0.5;
    const cy = height * 0.54;
    const maxR = Math.hypot(cx, cy);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        const idx = p * 4;
        if (data[idx + 3] < 25) {
          sal[p] = 0;
          salHist[0]++;
          continue;
        }
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        // Distance to nearest backdrop cluster (weighted perceptual RGB distance)
        let minBackdropDist = 1e9;
        for (let c = 0; c < validClusters.length; c++) {
          const [cr, cg, cb] = validClusters[c];
          const dr = r - cr, dg = g - cg, db = b - cb;
          const dist = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
          if (dist < minBackdropDist) minBackdropDist = dist;
        }

        const spatialPrior = 1 - Math.pow(Math.hypot(x - cx, y - cy) / maxR, 1.8) * 0.38;
        const score = clamp8(Math.round((minBackdropDist * 0.85) * spatialPrior));
        sal[p] = score;
        salHist[score]++;
      }
    }

    // 3. Otsu's adaptive threshold on saliency histogram
    let sumAll = 0;
    for (let t = 0; t < 256; t++) sumAll += t * salHist[t];
    let sumB = 0, wB = 0, maxVar = 0, threshold = 42;
    for (let t = 0; t < 256; t++) {
      wB += salHist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * salHist[t];
      const mB = sumB / wB;
      const mF = (sumAll - sumB) / wF;
      const betweenVar = wB * wF * (mB - mF) * (mB - mF);
      if (betweenVar > maxVar) {
        maxVar = betweenVar;
        threshold = t;
      }
    }
    threshold = Math.max(26, Math.min(115, Math.round(threshold * 0.82)));

    // 4. Exterior flood-fill from top/left/right frame edges for low-saliency background
    const isBg = new Uint8Array(total);
    const queue = new Int32Array(total);
    let qHead = 0, qTail = 0;

    const trySeed = (x, y) => {
      const p = y * width + x;
      if (!isBg[p] && sal[p] < threshold) {
        isBg[p] = 1;
        queue[qTail++] = p;
      }
    };

    for (let x = 0; x < width; x++) {
      trySeed(x, 0);
      if (x < width * 0.12 || x > width * 0.88) trySeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      trySeed(0, y);
      trySeed(width - 1, y);
    }

    while (qHead < qTail) {
      const p = queue[qHead++];
      const x = p % width;
      const y = (p / width) | 0;

      if (x > 0 && !isBg[p - 1] && sal[p - 1] < threshold) {
        isBg[p - 1] = 1;
        queue[qTail++] = p - 1;
      }
      if (x < width - 1 && !isBg[p + 1] && sal[p + 1] < threshold) {
        isBg[p + 1] = 1;
        queue[qTail++] = p + 1;
      }
      if (y > 0 && !isBg[p - width] && sal[p - width] < threshold) {
        isBg[p - width] = 1;
        queue[qTail++] = p - width;
      }
      if (y < height - 1 && !isBg[p + width] && sal[p + width] < threshold) {
        isBg[p + width] = 1;
        queue[qTail++] = p + width;
      }
    }

    // 5. Foreground mask = not exterior background and sufficient alpha
    const mask = new Uint8Array(total);
    for (let p = 0; p < total; p++) {
      if (!isBg[p] && data[p * 4 + 3] > 20) {
        mask[p] = 255;
      }
    }

    // Extract boundary contour segments for pixel-accurate Marching Ants display
    const contourPoints = [];
    const step = Math.max(2, Math.round(Math.min(width, height) / 140));
    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const p = y * width + x;
        const m = mask[p] > 127;
        const mR = mask[p + step] > 127;
        const mD = mask[p + step * width] > 127;
        if (m !== mR || m !== mD) {
          contourPoints.push({ x, y });
        }
      }
    }

    return { mask, contourPoints };
  }

  /**
   * ============================================================================
   * Full Photoshop / ProStudio Layer Effects & Blending Options Renderer
   * 
   * ============================================================================
   */
  static createDefaultLayerStyles() {
    return LayerStylesEngine.createDefaultLayerStyles();
  }

  static normalizeLayerStyles(rawStyles) {
    return LayerStylesEngine.normalizeLayerStyles(rawStyles);
  }

  static hasActiveLayerEffects(styles) {
    return LayerStylesEngine.hasActiveLayerEffects(styles);
  }

  static renderLayerWithEffects(layer, destCtx, srcCanvas, width, height, globalLight = null) {
    return LayerStylesEngine.renderLayerWithEffects(layer, destCtx, srcCanvas, width, height, globalLight);
  }

  static fillGradientCanvas(ctx, width, height, opts, bbox = null) {
    return LayerStylesEngine.fillGradientCanvas(ctx, width, height, opts, bbox);
  }

  static createProceduralPattern(ctx, kind, scalePct = 100, angleDeg = 0) {
    return LayerStylesEngine.createProceduralPattern(ctx, kind, scalePct, angleDeg);
  }

  static blendFilteredResult(src, filtered, dst, selectionMask) {
    if (!selectionMask) {
      dst.set(filtered);
      return;
    }
    for (let i = 0, px = 0; i < src.length; i += 4, px++) {
      const w = selectionMask[px] / 255;
      if (w <= 0) {
        dst[i] = src[i];
        dst[i + 1] = src[i + 1];
        dst[i + 2] = src[i + 2];
        dst[i + 3] = src[i + 3];
      } else if (w >= 1) {
        dst[i] = filtered[i];
        dst[i + 1] = filtered[i + 1];
        dst[i + 2] = filtered[i + 2];
        dst[i + 3] = filtered[i + 3];
      } else {
        dst[i] = clamp8(src[i] + (filtered[i] - src[i]) * w);
        dst[i + 1] = clamp8(src[i + 1] + (filtered[i + 1] - src[i + 1]) * w);
        dst[i + 2] = clamp8(src[i + 2] + (filtered[i + 2] - src[i + 2]) * w);
        dst[i + 3] = clamp8(src[i + 3] + (filtered[i + 3] - src[i + 3]) * w);
      }
    }
  }

  static hashCoord(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  static rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  static hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [clamp8(Math.round(r * 255)), clamp8(Math.round(g * 255)), clamp8(Math.round(b * 255))];
  }

  static hexToRgb(hex) {
    const clean = (hex || '#378ef0').replace('#', '');
    const num = parseInt(clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean, 16) || 0;
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  static rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp8(v).toString(16).padStart(2, '0')).join('');
  }
}
