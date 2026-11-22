/* ============================================================================
 * ProStudio Mobile — Binary PSD (8BPS) Reader & Writer
 * ============================================================================ */

const BLEND_TO_PSD = {
  'source-over': 'norm',
  'multiply': 'mul ',
  'screen': 'scrn',
  'overlay': 'over',
  'darken': 'dark',
  'lighten': 'lite',
  'color-dodge': 'div ',
  'color-burn': 'idiv',
  'hard-light': 'hLit',
  'soft-light': 'sLit',
  'difference': 'diff',
  'exclusion': 'smud',
  'hue': 'hue ',
  'saturation': 'sat ',
  'color': 'colr',
  'luminosity': 'lum '
};

const PSD_TO_BLEND = Object.fromEntries(
  Object.entries(BLEND_TO_PSD).map(([k, v]) => [v, k])
);

export class PsdCodec {
  /**
   * Encode a ProStudio Mobile document into a binary Adobe Photoshop .PSD (8BPS) Uint8Array.
   * Writes both the multi-layer Layer & Mask Information section and the composite Image Data section.
   */
  static encodePsd(doc, compositeCanvas) {
    const width = doc.width;
    const height = doc.height;
    const exportLayers = doc.layers.map((layer) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      doc.renderSingleLayerToContext(layer, ctx, false);
      const imgData = ctx.getImageData(0, 0, width, height).data;
      return {
        name: layer.name || 'Layer',
        opacity: Math.round((layer.opacity ?? 1) * 255),
        visible: layer.visible !== false,
        blendMode: BLEND_TO_PSD[layer.blendMode] || 'norm',
        pixels: imgData
      };
    });

    const layerRecordsChunks = [];
    const channelDataChunks = [];

    for (const lyr of exportLayers) {
      const pixelCount = width * height;
      const chR = new Uint8Array(pixelCount);
      const chG = new Uint8Array(pixelCount);
      const chB = new Uint8Array(pixelCount);
      const chA = new Uint8Array(pixelCount);

      const src = lyr.pixels;
      for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
        chR[i] = src[p];
        chG[i] = src[p + 1];
        chB[i] = src[p + 2];
        chA[i] = src[p + 3];
      }

      const channelLen = 2 + pixelCount; // 2-byte compression=0 (Raw) + planar bytes

      // Encode Pascal name padded to 4-byte multiple
      const nameBytes = new TextEncoder().encode(lyr.name.slice(0, 127));
      const pascalTotal = Math.ceil((1 + nameBytes.length) / 4) * 4;
      const extraDataLen = 4 + 4 + pascalTotal; // maskData(0) + blendingRanges(0) + name

      const recBuf = new ArrayBuffer(16 + 2 + 4 * 6 + 4 + 4 + 1 + 1 + 1 + 1 + 4 + extraDataLen);
      const recView = new DataView(recBuf);
      const recArr = new Uint8Array(recBuf);
      let off = 0;

      // Bounding box: top, left, bottom, right
      recView.setInt32(off, 0, false); off += 4;
      recView.setInt32(off, 0, false); off += 4;
      recView.setInt32(off, height, false); off += 4;
      recView.setInt32(off, width, false); off += 4;

      // Number of channels: 4 (A=-1, R=0, G=1, B=2)
      recView.setUint16(off, 4, false); off += 2;
      const chIds = [-1, 0, 1, 2];
      for (const cid of chIds) {
        recView.setInt16(off, cid, false); off += 2;
        recView.setUint32(off, channelLen, false); off += 4;
      }

      // Blend mode signature '8BIM'
      recArr.set([0x38, 0x42, 0x49, 0x4d], off); off += 4;
      // Blend mode key
      const bmKey = lyr.blendMode.padEnd(4, ' ');
      for (let i = 0; i < 4; i++) recArr[off + i] = bmKey.charCodeAt(i);
      off += 4;

      // Opacity (0..255), Clipping (0), Flags (bit 1 =not visible), Filler (0)
      recView.setUint8(off, lyr.opacity); off += 1;
      recView.setUint8(off, 0); off += 1;
      recView.setUint8(off, lyr.visible ? 0x00 : 0x02); off += 1;
      recView.setUint8(off, 0); off += 1;

      // Extra data length
      recView.setUint32(off, extraDataLen, false); off += 4;
      // Layer mask data length = 0
      recView.setUint32(off, 0, false); off += 4;
      // Layer blending ranges length = 0
      recView.setUint32(off, 0, false); off += 4;
      // Pascal string
      recView.setUint8(off, nameBytes.length);
      recArr.set(nameBytes, off + 1);

      layerRecordsChunks.push(recArr);

      // Channel image data for [-1 (A), 0 (R), 1 (G), 2 (B)]
      for (const chPlane of [chA, chR, chG, chB]) {
        const chBuf = new Uint8Array(2 + pixelCount);
        chBuf[0] = 0; // compression = 0 (Raw)
        chBuf[1] = 0;
        chBuf.set(chPlane, 2);
        channelDataChunks.push(chBuf);
      }
    }

    const totalRecsBytes = layerRecordsChunks.reduce((acc, c) => acc + c.byteLength, 0);
    const totalChBytes = channelDataChunks.reduce((acc, c) => acc + c.byteLength, 0);
    let layerInfoLen = 2 + totalRecsBytes + totalChBytes;
    const padLayerInfo = layerInfoLen % 2 === 1 ? 1 : 0;
    layerInfoLen += padLayerInfo;

    const layerAndMaskLen = 4 + layerInfoLen + 4; // layerInfoLen(4) + layerInfo + globalLayerMask(4=0)

    // Flattened composite image data (4 channels: R, G, B, A)
    const compCtx = compositeCanvas.getContext('2d');
    const compPixels = compCtx.getImageData(0, 0, width, height).data;
    const pixelCount = width * height;
    const compDataLen = 2 + 4 * pixelCount;

    const totalSize = 26 + 4 + 4 + 4 + layerAndMaskLen + compDataLen;
    const outBuf = new ArrayBuffer(totalSize);
    const view = new DataView(outBuf);
    const out = new Uint8Array(outBuf);
    let ptr = 0;

    // 1. File Header (26 bytes)
    out.set([0x38, 0x42, 0x50, 0x53], ptr); ptr += 4; // '8BPS'
    view.setUint16(ptr, 1, false); ptr += 2; // Version 1 (PSD)
    ptr += 6; // 6 reserved zero bytes
    view.setUint16(ptr, 4, false); ptr += 2; // 4 channels (RGBA)
    view.setUint32(ptr, height, false); ptr += 4;
    view.setUint32(ptr, width, false); ptr += 4;
    view.setUint16(ptr, 8, false); ptr += 2; // 8 bits per channel
    view.setUint16(ptr, 3, false); ptr += 2; // Color mode 3 = RGB

    // 2. Color Mode Data Section (4 bytes = 0)
    view.setUint32(ptr, 0, false); ptr += 4;

    // 3. Image Resources Section (4 bytes = 0)
    view.setUint32(ptr, 0, false); ptr += 4;

    // 4. Layer and Mask Information Section
    view.setUint32(ptr, layerAndMaskLen, false); ptr += 4;
    view.setUint32(ptr, layerInfoLen, false); ptr += 4;
    view.setInt16(ptr, exportLayers.length, false); ptr += 2;

    for (const chunk of layerRecordsChunks) {
      out.set(chunk, ptr);
      ptr += chunk.byteLength;
    }
    for (const chunk of channelDataChunks) {
      out.set(chunk, ptr);
      ptr += chunk.byteLength;
    }
    if (padLayerInfo) {
      out[ptr] = 0;
      ptr += 1;
    }
    // Global layer mask info length = 0
    view.setUint32(ptr, 0, false); ptr += 4;

    // 5. Composite Image Data Section
    view.setUint16(ptr, 0, false); ptr += 2; // Compression = 0 (Raw)
    const cR = ptr;
    const cG = ptr + pixelCount;
    const cB = ptr + 2 * pixelCount;
    const cA = ptr + 3 * pixelCount;
    for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
      out[cR + i] = compPixels[p];
      out[cG + i] = compPixels[p + 1];
      out[cB + i] = compPixels[p + 2];
      out[cA + i] = compPixels[p + 3];
    }

    return out;
  }

  /**
   * Decode a binary .PSD file ArrayBuffer into a structured ProStudio document descriptor.
   * Supports Raw (0) and RLE PackBits (1) channel compression.
   */
  static decodePsd(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    let ptr = 0;

    const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (sig !== '8BPS') {
      throw new Error('Invalid PSD signature (expected 8BPS)');
    }
    ptr += 4;
    const version = view.getUint16(ptr, false); ptr += 2;
    if (version !== 1 && version !== 2) {
      throw new Error(`Unsupported PSD version: ${version}`);
    }
    const isPsb = version === 2;
    ptr += 6; // reserved
    const numChannels = view.getUint16(ptr, false); ptr += 2;
    const height = view.getUint32(ptr, false); ptr += 4;
    const width = view.getUint32(ptr, false); ptr += 4;
    const depth = view.getUint16(ptr, false); ptr += 2;
    const colorMode = view.getUint16(ptr, false); ptr += 2;

    if (depth !== 8) {
      throw new Error(`Only 8-bit PSD files are supported in mobile direct decode (got ${depth}-bit)`);
    }
    if (colorMode !== 3 && colorMode !== 1) {
      throw new Error(`Unsupported PSD color mode (${colorMode}); expected RGB (3) or Grayscale (1)`);
    }

    // Skip Color Mode Data
    const colorModeLen = view.getUint32(ptr, false); ptr += 4 + colorModeLen;
    // Skip Image Resources
    const imgResLen = view.getUint32(ptr, false); ptr += 4 + imgResLen;

    // Layer and Mask Info
    const layerMaskLen = isPsb ? Number(view.getBigUint64(ptr, false)) : view.getUint32(ptr, false);
    ptr += isPsb ? 8 : 4;
    const layerMaskEnd = ptr + layerMaskLen;

    const parsedLayers = [];

    if (layerMaskLen > 0) {
      const layerInfoLen = isPsb ? Number(view.getBigUint64(ptr, false)) : view.getUint32(ptr, false);
      ptr += isPsb ? 8 : 4;

      if (layerInfoLen > 0) {
        const rawLayerCount = view.getInt16(ptr, false); ptr += 2;
        const layerCount = Math.abs(rawLayerCount);

        const layerMeta = [];
        for (let i = 0; i < layerCount; i++) {
          const top = view.getInt32(ptr, false); ptr += 4;
          const left = view.getInt32(ptr, false); ptr += 4;
          const bottom = view.getInt32(ptr, false); ptr += 4;
          const right = view.getInt32(ptr, false); ptr += 4;

          const chCount = view.getUint16(ptr, false); ptr += 2;
          const channels = [];
          for (let c = 0; c < chCount; c++) {
            const id = view.getInt16(ptr, false); ptr += 2;
            const len = isPsb ? Number(view.getBigUint64(ptr, false)) : view.getUint32(ptr, false);
            ptr += isPsb ? 8 : 4;
            channels.push({ id, len });
          }

          ptr += 4; // '8BIM'
          const bmKey = String.fromCharCode(bytes[ptr], bytes[ptr + 1], bytes[ptr + 2], bytes[ptr + 3]);
          ptr += 4;
          const opacity = view.getUint8(ptr) / 255; ptr += 1;
          const clipping = view.getUint8(ptr) !== 0; ptr += 1;
          const flags = view.getUint8(ptr); ptr += 1;
          ptr += 1; // filler

          const extraLen = view.getUint32(ptr, false); ptr += 4;
          const extraEnd = ptr + extraLen;

          const maskLen = view.getUint32(ptr, false); ptr += 4 + maskLen;
          const blendRangesLen = view.getUint32(ptr, false); ptr += 4 + blendRangesLen;

          const nameLen = view.getUint8(ptr);
          const nameBytes = bytes.slice(ptr + 1, ptr + 1 + nameLen);
          const name = new TextDecoder().decode(nameBytes) || `Layer ${i + 1}`;

          ptr = extraEnd;

          layerMeta.push({
            name,
            top,
            left,
            bottom,
            right,
            width: Math.max(0, right - left),
            height: Math.max(0, bottom - top),
            channels,
            blendMode: PSD_TO_BLEND[bmKey] || 'source-over',
            opacity,
            clipping,
            visible: (flags & 0x02) === 0
          });
        }

        // Decode channel image data for each layer
        for (const meta of layerMeta) {
          const lw = meta.width;
          const lh = meta.height;
          const channelPlanes = {};

          for (const ch of meta.channels) {
            const chStart = ptr;
            const compression = view.getUint16(ptr, false);
            const dataStart = ptr + 2;
            const pixelCount = lw * lh;

            if (pixelCount > 0 && ch.len >= 2) {
              if (compression === 0) {
                channelPlanes[ch.id] = bytes.slice(dataStart, dataStart + pixelCount);
              } else if (compression === 1) {
                channelPlanes[ch.id] = PsdCodec.decodeRleChannel(
                  view,
                  bytes,
                  dataStart,
                  lh,
                  lw,
                  isPsb
                );
              }
            }
            ptr = chStart + ch.len;
          }

          // Reconstruct layer canvas at full document dimensions
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          if (lw > 0 && lh > 0) {
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(lw, lh);
            const dst = imgData.data;
            const planeR = channelPlanes[0];
            const planeG = channelPlanes[1] || planeR;
            const planeB = channelPlanes[2] || planeR;
            const planeA = channelPlanes[-1];

            const count = lw * lh;
            for (let i = 0, p = 0; i < count; i++, p += 4) {
              dst[p] = planeR ? planeR[i] : 0;
              dst[p + 1] = planeG ? planeG[i] : 0;
              dst[p + 2] = planeB ? planeB[i] : 0;
              dst[p + 3] = planeA ? planeA[i] : 255;
            }
            ctx.putImageData(imgData, meta.left, meta.top);
          }

          parsedLayers.push({
            name: meta.name,
            blendMode: meta.blendMode,
            opacity: meta.opacity,
            visible: meta.visible,
            clipping: meta.clipping,
            canvas
          });
        }
      }
    }

    ptr = layerMaskEnd;

    // Fallback: if no layers were in the Layer section, read the composite Image Data section
    if (parsedLayers.length === 0 && ptr < bytes.byteLength) {
      const compression = view.getUint16(ptr, false); ptr += 2;
      const pixelCount = width * height;
      const planes = [];

      if (compression === 0) {
        for (let c = 0; c < numChannels; c++) {
          planes.push(bytes.slice(ptr + c * pixelCount, ptr + (c + 1) * pixelCount));
        }
      } else if (compression === 1) {
        const countTableBytes = numChannels * height * (isPsb ? 4 : 2);
        let dataPtr = ptr + countTableBytes;
        let countPtr = ptr;
        for (let c = 0; c < numChannels; c++) {
          const outPlane = new Uint8Array(pixelCount);
          let outIdx = 0;
          for (let row = 0; row < height; row++) {
            const byteCount = isPsb ? view.getUint32(countPtr, false) : view.getUint16(countPtr, false);
            countPtr += isPsb ? 4 : 2;
            outIdx = PsdCodec.decodePackBitsRow(bytes, dataPtr, byteCount, outPlane, outIdx, width);
            dataPtr += byteCount;
          }
          planes.push(outPlane);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(width, height);
      const dst = imgData.data;
      const pR = planes[0];
      const pG = planes[1] || pR;
      const pB = planes[2] || pR;
      const pA = planes[3];
      for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
        dst[p] = pR ? pR[i] : 0;
        dst[p + 1] = pG ? pG[i] : 0;
        dst[p + 2] = pB ? pB[i] : 0;
        dst[p + 3] = pA ? pA[i] : 255;
      }
      ctx.putImageData(imgData, 0, 0);
      parsedLayers.push({
        name: 'Background',
        blendMode: 'source-over',
        opacity: 1,
        visible: true,
        clipping: false,
        canvas
      });
    }

    return {
      width,
      height,
      layers: parsedLayers
    };
  }

  static decodeRleChannel(view, bytes, startOffset, height, width, isPsb) {
    const out = new Uint8Array(width * height);
    const countEntrySize = isPsb ? 4 : 2;
    let countPtr = startOffset;
    let dataPtr = startOffset + height * countEntrySize;
    let outIdx = 0;

    for (let row = 0; row < height; row++) {
      const rowByteCount = isPsb ? view.getUint32(countPtr, false) : view.getUint16(countPtr, false);
      countPtr += countEntrySize;
      outIdx = PsdCodec.decodePackBitsRow(bytes, dataPtr, rowByteCount, out, outIdx, width);
      dataPtr += rowByteCount;
    }
    return out;
  }

  static decodePackBitsRow(bytes, dataStart, byteCount, out, outStart, maxRowPixels) {
    let src = dataStart;
    const srcEnd = dataStart + byteCount;
    let dst = outStart;
    const dstEnd = outStart + maxRowPixels;

    while (src < srcEnd && dst < dstEnd) {
      let header = bytes[src++];
      if (header > 127) header -= 256; // signed int8
      if (header >= 0) {
        const count = header + 1;
        for (let i = 0; i < count && src < srcEnd && dst < dstEnd; i++) {
          out[dst++] = bytes[src++];
        }
      } else if (header !== -128) {
        const count = 1 - header;
        const val = bytes[src++];
        for (let i = 0; i < count && dst < dstEnd; i++) {
          out[dst++] = val;
        }
      }
    }
    return outStart + maxRowPixels;
  }
}
