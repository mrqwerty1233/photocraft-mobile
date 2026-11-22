/* ============================================================================
 * ProStudio Mobile — Adobe Photoshop-Exact Layer Style (fx) Engine
 * Supports all 27 Photoshop Blend Modes, Blending Options (Fill Opacity, RGB
 * Channels, Knockout, Layer Mask Hides Effects, Blend If This/Underlying with
 * Split Feathered Handles), Global Light, 12 Contour Curves, 8 Patterns,
 * Multi-Stop Gradients (Linear, Radial, Angle, Reflected, Diamond, Shape Burst),
 * Bevel & Emboss (+ Contour & Texture), Stackable (+) Stroke / Inner Shadow /
 * Color Overlay / Gradient Overlay / Drop Shadow, Inner Glow, Satin,
 * Pattern Overlay, Outer Glow, and Live Style Presets.
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

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp8(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
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

  static buildGradientLUT(stops) {
    const lut = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      const [r, g, b, a] = LayerStylesEngine.sampleGradientStops(stops, i / 255);
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

  /**
   * Migrates & normalizes legacy single-object styles (e.g. styles.stroke, styles.dropShadow)
   * into the full Photoshop stackable schema while preserving all legacy fields.
   */
  static normalizeLayerStyles(rawStyles) {
    const def = LayerStylesEngine.createDefaultLayerStyles();
    if (!rawStyles) return def;

    const merged = structuredClone(def);
    merged.effectsVisible = rawStyles.effectsVisible !== false;
    merged.effectsExpanded = rawStyles.effectsExpanded !== false;

    // Blend Options (migrate legacy blendIfBlack / blendIfWhite)
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

    // Non-stackable singletons
    for (const singleKey of ['bevelEmboss', 'innerGlow', 'satin', 'patternOverlay', 'outerGlow']) {
      if (rawStyles[singleKey]) {
        merged[singleKey] = {
          ...LayerStylesEngine.createDefaultEffect(singleKey, false),
          ...structuredClone(rawStyles[singleKey])
        };
      }
    }

    // Stackable arrays (support both new plural arrays AND legacy singular keys!)
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

          // Migrate legacy gradientColor1/2 or color1/2
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
        s.dropShadows[0].size = 16;
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
        s.dropShadows[0].size = 18;
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
        s.dropShadows[0].distance = 12;
        s.dropShadows[0].size = 22;
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
        s.dropShadows[0].size = 14;
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
        s.outerGlow.size = 26;
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

  static createProceduralPattern(ctx, kind = 'stripes', scalePct = 100, angleDeg = 0) {
    const s = Math.max(6, Math.round(18 * Math.max(0.1, scalePct / 100)));
    const pCanvas = document.createElement('canvas');
    pCanvas.width = s;
    pCanvas.height = s;
    const pCtx = pCanvas.getContext('2d');

    if (kind === 'checker') {
      const h = s / 2;
      pCtx.fillStyle = 'rgba(255,255,255,0.55)';
      pCtx.fillRect(0, 0, h, h);
      pCtx.fillRect(h, h, h, h);
      pCtx.fillStyle = 'rgba(0,0,0,0.55)';
      pCtx.fillRect(h, 0, h, h);
      pCtx.fillRect(0, h, h, h);
    } else if (kind === 'dots') {
      pCtx.fillStyle = 'rgba(255,255,255,0.72)';
      pCtx.beginPath();
      pCtx.arc(s / 2, s / 2, Math.max(1.5, s * 0.27), 0, Math.PI * 2);
      pCtx.fill();
    } else if (kind === 'grid') {
      pCtx.strokeStyle = 'rgba(255,255,255,0.55)';
      pCtx.lineWidth = Math.max(1, s * 0.08);
      pCtx.strokeRect(0, 0, s, s);
    } else if (kind === 'brushedMetal') {
      const img = pCtx.createImageData(s, s);
      const d = img.data;
      for (let y = 0; y < s; y++) {
        const rowTone = 110 + hashFast(1, y, 7) * 90;
        for (let x = 0; x < s; x++) {
          const v = clamp8(rowTone + (hashFast(x, y, 13) - 0.5) * 35);
          const idx = (y * s + x) * 4;
          d[idx] = v;
          d[idx + 1] = v;
          d[idx + 2] = clamp8(v + 6);
          d[idx + 3] = 215;
        }
      }
      pCtx.putImageData(img, 0, 0);
    } else if (kind === 'wovenCanvas') {
      pCtx.fillStyle = '#8b8f99';
      pCtx.fillRect(0, 0, s, s);
      pCtx.fillStyle = 'rgba(255,255,255,0.35)';
      pCtx.fillRect(0, 0, s, Math.max(1, s * 0.35));
      pCtx.fillStyle = 'rgba(0,0,0,0.28)';
      pCtx.fillRect(0, 0, Math.max(1, s * 0.35), s);
      pCtx.fillStyle = 'rgba(255,255,255,0.25)';
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
          d[idx + 3] = 190;
        }
      }
      pCtx.putImageData(img, 0, 0);
    } else {
      // Diagonal stripes
      pCtx.strokeStyle = 'rgba(255,255,255,0.58)';
      pCtx.lineWidth = Math.max(2, s * 0.25);
      pCtx.beginPath();
      pCtx.moveTo(-s * 0.2, s * 1.2);
      pCtx.lineTo(s * 1.2, -s * 0.2);
      pCtx.stroke();
    }

    const pat = ctx.createPattern(pCanvas, 'repeat');
    if (pat && angleDeg && pat.setTransform && typeof DOMMatrix !== 'undefined') {
      const m = new DOMMatrix();
      m.rotateSelf(angleDeg);
      pat.setTransform(m);
    }
    return pat;
  }

  static fillGradientCanvas(ctx, width, height, opts, bbox = null) {
    const rawStops = Array.isArray(opts.gradientStops) && opts.gradientStops.length > 0
      ? opts.gradientStops
      : [
          { pos: 0, color: opts.color1 || '#1e4e82', opacity: 1 },
          { pos: 1, color: opts.color2 || '#f59e0b', opacity: 1 }
        ];
    const stops = opts.reverse
      ? rawStops.map((s) => ({ ...s, pos: 1 - s.pos })).sort((a, b) => a.pos - b.pos)
      : [...rawStops].sort((a, b) => a.pos - b.pos);

    const alignBox = opts.alignWithLayer !== false && bbox ? bbox : { x: 0, y: 0, w: width, h: height };
    const scale = Math.max(0.1, (opts.scale ?? 100) / 100);
    const cx = alignBox.x + alignBox.w * (0.5 + (opts.offsetX || 0) / 100);
    const cy = alignBox.y + alignBox.h * (0.5 + (opts.offsetY || 0) / 100);
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
      ctx.fillRect(0, 0, width, height);
    } else if (style === 'angle' && typeof ctx.createConicGradient === 'function') {
      const rad = (-(opts.angle ?? 90) * Math.PI) / 180;
      const grad = ctx.createConicGradient(rad, cx, cy);
      addStopsToGrad(grad, false);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (style === 'diamond' || style === 'angle') {
      // Mathematical Diamond (L1 rotated norm) or Angle fallback inside alignBox
      const lut = LayerStylesEngine.buildGradientLUT(stops);
      const rad = ((opts.angle ?? 90) * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const maxD = Math.max(1, (Math.max(spanW, spanH) / 2) * scale);
      const bx0 = Math.max(0, Math.floor(alignBox.x));
      const by0 = Math.max(0, Math.floor(alignBox.y));
      const bw = Math.min(width - bx0, Math.ceil(alignBox.w));
      const bh = Math.min(height - by0, Math.ceil(alignBox.h));
      if (bw > 0 && bh > 0) {
        const img = ctx.createImageData(bw, bh);
        const d = img.data;
        for (let py = 0; py < bh; py++) {
          const dy = by0 + py - cy;
          for (let px = 0; px < bw; px++) {
            const dx = bx0 + px - cx;
            let t;
            if (style === 'diamond') {
              const rx = Math.abs(dx * cosA + dy * sinA);
              const ry = Math.abs(-dx * sinA + dy * cosA);
              t = clamp01((rx + ry) / maxD);
            } else {
              let ang = Math.atan2(dy, dx) + rad;
              t = ((ang / (Math.PI * 2)) % 1 + 1) % 1;
            }
            const li = clamp8(Math.round(t * 255)) * 4;
            const o = (py * bw + px) * 4;
            d[o] = lut[li];
            d[o + 1] = lut[li + 1];
            d[o + 2] = lut[li + 2];
            d[o + 3] = lut[li + 3];
          }
        }
        ctx.putImageData(img, bx0, by0);
      }
    } else {
      // Linear or Reflected
      const rad = ((opts.angle ?? 90) * Math.PI) / 180;
      const halfLen = (Math.hypot(spanW, spanH) / 2) * scale;
      const dx = Math.cos(rad) * halfLen;
      const dy = -Math.sin(rad) * halfLen;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      addStopsToGrad(grad, style === 'reflected');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle Dither anti-banding pass when checked
    if (opts.dither) {
      const bx0 = Math.max(0, Math.floor(alignBox.x));
      const by0 = Math.max(0, Math.floor(alignBox.y));
      const bw = Math.min(width - bx0, Math.ceil(alignBox.w));
      const bh = Math.min(height - by0, Math.ceil(alignBox.h));
      if (bw > 0 && bh > 0) {
        const img = ctx.getImageData(bx0, by0, bw, bh);
        const d = img.data;
        for (let py = 0; py < bh; py++) {
          for (let px = 0; px < bw; px++) {
            const o = (py * bw + px) * 4;
            if (d[o + 3] === 0) continue;
            const n = (hashFast(px, py, 37) - 0.5) * 4;
            d[o] = clamp8(d[o] + n);
            d[o + 1] = clamp8(d[o + 1] + n);
            d[o + 2] = clamp8(d[o + 2] + n);
          }
        }
        ctx.putImageData(img, bx0, by0);
      }
    }
  }

  /* ==========================================================================
   * FULL 27-MODE PHOTOSHOP COMPOSITOR HELPER
   * ========================================================================== */

  static compositeCanvas(destCtx, srcCanvas, blendMode = 'source-over', alpha = 1, region = null) {
    if (alpha <= 0) return;
    if (NATIVE_CANVAS_MODES.has(blendMode)) {
      destCtx.save();
      destCtx.globalCompositeOperation = blendMode;
      destCtx.globalAlpha = clamp01(alpha);
      destCtx.drawImage(srcCanvas, 0, 0);
      destCtx.restore();
      return;
    }

    const w = destCtx.canvas.width;
    const h = destCtx.canvas.height;
    const rx = region ? Math.max(0, region.x | 0) : 0;
    const ry = region ? Math.max(0, region.y | 0) : 0;
    const rw = region ? Math.min(w - rx, Math.ceil(region.w)) : w;
    const rh = region ? Math.min(h - ry, Math.ceil(region.h)) : h;
    if (rw <= 0 || rh <= 0) return;

    const dstImg = destCtx.getImageData(rx, ry, rw, rh);
    const srcImg = srcCanvas.getContext('2d').getImageData(rx, ry, rw, rh);
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
          if (hashFast(rx + px, ry + py, 53) > sa0) continue;
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
    destCtx.putImageData(dstImg, rx, ry);
  }

  /* ==========================================================================
   * TIGHT ALPHA BOUNDING BOX HELPER (Keeps Pixel FX Fast!)
   * ========================================================================== */

  static computeAlphaBounds(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    // Fast stride-2 scan with 1px expansion keeps bounds calculation < 1.5ms even at 1080p!
    const step = w * h > 500000 ? 2 : 1;
    for (let y = 0; y < h; y += step) {
      const row = y * w;
      for (let x = 0; x < w; x += step) {
        if (data[(row + x) * 4 + 3] > 2) {
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
   * Shape an effect alpha canvas in-place using Photoshop's exact Spread/Choke,
   * Contour Curve LUT, Range, Noise, Solid vs Gradient coloring, and Jitter.
   */
  static shapeEffectAlphaCanvas(canvas, region, opts) {
    const ctx = canvas.getContext('2d');
    const { x, y, w, h } = region;
    if (w <= 0 || h <= 0) return;

    const img = ctx.getImageData(x, y, w, h);
    const d = img.data;
    const spread = clamp01((opts.spread ?? 0) / 100);
    const range = Math.max(0.05, (opts.range ?? 50) / 100);
    const noise = clamp01((opts.noise ?? 0) / 100);
    const jitter = clamp01((opts.jitter ?? 0) / 100);
    const contourLut = LayerStylesEngine.getContourLUT(opts.contour || 'linear');
    const isGradient = opts.colorType === 'gradient' && Array.isArray(opts.gradientStops);
    const gradLut = isGradient ? LayerStylesEngine.buildGradientLUT(opts.gradientStops) : null;
    const [sr, sg, sb] = hexToRgb(opts.color || '#ffffbe');
    const seed = opts.seed || 31;

    // Spread/Choke compresses the upper ramp so edges harden like Photoshop Spread/Choke
    const rampDiv = Math.max(0.04, (1 - spread * 0.92) * (range * 2));

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        const aRaw = d[i + 3] / 255;
        if (aRaw <= 0.002) continue;

        let t = clamp01(aRaw / rampDiv);
        // Apply Contour LUT
        t = contourLut[clamp8(Math.round(t * 255))];

        // Apply Noise (Photoshop multiplicative alpha grain)
        if (noise > 0) {
          const n = hashFast(x + px, y + py, seed);
          t = clamp01(t * (1 - noise + n * noise * 1.4));
        }

        if (isGradient && gradLut) {
          let gt = 1 - t; // 0 = inner/dense edge, 1 = outer transparent edge
          if (jitter > 0) {
            gt = clamp01(gt + (hashFast(x + px, y + py, seed + 19) - 0.5) * jitter * 0.85);
          }
          const gi = clamp8(Math.round(gt * 255)) * 4;
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
    ctx.putImageData(img, x, y);
  }

  /**
   * Builds a solid-tinted silhouette copy of srcCanvas.
   */
  static makeSilhouette(srcCanvas, colorHex, width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = colorHex || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    return c;
  }

  /**
   * Builds an inverted silhouette (opaque everywhere EXCEPT srcCanvas alpha).
   */
  static makeInvertedSilhouette(srcCanvas, colorHex, width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = colorHex || '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(srcCanvas, 0, 0);
    return c;
  }

  /* ==========================================================================
   * MAIN PHOTOSHOP LAYER STYLE RENDERER
   * ========================================================================== */

  static renderLayerWithEffects(layer, destCtx, srcCanvas, width, height, globalLight = null) {
    const fx = LayerStylesEngine.normalizeLayerStyles(layer.styles);
    const bo = fx.blendOptions;
    const gAngle = globalLight?.angle ?? 120;
    const gAltitude = globalLight?.altitude ?? 30;
    const layerOpacity = clamp01(layer.opacity ?? 1);
    const fillOpacity = clamp01(layer.fill ?? 1);

    const bbox = LayerStylesEngine.computeAlphaBounds(srcCanvas);
    if (!bbox) return;

    // ------------------------------------------------------------------------
    // 0. BLENDING OPTIONS: RGB Channel Restrict + Blend If (This & Underlying)
    // ------------------------------------------------------------------------
    let processedSrc = srcCanvas;
    const needsBlendOpt = LayerStylesEngine.hasActiveBlendOptions(fx);
    if (needsBlendOpt) {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const cCtx = c.getContext('2d');
      cCtx.drawImage(srcCanvas, 0, 0);

      const srcImg = cCtx.getImageData(bbox.x, bbox.y, bbox.w, bbox.h);
      const sd = srcImg.data;
      const needUnder =
        (bo.underBlackMin ?? 0) > 0 ||
        (bo.underBlackMax ?? 0) > 0 ||
        (bo.underWhiteMin ?? 255) < 255 ||
        (bo.underWhiteMax ?? 255) < 255;
      const underData = needUnder ? destCtx.getImageData(bbox.x, bbox.y, bbox.w, bbox.h).data : null;

      const rOn = bo.channels?.r !== false;
      const gOn = bo.channels?.g !== false;
      const bOn = bo.channels?.b !== false;
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

      for (let i = 0; i < sd.length; i += 4) {
        if (sd[i + 3] === 0) continue;
        let f = rampFactor(sampleVal(sd, i), tBMin, tBMax, tWMin, tWMax);
        if (f > 0 && underData && underData[i + 3] > 0) {
          f *= rampFactor(sampleVal(underData, i), uBMin, uBMax, uWMin, uWMax);
        }
        sd[i + 3] = clamp8(sd[i + 3] * f);
        if (!rOn) sd[i] = 0;
        if (!gOn) sd[i + 1] = 0;
        if (!bOn) sd[i + 2] = 0;
      }
      cCtx.putImageData(srcImg, bbox.x, bbox.y);
      processedSrc = c;
    }

    // Knockout Shallow/Deep cuts out underlying layers with layer silhouette
    if (bo.knockout && bo.knockout !== 'none' && fillOpacity < 1) {
      destCtx.save();
      destCtx.globalCompositeOperation = 'destination-out';
      destCtx.globalAlpha = 1 - fillOpacity;
      destCtx.drawImage(processedSrc, 0, 0);
      destCtx.restore();
    }

    const effectsOn = fx.effectsVisible !== false;

    // ------------------------------------------------------------------------
    // 1. DROP SHADOWS (Stackable, behind layer — bottom-to-top order!)
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
        const size = Math.max(0, ds.size ?? 5);

        const shCanvas = document.createElement('canvas');
        shCanvas.width = width;
        shCanvas.height = height;
        const sCtx = shCanvas.getContext('2d');

        const sil = LayerStylesEngine.makeSilhouette(processedSrc, ds.color || '#000000', width, height);
        if (size > 0) sCtx.filter = `blur(${Math.max(0.5, size * 0.5)}px)`;
        sCtx.drawImage(sil, ox, oy);
        sCtx.filter = 'none';

        const region = LayerStylesEngine.expandRegion(
          { x: bbox.x + ox, y: bbox.y + oy, w: bbox.w, h: bbox.h },
          size * 1.5 + 8,
          width,
          height
        );

        if ((ds.spread ?? 0) > 0 || (ds.noise ?? 0) > 0 || (ds.contour && ds.contour !== 'linear')) {
          LayerStylesEngine.shapeEffectAlphaCanvas(shCanvas, region, {
            color: ds.color || '#000000',
            spread: ds.spread ?? 0,
            range: 50,
            contour: ds.contour || 'linear',
            noise: ds.noise ?? 0,
            seed: 41 + idx * 7
          });
        }

        // Photoshop "Layer Knocks Out Drop Shadow" cuts out interior pixels
        if (ds.layerKnocksOut !== false) {
          sCtx.globalCompositeOperation = 'destination-out';
          sCtx.drawImage(processedSrc, 0, 0);
        }

        LayerStylesEngine.compositeCanvas(
          destCtx,
          shCanvas,
          ds.blendMode || 'multiply',
          layerOpacity * clamp01(ds.opacity ?? 0.75),
          region
        );
      }
    }

    // ------------------------------------------------------------------------
    // 2. OUTER GLOW (Behind layer — Solid/Gradient, Softer/Precise, Spread, Contour, Range, Jitter, Noise)
    // ------------------------------------------------------------------------
    if (effectsOn && fx.outerGlow?.enabled) {
      const og = fx.outerGlow;
      const size = Math.max(0, og.size ?? 7);
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = width;
      glowCanvas.height = height;
      const gCtx = glowCanvas.getContext('2d');

      const sil = LayerStylesEngine.makeSilhouette(processedSrc, '#ffffff', width, height);
      if (og.technique === 'precise' && size > 0) {
        // Multi-ring sharp Euclidean halo for Precise technique
        const rings = Math.max(3, Math.min(10, Math.ceil(size / 3)));
        for (let r = rings; r >= 1; r--) {
          const rad = (size * r) / rings;
          const steps = Math.max(12, Math.min(28, Math.round(rad * 2.5)));
          gCtx.globalAlpha = 1 / rings;
          for (let a = 0; a < steps; a++) {
            const th = (a * Math.PI * 2) / steps;
            gCtx.drawImage(sil, Math.cos(th) * rad, Math.sin(th) * rad);
          }
        }
        gCtx.globalAlpha = 1;
      } else {
        if (size > 0) gCtx.filter = `blur(${Math.max(0.5, size * 0.55)}px)`;
        gCtx.drawImage(sil, 0, 0);
        gCtx.drawImage(sil, 0, 0);
        gCtx.filter = 'none';
      }

      // Remove inside silhouette so Outer Glow radiates cleanly around edges
      gCtx.globalCompositeOperation = 'destination-out';
      gCtx.drawImage(processedSrc, 0, 0);
      gCtx.globalCompositeOperation = 'source-over';

      const region = LayerStylesEngine.expandRegion(bbox, size * 1.8 + 8, width, height);
      LayerStylesEngine.shapeEffectAlphaCanvas(glowCanvas, region, {
        colorType: og.colorType || 'solid',
        color: og.color || '#ffffbe',
        gradientStops: og.gradientStops,
        spread: og.spread ?? 0,
        range: og.range ?? 50,
        contour: og.contour || 'linear',
        noise: og.noise ?? 0,
        jitter: og.jitter ?? 0,
        seed: 73
      });

      LayerStylesEngine.compositeCanvas(
        destCtx,
        glowCanvas,
        og.blendMode || 'screen',
        layerOpacity * clamp01(og.opacity ?? 0.35),
        region
      );
    }

    // ------------------------------------------------------------------------
    // 2b. OUTER BEVEL (when style is outerBevel / emboss / pillowEmboss)
    // ------------------------------------------------------------------------
    if (effectsOn && fx.bevelEmboss?.enabled) {
      const bev = fx.bevelEmboss;
      if (bev.style === 'outerBevel' || bev.style === 'emboss' || bev.style === 'pillowEmboss') {
        LayerStylesEngine.renderBevelOuter(bev, destCtx, processedSrc, bbox, width, height, layerOpacity, gAngle, gAltitude);
      }
    }

    // ------------------------------------------------------------------------
    // 3. INTERIOR COMPOSITE (Base Pixels * Fill Opacity + Clipped Overlays)
    // ------------------------------------------------------------------------
    const interior = document.createElement('canvas');
    interior.width = width;
    interior.height = height;
    const iCtx = interior.getContext('2d');

    iCtx.save();
    iCtx.globalAlpha = fillOpacity;
    iCtx.drawImage(processedSrc, 0, 0);
    iCtx.restore();

    const applyClippedInterior = (blendMode, opacity, drawFillFn) => {
      const ov = document.createElement('canvas');
      ov.width = width;
      ov.height = height;
      const oCtx = ov.getContext('2d');
      drawFillFn(oCtx);
      oCtx.globalCompositeOperation = 'destination-in';
      oCtx.drawImage(processedSrc, 0, 0);
      LayerStylesEngine.compositeCanvas(iCtx, ov, blendMode || 'source-over', clamp01(opacity ?? 1), bbox);
    };

    if (effectsOn) {
      // 3a. PATTERN OVERLAY
      if (fx.patternOverlay?.enabled) {
        const po = fx.patternOverlay;
        applyClippedInterior(po.blendMode || 'source-over', po.opacity ?? 1, (oCtx) => {
          const pat = LayerStylesEngine.createProceduralPattern(
            oCtx,
            po.pattern || 'stripes',
            po.scale ?? 100,
            po.angle ?? 0
          );
          oCtx.save();
          if (po.offsetX || po.offsetY) oCtx.translate(po.offsetX || 0, po.offsetY || 0);
          oCtx.fillStyle = pat;
          oCtx.fillRect(-(po.offsetX || 0), -(po.offsetY || 0), width, height);
          oCtx.restore();
        });
      }

      // 3b. GRADIENT OVERLAYS (Stackable, bottom-to-top)
      if (Array.isArray(fx.gradientOverlays)) {
        for (let idx = fx.gradientOverlays.length - 1; idx >= 0; idx--) {
          const go = fx.gradientOverlays[idx];
          if (!go?.enabled) continue;
          applyClippedInterior(go.blendMode || 'source-over', go.opacity ?? 1, (oCtx) => {
            LayerStylesEngine.fillGradientCanvas(
              oCtx,
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
            oCtx.fillRect(0, 0, width, height);
          });
        }
      }

      // 3d. SATIN (Dual offset self-interference + Contour + Invert)
      if (fx.satin?.enabled) {
        const sat = fx.satin;
        const rad = ((sat.angle ?? 19) * Math.PI) / 180;
        const dist = sat.distance ?? 11;
        const dx = Math.cos(rad) * dist;
        const dy = -Math.sin(rad) * dist;
        applyClippedInterior(sat.blendMode || 'multiply', sat.opacity ?? 0.5, (oCtx) => {
          const s1 = document.createElement('canvas');
          s1.width = width;
          s1.height = height;
          const c1 = s1.getContext('2d');
          c1.filter = `blur(${Math.max(0.5, (sat.size ?? 14) * 0.45)}px)`;
          c1.drawImage(processedSrc, dx, dy);
          c1.globalCompositeOperation = 'xor';
          c1.drawImage(processedSrc, -dx, -dy);
          c1.filter = 'none';

          if (sat.invert !== false) {
            oCtx.fillStyle = sat.color || '#000000';
            oCtx.fillRect(0, 0, width, height);
            oCtx.globalCompositeOperation = 'destination-out';
            oCtx.drawImage(s1, 0, 0);
            oCtx.globalCompositeOperation = 'source-over';
          } else {
            oCtx.drawImage(s1, 0, 0);
          }

          LayerStylesEngine.shapeEffectAlphaCanvas(oCtx.canvas, bbox, {
            color: sat.color || '#000000',
            contour: sat.contour || 'linear',
            range: 50,
            spread: 0,
            noise: 0,
            seed: 59
          });
        });
      }

      // 3e. INNER GLOW (Edge or Center, Softer/Precise, Choke, Size, Contour, Range, Jitter, Noise, Solid/Gradient)
      if (fx.innerGlow?.enabled) {
        const ig = fx.innerGlow;
        const size = Math.max(0, ig.size ?? 5);
        applyClippedInterior(ig.blendMode || 'screen', ig.opacity ?? 0.75, (oCtx) => {
          if (ig.source === 'center') {
            const sil = LayerStylesEngine.makeSilhouette(processedSrc, '#ffffff', width, height);
            if (size > 0) oCtx.filter = `blur(${Math.max(0.5, size * 0.6)}px)`;
            oCtx.drawImage(sil, 0, 0);
            oCtx.filter = 'none';
            // Invert interior falloff so center is strongest and edge fades out
            const inv = LayerStylesEngine.makeInvertedSilhouette(processedSrc, '#ffffff', width, height);
            oCtx.globalCompositeOperation = 'destination-out';
            oCtx.filter = `blur(${Math.max(0.5, size * 0.55)}px)`;
            oCtx.drawImage(inv, 0, 0);
            oCtx.filter = 'none';
            oCtx.globalCompositeOperation = 'source-over';
          } else {
            const inv = LayerStylesEngine.makeInvertedSilhouette(processedSrc, '#ffffff', width, height);
            if (ig.technique === 'precise' && size > 0) {
              const rings = Math.max(3, Math.min(8, Math.ceil(size / 3)));
              for (let r = rings; r >= 1; r--) {
                const rad = (size * r) / rings;
                const steps = Math.max(10, Math.min(20, Math.round(rad * 2)));
                oCtx.globalAlpha = 1 / rings;
                for (let a = 0; a < steps; a++) {
                  const th = (a * Math.PI * 2) / steps;
                  oCtx.drawImage(inv, Math.cos(th) * rad, Math.sin(th) * rad);
                }
              }
              oCtx.globalAlpha = 1;
            } else {
              if (size > 0) oCtx.filter = `blur(${Math.max(0.5, size * 0.55)}px)`;
              oCtx.drawImage(inv, 0, 0);
              oCtx.drawImage(inv, 0, 0);
              oCtx.filter = 'none';
            }
          }

          LayerStylesEngine.shapeEffectAlphaCanvas(oCtx.canvas, bbox, {
            colorType: ig.colorType || 'solid',
            color: ig.color || '#ffffbe',
            gradientStops: ig.gradientStops,
            spread: ig.choke ?? 0,
            range: ig.range ?? 50,
            contour: ig.contour || 'linear',
            noise: ig.noise ?? 0,
            jitter: ig.jitter ?? 0,
            seed: 83
          });
        });
      }

      // 3f. INNER SHADOWS (Stackable, bottom-to-top — Angle/Global Light, Distance, Choke, Size, Contour, Noise)
      if (Array.isArray(fx.innerShadows)) {
        for (let idx = fx.innerShadows.length - 1; idx >= 0; idx--) {
          const is = fx.innerShadows[idx];
          if (!is?.enabled) continue;
          const angle = is.useGlobalLight !== false ? gAngle : (is.angle ?? 120);
          const rad = (angle * Math.PI) / 180;
          const dist = is.distance ?? 5;
          const ox = Math.round(-Math.cos(rad) * dist);
          const oy = Math.round(Math.sin(rad) * dist);
          const size = Math.max(0, is.size ?? 5);

          applyClippedInterior(is.blendMode || 'multiply', is.opacity ?? 0.75, (oCtx) => {
            const inv = LayerStylesEngine.makeInvertedSilhouette(processedSrc, '#ffffff', width, height);
            if (size > 0) oCtx.filter = `blur(${Math.max(0.5, size * 0.5)}px)`;
            oCtx.drawImage(inv, ox, oy);
            oCtx.filter = 'none';

            LayerStylesEngine.shapeEffectAlphaCanvas(oCtx.canvas, bbox, {
              color: is.color || '#000000',
              spread: is.choke ?? 0,
              range: 50,
              contour: is.contour || 'linear',
              noise: is.noise ?? 0,
              seed: 101 + idx * 11
            });
          });
        }
      }

      // 3g. BEVEL & EMBOSS (Inner Bevel / Emboss / Pillow Emboss + Gloss Contour + Contour + Texture)
      if (fx.bevelEmboss?.enabled && fx.bevelEmboss.style !== 'outerBevel' && fx.bevelEmboss.style !== 'strokeEmboss') {
        LayerStylesEngine.renderBevelInner(
          fx.bevelEmboss,
          applyClippedInterior,
          processedSrc,
          bbox,
          width,
          height,
          gAngle,
          gAltitude
        );
      }
    }

    // Draw composed interior onto destination canvas
    LayerStylesEngine.compositeCanvas(
      destCtx,
      interior,
      layer.blendMode || 'source-over',
      layerOpacity,
      bbox
    );

    // ------------------------------------------------------------------------
    // 4. STROKES (Stackable, bottom-to-top — Outside/Inside/Center, Color/Gradient/Pattern, Overprint)
    // ------------------------------------------------------------------------
    if (effectsOn && Array.isArray(fx.strokes)) {
      for (let idx = fx.strokes.length - 1; idx >= 0; idx--) {
        const st = fx.strokes[idx];
        if (!st?.enabled || (st.size ?? 0) <= 0) continue;
        const stSize = Math.min(80, Math.max(1, st.size));
        const pos = st.position || 'outside';

        const strokeMask = document.createElement('canvas');
        strokeMask.width = width;
        strokeMask.height = height;
        const dCtx = strokeMask.getContext('2d');

        const radius = pos === 'center' ? Math.max(1, stSize / 2) : stSize;
        const steps = Math.max(14, Math.min(36, Math.round(radius * 2.8)));

        if (pos === 'inside') {
          const inv = LayerStylesEngine.makeInvertedSilhouette(processedSrc, '#ffffff', width, height);
          for (let a = 0; a < steps; a++) {
            const th = (a * Math.PI * 2) / steps;
            dCtx.drawImage(inv, Math.cos(th) * radius, Math.sin(th) * radius);
          }
          dCtx.globalCompositeOperation = 'destination-in';
          dCtx.drawImage(processedSrc, 0, 0);
        } else {
          for (let a = 0; a < steps; a++) {
            const th = (a * Math.PI * 2) / steps;
            dCtx.drawImage(processedSrc, Math.cos(th) * radius, Math.sin(th) * radius);
          }
          if (pos === 'outside') {
            dCtx.globalCompositeOperation = 'destination-out';
            dCtx.drawImage(processedSrc, 0, 0);
          }
        }

        const stRegion = LayerStylesEngine.expandRegion(bbox, stSize + 4, width, height);

        // Fill stroke with Color, Gradient, or Pattern
        dCtx.globalCompositeOperation = 'source-in';
        if (st.fillType === 'gradient') {
          if (st.gradientStyle === 'shapeBurst') {
            // Shape Burst gradient: blur stroke mask then map alpha through gradient LUT
            const sb = document.createElement('canvas');
            sb.width = width;
            sb.height = height;
            const sbCtx = sb.getContext('2d');
            sbCtx.filter = `blur(${Math.max(1, stSize * 0.45)}px)`;
            sbCtx.drawImage(processedSrc, 0, 0);
            sbCtx.filter = 'none';
            LayerStylesEngine.shapeEffectAlphaCanvas(sb, stRegion, {
              colorType: 'gradient',
              gradientStops: st.gradientStops,
              spread: 0,
              range: 50,
              contour: 'linear',
              noise: 0
            });
            dCtx.drawImage(sb, 0, 0);
          } else {
            LayerStylesEngine.fillGradientCanvas(
              dCtx,
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
          }
        } else if (st.fillType === 'pattern') {
          const pat = LayerStylesEngine.createProceduralPattern(
            dCtx,
            st.pattern || 'stripes',
            st.patternScale ?? 100,
            st.patternAngle ?? 0
          );
          dCtx.fillStyle = pat;
          dCtx.fillRect(0, 0, width, height);
        } else {
          dCtx.fillStyle = st.color || '#ffffff';
          dCtx.fillRect(0, 0, width, height);
        }

        // Stroke Emboss when Bevel & Emboss style === 'strokeEmboss'
        if (idx === 0 && fx.bevelEmboss?.enabled && fx.bevelEmboss.style === 'strokeEmboss') {
          const applyOnStroke = (bm, op, drawFn) => {
            const ov = document.createElement('canvas');
            ov.width = width;
            ov.height = height;
            const oCtx = ov.getContext('2d');
            drawFn(oCtx);
            oCtx.globalCompositeOperation = 'destination-in';
            oCtx.drawImage(strokeMask, 0, 0);
            LayerStylesEngine.compositeCanvas(dCtx, ov, bm, op, stRegion);
          };
          LayerStylesEngine.renderBevelInner(
            fx.bevelEmboss,
            applyOnStroke,
            strokeMask,
            stRegion,
            width,
            height,
            gAngle,
            gAltitude
          );
        }

        const effectiveMode = st.overprint ? 'multiply' : (st.blendMode || 'source-over');
        LayerStylesEngine.compositeCanvas(
          destCtx,
          strokeMask,
          effectiveMode,
          layerOpacity * clamp01(st.opacity ?? 1),
          stRegion
        );
      }
    }
  }

  static renderBevelInner(bev, applyClippedFn, srcCanvas, bbox, width, height, gAngle, gAltitude) {
    const sign = bev.direction === 'down' ? -1 : 1;
    const angle = bev.useGlobalLight !== false ? gAngle : (bev.angle ?? 120);
    const altitude = bev.useGlobalLight !== false ? gAltitude : (bev.altitude ?? 30);
    const rad = (angle * Math.PI) / 180;
    const altScale = Math.cos((altitude * Math.PI) / 180);
    const depthMul = Math.max(0.1, Math.min(4, (bev.depth ?? 100) / 100));
    const techSoft = bev.technique === 'chiselHard' ? 0 : bev.technique === 'chiselSoft' ? 0.35 : 0.6;
    const sz = Math.max(1, (bev.size ?? 5) * (0.4 + 0.35 * altScale));
    const soften = Math.max(0, (bev.soften ?? 0) + sz * techSoft * 0.25);
    const dx = Math.cos(rad) * sz * sign;
    const dy = -Math.sin(rad) * sz * sign;
    const glossContour = bev.glossContour || 'linear';

    // Optional Texture bump modulation
    if (bev.textureEnabled) {
      const texDepth = clamp01(Math.abs(bev.textureDepth ?? 100) / 200);
      applyClippedFn(bev.textureInvert ? 'screen' : 'overlay', texDepth * 0.65, (oCtx) => {
        const pat = LayerStylesEngine.createProceduralPattern(
          oCtx,
          bev.texturePattern || 'wovenCanvas',
          bev.textureScale ?? 100,
          0
        );
        oCtx.fillStyle = pat;
        oCtx.fillRect(0, 0, width, height);
      });
    }

    // Highlight edge
    applyClippedFn(bev.highlightMode || 'screen', clamp01((bev.highlightOpacity ?? 0.75) * Math.min(1.25, depthMul)), (oCtx) => {
      const inv = LayerStylesEngine.makeInvertedSilhouette(srcCanvas, '#ffffff', width, height);
      if (soften > 0) oCtx.filter = `blur(${soften}px)`;
      oCtx.drawImage(inv, dx, dy);
      oCtx.filter = 'none';
      LayerStylesEngine.shapeEffectAlphaCanvas(oCtx.canvas, bbox, {
        color: bev.highlightColor || '#ffffff',
        contour: bev.contourEnabled ? (bev.contour || glossContour) : glossContour,
        range: bev.contourEnabled ? (bev.contourRange ?? 50) : 50,
        spread: bev.technique === 'chiselHard' ? 45 : 0,
        noise: 0
      });
    });

    // Shadow edge
    applyClippedFn(bev.shadowMode || 'multiply', clamp01((bev.shadowOpacity ?? 0.75) * Math.min(1.25, depthMul)), (oCtx) => {
      const inv = LayerStylesEngine.makeInvertedSilhouette(srcCanvas, '#ffffff', width, height);
      if (soften > 0) oCtx.filter = `blur(${soften}px)`;
      oCtx.drawImage(inv, -dx, -dy);
      oCtx.filter = 'none';
      LayerStylesEngine.shapeEffectAlphaCanvas(oCtx.canvas, bbox, {
        color: bev.shadowColor || '#000000',
        contour: bev.contourEnabled ? (bev.contour || glossContour) : glossContour,
        range: bev.contourEnabled ? (bev.contourRange ?? 50) : 50,
        spread: bev.technique === 'chiselHard' ? 45 : 0,
        noise: 0
      });
    });
  }

  static renderBevelOuter(bev, destCtx, srcCanvas, bbox, width, height, layerOpacity, gAngle, gAltitude) {
    const sign = (bev.direction === 'down' ? -1 : 1) * (bev.style === 'pillowEmboss' ? -1 : 1);
    const angle = bev.useGlobalLight !== false ? gAngle : (bev.angle ?? 120);
    const rad = (angle * Math.PI) / 180;
    const sz = Math.max(1, (bev.size ?? 5) * 0.65);
    const soften = Math.max(0.5, (bev.soften ?? 0) + sz * 0.25);
    const dx = Math.cos(rad) * sz * sign;
    const dy = -Math.sin(rad) * sz * sign;
    const region = LayerStylesEngine.expandRegion(bbox, sz + soften + 6, width, height);

    const drawHalo = (ox, oy, color, mode, opacity) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      const sil = LayerStylesEngine.makeSilhouette(srcCanvas, color, width, height);
      ctx.filter = `blur(${soften}px)`;
      ctx.drawImage(sil, ox, oy);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(srcCanvas, 0, 0);
      LayerStylesEngine.compositeCanvas(destCtx, c, mode, layerOpacity * clamp01(opacity), region);
    };

    drawHalo(-dx, -dy, bev.highlightColor || '#ffffff', bev.highlightMode || 'screen', bev.highlightOpacity ?? 0.75);
    drawHalo(dx, dy, bev.shadowColor || '#000000', bev.shadowMode || 'multiply', bev.shadowOpacity ?? 0.75);
  }
}
