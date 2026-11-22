/* ============================================================================
 * ProStudio Mobile — Built-in Multi-Layer Sample PSD Documents
 * ============================================================================ */

import { StudioDoc } from './studio-engine.js';

export class SampleProjects {
  static createOceanWaveProject() {
    const W = 900;
    const H = 1120;
    const doc = new StudioDoc(W, H, 'Ocean-Wave-Poster.psd');

    // Layer 1: Sky & Mountain Backdrop
    const skyLayer = doc.createLayerObject({ name: 'Sky & Mountain Backdrop', kind: 'raster' });
    const sCtx = skyLayer.canvas.getContext('2d');
    const skyGrad = sCtx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#e8d7b9');
    skyGrad.addColorStop(0.45, '#f2e5cc');
    skyGrad.addColorStop(0.75, '#c9b79c');
    skyGrad.addColorStop(1, '#183456');
    sCtx.fillStyle = skyGrad;
    sCtx.fillRect(0, 0, W, H);

    const sunGrad = sCtx.createRadialGradient(W * 0.68, H * 0.48, 20, W * 0.68, H * 0.48, 340);
    sunGrad.addColorStop(0, 'rgba(255, 224, 178, 0.72)');
    sunGrad.addColorStop(1, 'rgba(255, 224, 178, 0)');
    sCtx.fillStyle = sunGrad;
    sCtx.fillRect(0, 0, W, H);

    sCtx.save();
    sCtx.beginPath();
    sCtx.moveTo(W * 0.36, H * 0.68);
    sCtx.quadraticCurveTo(W * 0.58, H * 0.61, W * 0.64, H * 0.48);
    sCtx.lineTo(W * 0.71, H * 0.48);
    sCtx.quadraticCurveTo(W * 0.78, H * 0.61, W * 0.96, H * 0.68);
    sCtx.closePath();
    const peakGrad = sCtx.createLinearGradient(0, H * 0.48, 0, H * 0.68);
    peakGrad.addColorStop(0, '#f8f9fa');
    peakGrad.addColorStop(0.28, '#dce5ef');
    peakGrad.addColorStop(0.35, '#2b4c73');
    peakGrad.addColorStop(1, '#162b47');
    sCtx.fillStyle = peakGrad;
    sCtx.fill();
    sCtx.restore();
    doc.layers.push(skyLayer);

    // Layer 2: Ocean Wave Foreground
    const waveLayer = doc.createLayerObject({ name: 'Cobalt Ocean Wave', kind: 'raster' });
    const wCtx = waveLayer.canvas.getContext('2d');

    wCtx.save();
    wCtx.beginPath();
    wCtx.moveTo(0, H * 0.42);
    wCtx.bezierCurveTo(W * 0.18, H * 0.22, W * 0.52, H * 0.16, W * 0.64, H * 0.34);
    wCtx.bezierCurveTo(W * 0.45, H * 0.36, W * 0.36, H * 0.54, W * 0.56, H * 0.64);
    wCtx.bezierCurveTo(W * 0.74, H * 0.72, W * 0.88, H * 0.58, W, H * 0.63);
    wCtx.lineTo(W, H);
    wCtx.lineTo(0, H);
    wCtx.closePath();

    const waveGrad = wCtx.createLinearGradient(0, H * 0.2, W * 0.8, H);
    waveGrad.addColorStop(0, '#1e4e82');
    waveGrad.addColorStop(0.45, '#12345b');
    waveGrad.addColorStop(1, '#091c34');
    wCtx.fillStyle = waveGrad;
    wCtx.fill();

    wCtx.strokeStyle = '#3b73a8';
    wCtx.lineWidth = 5;
    for (let r = 0; r < 7; r++) {
      wCtx.beginPath();
      wCtx.moveTo(0, H * (0.52 + r * 0.06));
      wCtx.bezierCurveTo(
        W * 0.28,
        H * (0.38 + r * 0.05),
        W * 0.52,
        H * (0.72 + r * 0.04),
        W,
        H * (0.64 + r * 0.05)
      );
      wCtx.stroke();
    }

    wCtx.fillStyle = '#f6f2e8';
    const foamCircles = [
      [W * 0.52, H * 0.25, 42],
      [W * 0.58, H * 0.28, 34],
      [W * 0.63, H * 0.33, 28],
      [W * 0.44, H * 0.23, 46],
      [W * 0.36, H * 0.25, 38],
      [W * 0.28, H * 0.29, 34],
      [W * 0.21, H * 0.34, 30]
    ];
    for (const [fx, fy, fr] of foamCircles) {
      wCtx.beginPath();
      wCtx.arc(fx, fy, fr, 0, Math.PI * 2);
      wCtx.fill();
    }
    for (let i = 0; i < 48; i++) {
      const sx = W * 0.25 + ((i * 73) % (W * 0.55));
      const sy = H * 0.16 + ((i * 59) % (H * 0.28));
      const sr = 2.5 + (i % 5) * 1.5;
      wCtx.beginPath();
      wCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      wCtx.fill();
    }
    wCtx.restore();
    doc.layers.push(waveLayer);

    // Layer 3: Title Card Shape Layer with Drop Shadow
    const cardLayer = doc.createLayerObject({
      name: 'Title Badge Card',
      kind: 'shape',
      opacity: 0.92,
      shapeData: {
        shapeType: 'rect',
        x: 70,
        y: 770,
        w: 760,
        h: 245,
        fill: '#142030',
        stroke: '#4e79a8',
        strokeWidth: 2,
        cornerRadius: 20
      },
      styles: {
        dropShadow: { enabled: true, color: '#000000', opacity: 0.72, angle: 120, distance: 14, size: 24 }
      }
    });
    doc.layers.push(cardLayer);

    // Layer 4: Live Editable Type Layer
    const titleLayer = doc.createLayerObject({
      name: 'PACIFIC SWELL',
      kind: 'text',
      textData: {
        text: 'PACIFIC SWELL\nLayered Mobile Studio Edition',
        fontFamily: 'Inter, sans-serif',
        fontSize: 44,
        fontWeight: '700',
        color: '#f5efe2',
        align: 'center',
        lineHeight: 1.38,
        strokeWidth: 0,
        strokeColor: '#000000',
        x: W / 2,
        y: 892
      },
      styles: {
        dropShadow: { enabled: true, color: '#000000', opacity: 0.65, angle: 125, distance: 6, size: 10 }
      }
    });
    doc.layers.push(titleLayer);

    // Layer 5: Vibrance Adjustment Layer
    const vibLayer = doc.createLayerObject({
      name: 'Vibrance +24',
      kind: 'adjustment',
      adjustment: {
        type: 'vibrance',
        params: { vibrance: 24, saturation: 8 }
      }
    });
    doc.layers.push(vibLayer);

    // Layer 6: Curves Adjustment Layer
    const curvesLayer = doc.createLayerObject({
      name: 'Curves (Contrast S-Curve)',
      kind: 'adjustment',
      adjustment: {
        type: 'curves',
        params: {
          rgb: [[0, 0], [64, 52], [192, 208], [255, 255]],
          r: [[0, 0], [255, 255]],
          g: [[0, 0], [255, 255]],
          b: [[0, 0], [255, 255]]
        }
      }
    });
    doc.layers.push(curvesLayer);

    doc.activeLayerId = waveLayer.id;
    doc.compose();
    doc.pushHistory('Open Ocean-Wave-Poster.psd');
    return doc;
  }

  static createDeepSpaceProject() {
    const W = 900;
    const H = 1120;
    const doc = new StudioDoc(W, H, 'Deep-Space-Horizon.psd');

    const space = doc.createLayerObject({ name: 'Deep Space Starfield', kind: 'raster' });
    const sCtx = space.canvas.getContext('2d');
    sCtx.fillStyle = '#05070d';
    sCtx.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) {
      const x = (i * 197) % W;
      const y = (i * 131) % (H * 0.75);
      const r = (i % 3) * 0.7 + 0.6;
      sCtx.fillStyle = `rgba(255,255,255,${0.3 + (i % 7) * 0.1})`;
      sCtx.beginPath();
      sCtx.arc(x, y, r, 0, Math.PI * 2);
      sCtx.fill();
    }
    doc.layers.push(space);

    const earth = doc.createLayerObject({ name: 'Orbital Planet', kind: 'raster' });
    const eCtx = earth.canvas.getContext('2d');
    const cx = W * 0.5;
    const cy = H * 0.36;
    const radius = 175;
    eCtx.save();
    eCtx.beginPath();
    eCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    eCtx.clip();

    const earthGrad = eCtx.createRadialGradient(cx - 50, cy - 55, 20, cx, cy, radius);
    earthGrad.addColorStop(0, '#6dc2ff');
    earthGrad.addColorStop(0.55, '#1964b8');
    earthGrad.addColorStop(0.88, '#09234a');
    earthGrad.addColorStop(1, '#02060d');
    eCtx.fillStyle = earthGrad;
    eCtx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    eCtx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    for (let c = 0; c < 8; c++) {
      eCtx.beginPath();
      eCtx.ellipse(
        cx - 60 + c * 22,
        cy - 50 + (c % 3) * 44,
        48,
        14,
        c * 0.35,
        0,
        Math.PI * 2
      );
      eCtx.fill();
    }
    eCtx.restore();
    earth.styles.outerGlow = { enabled: true, color: '#45a1ff', opacity: 0.85, size: 32 };
    doc.layers.push(earth);

    const moon = doc.createLayerObject({ name: 'Crater Horizon', kind: 'raster' });
    const mCtx = moon.canvas.getContext('2d');
    mCtx.beginPath();
    mCtx.moveTo(0, H * 0.68);
    mCtx.quadraticCurveTo(W * 0.45, H * 0.62, W, H * 0.71);
    mCtx.lineTo(W, H);
    mCtx.lineTo(0, H);
    mCtx.closePath();
    const moonGrad = mCtx.createLinearGradient(0, H * 0.63, 0, H);
    moonGrad.addColorStop(0, '#8d8b86');
    moonGrad.addColorStop(0.4, '#63615c');
    moonGrad.addColorStop(1, '#2b2a28');
    mCtx.fillStyle = moonGrad;
    mCtx.fill();
    doc.layers.push(moon);

    const typeLyr = doc.createLayerObject({
      name: 'ORBITAL HORIZON',
      kind: 'text',
      textData: {
        text: 'ORBITAL HORIZON\nLAYER STYLES EDITION',
        fontFamily: 'Inter, sans-serif',
        fontSize: 52,
        fontWeight: '700',
        color: '#ffffff',
        align: 'center',
        lineHeight: 1.35,
        strokeWidth: 0,
        strokeColor: '#1d68c4',
        x: W / 2,
        y: H * 0.84
      },
      styles: {
        dropShadow: { enabled: true, color: '#000000', opacity: 0.8, angle: 120, distance: 10, size: 18 },
        outerGlow: { enabled: true, color: '#378ef0', opacity: 0.9, size: 24 },
        stroke: { enabled: true, color: '#7cc0ff', opacity: 1.0, size: 2, position: 'outside', fillType: 'color' }
      }
    });
    doc.layers.push(typeLyr);

    doc.activeLayerId = typeLyr.id;
    doc.compose();
    doc.pushHistory('Open Deep-Space-Horizon.psd');
    return doc;
  }

  static createBlankDocument(width = 1080, height = 1350, bgColor = '#ffffff', title = 'Untitled-Mobile.psd') {
    const doc = new StudioDoc(width, height, title);
    const bg = doc.createLayerObject({ name: 'Background', kind: 'raster' });
    if (bgColor !== 'transparent') {
      const ctx = bg.canvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }
    doc.layers.push(bg);
    doc.activeLayerId = bg.id;
    doc.compose();
    doc.pushHistory('New Document');
    return doc;
  }
}
