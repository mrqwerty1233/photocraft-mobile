/* ============================================================================
 * ProStudio Mobile — Adobe Photoshop-Exact Layer Style (fx) Engine v2
 * Powered by Tight-BBox Accelerated Exact 2D Euclidean Distance Transform (EDT),
 * Exact O(N) 3-Pass Separable Gaussian Blur, and True 3D Heightfield Normal
 * Bevel & Emboss Shading.
 *
 * Supports all 27 Photoshop Blend Modes, Blending Options (Fill Opacity, true
 * RGB Channel write masks, Knockout Shallow/Deep, Blend Interior Effects as
 * Group, Transparency Shapes Layer, Layer Mask Hides Effects, Blend If
 * This/Underlying with Split Feathered Handles), Global Light, 12 Contour
 * Curves (+ Anti-aliased), 8 Procedural Patterns (+ Link with Layer), Multi-Stop
 * Gradients (Linear, Radial, Angle, Reflected, Diamond, Shape Burst), True 3D
 * Bevel & Emboss (+ Contour & Texture Bump Mapping), Stackable (+) Stroke /
 * Inner Shadow / Color Overlay / Gradient Overlay / Drop Shadow, Inner Glow
 * (Edge & Center), Satin, Pattern Overlay, Outer Glow (Softer & Precise), and
 * Live Style Presets.
 * ============================================================================ */

let NEXT_FX_INSTANCE_ID = 100;

export const PHOTOSHOP_BLEND_MODES = [
  { id: 'source-over', label: 'Normal', group: 'normal' },
  { id: 'dissolve', label: 'Dissolve', group: 'normal' },
  { id: 'darken', label: 'Darken', group: 'darken' },
  { id: 'multiply', label: 'Multiply', group: 'darken' },
  { id: 'color-burn', label: 'Color Burn', group: 'darken' },
  { id: 'linear-burn', label: 'Linear Burn', group: 'darken' },
  { id: 'darker-color', label: 'Darker Color', group: 'darken' },
  { id: 'lighten', label: 'Lighten', group: 'lighten' },
  { id: 'screen', label: 'Screen', group: 'lighten' },
  { id: 'color-dodge', label: 'Color Dodge', group: 'lighten' },
  { id: 'lighter', label: 'Linear Dodge (Add)', group: 'lighten' },
  { id: 'lighter-color', label: 'Lighter Color', group: 'lighten' },
  { id: 'overlay', label: 'Overlay', group: 'contrast' },
  { id: 'soft-light', label: 'Soft Light', group: 'contrast' },
  { id: 'hard-light', label: 'Hard Light', group: 'contrast' },
  { id: 'vivid-light', label: 'Vivid Light', group: 'contrast' },
  { id: 'linear-light', label: 'Linear Light', group: 'contrast' },
  { id: 'pin-light', label: 'Pin Light', group: 'contrast' },
  { id: 'hard-mix', label: 'Hard Mix', group: 'contrast' },
  { id: 'difference', label: 'Difference', group: 'invert' },
  { id: 'exclusion', label: 'Exclusion', group: 'invert' },
  { id: 'subtract', label: 'Subtract', group: 'invert' },
  { id: 'divide', label: 'Divide', group: 'invert' },
  { id: 'hue', label: 'Hue', group: 'component' },
  { id: 'saturation', label: 'Saturation', group: 'component' },
  { id: 'color', label: 'Color', group: 'component' },
  { id: 'luminosity', label: 'Luminosity', group: 'component' }
];

const NATIVE_CANVAS_MODES = new Set([
  'source-over',
  'darken',
  'multiply',
  'color-burn',
  'lighten',
  'screen',
  'color-dodge',
  'lighter',
  'overlay',
  'soft-light',
  'hard-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity'
]);

export const CONTOUR_PRESETS = [
  { id: 'linear', label: 'Linear' },
  { id: 'cone', label: 'Cone' },
  { id: 'coneInverted', label: 'Cone - Inverted' },
  { id: 'coveDeep', label: 'Cove - Deep' },
  { id: 'coveShallow', label: 'Cove - Shallow' },
  { id: 'gaussian', label: 'Gaussian' },
  { id: 'halfRound', label: 'Half Round' },
  { id: 'ring', label: 'Ring' },
  { id: 'ringDouble', label: 'Ring - Double' },
  { id: 'rollingSlope', label: 'Rolling Slope - Descending' },
  { id: 'roundedSteps', label: 'Rounded Steps' },
  { id: 'sawtooth1', label: 'Sawtooth 1' }
];

export const PATTERN_PRESETS = [
  { id: 'stripes', label: 'Diagonal Stripes' },
  { id: 'checker', label: 'Checkerboard' },
  { id: 'dots', label: 'Halftone Dots' },
  { id: 'grid', label: 'Technical Grid' },
  { id: 'brushedMetal', label: 'Brushed Metal' },
  { id: 'wovenCanvas', label: 'Woven Canvas' },
  { id: 'carbonFiber', label: 'Carbon Fiber' },
  { id: 'fineNoise', label: 'Fine Film Grain' }
];

export const GRADIENT_PRESETS = [
  {
    id: 'fgTransparent',
    label: 'Glow to Transparent',
    stops: [
      { pos: 0, color: '#ffffbe', opacity: 1 },
      { pos: 1, color: '#ffffbe', opacity: 0 }
    ]
  },
  {
    id: 'cobaltAmber',
    label: 'Cobalt to Sunset',
    stops: [
      { pos: 0, color: '#1e4e82', opacity: 1 },
      { pos: 1, color: '#f59e0b', opacity: 1 }
    ]
  },
  {
    id: 'chromeMetal',
    label: 'Chrome Metallic',
    stops: [
      { pos: 0, color: '#1f2937', opacity: 1 },
      { pos: 0.32, color: '#e2e8f0', opacity: 1 },
      { pos: 0.5, color: '#475569', opacity: 1 },
      { pos: 0.72, color: '#ffffff', opacity: 1 },
      { pos: 1, color: '#0f172a', opacity: 1 }
    ]
  },
  {
    id: 'goldFoil',
    label: 'Gold Foil',
    stops: [
      { pos: 0, color: '#78350f', opacity: 1 },
      { pos: 0.35, color: '#fcd34d', opacity: 1 },
      { pos: 0.55, color: '#d97706', opacity: 1 },
      { pos: 0.8, color: '#fef08a', opacity: 1 },
      { pos: 1, color: '#713f12', opacity: 1 }
    ]
  },
  {
    id: 'neonCyber',
    label: 'Neon Cyan → Magenta',
    stops: [
      { pos: 0, color: '#06b6d4', opacity: 1 },
      { pos: 0.5, color: '#6366f1', opacity: 1 },
      { pos: 1, color: '#ec4899', opacity: 1 }
    ]
  },
  {
    id: 'spectrum',
    label: 'Spectrum Rainbow',
    stops: [
      { pos: 0, color: '#ef4444', opacity: 1 },
      { pos: 0.25, color: '#eab308', opacity: 1 },
      { pos: 0.5, color: '#22c55e', opacity: 1 },
      { pos: 0.75, color: '#3b82f6', opacity: 1 },
      { pos: 1, color: '#a855f7', opacity: 1 }
    ]
  },
  {
    id: 'blackWhite',
    label: 'Black to White',
    stops: [
      { pos: 0, color: '#000000', opacity: 1 },
      { pos: 1, color: '#ffffff', opacity: 1 }
    ]
  }
];

export const STACKABLE_EFFECT_KEYS = {
  stroke: 'strokes',
  innerShadow: 'innerShadows',
  colorOverlay: 'colorOverlays',
  gradientOverlay: 'gradientOverlays',
  dropShadow: 'dropShadows'
};

const USER_DEFAULTS_STORAGE_KEY = 'prostudio_fx_defaults_v1';
const USER_STYLES_STORAGE_KEY = 'prostudio_saved_styles_v1';

const CONTOUR_LUT_CACHE = new Map();
const EDT_INF = 1e12;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp8(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function hexToRgb(hex) {
  const clean = String(hex || '#ffffff').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function hashFast(x, y, seed = 17) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function getUserDefaultsMap() {
  try {
    const raw = localStorage.getItem(USER_DEFAULTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/* ============================================================================
 * EXACT O(N) 2D EUCLIDEAN DISTANCE TRANSFORM (Felzenszwalb & Huttenlocher)
 * ============================================================================ */

function edt1d(f, d, n, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -1e20;
  z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * (q - v[k]));
    while (k > 0 && s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * (q - v[k]));
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
}

/**
 * Computes exact Euclidean distance in pixels from every pixel to the nearest
 * seed pixel (where fInit[i] === 0). Returns Float32Array(w * h).
 */
function computeEDT2D(fInit, w, h) {
  const maxDim = Math.max(w, h) + 2;
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);
  const colIn = new Float64Array(h);
  const colOut = new Float64Array(h);
  const tmp = new Float64Array(w * h);

  // Pass 1: Columns
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) colIn[y] = fInit[y * w + x];
    edt1d(colIn, colOut, h, v, z);
    for (let y = 0; y < h; y++) tmp[y * w + x] = colOut[y];
  }

  // Pass 2: Rows
  const rowIn = new Float64Array(w);
  const rowOut = new Float64Array(w);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) rowIn[x] = tmp[off + x];
    edt1d(rowIn, rowOut, w, v, z);
    for (let x = 0; x < w; x++) {
      const val = rowOut[x];
      out[off + x] = val >= EDT_INF * 0.5 ? 1e6 : Math.sqrt(val);
    }
  }
  return out;
}

/**
 * Outer Euclidean distance from opaque pixels (alpha >= 0.5) with sub-pixel
 * anti-aliased boundary refinement.
 */
function computeOuterEDT(alpha, w, h) {
  const n = w * h;
  const f = new Float64Array(n);
  let hasSeed = false;
  for (let i = 0; i < n; i++) {
    if (alpha[i] >= 0.5) {
      f[i] = 0;
      hasSeed = true;
    } else {
      f[i] = EDT_INF;
    }
  }
  if (!hasSeed) {
    const empty = new Float32Array(n);
    empty.fill(1e6);
    return empty;
  }
  const dist = computeEDT2D(f, w, h);
  // Sub-pixel anti-aliased boundary adjustment so thin glyphs & curves have silky smooth offsets
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    if (a > 0 && a < 0.5 && dist[i] < 2.5) {
      dist[i] = Math.max(0, dist[i] - a);
    }
  }
  return dist;
}

/**
 * Inner Euclidean distance from transparent boundary (alpha < 0.5), including
 * a 1px virtual transparent frame around the buffer so full-canvas layers still
 * get crisp Inner Shadow / Inner Glow / Inside Stroke / Inner Bevel along edges!
 */
function computeInnerEDT(alpha, w, h) {
  const ew = w + 2;
  const eh = h + 2;
  const f = new Float64Array(ew * eh);
  // 1px outer border is always transparent seed (0)
  for (let y = 0; y < h; y++) {
    const srcOff = y * w;
    const dstOff = (y + 1) * ew + 1;
    for (let x = 0; x < w; x++) {
      f[dstOff + x] = alpha[srcOff + x] < 0.5 ? 0 : EDT_INF;
    }
  }
  const extDist = computeEDT2D(f, ew, eh);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const srcOff = (y + 1) * ew + 1;
    const dstOff = y * w;
    for (let x = 0; x < w; x++) {
      const a = alpha[dstOff + x];
      let d = extDist[srcOff + x];
      if (a >= 0.5 && a < 1.0 && d < 2.5) {
        d = Math.max(0, d - (1 - a));
      }
      out[dstOff + x] = d;
    }
  }
  return out;
}

/* ============================================================================
 * EXACT O(N) 3-PASS SEPARABLE BOX-GAUSSIAN BLUR (Zero WebView filter bugs!)
 * ============================================================================ */

function boxBlurH(src, dst, w, h, r, edgeVal) {
  if (r <= 0) {
    dst.set(src);
    return;
  }
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    // Left padded window [-r .. r]
    for (let k = -r; k <= r; k++) {
      if (k < 0) acc += edgeVal;
      else if (k >= w) acc += edgeVal;
      else acc += src[row + k];
    }
    dst[row] = acc * inv;
    for (let x = 1; x < w; x++) {
      const addIdx = x + r;
      const subIdx = x - r - 1;
      const addV = addIdx < w ? src[row + addIdx] : edgeVal;
      const subV = subIdx >= 0 ? src[row + subIdx] : edgeVal;
      acc += addV - subV;
      dst[row + x] = acc * inv;
    }
  }
}

function boxBlurV(src, dst, w, h, r, edgeVal) {
  if (r <= 0) {
    dst.set(src);
    return;
  }
  const inv = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) {
      if (k < 0 || k >= h) acc += edgeVal;
      else acc += src[k * w + x];
    }
    dst[x] = acc * inv;
    for (let y = 1; y < h; y++) {
      const addY = y + r;
      const subY = y - r - 1;
      const addV = addY < h ? src[addY * w + x] : edgeVal;
      const subV = subY >= 0 ? src[subY * w + x] : edgeVal;
      acc += addV - subV;
      dst[y * w + x] = acc * inv;
    }
  }
}

/**
 * Smooth O(N) Gaussian blur on a Float32Array alpha/height buffer.
 * Uses exact 1D Gaussian convolution for small sigma (< 1.4) and Kovesi's
 * 3-pass sliding-window Gaussian approximation for larger sigma (any size up to 250px!).
 */
function blurFloatBuffer(src, w, h, sigma, edgeVal = 0) {
  if (sigma <= 0.08) return new Float32Array(src);
  const n = w * h;

  if (sigma < 1.45) {
    const r = Math.max(1, Math.ceil(sigma * 3));
    const kernel = new Float32Array(2 * r + 1);
    let sum = 0;
    const inv2s2 = 1 / (2 * sigma * sigma);
    for (let k = -r; k <= r; k++) {
      const v = Math.exp(-(k * k) * inv2s2);
      kernel[k + r] = v;
      sum += v;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

    const tmp = new Float32Array(n);
    const out = new Float32Array(n);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let k = -r; k <= r; k++) {
          const sx = x + k;
          const sv = sx >= 0 && sx < w ? src[row + sx] : edgeVal;
          acc += sv * kernel[k + r];
        }
        tmp[row + x] = acc;
      }
    }
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let k = -r; k <= r; k++) {
          const sy = y + k;
          const sv = sy >= 0 && sy < h ? tmp[sy * w + x] : edgeVal;
          acc += sv * kernel[k + r];
        }
        out[row + x] = acc;
      }
    }
    return out;
  }

  // Kovesi 3-pass exact box widths for Gaussian sigma
  const wIdeal = Math.sqrt((12 * sigma * sigma) / 3 + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const mIdeal = (12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4);
  const m = Math.round(mIdeal);

  let bufA = new Float32Array(src);
  let bufB = new Float32Array(n);
  for (let pass = 0; pass < 3; pass++) {
    const bw = pass < m ? wl : wu;
    const rad = Math.max(0, (bw - 1) >> 1);
    boxBlurH(bufA, bufB, w, h, rad, edgeVal);
    boxBlurV(bufB, bufA, w, h, rad, edgeVal);
  }
  return bufA;
}

/**
 * Evaluates a contour LUT with optional 3-tap Anti-Aliased curve smoothing.
 */
function sampleContour(lut, t, antiAliased) {
  const x = clamp01(t);
  if (!antiAliased) {
    return lut[clamp8(x * 255)];
  }
  const c0 = lut[clamp8(clamp01(x - 0.012) * 255)];
  const c1 = lut[clamp8(x * 255)];
  const c2 = lut[clamp8(clamp01(x + 0.012) * 255)];
  return c0 * 0.25 + c1 * 0.5 + c2 * 0.25;
}

/**
 * Extracts normalized [0..1] alpha channel from a canvas region { x, y, w, h }.
 */
function extractAlphaRegion(canvas, region) {
  const data = canvas.getContext('2d').getImageData(region.x, region.y, region.w, region.h).data;
  const n = region.w * region.h;
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    alpha[i] = data[i * 4 + 3] / 255;
  }
  return alpha;
}

export class LayerStylesEngine {
  static evaluateContour(contourId, t) {
    const x = clamp01(t);
    switch (contourId) {
      case 'cone':
        return x < 0.5 ? x * 2 : (1 - x) * 2;
      case 'coneInverted':
        return x < 0.5 ? 1 - x * 2 : (x - 0.5) * 2;
      case 'coveDeep':
        return Math.pow(x, 2.5);
      case 'coveShallow':
        return Math.pow(x, 1.55);
      case 'gaussian':
        return 0.5 - 0.5 * Math.cos(Math.PI * x);
      case 'halfRound':
        return Math.sqrt(Math.max(0, 1 - (1 - x) * (1 - x)));
      case 'ring':
        return Math.sin(Math.PI * x);
      case 'ringDouble':
        return Math.abs(Math.sin(Math.PI * 2 * x));
      case 'rollingSlope':
        return clamp01(x + 0.24 * Math.sin(Math.PI * 2 * x));
      case 'roundedSteps': {
        const s = x * 2;
        const idx = Math.floor(s);
        const f = s - idx;
        const smooth = f * f * (3 - 2 * f);
        return clamp01((idx + smooth) / 2);
      }
      case 'sawtooth1':
        return x < 0.5 ? x * 2 : (x - 0.5) * 2;
      case 'linear':
      default:
        return x;
    }
  }

  static getContourLUT(contourId = 'linear') {
    if (CONTOUR_LUT_CACHE.has(contourId)) {
      return CONTOUR_LUT_CACHE.get(contourId);
    }
    const lut = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = LayerStylesEngine.evaluateContour(contourId, i / 255);
    }
    CONTOUR_LUT_CACHE.set(contourId, lut);
    return lut;
  }

  static sampleGradientStops(stops, t) {
    const arr = Array.isArray(stops) && stops.length > 0
      ? stops
      : [
          { pos: 0, color: '#ffffbe', opacity: 1 },
          { pos: 1, color: '#ffffbe', opacity: 0 }
        ];
    const sorted = arr.length > 1 ? [...arr].sort((a, b) => a.pos - b.pos) : arr;
    const x = clamp01(t);
    if (x <= sorted[0].pos) {
      const [r, g, b] = hexToRgb(sorted[0].color);
      return [r, g, b, sorted[0].opacity ?? 1];
    }
    const last = sorted[sorted.length - 1];
    if (x >= last.pos) {
      const [r, g, b] = hexToRgb(last.color);
      return [r, g, b, last.opacity ?? 1];
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (x >= a.pos && x <= b.pos) {
        const span = Math.max(0.0001, b.pos - a.pos);
        const f = (x - a.pos) / span;
        const [r1, g1, b1] = hexToRgb(a.color);
        const [r2, g2, b2] = hexToRgb(b.color);
        return [
          r1 + (r2 - r1) * f,
          g1 + (g2 - g1) * f,
          b1 + (b2 - b1) * f,
          (a.opacity ?? 1) + ((b.opacity ?? 1) - (a.opacity ?? 1)) * f
        ];
      }
    }
    const [r, g, b] = hexToRgb(last.color);
    return [r, g, b, last.opacity ?? 1];
  }

  static buildGradientLUT(stops, reverse = false) {
    const arr = Array.isArray(stops) && stops.length > 0
      ? stops
      : [
          { pos: 0, color: '#ffffbe', opacity: 1 },
          { pos: 1, color: '#ffffbe', opacity: 0 }
        ];
    const eff = reverse
      ? arr.map((s) => ({ ...s, pos: 1 - s.pos })).sort((a, b) => a.pos - b.pos)
      : arr;
    const lut = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      const [r, g, b, a] = LayerStylesEngine.sampleGradientStops(eff, i / 255);
      lut[i * 4] = clamp8(r);
      lut[i * 4 + 1] = clamp8(g);
      lut[i * 4 + 2] = clamp8(b);
      lut[i * 4 + 3] = clamp8(a * 255);
    }
    return lut;
  }

  static createDefaultEffect(type, useSavedDefault = false) {
    const factory = {
      blendOptions: {
        channels: { r: true, g: true, b: true },
        knockout: 'none',
        blendInteriorAsGroup: false,
        blendClippedAsGroup: true,
        transparencyShapesLayer: true,
        layerMaskHidesEffects: false,
        vectorMaskHidesEffects: false,
        blendIfChannel: 'gray',
        thisBlackMin: 0,
        thisBlackMax: 0,
        thisWhiteMin: 255,
        thisWhiteMax: 255,
        underBlackMin: 0,
        underBlackMax: 0,
        underWhiteMin: 255,
        underWhiteMax: 255
      },
      bevelEmboss: {
        enabled: false,
        style: 'innerBevel',
        technique: 'smooth',
        depth: 100,
        direction: 'up',
        size: 5,
        soften: 0,
        angle: 120,
        useGlobalLight: true,
        altitude: 30,
        glossContour: 'linear',
        glossAntiAliased: false,
        highlightMode: 'screen',
        highlightColor: '#ffffff',
        highlightOpacity: 0.75,
        shadowMode: 'multiply',
        shadowColor: '#000000',
        shadowOpacity: 0.75,
        contourEnabled: false,
        contour: 'linear',
        contourAntiAliased: false,
        contourRange: 50,
        textureEnabled: false,
        texturePattern: 'wovenCanvas',
        textureScale: 100,
        textureDepth: 100,
        textureInvert: false,
        textureLinkWithLayer: true,
        textureOffsetX: 0,
        textureOffsetY: 0
      },
      stroke: {
        id: `stroke_${NEXT_FX_INSTANCE_ID++}`,
        enabled: false,
        size: 3,
        position: 'outside',
        blendMode: 'source-over',
        opacity: 1.0,
        overprint: false,
        fillType: 'color',
        color: '#ffffff',
        gradientStops: [
          { pos: 0, color: '#378ef0', opacity: 1 },
          { pos: 1, color: '#f59e0b', opacity: 1 }
        ],
        gradientStyle: 'linear',
        gradientReverse: false,
        gradientAlignWithLayer: true,
        gradientAngle: 90,
        gradientScale: 100,
        gradientDither: false,
        pattern: 'stripes',
        patternAngle: 0,
        patternScale: 100,
        patternLinkWithLayer: true,
        patternOffsetX: 0,
        patternOffsetY: 0
      },
      innerShadow: {
        id: `innerShadow_${NEXT_FX_INSTANCE_ID++}`,
        enabled: false,
        blendMode: 'multiply',
        color: '#000000',
        opacity: 0.75,
        angle: 120,
        useGlobalLight: true,
        distance: 5,
        choke: 0,
        size: 5,
        contour: 'linear',
        antiAliased: false,
        noise: 0
      },
      innerGlow: {
        enabled: false,
        blendMode: 'screen',
        opacity: 0.75,
        noise: 0,
        colorType: 'solid',
        color: '#ffffbe',
        gradientStops: [
          { pos: 0, color: '#ffffbe', opacity: 1 },
          { pos: 1, color: '#ffffbe', opacity: 0 }
        ],
        technique: 'softer',
        source: 'edge',
        choke: 0,
        size: 5,
        contour: 'linear',
        antiAliased: false,
        range: 50,
        jitter: 0
      },
      satin: {
        enabled: false,
        blendMode: 'multiply',
        color: '#000000',
        opacity: 0.5,
        angle: 19,
        distance: 11,
        size: 14,
        contour: 'linear',
        antiAliased: false,
        invert: true
      },
      colorOverlay: {
        id: `colorOverlay_${NEXT_FX_INSTANCE_ID++}`,
        enabled: false,
        blendMode: 'source-over',
        color: '#ff0000',
        opacity: 1.0
      },
      gradientOverlay: {
        id: `gradientOverlay_${NEXT_FX_INSTANCE_ID++}`,
        enabled: false,
        blendMode: 'source-over',
        dither: false,
        opacity: 1.0,
        gradientStops: [
          { pos: 0, color: '#1e4e82', opacity: 1 },
          { pos: 1, color: '#f59e0b', opacity: 1 }
        ],
        reverse: false,
        alignWithLayer: true,
        style: 'linear',
        angle: 90,
        scale: 100,
        offsetX: 0,
        offsetY: 0
      },
      patternOverlay: {
        enabled: false,
        blendMode: 'source-over',
        opacity: 1.0,
        pattern: 'stripes',
        angle: 0,
        scale: 100,
        linkWithLayer: true,
        offsetX: 0,
        offsetY: 0
      },
      outerGlow: {
        enabled: false,
        blendMode: 'screen',
        opacity: 0.35,
        noise: 0,
        colorType: 'solid',
        color: '#ffffbe',
        gradientStops: [
          { pos: 0, color: '#ffffbe', opacity: 1 },
          { pos: 1, color: '#ffffbe', opacity: 0 }
        ],
        technique: 'softer',
        spread: 0,
        size: 7,
        contour: 'linear',
        antiAliased: false,
        range: 50,
        jitter: 0
      },
      dropShadow: {
        id: `dropShadow_${NEXT_FX_INSTANCE_ID++}`,
        enabled: false,
        blendMode: 'multiply',
        color: '#000000',
        opacity: 0.75,
        angle: 120,
        useGlobalLight: true,
        distance: 5,
        spread: 0,
        size: 5,
        contour: 'linear',
        antiAliased: false,
        noise: 0,
        layerKnocksOut: true
      }
    };

    const base = structuredClone(factory[type] || {});
    if (useSavedDefault) {
      const saved = getUserDefaultsMap()[type];
      if (saved) {
        const merged = { ...base, ...structuredClone(saved) };
        if (base.id) merged.id = `${type}_${NEXT_FX_INSTANCE_ID++}`;
        return merged;
      }
    }
    return base;
  }

  static saveUserDefault(type, value) {
    try {
      const map = getUserDefaultsMap();
      const copy = structuredClone(value);
      delete copy.id;
      delete copy.enabled;
      map[type] = copy;
      localStorage.setItem(USER_DEFAULTS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage quota errors
    }
  }

  static createDefaultLayerStyles() {
    return {
      effectsVisible: true,
      effectsExpanded: true,
      blendOptions: LayerStylesEngine.createDefaultEffect('blendOptions', false),
      bevelEmboss: LayerStylesEngine.createDefaultEffect('bevelEmboss', false),
      strokes: [LayerStylesEngine.createDefaultEffect('stroke', false)],
      innerShadows: [LayerStylesEngine.createDefaultEffect('innerShadow', false)],
      innerGlow: LayerStylesEngine.createDefaultEffect('innerGlow', false),
      satin: LayerStylesEngine.createDefaultEffect('satin', false),
      colorOverlays: [LayerStylesEngine.createDefaultEffect('colorOverlay', false)],
      gradientOverlays: [LayerStylesEngine.createDefaultEffect('gradientOverlay', false)],
      patternOverlay: LayerStylesEngine.createDefaultEffect('patternOverlay', false),
      outerGlow: LayerStylesEngine.createDefaultEffect('outerGlow', false),
      dropShadows: [LayerStylesEngine.createDefaultEffect('dropShadow', false)]
    };
  }

  static normalizeLayerStyles(rawStyles) {
    const def = LayerStylesEngine.createDefaultLayerStyles();
    if (!rawStyles) return def;

    const merged = structuredClone(def);
    merged.effectsVisible = rawStyles.effectsVisible !== false;
    merged.effectsExpanded = rawStyles.effectsExpanded !== false;

    if (rawStyles.blendOptions) {
      const bo = rawStyles.blendOptions;
      merged.blendOptions = { ...merged.blendOptions, ...structuredClone(bo) };
      merged.blendOptions.channels = {
        r: bo.channels?.r !== false,
        g: bo.channels?.g !== false,
        b: bo.channels?.b !== false
      };
      if (bo.blendIfBlack !== undefined && bo.thisBlackMin === undefined) {
        merged.blendOptions.thisBlackMin = bo.blendIfBlack;
        merged.blendOptions.thisBlackMax = bo.blendIfBlack;
      }
      if (bo.blendIfWhite !== undefined && bo.thisWhiteMax === undefined) {
        merged.blendOptions.thisWhiteMin = bo.blendIfWhite;
        merged.blendOptions.thisWhiteMax = bo.blendIfWhite;
      }
    }

    for (const singleKey of ['bevelEmboss', 'innerGlow', 'satin', 'patternOverlay', 'outerGlow']) {
      if (rawStyles[singleKey]) {
        merged[singleKey] = {
          ...LayerStylesEngine.createDefaultEffect(singleKey, false),
          ...structuredClone(rawStyles[singleKey])
        };
      }
    }

    for (const [singular, plural] of Object.entries(STACKABLE_EFFECT_KEYS)) {
      const rawArr = Array.isArray(rawStyles[plural])
        ? rawStyles[plural]
        : rawStyles[singular]
        ? [rawStyles[singular]]
        : null;

      if (rawArr && rawArr.length > 0) {
        merged[plural] = rawArr.map((item) => {
          const itemDef = LayerStylesEngine.createDefaultEffect(singular, false);
          const out = { ...itemDef, ...structuredClone(item) };
          if (!out.id) out.id = `${singular}_${NEXT_FX_INSTANCE_ID++}`;

          if (singular === 'stroke' && item.gradientColor1 && !item.gradientStops) {
            out.gradientStops = [
              { pos: 0, color: item.gradientColor1, opacity: 1 },
              { pos: 1, color: item.gradientColor2 || '#f59e0b', opacity: 1 }
            ];
          }
          if (singular === 'gradientOverlay' && item.color1 && !item.gradientStops) {
            out.gradientStops = [
              { pos: 0, color: item.color1, opacity: 1 },
              { pos: 1, color: item.color2 || '#f59e0b', opacity: 1 }
            ];
          }
          if (singular === 'dropShadow' && item.blur !== undefined && item.size === undefined) {
            out.size = item.blur;
          }
          return out;
        });
      }
    }

    return merged;
  }

  static hasActiveBlendOptions(styles) {
    const bo = styles?.blendOptions;
    if (!bo) return false;
    return Boolean(
      bo.channels?.r === false ||
        bo.channels?.g === false ||
        bo.channels?.b === false ||
        (bo.thisBlackMin ?? 0) > 0 ||
        (bo.thisBlackMax ?? 0) > 0 ||
        (bo.thisWhiteMin ?? 255) < 255 ||
        (bo.thisWhiteMax ?? 255) < 255 ||
        (bo.underBlackMin ?? 0) > 0 ||
        (bo.underBlackMax ?? 0) > 0 ||
        (bo.underWhiteMin ?? 255) < 255 ||
        (bo.underWhiteMax ?? 255) < 255 ||
        (bo.knockout && bo.knockout !== 'none')
    );
  }

  static listActiveEffectEntries(rawStyles) {
    const styles = LayerStylesEngine.normalizeLayerStyles(rawStyles);
    const list = [];
    const pushIf = (type, label, inst, idx = 0) => {
      if (inst && inst.enabled) {
        list.push({ type, label, instance: inst, index: idx });
      }
    };
    pushIf('bevelEmboss', 'Bevel & Emboss', styles.bevelEmboss, 0);
    styles.strokes.forEach((s, i) => pushIf('stroke', styles.strokes.length > 1 ? `Stroke ${i + 1}` : 'Stroke', s, i));
    styles.innerShadows.forEach((s, i) => pushIf('innerShadow', styles.innerShadows.length > 1 ? `Inner Shadow ${i + 1}` : 'Inner Shadow', s, i));
    pushIf('innerGlow', 'Inner Glow', styles.innerGlow, 0);
    pushIf('satin', 'Satin', styles.satin, 0);
    styles.colorOverlays.forEach((s, i) => pushIf('colorOverlay', styles.colorOverlays.length > 1 ? `Color Overlay ${i + 1}` : 'Color Overlay', s, i));
    styles.gradientOverlays.forEach((s, i) => pushIf('gradientOverlay', styles.gradientOverlays.length > 1 ? `Gradient Overlay ${i + 1}` : 'Gradient Overlay', s, i));
    pushIf('patternOverlay', 'Pattern Overlay', styles.patternOverlay, 0);
    pushIf('outerGlow', 'Outer Glow', styles.outerGlow, 0);
    styles.dropShadows.forEach((s, i) => pushIf('dropShadow', styles.dropShadows.length > 1 ? `Drop Shadow ${i + 1}` : 'Drop Shadow', s, i));
    return list;
  }

  static hasActiveLayerEffects(rawStyles) {
    if (!rawStyles) return false;
    const styles = LayerStylesEngine.normalizeLayerStyles(rawStyles);
    if (LayerStylesEngine.hasActiveBlendOptions(styles)) return true;
    if (!styles.effectsVisible) return false;
    return LayerStylesEngine.listActiveEffectEntries(styles).length > 0;
  }

  static getBuiltInStylePresets() {
    const mk = (name, previewHint, mutator) => {
      const st = LayerStylesEngine.createDefaultLayerStyles();
      mutator(st);
      return { id: `builtin_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, name, builtin: true, previewHint, styles: st };
    };

    return [
      mk('Neon Cyan Glow', 'Outer Glow + Stroke', (s) => {
        s.outerGlow.enabled = true;
        s.outerGlow.color = '#38bdf8';
        s.outerGlow.opacity = 0.85;
        s.outerGlow.size = 24;
        s.outerGlow.spread = 15;
        s.outerGlow.blendMode = 'screen';
        s.strokes[0].enabled = true;
        s.strokes[0].size = 2;
        s.strokes[0].color = '#e0f2fe';
      }),
      mk('Gold Metallic Bevel', 'Bevel + Gradient + Drop Shadow', (s) => {
        s.bevelEmboss.enabled = true;
        s.bevelEmboss.style = 'innerBevel';
        s.bevelEmboss.technique = 'chiselHard';
        s.bevelEmboss.depth = 220;
        s.bevelEmboss.size = 10;
        s.bevelEmboss.glossContour = 'ring';
        s.gradientOverlays[0].enabled = true;
        s.gradientOverlays[0].gradientStops = structuredClone(GRADIENT_PRESETS[3].stops);
        s.gradientOverlays[0].angle = 115;
        s.dropShadows[0].enabled = true;
        s.dropShadows[0].distance = 10;
        s.dropShadows[0].size = 14;
        s.dropShadows[0].opacity = 0.65;
      }),
      mk('Double Sticker Stroke', 'Dual Stacked Strokes + Shadow', (s) => {
        s.strokes[0].enabled = true;
        s.strokes[0].size = 4;
        s.strokes[0].position = 'outside';
        s.strokes[0].color = '#ffffff';
        const s2 = LayerStylesEngine.createDefaultEffect('stroke', false);
        s2.enabled = true;
        s2.size = 10;
        s2.position = 'outside';
        s2.color = '#111827';
        s.strokes.push(s2);
        s.dropShadows[0].enabled = true;
        s.dropShadows[0].distance = 12;
        s.dropShadows[0].size = 16;
        s.dropShadows[0].opacity = 0.55;
      }),
      mk('Frosted Glass Emboss', 'Inner Glow + Stroke + Bevel', (s) => {
        s.bevelEmboss.enabled = true;
        s.bevelEmboss.size = 6;
        s.bevelEmboss.soften = 3;
        s.bevelEmboss.highlightOpacity = 0.85;
        s.bevelEmboss.shadowOpacity = 0.35;
        s.innerGlow.enabled = true;
        s.innerGlow.color = '#ffffff';
        s.innerGlow.opacity = 0.55;
        s.innerGlow.size = 16;
        s.strokes[0].enabled = true;
        s.strokes[0].size = 2;
        s.strokes[0].position = 'inside';
        s.strokes[0].opacity = 0.7;
        s.strokes[0].color = '#ffffff';
        s.dropShadows[0].enabled = true;
        s.dropShadows[0].distance = 10;
        s.dropShadows[0].size = 18;
        s.dropShadows[0].opacity = 0.45;
      }),
      mk('Chrome Satin Badge', 'Chrome Gradient + Satin + Contour', (s) => {
        s.gradientOverlays[0].enabled = true;
        s.gradientOverlays[0].gradientStops = structuredClone(GRADIENT_PRESETS[2].stops);
        s.satin.enabled = true;
        s.satin.opacity = 0.45;
        s.satin.distance = 12;
        s.satin.size = 14;
        s.satin.contour = 'gaussian';
        s.bevelEmboss.enabled = true;
        s.bevelEmboss.contourEnabled = true;
        s.bevelEmboss.contour = 'halfRound';
        s.bevelEmboss.size = 8;
        s.dropShadows[0].enabled = true;
        s.dropShadows[0].distance = 8;
        s.dropShadows[0].size = 12;
      }),
      mk('Soft Sunset Halo', 'Gradient Outer Glow + Inner Shadow', (s) => {
        s.outerGlow.enabled = true;
        s.outerGlow.colorType = 'gradient';
        s.outerGlow.gradientStops = [
          { pos: 0, color: '#fde047', opacity: 1 },
          { pos: 0.5, color: '#f97316', opacity: 0.7 },
          { pos: 1, color: '#ec4899', opacity: 0 }
        ];
        s.outerGlow.opacity = 0.85;
        s.outerGlow.size = 24;
        s.outerGlow.range = 60;
        s.innerShadows[0].enabled = true;
        s.innerShadows[0].color = '#7c2d12';
        s.innerShadows[0].opacity = 0.55;
        s.innerShadows[0].distance = 4;
        s.innerShadows[0].size = 10;
      })
    ];
  }

  static getSavedUserStyles() {
    try {
      const raw = localStorage.getItem(USER_STYLES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveUserStylePreset(name, styles, includeBlending = true, layerMeta = null) {
    const existing = LayerStylesEngine.getSavedUserStyles();
    const entry = {
      id: `user_${Date.now()}`,
      name: String(name || 'Custom Style').trim(),
      builtin: false,
      includeBlending,
      layerMeta: includeBlending && layerMeta ? structuredClone(layerMeta) : null,
      styles: structuredClone(LayerStylesEngine.normalizeLayerStyles(styles))
    };
    existing.unshift(entry);
    try {
      localStorage.setItem(USER_STYLES_STORAGE_KEY, JSON.stringify(existing.slice(0, 32)));
    } catch {
      // Ignore storage errors
    }
    return entry;
  }

  static deleteUserStylePreset(id) {
    const next = LayerStylesEngine.getSavedUserStyles().filter((p) => p.id !== id);
    try {
      localStorage.setItem(USER_STYLES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }

  /* ==========================================================================
   * PATTERN & MULTI-STOP GRADIENT RENDERERS
   * ========================================================================== */

  static createPatternTileCanvas(kind = 'stripes', scalePct = 100) {
    const s = Math.max(6, Math.min(256, Math.round(18 * Math.max(0.1, scalePct / 100))));
    const pCanvas = document.createElement('canvas');
    pCanvas.width = s;
    pCanvas.height = s;
    const pCtx = pCanvas.getContext('2d');

    if (kind === 'checker') {
      const h = s / 2;
      pCtx.fillStyle = 'rgba(255,255,255,0.65)';
      pCtx.fillRect(0, 0, h, h);
      pCtx.fillRect(h, h, h, h);
      pCtx.fillStyle = 'rgba(0,0,0,0.65)';
      pCtx.fillRect(h, 0, h, h);
      pCtx.fillRect(0, h, h, h);
    } else if (kind === 'dots') {
      pCtx.fillStyle = 'rgba(255,255,255,0.8)';
      pCtx.beginPath();
      pCtx.arc(s / 2, s / 2, Math.max(1.5, s * 0.28), 0, Math.PI * 2);
      pCtx.fill();
    } else if (kind === 'grid') {
      pCtx.strokeStyle = 'rgba(255,255,255,0.65)';
      pCtx.lineWidth = Math.max(1, s * 0.08);
      pCtx.strokeRect(0, 0, s, s);
    } else if (kind === 'brushedMetal') {
      const img = pCtx.createImageData(s, s);
      const d = img.data;
      for (let y = 0; y < s; y++) {
        const rowTone = 105 + hashFast(1, y, 7) * 95;
        for (let x = 0; x < s; x++) {
          const v = clamp8(rowTone + (hashFast(x, y, 13) - 0.5) * 38);
          const idx = (y * s + x) * 4;
          d[idx] = v;
          d[idx + 1] = v;
          d[idx + 2] = clamp8(v + 6);
          d[idx + 3] = 225;
        }
      }
      pCtx.putImageData(img, 0, 0);
    } else if (kind === 'wovenCanvas') {
      pCtx.fillStyle = '#8b8f99';
      pCtx.fillRect(0, 0, s, s);
      pCtx.fillStyle = 'rgba(255,255,255,0.42)';
      pCtx.fillRect(0, 0, s, Math.max(1, s * 0.35));
      pCtx.fillStyle = 'rgba(0,0,0,0.34)';
      pCtx.fillRect(0, 0, Math.max(1, s * 0.35), s);
      pCtx.fillStyle = 'rgba(255,255,255,0.30)';
      pCtx.fillRect(s * 0.5, s * 0.5, s * 0.5, s * 0.35);
    } else if (kind === 'carbonFiber') {
      pCtx.fillStyle = '#1f242d';
      pCtx.fillRect(0, 0, s, s);
      const h = s / 2;
      pCtx.fillStyle = '#3b4252';
      pCtx.fillRect(0, 0, h, h * 0.8);
      pCtx.fillStyle = '#4c566a';
      pCtx.fillRect(h, h, h, h * 0.8);
      pCtx.fillStyle = '#11151c';
      pCtx.fillRect(0, h, h, h);
      pCtx.fillRect(h, 0, h, h);
    } else if (kind === 'fineNoise') {
      const img = pCtx.createImageData(s, s);
      const d = img.data;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = clamp8(hashFast(x, y, 91) * 255);
          const idx = (y * s + x) * 4;
          d[idx] = v;
          d[idx + 1] = v;
          d[idx + 2] = v;
          d[idx + 3] = 210;
        }
      }
      pCtx.putImageData(img, 0, 0);
    } else {
      pCtx.strokeStyle = 'rgba(255,255,255,0.68)';
      pCtx.lineWidth = Math.max(2, s * 0.25);
      pCtx.beginPath();
      pCtx.moveTo(-s * 0.2, s * 1.2);
      pCtx.lineTo(s * 1.2, -s * 0.2);
      pCtx.stroke();
    }
    return pCanvas;
  }

  static createProceduralPattern(ctx, kind = 'stripes', scalePct = 100, angleDeg = 0, offsetX = 0, offsetY = 0) {
    const pCanvas = LayerStylesEngine.createPatternTileCanvas(kind, scalePct);
    const pat = ctx.createPattern(pCanvas, 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined' && (angleDeg || offsetX || offsetY)) {
      const m = new DOMMatrix();
      if (offsetX || offsetY) m.translateSelf(offsetX, offsetY);
      if (angleDeg) m.rotateSelf(angleDeg);
      pat.setTransform(m);
    }
    return pat;
  }

  /**
   * Fills a local canvas of size (rw x rh) mapped at document origin (ox, oy)
   * with a Photoshop-exact Linear / Radial / Angle / Reflected / Diamond gradient.
   * Uses exact directional bounding-box projection so vertical gradients on wide
   * text span cleanly from the exact top to the exact bottom of the glyphs!
   */
  static fillGradientRegion(ctx, rw, rh, originX, originY, docW, docH, opts, layerBbox = null) {
    const rawStops = Array.isArray(opts.gradientStops) && opts.gradientStops.length > 0
      ? opts.gradientStops
      : [
          { pos: 0, color: opts.color1 || '#1e4e82', opacity: 1 },
          { pos: 1, color: opts.color2 || '#f59e0b', opacity: 1 }
        ];
    const stops = opts.reverse
      ? rawStops.map((s) => ({ ...s, pos: 1 - s.pos })).sort((a, b) => a.pos - b.pos)
      : [...rawStops].sort((a, b) => a.pos - b.pos);

    const alignBox = opts.alignWithLayer !== false && layerBbox ? layerBbox : { x: 0, y: 0, w: docW, h: docH };
    const scale = Math.max(0.1, (opts.scale ?? 100) / 100);
    // Center in local region coordinates
    const cx = alignBox.x + alignBox.w * (0.5 + (opts.offsetX || 0) / 100) - originX;
    const cy = alignBox.y + alignBox.h * (0.5 + (opts.offsetY || 0) / 100) - originY;
    const spanW = Math.max(1, alignBox.w);
    const spanH = Math.max(1, alignBox.h);
    const style = opts.style || 'linear';

    const addStopsToGrad = (grad, reflected = false) => {
      if (reflected) {
        for (const s of stops) {
          const [r, g, b] = hexToRgb(s.color);
          const a = s.opacity ?? 1;
          grad.addColorStop(clamp01(0.5 - s.pos * 0.5), `rgba(${r},${g},${b},${a})`);
          grad.addColorStop(clamp01(0.5 + s.pos * 0.5), `rgba(${r},${g},${b},${a})`);
        }
      } else {
        for (const s of stops) {
          const [r, g, b] = hexToRgb(s.color);
          grad.addColorStop(clamp01(s.pos), `rgba(${r},${g},${b},${s.opacity ?? 1})`);
        }
      }
    };

    if (style === 'radial') {
      const r = (Math.hypot(spanW, spanH) / 2) * scale;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
      addStopsToGrad(grad, false);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rw, rh);
    } else if (style === 'angle' && typeof ctx.createConicGradient === 'function') {
      const rad = (-(opts.angle ?? 90) * Math.PI) / 180;
      const grad = ctx.createConicGradient(rad, cx, cy);
      addStopsToGrad(grad, false);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rw, rh);
    } else if (style === 'diamond' || style === 'angle') {
      const lut = LayerStylesEngine.buildGradientLUT(stops, false);
      const rad = ((opts.angle ?? 90) * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const maxD = Math.max(1, (Math.max(spanW, spanH) / 2) * scale);
      const img = ctx.createImageData(rw, rh);
      const d = img.data;
      for (let py = 0; py < rh; py++) {
        const dy = py - cy;
        for (let px = 0; px < rw; px++) {
          const dx = px - cx;
          let t;
          if (style === 'diamond') {
            const rx = Math.abs(dx * cosA + dy * sinA);
            const ry = Math.abs(-dx * sinA + dy * cosA);
            t = clamp01((rx + ry) / maxD);
          } else {
            const ang = Math.atan2(dy, dx) + rad;
            t = ((ang / (Math.PI * 2)) % 1 + 1) % 1;
          }
          const li = clamp8(t * 255) * 4;
          const o = (py * rw + px) * 4;
          d[o] = lut[li];
          d[o + 1] = lut[li + 1];
          d[o + 2] = lut[li + 2];
          d[o + 3] = lut[li + 3];
        }
      }
      ctx.putImageData(img, 0, 0);
    } else {
      // Exact Photoshop Linear / Reflected bounding-box projection length!
      // At 90° (vertical) -> spanH/2; at 0° (horizontal) -> spanW/2; exact for every angle!
      const rad = ((opts.angle ?? 90) * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const halfLen = (Math.abs(spanW * cosA) + Math.abs(spanH * sinA)) * 0.5 * scale;
      const dx = cosA * halfLen;
      const dy = -sinA * halfLen;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      addStopsToGrad(grad, style === 'reflected');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rw, rh);
    }

    if (opts.dither) {
      const img = ctx.getImageData(0, 0, rw, rh);
      const d = img.data;
      for (let py = 0; py < rh; py++) {
        for (let px = 0; px < rw; px++) {
          const o = (py * rw + px) * 4;
          if (d[o + 3] === 0) continue;
          const n = (hashFast(originX + px, originY + py, 37) - 0.5) * 3.5;
          d[o] = clamp8(d[o] + n);
          d[o + 1] = clamp8(d[o + 1] + n);
          d[o + 2] = clamp8(d[o + 2] + n);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  }

  static fillGradientCanvas(ctx, width, height, opts, bbox = null) {
    LayerStylesEngine.fillGradientRegion(ctx, width, height, 0, 0, width, height, opts, bbox);
  }

  /* ==========================================================================
   * FULL 27-MODE PHOTOSHOP COMPOSITOR HELPER (Supports Full or Local Region!)
   * ========================================================================== */

  static compositeRegion(destCtx, srcCanvas, dstX, dstY, blendMode = 'source-over', alpha = 1) {
    if (alpha <= 0.0005) return;
    const sw = srcCanvas.width;
    const sh = srcCanvas.height;
    if (sw <= 0 || sh <= 0) return;

    if (NATIVE_CANVAS_MODES.has(blendMode)) {
      destCtx.save();
      destCtx.globalCompositeOperation = blendMode;
      destCtx.globalAlpha = clamp01(alpha);
      destCtx.drawImage(srcCanvas, dstX, dstY);
      destCtx.restore();
      return;
    }

    const dw = destCtx.canvas.width;
    const dh = destCtx.canvas.height;
    const x0 = Math.max(0, Math.floor(dstX));
    const y0 = Math.max(0, Math.floor(dstY));
    const x1 = Math.min(dw, Math.ceil(dstX + sw));
    const y1 = Math.min(dh, Math.ceil(dstY + sh));
    const rw = x1 - x0;
    const rh = y1 - y0;
    if (rw <= 0 || rh <= 0) return;

    const sx0 = x0 - Math.floor(dstX);
    const sy0 = y0 - Math.floor(dstY);

    const dstImg = destCtx.getImageData(x0, y0, rw, rh);
    const srcImg = srcCanvas.getContext('2d').getImageData(sx0, sy0, rw, rh);
    const dd = dstImg.data;
    const sd = srcImg.data;

    const blendCh = (cb, cs) => {
      switch (blendMode) {
        case 'linear-burn':
          return Math.max(0, cb + cs - 1);
        case 'vivid-light':
          return cs <= 0.5
            ? cs === 0 ? 0 : Math.max(0, 1 - (1 - cb) / (2 * cs))
            : cs === 1 ? 1 : Math.min(1, cb / (2 * (1 - cs)));
        case 'linear-light':
          return clamp01(cb + 2 * cs - 1);
        case 'pin-light':
          return cs <= 0.5 ? Math.min(cb, 2 * cs) : Math.max(cb, 2 * cs - 1);
        case 'hard-mix':
          return cb + cs >= 1 ? 1 : 0;
        case 'subtract':
          return Math.max(0, cb - cs);
        case 'divide':
          return cs <= 0.001 ? 1 : Math.min(1, cb / cs);
        default:
          return cs;
      }
    };

    for (let py = 0; py < rh; py++) {
      for (let px = 0; px < rw; px++) {
        const i = (py * rw + px) * 4;
        const sa0 = (sd[i + 3] / 255) * alpha;
        if (sa0 <= 0.001) continue;

        if (blendMode === 'dissolve') {
          if (hashFast(x0 + px, y0 + py, 53) > sa0) continue;
          dd[i] = sd[i];
          dd[i + 1] = sd[i + 1];
          dd[i + 2] = sd[i + 2];
          dd[i + 3] = 255;
          continue;
        }

        const da = dd[i + 3] / 255;
        const sr = sd[i] / 255, sg = sd[i + 1] / 255, sb = sd[i + 2] / 255;
        const dr = dd[i] / 255, dg = dd[i + 1] / 255, db = dd[i + 2] / 255;

        let br, bg, bb;
        if (blendMode === 'darker-color') {
          const sLum = 0.299 * sr + 0.587 * sg + 0.114 * sb;
          const dLum = 0.299 * dr + 0.587 * dg + 0.114 * db;
          if (sLum < dLum) { br = sr; bg = sg; bb = sb; } else { br = dr; bg = dg; bb = db; }
        } else if (blendMode === 'lighter-color') {
          const sLum = 0.299 * sr + 0.587 * sg + 0.114 * sb;
          const dLum = 0.299 * dr + 0.587 * dg + 0.114 * db;
          if (sLum > dLum) { br = sr; bg = sg; bb = sb; } else { br = dr; bg = dg; bb = db; }
        } else {
          br = blendCh(dr, sr);
          bg = blendCh(dg, sg);
          bb = blendCh(db, sb);
        }

        const outA = sa0 + da * (1 - sa0);
        if (outA <= 0.0001) continue;
        const cr = (1 - da) * sr + da * br;
        const cg = (1 - da) * sg + da * bg;
        const cb = (1 - da) * sb + da * bb;

        dd[i] = clamp8(((sa0 * cr + da * (1 - sa0) * dr) / outA) * 255);
        dd[i + 1] = clamp8(((sa0 * cg + da * (1 - sa0) * dg) / outA) * 255);
        dd[i + 2] = clamp8(((sa0 * cb + da * (1 - sa0) * db) / outA) * 255);
        dd[i + 3] = clamp8(outA * 255);
      }
    }
    destCtx.putImageData(dstImg, x0, y0);
  }

  static compositeCanvas(destCtx, srcCanvas, blendMode = 'source-over', alpha = 1, region = null) {
    if (alpha <= 0.0005) return;
    if (NATIVE_CANVAS_MODES.has(blendMode)) {
      destCtx.save();
      destCtx.globalCompositeOperation = blendMode;
      destCtx.globalAlpha = clamp01(alpha);
      destCtx.drawImage(srcCanvas, 0, 0);
      destCtx.restore();
      return;
    }
    if (region) {
      const tmp = document.createElement('canvas');
      tmp.width = region.w;
      tmp.height = region.h;
      tmp.getContext('2d').drawImage(srcCanvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
      LayerStylesEngine.compositeRegion(destCtx, tmp, region.x, region.y, blendMode, alpha);
      return;
    }
    LayerStylesEngine.compositeRegion(destCtx, srcCanvas, 0, 0, blendMode, alpha);
  }

  /* ==========================================================================
   * TIGHT ALPHA BOUNDING BOX HELPER (Exact & Fast!)
   * ========================================================================== */

  static computeAlphaBounds(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    const step = w * h > 800000 ? 2 : 1;
    for (let y = 0; y < h; y += step) {
      const row = y * w;
      for (let x = 0; x < w; x += step) {
        if (data[(row + x) * 4 + 3] > 1) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    minX = Math.max(0, minX - step);
    minY = Math.max(0, minY - step);
    maxX = Math.min(w - 1, maxX + step);
    maxY = Math.min(h - 1, maxY + step);
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  static expandRegion(bbox, pad, width, height) {
    const x0 = Math.max(0, Math.floor(bbox.x - pad));
    const y0 = Math.max(0, Math.floor(bbox.y - pad));
    const x1 = Math.min(width, Math.ceil(bbox.x + bbox.w + pad));
    const y1 = Math.min(height, Math.ceil(bbox.y + bbox.h + pad));
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }

  /**
   * Builds a solid-tinted RGBA canvas from a Float32Array [0..1] alpha buffer
   * with Contour LUT, Noise, Solid or Gradient coloring, and Jitter.
   */
  static buildColoredEffectCanvas(alphaBuf, rw, rh, originX, originY, opts) {
    const c = document.createElement('canvas');
    c.width = rw;
    c.height = rh;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(rw, rh);
    const d = img.data;

    const contourLut = LayerStylesEngine.getContourLUT(opts.contour || 'linear');
    const antiAliased = Boolean(opts.antiAliased);
    const noise = clamp01((opts.noise ?? 0) / 100);
    const jitter = clamp01((opts.jitter ?? 0) / 100);
    const isGradient = opts.colorType === 'gradient' && Array.isArray(opts.gradientStops);
    const gradLut = isGradient ? LayerStylesEngine.buildGradientLUT(opts.gradientStops, false) : null;
    const [sr, sg, sb] = hexToRgb(opts.color || '#000000');
    const seed = opts.seed || 31;
    const knockoutAlpha = opts.knockoutAlpha || null;
    const clipAlpha = opts.clipAlpha || null;

    for (let py = 0; py < rh; py++) {
      const row = py * rw;
      for (let px = 0; px < rw; px++) {
        const p = row + px;
        let a = alphaBuf[p];
        if (a <= 0.0015) continue;

        let t = sampleContour(contourLut, clamp01(a), antiAliased);
        if (t <= 0.0015) continue;

        if (noise > 0) {
          const n = hashFast(originX + px, originY + py, seed);
          t = clamp01(t * (1 - noise + n * noise * 1.45));
        }

        if (knockoutAlpha) {
          t *= 1 - knockoutAlpha[p];
          if (t <= 0.0015) continue;
        }
        if (clipAlpha) {
          t *= clipAlpha[p];
          if (t <= 0.0015) continue;
        }

        const i = p * 4;
        if (isGradient && gradLut) {
          let gt = 1 - clamp01(t); // 0 = dense inner core, 1 = outer edge
          if (jitter > 0) {
            gt = clamp01(gt + (hashFast(originX + px, originY + py, seed + 19) - 0.5) * jitter * 0.85);
          }
          const gi = clamp8(gt * 255) * 4;
          d[i] = gradLut[gi];
          d[i + 1] = gradLut[gi + 1];
          d[i + 2] = gradLut[gi + 2];
          d[i + 3] = clamp8(t * gradLut[gi + 3]);
        } else {
          d[i] = sr;
          d[i + 1] = sg;
          d[i + 2] = sb;
          d[i + 3] = clamp8(t * 255);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /* ==========================================================================
   * MAIN PHOTOSHOP LAYER STYLE RENDERER (Tight-BBox + Exact EDT + 3D Bevel!)
   * ========================================================================== */

  static renderLayerWithEffects(layer, destCtx, srcCanvas, width, height, globalLight = null) {
    const fx = LayerStylesEngine.normalizeLayerStyles(layer.styles);
    const bo = fx.blendOptions;
    const gAngle = globalLight?.angle ?? 120;
    const gAltitude = globalLight?.altitude ?? 30;
    const layerOpacity = clamp01(layer.opacity ?? 1);
    const fillOpacity = clamp01(layer.fill ?? 1);
    const effectsOn = fx.effectsVisible !== false;

    const bbox = LayerStylesEngine.computeAlphaBounds(srcCanvas);
    if (!bbox) return;

    // ------------------------------------------------------------------------
    // 0. CHANNEL RESTRICT WRAPPER (True Photoshop RGB Channel Isolation!)
    // When R, G, or B is unchecked, we render the complete layer+effects onto a
    // copy of the destination over the full effect envelope, then copy back ONLY
    // the enabled RGB channels so unchecked channels preserve underlying pixels!
    // ------------------------------------------------------------------------
    const rOn = bo.channels?.r !== false;
    const gOn = bo.channels?.g !== false;
    const bOn = bo.channels?.b !== false;
    const restrictChannels = !rOn || !gOn || !bOn;

    let targetCtx = destCtx;
    let chanWrap = null;
    if (restrictChannels) {
      let maxPad = 8;
      if (effectsOn) {
        if (fx.outerGlow?.enabled) maxPad = Math.max(maxPad, (fx.outerGlow.size ?? 7) * 1.6 + 8);
        if (fx.bevelEmboss?.enabled) maxPad = Math.max(maxPad, (fx.bevelEmboss.size ?? 5) + (fx.bevelEmboss.soften ?? 0) + 8);
        for (const st of fx.strokes || []) {
          if (st?.enabled) maxPad = Math.max(maxPad, (st.size ?? 3) + 6);
        }
        for (const ds of fx.dropShadows || []) {
          if (ds?.enabled) maxPad = Math.max(maxPad, (ds.distance ?? 5) + (ds.size ?? 5) * 1.6 + 8);
        }
      }
      const env = LayerStylesEngine.expandRegion(bbox, maxPad, width, height);
      const wrapCanvas = document.createElement('canvas');
      wrapCanvas.width = width;
      wrapCanvas.height = height;
      const wCtx = wrapCanvas.getContext('2d');
      wCtx.drawImage(destCtx.canvas, env.x, env.y, env.w, env.h, env.x, env.y, env.w, env.h);
      chanWrap = { canvas: wrapCanvas, env };
      targetCtx = wCtx;
    }

    // ------------------------------------------------------------------------
    // 0b. BLENDING OPTIONS: Blend If (This & Underlying) + Knockout
    // ------------------------------------------------------------------------
    const hasBlendIf =
      (bo.thisBlackMin ?? 0) > 0 ||
      (bo.thisBlackMax ?? 0) > 0 ||
      (bo.thisWhiteMin ?? 255) < 255 ||
      (bo.thisWhiteMax ?? 255) < 255 ||
      (bo.underBlackMin ?? 0) > 0 ||
      (bo.underBlackMax ?? 0) > 0 ||
      (bo.underWhiteMin ?? 255) < 255 ||
      (bo.underWhiteMax ?? 255) < 255;

    // Crop tight source canvas for base pixels & alpha
    const baseSrc = document.createElement('canvas');
    baseSrc.width = bbox.w;
    baseSrc.height = bbox.h;
    const baseSrcCtx = baseSrc.getContext('2d');
    baseSrcCtx.drawImage(srcCanvas, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);

    // Compute Blend If attenuation factor buffer over bbox (reused for base & optional interior group)
    let blendIfMask = null;
    if (hasBlendIf) {
      const srcImg = baseSrcCtx.getImageData(0, 0, bbox.w, bbox.h);
      const sd = srcImg.data;
      const needUnder =
        (bo.underBlackMin ?? 0) > 0 ||
        (bo.underBlackMax ?? 0) > 0 ||
        (bo.underWhiteMin ?? 255) < 255 ||
        (bo.underWhiteMax ?? 255) < 255;
      const underData = needUnder ? targetCtx.getImageData(bbox.x, bbox.y, bbox.w, bbox.h).data : null;

      const ch = bo.blendIfChannel || 'gray';
      const tBMin = bo.thisBlackMin ?? 0;
      const tBMax = Math.max(tBMin, bo.thisBlackMax ?? tBMin);
      const tWMax = bo.thisWhiteMax ?? 255;
      const tWMin = Math.min(tWMax, bo.thisWhiteMin ?? tWMax);
      const uBMin = bo.underBlackMin ?? 0;
      const uBMax = Math.max(uBMin, bo.underBlackMax ?? uBMin);
      const uWMax = bo.underWhiteMax ?? 255;
      const uWMin = Math.min(uWMax, bo.underWhiteMin ?? uWMax);

      const sampleVal = (arr, idx) => {
        if (ch === 'red') return arr[idx];
        if (ch === 'green') return arr[idx + 1];
        if (ch === 'blue') return arr[idx + 2];
        return 0.299 * arr[idx] + 0.587 * arr[idx + 1] + 0.114 * arr[idx + 2];
      };
      const rampFactor = (val, bMin, bMax, wMin, wMax) => {
        let f = 1;
        if (bMin > 0 || bMax > 0) {
          if (val <= bMin) return 0;
          if (val < bMax) f = Math.min(f, (val - bMin) / Math.max(1, bMax - bMin));
        }
        if (wMin < 255 || wMax < 255) {
          if (val >= wMax) return 0;
          if (val > wMin) f = Math.min(f, (wMax - val) / Math.max(1, wMax - wMin));
        }
        return f;
      };

      blendIfMask = new Float32Array(bbox.w * bbox.h);
      for (let p = 0, i = 0; i < sd.length; p++, i += 4) {
        if (sd[i + 3] === 0) continue;
        let f = rampFactor(sampleVal(sd, i), tBMin, tBMax, tWMin, tWMax);
        if (f > 0 && underData && underData[i + 3] > 0) {
          f *= rampFactor(sampleVal(underData, i), uBMin, uBMax, uWMin, uWMax);
        }
        blendIfMask[p] = f;
        sd[i + 3] = clamp8(sd[i + 3] * f);
      }
      baseSrcCtx.putImageData(srcImg, 0, 0);
    }

    // Source alpha used for shaping effects:
    // If Blend Interior as Group is checked or Blend If is active, baseSrc reflects Blend If;
    // otherwise original srcCanvas shapes interior overlays while Blend If only hides base pixels.
    const shapeCanvas =
      hasBlendIf && !bo.blendInteriorAsGroup
        ? (() => {
            const c = document.createElement('canvas');
            c.width = bbox.w;
            c.height = bbox.h;
            c.getContext('2d').drawImage(srcCanvas, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
            return c;
          })()
        : baseSrc;

    // Knockout Shallow/Deep cuts out underlying layers with layer silhouette
    if (bo.knockout && bo.knockout !== 'none' && fillOpacity < 1) {
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'destination-out';
      targetCtx.globalAlpha = bo.knockout === 'deep' ? 1 - fillOpacity : (1 - fillOpacity) * 0.78;
      targetCtx.drawImage(baseSrc, bbox.x, bbox.y);
      targetCtx.restore();
    }

    // Helper: extract padded local alpha from shapeCanvas into region { x, y, w, h }
    const getAlphaInRegion = (region) => {
      const alpha = new Float32Array(region.w * region.h);
      const sx0 = Math.max(0, region.x - bbox.x);
      const sy0 = Math.max(0, region.y - bbox.y);
      const dx0 = Math.max(0, bbox.x - region.x);
      const dy0 = Math.max(0, bbox.y - region.y);
      const cw = Math.min(bbox.w - sx0, region.w - dx0);
      const ch = Math.min(bbox.h - sy0, region.h - dy0);
      if (cw <= 0 || ch <= 0) return alpha;
      const srcData = shapeCanvas.getContext('2d').getImageData(sx0, sy0, cw, ch).data;
      for (let py = 0; py < ch; py++) {
        const sRow = py * cw;
        const dRow = (dy0 + py) * region.w + dx0;
        for (let px = 0; px < cw; px++) {
          alpha[dRow + px] = srcData[(sRow + px) * 4 + 3] / 255;
        }
      }
      return alpha;
    };

    // Cached local bbox alpha & inner EDT (computed lazily once and reused by Inner Shadow / Inner Glow / Inner Bevel / Stroke Inside!)
    let cachedBboxAlpha = null;
    let cachedBboxInnerEDT = null;
    const getBboxAlpha = () => {
      if (!cachedBboxAlpha) {
        cachedBboxAlpha = extractAlphaRegion(shapeCanvas, { x: 0, y: 0, w: bbox.w, h: bbox.h });
      }
      return cachedBboxAlpha;
    };
    const getBboxInnerEDT = () => {
      if (!cachedBboxInnerEDT) {
        cachedBboxInnerEDT = computeInnerEDT(getBboxAlpha(), bbox.w, bbox.h);
      }
      return cachedBboxInnerEDT;
    };

    const transparencyShapes = bo.transparencyShapesLayer !== false;

    // ------------------------------------------------------------------------
    // 1. DROP SHADOWS (Stackable, bottom-to-top — Exact EDT Spread + Exact Gaussian!)
    // ------------------------------------------------------------------------
    if (effectsOn && Array.isArray(fx.dropShadows)) {
      for (let idx = fx.dropShadows.length - 1; idx >= 0; idx--) {
        const ds = fx.dropShadows[idx];
        if (!ds?.enabled) continue;
        const angle = ds.useGlobalLight !== false ? gAngle : (ds.angle ?? 120);
        const rad = (angle * Math.PI) / 180;
        const dist = ds.distance ?? 5;
        const ox = Math.round(-Math.cos(rad) * dist);
        const oy = Math.round(Math.sin(rad) * dist);
        const size = Math.max(0, Math.min(250, ds.size ?? 5));
        const spread = clamp01((ds.spread ?? 0) / 100);

        const pad = Math.ceil(size * 1.45 + 6);
        const shRegion = LayerStylesEngine.expandRegion(
          { x: bbox.x + ox, y: bbox.y + oy, w: bbox.w, h: bbox.h },
          pad,
          width,
          height
        );

        // Build unshifted alpha inside (shRegion shifted back by -ox, -oy)
        const srcAlpha = new Float32Array(shRegion.w * shRegion.h);
        const mapX = bbox.x + ox - shRegion.x;
        const mapY = bbox.y + oy - shRegion.y;
        const sx0 = Math.max(0, -mapX);
        const sy0 = Math.max(0, -mapY);
        const dx0 = Math.max(0, mapX);
        const dy0 = Math.max(0, mapY);
        const cw = Math.min(bbox.w - sx0, shRegion.w - dx0);
        const ch = Math.min(bbox.h - sy0, shRegion.h - dy0);
        if (cw > 0 && ch > 0) {
          const bAlpha = getBboxAlpha();
          for (let py = 0; py < ch; py++) {
            const sRow = (sy0 + py) * bbox.w + sx0;
            const dRow = (dy0 + py) * shRegion.w + dx0;
            for (let px = 0; px < cw; px++) {
              srcAlpha[dRow + px] = bAlpha[sRow + px];
            }
          }
        }

        // Exact Photoshop Spread + Size physics:
        // solidRad = size * spread (exact EDT morphological dilation!)
        // blurRad  = size * (1 - spread) (exact smooth Gaussian feather!)
        const solidRad = size * spread;
        const blurRad = size * (1 - spread);
        let workAlpha = srcAlpha;

        if (solidRad > 0.1) {
          const edt = computeOuterEDT(srcAlpha, shRegion.w, shRegion.h);
          const dilated = new Float32Array(srcAlpha.length);
          for (let i = 0; i < dilated.length; i++) {
            const a0 = srcAlpha[i];
            if (a0 >= 0.999) {
              dilated[i] = 1;
            } else {
              const d = edt[i];
              const da = clamp01(solidRad + 0.5 - d);
              dilated[i] = da > a0 ? da : a0;
            }
          }
          workAlpha = dilated;
        }

        if (blurRad > 0.1) {
          // Photoshop Size maps cleanly to sigma ~ 0.42 * blurRad
          workAlpha = blurFloatBuffer(workAlpha, shRegion.w, shRegion.h, blurRad * 0.42, 0);
        }

        // Optional Layer Knocks Out Drop Shadow (unshifted layer silhouette!)
        let knockoutBuf = null;
        if (ds.layerKnocksOut !== false && transparencyShapes) {
          knockoutBuf = getAlphaInRegion(shRegion);
        }

        const shCanvas = LayerStylesEngine.buildColoredEffectCanvas(workAlpha, shRegion.w, shRegion.h, shRegion.x, shRegion.y, {
          color: ds.color || '#000000',
          contour: ds.contour || 'linear',
          antiAliased: Boolean(ds.antiAliased),
          noise: ds.noise ?? 0,
          knockoutAlpha: knockoutBuf,
          seed: 41 + idx * 7
        });

        LayerStylesEngine.compositeRegion(
          targetCtx,
          shCanvas,
          shRegion.x,
          shRegion.y,
          ds.blendMode || 'multiply',
          layerOpacity * clamp01(ds.opacity ?? 0.75)
        );
      }
    }

    // ------------------------------------------------------------------------
    // 2. OUTER GLOW (Exact EDT Precise OR Smooth Gaussian Softer + Spread + Range + Gradient!)
    // ------------------------------------------------------------------------
    if (effectsOn && fx.outerGlow?.enabled) {
      const og = fx.outerGlow;
      const size = Math.max(0, Math.min(250, og.size ?? 7));
      const spread = clamp01((og.spread ?? 0) / 100);
      const range = Math.max(0.05, (og.range ?? 50) / 100);
      const pad = Math.ceil(size * 1.5 + 8);
      const gRegion = LayerStylesEngine.expandRegion(bbox, pad, width, height);
      const srcAlpha = getAlphaInRegion(gRegion);
      const n = gRegion.w * gRegion.h;
      const solidRad = size * spread;
      const falloffRad = Math.max(0.5, size * (1 - spread));
      let glowAlpha;

      if (og.technique === 'precise') {
        // Exact Euclidean distance halo (zero concentric ring banding!)
        const edt = computeOuterEDT(srcAlpha, gRegion.w, gRegion.h);
        glowAlpha = new Float32Array(n);
        const effFalloff = Math.max(0.5, falloffRad * (range * 2));
        for (let i = 0; i < n; i++) {
          const d = edt[i];
          if (d <= solidRad) {
            glowAlpha[i] = 1;
          } else if (d < solidRad + effFalloff) {
            glowAlpha[i] = clamp01(1 - (d - solidRad) / effFalloff);
          }
        }
      } else {
        // Softer technique: EDT spread + exact Gaussian blur + Range ramp
        let baseA = srcAlpha;
        if (solidRad > 0.1) {
          const edt = computeOuterEDT(srcAlpha, gRegion.w, gRegion.h);
          baseA = new Float32Array(n);
          for (let i = 0; i < n; i++) {
            baseA[i] = Math.max(srcAlpha[i], clamp01(solidRad + 0.5 - edt[i]));
          }
        }
        const blurred = size > 0 ? blurFloatBuffer(baseA, gRegion.w, gRegion.h, Math.max(0.4, falloffRad * 0.45), 0) : baseA;
        glowAlpha = new Float32Array(n);
        const rangeScale = 1 / Math.max(0.08, range * 1.45);
        for (let i = 0; i < n; i++) {
          glowAlpha[i] = clamp01(blurred[i] * rangeScale);
        }
      }

      const glowCanvas = LayerStylesEngine.buildColoredEffectCanvas(glowAlpha, gRegion.w, gRegion.h, gRegion.x, gRegion.y, {
        colorType: og.colorType || 'solid',
        color: og.color || '#ffffbe',
        gradientStops: og.gradientStops,
        contour: og.contour || 'linear',
        antiAliased: Boolean(og.antiAliased),
        noise: og.noise ?? 0,
        jitter: og.jitter ?? 0,
        knockoutAlpha: transparencyShapes ? srcAlpha : null,
        seed: 73
      });

      LayerStylesEngine.compositeRegion(
        targetCtx,
        glowCanvas,
        gRegion.x,
        gRegion.y,
        og.blendMode || 'screen',
        layerOpacity * clamp01(og.opacity ?? 0.35)
      );
    }

    // ------------------------------------------------------------------------
    // 2b. OUTER BEVEL / EMBOSS / PILLOW EMBOSS (True 3D Outer Surface Normal Shading!)
    // ------------------------------------------------------------------------
    if (effectsOn && fx.bevelEmboss?.enabled) {
      const bev = fx.bevelEmboss;
      if (bev.style === 'outerBevel' || bev.style === 'emboss' || bev.style === 'pillowEmboss') {
        LayerStylesEngine.renderBevelOuter3D(
          bev,
          targetCtx,
          getAlphaInRegion,
          bbox,
          width,
          height,
          layerOpacity,
          gAngle,
          gAltitude
        );
      }
    }

    // ------------------------------------------------------------------------
    // 3. INTERIOR COMPOSITE (Tight bbox canvas: Base Pixels * Fill Opacity + Clipped Overlays)
    // ------------------------------------------------------------------------
    const interior = document.createElement('canvas');
    interior.width = bbox.w;
    interior.height = bbox.h;
    const iCtx = interior.getContext('2d');

    iCtx.save();
    iCtx.globalAlpha = fillOpacity;
    iCtx.drawImage(baseSrc, 0, 0);
    iCtx.restore();

    const applyClippedInterior = (blendMode, opacity, drawOrCanvas) => {
      let ov;
      if (drawOrCanvas instanceof HTMLCanvasElement) {
        ov = drawOrCanvas;
      } else {
        ov = document.createElement('canvas');
        ov.width = bbox.w;
        ov.height = bbox.h;
        const oCtx = ov.getContext('2d');
        drawOrCanvas(oCtx);
        if (transparencyShapes) {
          oCtx.globalCompositeOperation = 'destination-in';
          oCtx.drawImage(shapeCanvas, 0, 0);
        }
      }
      LayerStylesEngine.compositeRegion(iCtx, ov, 0, 0, blendMode || 'source-over', clamp01(opacity ?? 1));
    };

    if (effectsOn) {
      // 3a. PATTERN OVERLAY (With true Link with Layer & Angle/Scale!)
      if (fx.patternOverlay?.enabled) {
        const po = fx.patternOverlay;
        applyClippedInterior(po.blendMode || 'source-over', po.opacity ?? 1, (oCtx) => {
          const linkOffX = po.linkWithLayer !== false ? (po.offsetX || 0) : -bbox.x + (po.offsetX || 0);
          const linkOffY = po.linkWithLayer !== false ? (po.offsetY || 0) : -bbox.y + (po.offsetY || 0);
          const pat = LayerStylesEngine.createProceduralPattern(
            oCtx,
            po.pattern || 'stripes',
            po.scale ?? 100,
            po.angle ?? 0,
            linkOffX,
            linkOffY
          );
          oCtx.fillStyle = pat;
          oCtx.fillRect(0, 0, bbox.w, bbox.h);
        });
      }

      // 3b. GRADIENT OVERLAYS (Stackable, bottom-to-top — Exact Directional Box Projection!)
      if (Array.isArray(fx.gradientOverlays)) {
        for (let idx = fx.gradientOverlays.length - 1; idx >= 0; idx--) {
          const go = fx.gradientOverlays[idx];
          if (!go?.enabled) continue;
          applyClippedInterior(go.blendMode || 'source-over', go.opacity ?? 1, (oCtx) => {
            LayerStylesEngine.fillGradientRegion(
              oCtx,
              bbox.w,
              bbox.h,
              bbox.x,
              bbox.y,
              width,
              height,
              {
                style: go.style || 'linear',
                angle: go.angle ?? 90,
                scale: go.scale ?? 100,
                reverse: Boolean(go.reverse),
                alignWithLayer: go.alignWithLayer !== false,
                dither: Boolean(go.dither),
                gradientStops: go.gradientStops,
                offsetX: go.offsetX || 0,
                offsetY: go.offsetY || 0
              },
              bbox
            );
          });
        }
      }

      // 3c. COLOR OVERLAYS (Stackable, bottom-to-top)
      if (Array.isArray(fx.colorOverlays)) {
        for (let idx = fx.colorOverlays.length - 1; idx >= 0; idx--) {
          const co = fx.colorOverlays[idx];
          if (!co?.enabled) continue;
          applyClippedInterior(co.blendMode || 'source-over', co.opacity ?? 1, (oCtx) => {
            oCtx.fillStyle = co.color || '#ff0000';
            oCtx.fillRect(0, 0, bbox.w, bbox.h);
          });
        }
      }

      // 3d. SATIN (Exact Photoshop |blur(a(x+dx,y+dy)) - blur(a(x-dx,y-dy))| + Contour + Invert!)
      if (fx.satin?.enabled) {
        const sat = fx.satin;
        const rad = ((sat.angle ?? 19) * Math.PI) / 180;
        const dist = Math.max(0, sat.distance ?? 11);
        const dx = Math.round(Math.cos(rad) * dist);
        const dy = Math.round(-Math.sin(rad) * dist);
        const size = Math.max(0, Math.min(250, sat.size ?? 14));
        const pad = Math.ceil(dist + size + 4);
        // Virtual padded alpha around bbox (zero outside)
        const pw = bbox.w + pad * 2;
        const ph = bbox.h + pad * 2;
        const bAlpha = getBboxAlpha();
        const padAlpha = new Float32Array(pw * ph);
        for (let py = 0; py < bbox.h; py++) {
          const sRow = py * bbox.w;
          const dRow = (py + pad) * pw + pad;
          for (let px = 0; px < bbox.w; px++) padAlpha[dRow + px] = bAlpha[sRow + px];
        }
        const blurred = size > 0 ? blurFloatBuffer(padAlpha, pw, ph, Math.max(0.5, size * 0.42), 0) : padAlpha;
        const satAlpha = new Float32Array(bbox.w * bbox.h);
        const invFlag = sat.invert !== false;
        for (let py = 0; py < bbox.h; py++) {
          const row = py * bbox.w;
          for (let px = 0; px < bbox.w; px++) {
            const p = row + px;
            if (bAlpha[p] <= 0.002) continue;
            const x1 = Math.max(0, Math.min(pw - 1, px + pad + dx));
            const y1 = Math.max(0, Math.min(ph - 1, py + pad + dy));
            const x2 = Math.max(0, Math.min(pw - 1, px + pad - dx));
            const y2 = Math.max(0, Math.min(ph - 1, py + pad - dy));
            const diff = Math.abs(blurred[y1 * pw + x1] - blurred[y2 * pw + x2]);
            satAlpha[p] = invFlag ? clamp01(1 - diff) : clamp01(diff);
          }
        }
        const satCanvas = LayerStylesEngine.buildColoredEffectCanvas(satAlpha, bbox.w, bbox.h, bbox.x, bbox.y, {
          color: sat.color || '#000000',
          contour: sat.contour || 'linear',
          antiAliased: Boolean(sat.antiAliased),
          clipAlpha: bAlpha,
          seed: 59
        });
        applyClippedInterior(sat.blendMode || 'multiply', sat.opacity ?? 0.5, satCanvas);
      }

      // 3e. INNER GLOW (Exact EDT for both Edge & Center Source + Softer/Precise + Choke + Range!)
      if (fx.innerGlow?.enabled) {
        const ig = fx.innerGlow;
        const size = Math.max(0, Math.min(250, ig.size ?? 5));
        const choke = clamp01((ig.choke ?? 0) / 100);
        const range = Math.max(0.05, (ig.range ?? 50) / 100);
        const bAlpha = getBboxAlpha();
        const innerDist = getBboxInnerEDT();
        const n = bbox.w * bbox.h;
        const chokeRad = size * choke;
        const falloffRad = Math.max(0.5, size * (1 - choke) * (range * 2));
        let igAlpha = new Float32Array(n);

        if (ig.source === 'center') {
          // Strongest at interior center, fading out to 0 at edges!
          // Measure max inner distance so thin text still gets a vivid center glow!
          let maxD = 1;
          for (let i = 0; i < n; i++) if (bAlpha[i] > 0.5 && innerDist[i] > maxD) maxD = innerDist[i];
          const effSpan = Math.max(0.5, Math.min(size > 0 ? size : maxD, maxD));
          const effChoke = effSpan * choke;
          const effFall = Math.max(0.5, (effSpan - effChoke) * (range * 2));
          for (let i = 0; i < n; i++) {
            if (bAlpha[i] <= 0.002) continue;
            const d = innerDist[i];
            if (d <= effChoke) {
              igAlpha[i] = 0;
            } else {
              igAlpha[i] = clamp01((d - effChoke) / effFall);
            }
          }
          if (ig.technique !== 'precise' && size > 1) {
            igAlpha = blurFloatBuffer(igAlpha, bbox.w, bbox.h, Math.min(6, size * 0.18), 0);
          }
        } else if (ig.technique === 'precise') {
          // Precise Edge Inner Glow from exact Euclidean inner distance
          for (let i = 0; i < n; i++) {
            if (bAlpha[i] <= 0.002) continue;
            const d = innerDist[i];
            if (d <= chokeRad) igAlpha[i] = 1;
            else if (d < chokeRad + falloffRad) igAlpha[i] = clamp01(1 - (d - chokeRad) / falloffRad);
          }
        } else {
          // Softer Edge Inner Glow: EDT choke + exact Gaussian blur on virtual-padded inverted alpha
          const invBase = new Float32Array(n);
          for (let i = 0; i < n; i++) {
            const d = innerDist[i];
            if (bAlpha[i] < 0.5) invBase[i] = 1;
            else if (chokeRad > 0.1) invBase[i] = clamp01(chokeRad + 0.5 - d);
            else invBase[i] = 1 - bAlpha[i];
          }
          const blurred = size > 0 ? blurFloatBuffer(invBase, bbox.w, bbox.h, Math.max(0.4, size * (1 - choke) * 0.45), 1) : invBase;
          const rangeScale = 1 / Math.max(0.08, range * 1.45);
          for (let i = 0; i < n; i++) {
            if (bAlpha[i] <= 0.002) continue;
            igAlpha[i] = clamp01(blurred[i] * rangeScale);
          }
        }

        const igCanvas = LayerStylesEngine.buildColoredEffectCanvas(igAlpha, bbox.w, bbox.h, bbox.x, bbox.y, {
          colorType: ig.colorType || 'solid',
          color: ig.color || '#ffffbe',
          gradientStops: ig.gradientStops,
          contour: ig.contour || 'linear',
          antiAliased: Boolean(ig.antiAliased),
          noise: ig.noise ?? 0,
          jitter: ig.jitter ?? 0,
          clipAlpha: bAlpha,
          seed: 83
        });
        applyClippedInterior(ig.blendMode || 'screen', ig.opacity ?? 0.75, igCanvas);
      }

      // 3f. INNER SHADOWS (Stackable, bottom-to-top — Exact EDT Choke + Gaussian + Virtual Edge!)
      if (Array.isArray(fx.innerShadows)) {
        for (let idx = fx.innerShadows.length - 1; idx >= 0; idx--) {
          const is = fx.innerShadows[idx];
          if (!is?.enabled) continue;
          const angle = is.useGlobalLight !== false ? gAngle : (is.angle ?? 120);
          const rad = (angle * Math.PI) / 180;
          const dist = Math.max(0, is.distance ?? 5);
          const ox = Math.round(-Math.cos(rad) * dist);
          const oy = Math.round(Math.sin(rad) * dist);
          const size = Math.max(0, Math.min(250, is.size ?? 5));
          const choke = clamp01((is.choke ?? 0) / 100);
          const bAlpha = getBboxAlpha();
          const innerDist = getBboxInnerEDT();
          const n = bbox.w * bbox.h;

          // Build unshifted choked inverted silhouette (1 outside shape & within chokeRad of edge, 0 deep inside)
          const chokeRad = size * choke;
          const blurRad = size * (1 - choke);
          const invMask = new Float32Array(n);
          for (let i = 0; i < n; i++) {
            if (bAlpha[i] < 0.5) {
              invMask[i] = 1;
            } else if (chokeRad > 0.1) {
              invMask[i] = clamp01(chokeRad + 0.5 - innerDist[i]);
            } else {
              invMask[i] = 1 - bAlpha[i];
            }
          }

          // Blur with edgeVal = 1 (outside bbox is opaque shadow wall!)
          const blurredInv = blurRad > 0.1 ? blurFloatBuffer(invMask, bbox.w, bbox.h, blurRad * 0.42, 1) : invMask;

          // Shift shadow by (+ox, +oy): sample blurredInv at (px - ox, py - oy); out-of-bounds = 1
          const shifted = new Float32Array(n);
          for (let py = 0; py < bbox.h; py++) {
            const sy = py - oy;
            const row = py * bbox.w;
            for (let px = 0; px < bbox.w; px++) {
              const p = row + px;
              if (bAlpha[p] <= 0.002) continue;
              const sx = px - ox;
              if (sx < 0 || sx >= bbox.w || sy < 0 || sy >= bbox.h) {
                shifted[p] = 1;
              } else {
                shifted[p] = blurredInv[sy * bbox.w + sx];
              }
            }
          }

          const isCanvas = LayerStylesEngine.buildColoredEffectCanvas(shifted, bbox.w, bbox.h, bbox.x, bbox.y, {
            color: is.color || '#000000',
            contour: is.contour || 'linear',
            antiAliased: Boolean(is.antiAliased),
            noise: is.noise ?? 0,
            clipAlpha: bAlpha,
            seed: 101 + idx * 11
          });
          applyClippedInterior(is.blendMode || 'multiply', is.opacity ?? 0.75, isCanvas);
        }
      }

      // 3g. TRUE 3D BEVEL & EMBOSS (Inner Bevel / Emboss / Pillow Emboss + Contour + Texture + Gloss!)
      if (fx.bevelEmboss?.enabled && fx.bevelEmboss.style !== 'outerBevel' && fx.bevelEmboss.style !== 'strokeEmboss') {
        LayerStylesEngine.renderBevelInner3D(
          fx.bevelEmboss,
          applyClippedInterior,
          getBboxAlpha(),
          getBboxInnerEDT(),
          bbox,
          gAngle,
          gAltitude
        );
      }
    }

    // Draw composed interior onto target canvas
    LayerStylesEngine.compositeRegion(
      targetCtx,
      interior,
      bbox.x,
      bbox.y,
      layer.blendMode || 'source-over',
      layerOpacity
    );

    // ------------------------------------------------------------------------
    // 4. STROKES (Stackable, bottom-to-top — Exact EDT 1..250px, Zero Hollow Gaps!)
    // ------------------------------------------------------------------------
    if (effectsOn && Array.isArray(fx.strokes)) {
      for (let idx = fx.strokes.length - 1; idx >= 0; idx--) {
        const st = fx.strokes[idx];
        if (!st?.enabled || (st.size ?? 0) <= 0) continue;
        const stSize = Math.min(250, Math.max(1, st.size));
        const pos = st.position || 'outside';
        const pad = pos === 'inside' ? 2 : Math.ceil(pos === 'center' ? stSize / 2 + 4 : stSize + 4);
        const stRegion = LayerStylesEngine.expandRegion(bbox, pad, width, height);
        const srcAlpha = getAlphaInRegion(stRegion);
        const n = stRegion.w * stRegion.h;

        // Compute exact anti-aliased stroke alpha + normalized Shape Burst distance t in [0..1]
        const strokeAlpha = new Float32Array(n);
        const burstT = st.fillType === 'gradient' && st.gradientStyle === 'shapeBurst' ? new Float32Array(n) : null;

        if (pos === 'outside') {
          const dOut = computeOuterEDT(srcAlpha, stRegion.w, stRegion.h);
          for (let i = 0; i < n; i++) {
            const outerCover = clamp01(stSize + 0.5 - dOut[i]);
            if (outerCover <= 0.001) continue;
            const a = outerCover * (1 - srcAlpha[i]);
            if (a > 0.001) {
              strokeAlpha[i] = a;
              if (burstT) burstT[i] = clamp01(dOut[i] / Math.max(1, stSize));
            }
          }
        } else if (pos === 'inside') {
          const dIn = computeInnerEDT(srcAlpha, stRegion.w, stRegion.h);
          for (let i = 0; i < n; i++) {
            if (srcAlpha[i] <= 0.002) continue;
            const innerCover = clamp01(stSize + 0.5 - dIn[i]);
            if (innerCover > 0.001) {
              strokeAlpha[i] = innerCover * srcAlpha[i];
              if (burstT) burstT[i] = clamp01(dIn[i] / Math.max(1, stSize));
            }
          }
        } else {
          // Center stroke: half outside + half inside seamlessly!
          const half = stSize * 0.5;
          const dOut = computeOuterEDT(srcAlpha, stRegion.w, stRegion.h);
          const dIn = computeInnerEDT(srcAlpha, stRegion.w, stRegion.h);
          for (let i = 0; i < n; i++) {
            const outCover = clamp01(half + 0.5 - dOut[i]);
            const inCover = clamp01(half + 0.5 - dIn[i]);
            const a = srcAlpha[i] >= 0.5 ? inCover : outCover;
            if (a > 0.001) {
              strokeAlpha[i] = a;
              if (burstT) {
                const signedD = srcAlpha[i] >= 0.5 ? half - dIn[i] : half + dOut[i];
                burstT[i] = clamp01(signedD / Math.max(1, stSize));
              }
            }
          }
        }

        // Build stroke mask canvas
        const strokeCanvas = document.createElement('canvas');
        strokeCanvas.width = stRegion.w;
        strokeCanvas.height = stRegion.h;
        const dCtx = strokeCanvas.getContext('2d');

        if (st.fillType === 'gradient' && st.gradientStyle === 'shapeBurst' && burstT) {
          // Exact Shape Burst gradient mapped by true Euclidean distance across stroke width!
          const gLut = LayerStylesEngine.buildGradientLUT(st.gradientStops, Boolean(st.gradientReverse));
          const img = dCtx.createImageData(stRegion.w, stRegion.h);
          const dd = img.data;
          for (let i = 0; i < n; i++) {
            const sa = strokeAlpha[i];
            if (sa <= 0.001) continue;
            const gi = clamp8(burstT[i] * 255) * 4;
            const o = i * 4;
            dd[o] = gLut[gi];
            dd[o + 1] = gLut[gi + 1];
            dd[o + 2] = gLut[gi + 2];
            dd[o + 3] = clamp8(sa * gLut[gi + 3]);
          }
          dCtx.putImageData(img, 0, 0);
        } else {
          // Fill Color / Gradient / Pattern, then multiply by exact strokeAlpha!
          if (st.fillType === 'gradient') {
            LayerStylesEngine.fillGradientRegion(
              dCtx,
              stRegion.w,
              stRegion.h,
              stRegion.x,
              stRegion.y,
              width,
              height,
              {
                style: st.gradientStyle || 'linear',
                angle: st.gradientAngle ?? 90,
                scale: st.gradientScale ?? 100,
                reverse: Boolean(st.gradientReverse),
                alignWithLayer: st.gradientAlignWithLayer !== false,
                dither: Boolean(st.gradientDither),
                gradientStops: st.gradientStops
              },
              stRegion
            );
          } else if (st.fillType === 'pattern') {
            const pOffX = st.patternLinkWithLayer !== false ? (bbox.x - stRegion.x + (st.patternOffsetX || 0)) : (-stRegion.x + (st.patternOffsetX || 0));
            const pOffY = st.patternLinkWithLayer !== false ? (bbox.y - stRegion.y + (st.patternOffsetY || 0)) : (-stRegion.y + (st.patternOffsetY || 0));
            const pat = LayerStylesEngine.createProceduralPattern(
              dCtx,
              st.pattern || 'stripes',
              st.patternScale ?? 100,
              st.patternAngle ?? 0,
              pOffX,
              pOffY
            );
            dCtx.fillStyle = pat;
            dCtx.fillRect(0, 0, stRegion.w, stRegion.h);
          } else {
            dCtx.fillStyle = st.color || '#ffffff';
            dCtx.fillRect(0, 0, stRegion.w, stRegion.h);
          }

          // Mask fill by exact anti-aliased strokeAlpha
          const fillImg = dCtx.getImageData(0, 0, stRegion.w, stRegion.h);
          const fd = fillImg.data;
          for (let i = 0; i < n; i++) {
            fd[i * 4 + 3] = clamp8(fd[i * 4 + 3] * strokeAlpha[i]);
          }
          dCtx.putImageData(fillImg, 0, 0);
        }

        // True 3D Stroke Emboss when Bevel & Emboss style === 'strokeEmboss'
        if (idx === 0 && fx.bevelEmboss?.enabled && fx.bevelEmboss.style === 'strokeEmboss') {
          const stInnerEDT = computeInnerEDT(strokeAlpha, stRegion.w, stRegion.h);
          const applyOnStroke = (bm, op, canvasOrFn) => {
            const ov = canvasOrFn instanceof HTMLCanvasElement ? canvasOrFn : (() => {
              const tc = document.createElement('canvas');
              tc.width = stRegion.w;
              tc.height = stRegion.h;
              canvasOrFn(tc.getContext('2d'));
              return tc;
            })();
            LayerStylesEngine.compositeRegion(dCtx, ov, 0, 0, bm, op);
          };
          LayerStylesEngine.renderBevelInner3D(
            fx.bevelEmboss,
            applyOnStroke,
            strokeAlpha,
            stInnerEDT,
            stRegion,
            gAngle,
            gAltitude
          );
        }

        const effectiveMode = st.overprint ? 'multiply' : (st.blendMode || 'source-over');
        LayerStylesEngine.compositeRegion(
          targetCtx,
          strokeCanvas,
          stRegion.x,
          stRegion.y,
          effectiveMode,
          layerOpacity * clamp01(st.opacity ?? 1)
        );
      }
    }

    // Finalize True Photoshop RGB Channel Isolation (only write enabled R / G / B channels!)
    if (chanWrap) {
      const { canvas: wrapCanvas, env } = chanWrap;
      const origImg = destCtx.getImageData(env.x, env.y, env.w, env.h);
      const newImg = wrapCanvas.getContext('2d').getImageData(env.x, env.y, env.w, env.h);
      const od = origImg.data;
      const nd = newImg.data;
      for (let i = 0; i < od.length; i += 4) {
        if (rOn) od[i] = nd[i];
        if (gOn) od[i + 1] = nd[i + 1];
        if (bOn) od[i + 2] = nd[i + 2];
        od[i + 3] = Math.max(od[i + 3], nd[i + 3]);
      }
      destCtx.putImageData(origImg, env.x, env.y);
    }
  }

  /* ==========================================================================
   * TRUE 3D HEIGHTFIELD + SURFACE NORMAL BEVEL & EMBOSS ENGINE
   * Authentic Photoshop Lighting: Angle=120° (top-left light) illuminates TOP-LEFT
   * with Highlight and casts Shadow on BOTTOM-RIGHT! Full Altitude, Depth,
   * Technique (Smooth/Chisel Hard/Chisel Soft), Contour, Texture Bump, & Gloss!
   * ========================================================================== */

  static shadeHeightfield3D(bev, heightBuf, maskAlpha, rw, rh, originX, originY, gAngle, gAltitude, flipDirection = false) {
    const n = rw * rh;
    const angle = bev.useGlobalLight !== false ? gAngle : (bev.angle ?? 120);
    const altitude = clamp01((bev.useGlobalLight !== false ? gAltitude : (bev.altitude ?? 30)) / 90) * (Math.PI / 2);
    const rad = (angle * Math.PI) / 180;
    const dirSign = (bev.direction === 'down' ? -1 : 1) * (flipDirection ? -1 : 1);

    // Optional Texture bump map perturbation of the 3D heightfield!
    let H = heightBuf;
    if (bev.textureEnabled) {
      const patTile = LayerStylesEngine.createPatternTileCanvas(bev.texturePattern || 'wovenCanvas', bev.textureScale ?? 100);
      const ts = patTile.width;
      const tData = patTile.getContext('2d').getImageData(0, 0, ts, ts).data;
      const tDepth = Math.max(-10, Math.min(10, (bev.textureDepth ?? 100) / 100)) * 0.45 * (bev.textureInvert ? -1 : 1);
      const offX = (bev.textureLinkWithLayer !== false ? 0 : originX) + (bev.textureOffsetX || 0);
      const offY = (bev.textureLinkWithLayer !== false ? 0 : originY) + (bev.textureOffsetY || 0);
      const bumped = new Float32Array(n);
      for (let py = 0; py < rh; py++) {
        const ty = (((py + offY) % ts) + ts) % ts;
        const row = py * rw;
        for (let px = 0; px < rw; px++) {
          const tx = (((px + offX) % ts) + ts) % ts;
          const ti = (ty * ts + tx) * 4;
          const lum = (0.299 * tData[ti] + 0.587 * tData[ti + 1] + 0.114 * tData[ti + 2]) / 255;
          bumped[row + px] = H[row + px] + (lum - 0.5) * tDepth;
        }
      }
      H = bumped;
    }

    // Light unit vector pointing TOWARD the light source (Canvas Y points DOWN, so -sin(rad)!)
    // At angle=120°: lx = -0.5 (left), ly = -0.866 (up), lz = sin(30°) = 0.5
    const cosAlt = Math.cos(altitude);
    const lx = Math.cos(rad) * cosAlt;
    const ly = -Math.sin(rad) * cosAlt;
    const lz = Math.sin(altitude);

    const depthScale = Math.max(0.15, Math.min(14, ((bev.depth ?? 100) / 100) * 2.4)) * dirSign;
    const glossLut = LayerStylesEngine.getContourLUT(bev.glossContour || 'linear');
    const glossAA = Boolean(bev.glossAntiAliased);
    const flatLit = sampleContour(glossLut, clamp01(lz), glossAA);

    const [hr, hg, hb] = hexToRgb(bev.highlightColor || '#ffffff');
    const [sr, sg, sb] = hexToRgb(bev.shadowColor || '#000000');

    const hiCanvas = document.createElement('canvas');
    hiCanvas.width = rw;
    hiCanvas.height = rh;
    const hiCtx = hiCanvas.getContext('2d');
    const hiImg = hiCtx.createImageData(rw, rh);
    const hd = hiImg.data;

    const shCanvas = document.createElement('canvas');
    shCanvas.width = rw;
    shCanvas.height = rh;
    const shCtx = shCanvas.getContext('2d');
    const shImg = shCtx.createImageData(rw, rh);
    const sd = shImg.data;

    for (let py = 0; py < rh; py++) {
      const yUp = py > 0 ? py - 1 : 0;
      const yDn = py < rh - 1 ? py + 1 : rh - 1;
      const row = py * rw;
      const rowUp = yUp * rw;
      const rowDn = yDn * rw;

      for (let px = 0; px < rw; px++) {
        const p = row + px;
        const ma = maskAlpha[p];
        if (ma <= 0.002) continue;

        const xLt = px > 0 ? px - 1 : 0;
        const xRt = px < rw - 1 ? px + 1 : rw - 1;

        // Sobel-like smooth 3x3 surface height gradient (dH/dx, dH/dy)
        const gx =
          ((H[rowUp + xRt] + 2 * H[row + xRt] + H[rowDn + xRt]) -
            (H[rowUp + xLt] + 2 * H[row + xLt] + H[rowDn + xLt])) *
          0.125 *
          depthScale;
        const gy =
          ((H[rowDn + xLt] + 2 * H[rowDn + px] + H[rowDn + xRt]) -
            (H[rowUp + xLt] + 2 * H[rowUp + px] + H[rowUp + xRt])) *
          0.125 *
          depthScale;

        // Skip perfectly flat interior pixels (zero bevel contribution)
        if (Math.abs(gx) < 0.001 && Math.abs(gy) < 0.001) continue;

        // Surface normal N = normalize(-gx, -gy, 1):
        // On a raised top-left edge, H increases going right (+gx) and down (+gy),
        // so normal points LEFT (-gx) and UP (-gy) -> aligns with light (lx<0, ly<0) -> BRIGHT HIGHLIGHT!
        const invLen = 1 / Math.sqrt(gx * gx + gy * gy + 1);
        const nx = -gx * invLen;
        const ny = -gy * invLen;
        const nz = invLen;

        const ndotl = clamp01(nx * lx + ny * ly + nz * lz);
        const lit = sampleContour(glossLut, ndotl, glossAA);
        const delta = lit - flatLit;

        const o = p * 4;
        if (delta > 0.005) {
          const strength = clamp01(delta / Math.max(0.15, 1 - flatLit)) * ma;
          hd[o] = hr;
          hd[o + 1] = hg;
          hd[o + 2] = hb;
          hd[o + 3] = clamp8(strength * 255);
        } else if (delta < -0.005) {
          const strength = clamp01(-delta / Math.max(0.15, flatLit)) * ma;
          sd[o] = sr;
          sd[o + 1] = sg;
          sd[o + 2] = sb;
          sd[o + 3] = clamp8(strength * 255);
        }
      }
    }

    hiCtx.putImageData(hiImg, 0, 0);
    shCtx.putImageData(shImg, 0, 0);
    return { hiCanvas, shCanvas };
  }

  static renderBevelInner3D(bev, applyClippedFn, srcAlpha, innerDist, region, gAngle, gAltitude) {
    const rw = region.w;
    const rh = region.h;
    const n = rw * rh;
    const size = Math.max(1, Math.min(250, bev.size ?? 5));
    const tech = bev.technique || 'smooth';
    const contourLut = bev.contourEnabled ? LayerStylesEngine.getContourLUT(bev.contour || 'linear') : null;
    const cRange = Math.max(0.05, (bev.contourRange ?? 50) / 100);
    const cAA = Boolean(bev.contourAntiAliased);

    let heightBuf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (srcAlpha[i] <= 0.002) continue;
      let t = clamp01(innerDist[i] / size);
      if (tech === 'smooth') {
        // Smooth rounded bevel shoulder
        t = Math.sin(t * Math.PI * 0.5);
      } else if (tech === 'chiselSoft') {
        t = Math.pow(t, 0.85);
      }
      // Chisel Hard uses exact linear Euclidean distance pyramid!
      if (contourLut) {
        t = sampleContour(contourLut, clamp01(t / (cRange * 2)), cAA);
      }
      heightBuf[i] = t * size;
    }

    // Apply Technique smoothness + Soften (0..16px) to the heightfield
    const techSoft = tech === 'chiselHard' ? 0 : tech === 'chiselSoft' ? Math.min(2.5, size * 0.14) : Math.min(6, size * 0.28);
    const totalSoft = (bev.soften ?? 0) * 0.65 + techSoft;
    if (totalSoft > 0.15) {
      heightBuf = blurFloatBuffer(heightBuf, rw, rh, totalSoft, 0);
    }

    const { hiCanvas, shCanvas } = LayerStylesEngine.shadeHeightfield3D(
      bev,
      heightBuf,
      srcAlpha,
      rw,
      rh,
      region.x,
      region.y,
      gAngle,
      gAltitude,
      false
    );

    applyClippedFn(bev.highlightMode || 'screen', clamp01(bev.highlightOpacity ?? 0.75), hiCanvas);
    applyClippedFn(bev.shadowMode || 'multiply', clamp01(bev.shadowOpacity ?? 0.75), shCanvas);
  }

  static renderBevelOuter3D(bev, destCtx, getAlphaInRegion, bbox, width, height, layerOpacity, gAngle, gAltitude) {
    const size = Math.max(1, Math.min(250, bev.size ?? 5));
    const soften = bev.soften ?? 0;
    const pad = Math.ceil(size + soften + 6);
    const region = LayerStylesEngine.expandRegion(bbox, pad, width, height);
    const rw = region.w;
    const rh = region.h;
    const n = rw * rh;
    const srcAlpha = getAlphaInRegion(region);
    const dOut = computeOuterEDT(srcAlpha, rw, rh);
    const tech = bev.technique || 'smooth';
    const contourLut = bev.contourEnabled ? LayerStylesEngine.getContourLUT(bev.contour || 'linear') : null;
    const cRange = Math.max(0.05, (bev.contourRange ?? 50) / 100);
    const cAA = Boolean(bev.contourAntiAliased);

    let heightBuf = new Float32Array(n);
    const maskAlpha = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a0 = srcAlpha[i];
      if (a0 >= 0.999) {
        heightBuf[i] = size;
        maskAlpha[i] = 0;
      } else {
        const d = dOut[i];
        if (d < size + 1.5) {
          let t = clamp01(1 - d / size);
          if (tech === 'smooth') t = t * t * (3 - 2 * t);
          if (contourLut) t = sampleContour(contourLut, clamp01(t / (cRange * 2)), cAA);
          heightBuf[i] = t * size;
          const outerFade = clamp01((size - d) / Math.max(1.5, size * 0.25));
          maskAlpha[i] = outerFade * (1 - a0);
        }
      }
    }

    const techSoft = tech === 'chiselHard' ? 0 : tech === 'chiselSoft' ? Math.min(2.5, size * 0.14) : Math.min(5, size * 0.25);
    const totalSoft = soften * 0.65 + techSoft;
    if (totalSoft > 0.15) {
      heightBuf = blurFloatBuffer(heightBuf, rw, rh, totalSoft, 0);
    }

    // Pillow Emboss reverses the outer ramp slope to create the classic recessed outer trench!
    const flipOuter = bev.style === 'pillowEmboss';
    const { hiCanvas, shCanvas } = LayerStylesEngine.shadeHeightfield3D(
      bev,
      heightBuf,
      maskAlpha,
      rw,
      rh,
      region.x,
      region.y,
      gAngle,
      gAltitude,
      flipOuter
    );

    LayerStylesEngine.compositeRegion(
      destCtx,
      hiCanvas,
      region.x,
      region.y,
      bev.highlightMode || 'screen',
      layerOpacity * clamp01(bev.highlightOpacity ?? 0.75)
    );
    LayerStylesEngine.compositeRegion(
      destCtx,
      shCanvas,
      region.x,
      region.y,
      bev.shadowMode || 'multiply',
      layerOpacity * clamp01(bev.shadowOpacity ?? 0.75)
    );
  }
}
