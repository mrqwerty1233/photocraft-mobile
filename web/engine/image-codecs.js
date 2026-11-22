/**
 * ProStudio Mobile — Multi-Format Image & Document Codec Engine
 * Zero-dependency pure-JS encoders & decoders for:
 *   Export: PSD, PNG, JPG, WEBP, AVIF, GIF (LZW 256-color), BMP (32-bit RGBA),
 *           TIFF (32-bit RGBA), TGA (32-bit RGBA), ICO (Multi-size PNG-in-ICO),
 *           SVG (Vector Text/Shapes + Embedded Raster), PDF (Print-ready PDF 1.4),
 *           PPM (P6 Binary), PSPROJ (Full ProStudio Editable Project).
 *   Import: PNG, JPG, WEBP, AVIF, GIF, SVG, BMP, TIFF, TGA, ICO, PPM/PGM,
 *           HEIC/HEIF (native), Camera RAW (DNG/CR2/NEF/ARW embedded JPEG preview),
 *           PSD/PSB, PSPROJ.
 */

export const EXPORT_FORMATS = [
  { id: 'psd', ext: 'psd', mime: 'image/vnd.adobe.photoshop', label: 'Layered Photoshop (.PSD — 8BPS Binary)', layered: true, lossy: false },
  { id: 'png', ext: 'png', mime: 'image/png', label: 'PNG Lossless with Alpha (.PNG)', layered: false, lossy: false },
  { id: 'jpeg', ext: 'jpg', mime: 'image/jpeg', label: 'JPEG Photo (.JPG)', layered: false, lossy: true },
  { id: 'webp', ext: 'webp', mime: 'image/webp', label: 'WebP Modern Image (.WEBP)', layered: false, lossy: true },
  { id: 'avif', ext: 'avif', mime: 'image/avif', label: 'AVIF Next-Gen Image (.AVIF)', layered: false, lossy: true },
  { id: 'gif', ext: 'gif', mime: 'image/gif', label: 'GIF 256-Color Graphics (.GIF)', layered: false, lossy: false },
  { id: 'bmp', ext: 'bmp', mime: 'image/bmp', label: 'BMP Uncompressed 32-Bit (.BMP)', layered: false, lossy: false },
  { id: 'tiff', ext: 'tif', mime: 'image/tiff', label: 'TIFF Print & Archival RGBA (.TIF)', layered: false, lossy: false },
  { id: 'tga', ext: 'tga', mime: 'image/x-tga', label: 'TGA Truevision Targa RGBA (.TGA)', layered: false, lossy: false },
  { id: 'ico', ext: 'ico', mime: 'image/x-icon', label: 'ICO App / Web Favicon (.ICO)', layered: false, lossy: false },
  { id: 'svg', ext: 'svg', mime: 'image/svg+xml', label: 'SVG Scalable Vector Graphic (.SVG)', layered: true, lossy: false },
  { id: 'pdf', ext: 'pdf', mime: 'application/pdf', label: 'PDF Print Document (.PDF)', layered: false, lossy: true },
  { id: 'ppm', ext: 'ppm', mime: 'image/x-portable-pixmap', label: 'PPM Raw Netpbm RGB (.PPM)', layered: false, lossy: false },
  { id: 'psproj', ext: 'psproj', mime: 'application/json', label: 'ProStudio Editable Project (.PSPROJ)', layered: true, lossy: false }
];

export const IMPORT_IMAGE_ACCEPT =
  'image/*,.png,.jpg,.jpeg,.webp,.avif,.gif,.bmp,.tif,.tiff,.tga,.ico,.svg,.ppm,.pgm,.heic,.heif,.dng,.cr2,.nef,.arw';

export const IMPORT_ALL_ACCEPT =
  `${IMPORT_IMAGE_ACCEPT},.psd,.psb,.psproj,.json`;

export class ImageCodecs {
  static getFormatMeta(formatId) {
    return EXPORT_FORMATS.find((f) => f.id === formatId) || EXPORT_FORMATS[1];
  }

  /* ==========================================================================
   * 1. BMP (32-bit BGRA BITMAPV4HEADER — Lossless with Transparency)
   * ========================================================================== */
  static encodeBmp(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const pixels = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const fileHeaderSize = 14;
    const dibHeaderSize = 108; // BITMAPV4HEADER for native alpha mask support
    const headerSize = fileHeaderSize + dibHeaderSize;
    const pixelBytes = w * h * 4;
    const totalSize = headerSize + pixelBytes;

    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);
    const out = new Uint8Array(buf);

    // File header ('BM')
    out[0] = 0x42;
    out[1] = 0x4d;
    view.setUint32(2, totalSize, true);
    view.setUint32(6, 0, true);
    view.setUint32(10, headerSize, true);

    // BITMAPV4HEADER
    view.setUint32(14, dibHeaderSize, true);
    view.setInt32(18, w, true);
    view.setInt32(22, -h, true); // top-down scanline order
    view.setUint16(26, 1, true); // planes
    view.setUint16(28, 32, true); // 32 bpp
    view.setUint32(30, 3, true); // BI_BITFIELDS
    view.setUint32(34, pixelBytes, true);
    view.setInt32(38, 2835, true); // 72 DPI X
    view.setInt32(42, 2835, true); // 72 DPI Y
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);
    // RGBA channel bitmasks (BGRA in memory -> little-endian masks)
    view.setUint32(54, 0x00ff0000, true); // R
    view.setUint32(58, 0x0000ff00, true); // G
    view.setUint32(62, 0x000000ff, true); // B
    view.setUint32(66, 0xff000000, true); // A
    view.setUint32(70, 0x73524742, true); // 'sRGB'

    let p = headerSize;
    for (let i = 0; i < pixels.length; i += 4) {
      out[p++] = pixels[i + 2]; // B
      out[p++] = pixels[i + 1]; // G
      out[p++] = pixels[i];     // R
      out[p++] = pixels[i + 3]; // A
    }
    return new Blob([buf], { type: 'image/bmp' });
  }

  /* ==========================================================================
   * 2. TGA (Truevision Targa 32-bit BGRA — Uncompressed Encode + Raw/RLE Decode)
   * ========================================================================== */
  static encodeTga(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const pixels = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const out = new Uint8Array(18 + w * h * 4);
    const view = new DataView(out.buffer);

    out[2] = 2; // Uncompressed True-Color image
    view.setUint16(12, w, true);
    view.setUint16(14, h, true);
    out[16] = 32; // 32 bpp
    out[17] = 0x28; // Top-left origin (bit 5) + 8 alpha bits

    let p = 18;
    for (let i = 0; i < pixels.length; i += 4) {
      out[p++] = pixels[i + 2]; // B
      out[p++] = pixels[i + 1]; // G
      out[p++] = pixels[i];     // R
      out[p++] = pixels[i + 3]; // A
    }
    return new Blob([out], { type: 'image/x-tga' });
  }

  static decodeTga(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    if (bytes.length < 18) throw new Error('Invalid TGA file');

    const idLen = bytes[0];
    const colorMapType = bytes[1];
    const imgType = bytes[2];
    const colorMapLen = view.getUint16(5, true);
    const colorMapDepth = bytes[7];
    const w = view.getUint16(12, true);
    const h = view.getUint16(14, true);
    const bpp = bytes[16];
    const desc = bytes[17];
    const topOrigin = (desc & 0x20) !== 0;

    if (w <= 0 || h <= 0 || w > 8192 || h > 8192) throw new Error('Invalid TGA dimensions');
    const bytesPerPixel = bpp >> 3;
    if (![1, 3, 4].includes(bytesPerPixel)) throw new Error(`Unsupported TGA depth: ${bpp}-bit`);

    let ptr = 18 + idLen + (colorMapType ? colorMapLen * ((colorMapDepth + 7) >> 3) : 0);
    const rgba = new Uint8ClampedArray(w * h * 4);
    const isRle = imgType === 10 || imgType === 11;
    const isGray = imgType === 3 || imgType === 11;

    const readPixel = (offset) => {
      if (isGray) {
        const g = bytes[offset];
        return [g, g, g, 255];
      }
      const b = bytes[offset];
      const g = bytes[offset + 1];
      const r = bytes[offset + 2];
      const a = bytesPerPixel === 4 ? bytes[offset + 3] : 255;
      return [r, g, b, a];
    };

    const total = w * h;
    let idx = 0;
    while (idx < total && ptr < bytes.length) {
      if (isRle) {
        const hdr = bytes[ptr++];
        const count = (hdr & 0x7f) + 1;
        if (hdr & 0x80) {
          const px = readPixel(ptr);
          ptr += bytesPerPixel;
          for (let k = 0; k < count && idx < total; k++, idx++) {
            const x = idx % w;
            const y = topOrigin ? (idx / w) | 0 : h - 1 - ((idx / w) | 0);
            const o = (y * w + x) * 4;
            rgba[o] = px[0]; rgba[o + 1] = px[1]; rgba[o + 2] = px[2]; rgba[o + 3] = px[3];
          }
        } else {
          for (let k = 0; k < count && idx < total; k++, idx++) {
            const px = readPixel(ptr);
            ptr += bytesPerPixel;
            const x = idx % w;
            const y = topOrigin ? (idx / w) | 0 : h - 1 - ((idx / w) | 0);
            const o = (y * w + x) * 4;
            rgba[o] = px[0]; rgba[o + 1] = px[1]; rgba[o + 2] = px[2]; rgba[o + 3] = px[3];
          }
        }
      } else {
        const px = readPixel(ptr);
        ptr += bytesPerPixel;
        const x = idx % w;
        const y = topOrigin ? (idx / w) | 0 : h - 1 - ((idx / w) | 0);
        const o = (y * w + x) * 4;
        rgba[o] = px[0]; rgba[o + 1] = px[1]; rgba[o + 2] = px[2]; rgba[o + 3] = px[3];
        idx++;
      }
    }

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
    return c;
  }

  /* ==========================================================================
   * 3. TIFF (Baseline Uncompressed 32-bit RGBA Encode & 24/32-bit Decode)
   * ========================================================================== */
  static encodeTiff(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const pixels = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const pixelBytes = w * h * 4;

    // Layout: Header(8) + IFD(2 + 12*12 + 4 = 150) + ExtraValues(BitsPerSample 8 + XRes 8 + YRes 8 = 24) + Pixels
    const ifdOffset = 8;
    const numTags = 12;
    const extraOffset = ifdOffset + 2 + numTags * 12 + 4;
    const bpsOffset = extraOffset;
    const xResOffset = extraOffset + 8;
    const yResOffset = extraOffset + 16;
    const pixelOffset = extraOffset + 24;

    const totalSize = pixelOffset + pixelBytes;
    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);
    const out = new Uint8Array(buf);

    // Header: Little-endian 'II', magic 42, IFD offset
    out[0] = 0x49; out[1] = 0x49;
    view.setUint16(2, 42, true);
    view.setUint32(4, ifdOffset, true);

    let ptr = ifdOffset;
    view.setUint16(ptr, numTags, true); ptr += 2;
    const writeTag = (tag, type, count, value) => {
      view.setUint16(ptr, tag, true); ptr += 2;
      view.setUint16(ptr, type, true); ptr += 2;
      view.setUint32(ptr, count, true); ptr += 4;
      if (type === 3 && count === 1) {
        view.setUint16(ptr, value, true);
        view.setUint16(ptr + 2, 0, true);
      } else {
        view.setUint32(ptr, value, true);
      }
      ptr += 4;
    };

    // Tags must be in ascending tag ID order per TIFF 6.0 spec!
    writeTag(256, 4, 1, w);              // ImageWidth
    writeTag(257, 4, 1, h);              // ImageLength
    writeTag(258, 3, 4, bpsOffset);      // BitsPerSample (8,8,8,8)
    writeTag(259, 3, 1, 1);              // Compression = 1 (None)
    writeTag(262, 3, 1, 2);              // PhotometricInterpretation = 2 (RGB)
    writeTag(273, 4, 1, pixelOffset);    // StripOffsets
    writeTag(277, 3, 1, 4);              // SamplesPerPixel = 4 (RGBA)
    writeTag(278, 4, 1, h);              // RowsPerStrip = h
    writeTag(279, 4, 1, pixelBytes);     // StripByteCounts
    writeTag(282, 5, 1, xResOffset);     // XResolution
    writeTag(283, 5, 1, yResOffset);     // YResolution
    writeTag(338, 3, 1, 2);              // ExtraSamples = 2 (Unassociated alpha)
    view.setUint32(ptr, 0, true);        // Next IFD = 0

    // Extra tag data
    view.setUint16(bpsOffset, 8, true);
    view.setUint16(bpsOffset + 2, 8, true);
    view.setUint16(bpsOffset + 4, 8, true);
    view.setUint16(bpsOffset + 6, 8, true);
    view.setUint32(xResOffset, 300, true);
    view.setUint32(xResOffset + 4, 1, true);
    view.setUint32(yResOffset, 300, true);
    view.setUint32(yResOffset + 4, 1, true);

    out.set(pixels, pixelOffset);
    return new Blob([buf], { type: 'image/tiff' });
  }

  static decodeTiff(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    if (bytes.length < 16) throw new Error('Invalid TIFF file');
    const le = bytes[0] === 0x49 && bytes[1] === 0x49;
    if (!le && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) throw new Error('Invalid TIFF byte order');
    if (view.getUint16(2, le) !== 42) throw new Error('Invalid TIFF magic');

    const ifdOff = view.getUint32(4, le);
    const numTags = view.getUint16(ifdOff, le);
    let w = 0, h = 0, spp = 3, compression = 1;
    let stripOffsets = [];
    let stripCounts = [];

    const readVals = (type, count, valOff) => {
      const size = type === 3 ? 2 : type === 4 ? 4 : 1;
      const start = count * size <= 4 ? valOff : view.getUint32(valOff, le);
      const res = [];
      for (let i = 0; i < count; i++) {
        if (type === 3) res.push(view.getUint16(start + i * 2, le));
        else if (type === 4) res.push(view.getUint32(start + i * 4, le));
        else res.push(bytes[start + i]);
      }
      return res;
    };

    for (let i = 0; i < numTags; i++) {
      const off = ifdOff + 2 + i * 12;
      const tag = view.getUint16(off, le);
      const type = view.getUint16(off + 2, le);
      const count = view.getUint32(off + 4, le);
      const vals = readVals(type, count, off + 8);
      if (tag === 256) w = vals[0];
      else if (tag === 257) h = vals[0];
      else if (tag === 259) compression = vals[0];
      else if (tag === 273) stripOffsets = vals;
      else if (tag === 277) spp = vals[0];
      else if (tag === 279) stripCounts = vals;
    }

    if (!w || !h) throw new Error('Could not parse TIFF dimensions');
    if (compression !== 1) {
      // Fallback: check for embedded JPEG preview (e.g. TIFF/DNG/RAW containers)
      const jpg = this.extractEmbeddedJpegBlob(bytes);
      if (jpg) return jpg;
      throw new Error(`Compressed TIFF (method ${compression}) not directly supported`);
    }

    const rgba = new Uint8ClampedArray(w * h * 4);
    let dst = 0;
    for (let s = 0; s < stripOffsets.length; s++) {
      const off = stripOffsets[s];
      const len = stripCounts[s] || (w * h * spp);
      const end = Math.min(bytes.length, off + len);
      for (let p = off; p + spp - 1 < end && dst < rgba.length; p += spp) {
        if (spp === 1) {
          rgba[dst++] = bytes[p]; rgba[dst++] = bytes[p]; rgba[dst++] = bytes[p]; rgba[dst++] = 255;
        } else {
          rgba[dst++] = bytes[p];
          rgba[dst++] = bytes[p + 1];
          rgba[dst++] = bytes[p + 2];
          rgba[dst++] = spp >= 4 ? bytes[p + 3] : 255;
        }
      }
    }

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
    return c;
  }

  /* ==========================================================================
   * 4. ICO (Multi-Size PNG-in-ICO Favicon & App Icon: 256, 64, 32, 16px)
   * ========================================================================== */
  static async encodeIco(canvas) {
    const sizes = [256, 64, 32, 16];
    const pngChunks = [];

    for (const sz of sizes) {
      const c = document.createElement('canvas');
      c.width = sz;
      c.height = sz;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const scale = Math.min(sz / canvas.width, sz / canvas.height);
      const dw = canvas.width * scale;
      const dh = canvas.height * scale;
      ctx.drawImage(canvas, (sz - dw) / 2, (sz - dh) / 2, dw, dh);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
      const arr = new Uint8Array(await blob.arrayBuffer());
      pngChunks.push({ size: sz, bytes: arr });
    }

    const headerLen = 6 + pngChunks.length * 16;
    const totalLen = headerLen + pngChunks.reduce((acc, p) => acc + p.bytes.length, 0);
    const out = new Uint8Array(totalLen);
    const view = new DataView(out.buffer);

    view.setUint16(0, 0, true); // Reserved
    view.setUint16(2, 1, true); // Type 1 = ICO
    view.setUint16(4, pngChunks.length, true);

    let dataOff = headerLen;
    pngChunks.forEach((chunk, idx) => {
      const eOff = 6 + idx * 16;
      out[eOff] = chunk.size >= 256 ? 0 : chunk.size;
      out[eOff + 1] = chunk.size >= 256 ? 0 : chunk.size;
      out[eOff + 2] = 0; // Palette
      out[eOff + 3] = 0;
      view.setUint16(eOff + 4, 1, true);  // Planes
      view.setUint16(eOff + 6, 32, true); // Bit count
      view.setUint32(eOff + 8, chunk.bytes.length, true);
      view.setUint32(eOff + 12, dataOff, true);
      out.set(chunk.bytes, dataOff);
      dataOff += chunk.bytes.length;
    });

    return new Blob([out], { type: 'image/x-icon' });
  }

  /* ==========================================================================
   * 5. GIF89a (Pure-JS 256-Color Quantized Palette + LZW Encoder w/ Alpha)
   * ========================================================================== */
  static encodeGif(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const rgba = canvas.getContext('2d').getImageData(0, 0, w, h).data;

    // 6x6x6 Web-Safe+Color Cube (216 colors) + 39 Grayscale steps + 1 Transparent index (255) = 256 colors!
    const palette = new Uint8Array(256 * 3);
    let idx = 0;
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 6; g++) {
        for (let b = 0; b < 6; b++) {
          palette[idx * 3] = Math.round((r * 255) / 5);
          palette[idx * 3 + 1] = Math.round((g * 255) / 5);
          palette[idx * 3 + 2] = Math.round((b * 255) / 5);
          idx++;
        }
      }
    }
    for (let k = 0; k < 39; k++) {
      const v = Math.round(((k + 1) * 255) / 40);
      palette[idx * 3] = v;
      palette[idx * 3 + 1] = v;
      palette[idx * 3 + 2] = v;
      idx++;
    }
    const transIdx = 255;

    const indices = new Uint8Array(w * h);
    let hasTransparency = false;
    for (let i = 0, p = 0; p < indices.length; p++, i += 4) {
      if (rgba[i + 3] < 128) {
        indices[p] = transIdx;
        hasTransparency = true;
      } else {
        const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
        // Snap near-grays to the smooth 39-step grayscale ramp for cleaner gradients
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        if (maxC - minC < 10 && maxC > 12 && minC < 243) {
          const lum = (r + g + b) / 3;
          const gi = Math.max(0, Math.min(38, Math.round((lum * 40) / 255) - 1));
          indices[p] = 216 + gi;
        } else {
          const ri = Math.round((r * 5) / 255);
          const gi = Math.round((g * 5) / 255);
          const bi = Math.round((b * 5) / 255);
          indices[p] = ri * 36 + gi * 6 + bi;
        }
      }
    }

    // LZW Compression (minCodeSize = 8)
    const minCodeSize = 8;
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    const lzwSubBlocks = [];
    let curBlock = new Uint8Array(255);
    let blockLen = 0;
    let bitBuf = 0;
    let bitCount = 0;

    const pushByte = (b) => {
      curBlock[blockLen++] = b;
      if (blockLen === 255) {
        lzwSubBlocks.push(curBlock);
        curBlock = new Uint8Array(255);
        blockLen = 0;
      }
    };
    const writeCode = (code, bits) => {
      bitBuf |= code << bitCount;
      bitCount += bits;
      while (bitCount >= 8) {
        pushByte(bitBuf & 0xff);
        bitBuf >>= 8;
        bitCount -= 8;
      }
    };

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const dict = new Map();

    writeCode(clearCode, codeSize);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      const found = dict.get(key);
      if (found !== undefined) {
        prefix = found;
      } else {
        writeCode(prefix, codeSize);
        if (nextCode < 4096) {
          dict.set(key, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
        } else {
          writeCode(clearCode, codeSize);
          dict.clear();
          codeSize = minCodeSize + 1;
          nextCode = eoiCode + 1;
        }
        prefix = k;
      }
    }
    writeCode(prefix, codeSize);
    writeCode(eoiCode, codeSize);
    if (bitCount > 0) pushByte(bitBuf & 0xff);
    if (blockLen > 0) lzwSubBlocks.push(curBlock.slice(0, blockLen));

    const parts = [];
    // Header + Logical Screen Descriptor (13 bytes)
    const hdr = new Uint8Array(13);
    const hv = new DataView(hdr.buffer);
    hdr.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0); // GIF89a
    hv.setUint16(6, w, true);
    hv.setUint16(8, h, true);
    hdr[10] = 0xf7; // Global Color Table flag (1), color res (7), sort (0), size = 2^(7+1)=256
    hdr[11] = transIdx;
    hdr[12] = 0;
    parts.push(hdr, palette);

    // Graphic Control Extension (for transparency)
    if (hasTransparency) {
      parts.push(new Uint8Array([0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, transIdx, 0x00]));
    }

    // Image Descriptor (10 bytes)
    const desc = new Uint8Array(10);
    const dv = new DataView(desc.buffer);
    desc[0] = 0x2c;
    dv.setUint16(5, w, true);
    dv.setUint16(7, h, true);
    parts.push(desc, new Uint8Array([minCodeSize]));

    for (const blk of lzwSubBlocks) {
      parts.push(new Uint8Array([blk.length]), blk);
    }
    parts.push(new Uint8Array([0x00, 0x3b])); // Block terminator + Trailer ';'

    return new Blob(parts, { type: 'image/gif' });
  }

  /* ==========================================================================
   * 6. PPM (Netpbm P6 Binary RGB Encode & P6/P5/P3 Decode)
   * ========================================================================== */
  static encodePpm(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const rgba = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const header = new TextEncoder().encode(`P6\n${w} ${h}\n255\n`);
    const rgb = new Uint8Array(w * h * 3);
    let p = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const a = rgba[i + 3] / 255;
      rgb[p++] = Math.round(rgba[i] * a + 255 * (1 - a));
      rgb[p++] = Math.round(rgba[i + 1] * a + 255 * (1 - a));
      rgb[p++] = Math.round(rgba[i + 2] * a + 255 * (1 - a));
    }
    return new Blob([header, rgb], { type: 'image/x-portable-pixmap' });
  }

  static decodePpm(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let pos = 0;
    const nextToken = () => {
      while (pos < bytes.length) {
        const c = bytes[pos];
        if (c === 35) { // '#' comment
          while (pos < bytes.length && bytes[pos] !== 10) pos++;
        } else if (c <= 32) {
          pos++;
        } else break;
      }
      const start = pos;
      while (pos < bytes.length && bytes[pos] > 32 && bytes[pos] !== 35) pos++;
      return new TextDecoder().decode(bytes.subarray(start, pos));
    };

    const magic = nextToken();
    const w = parseInt(nextToken(), 10);
    const h = parseInt(nextToken(), 10);
    const maxVal = parseInt(nextToken(), 10) || 255;
    if (!w || !h) throw new Error('Invalid PPM/PGM header');
    pos++; // skip single whitespace after maxVal

    const rgba = new Uint8ClampedArray(w * h * 4);
    if (magic === 'P6') {
      for (let i = 0, p = pos; i < rgba.length && p + 2 < bytes.length; i += 4, p += 3) {
        rgba[i] = Math.round((bytes[p] * 255) / maxVal);
        rgba[i + 1] = Math.round((bytes[p + 1] * 255) / maxVal);
        rgba[i + 2] = Math.round((bytes[p + 2] * 255) / maxVal);
        rgba[i + 3] = 255;
      }
    } else if (magic === 'P5') {
      for (let i = 0, p = pos; i < rgba.length && p < bytes.length; i += 4, p++) {
        const v = Math.round((bytes[p] * 255) / maxVal);
        rgba[i] = v; rgba[i + 1] = v; rgba[i + 2] = v; rgba[i + 3] = 255;
      }
    } else if (magic === 'P3') {
      for (let i = 0; i < rgba.length; i += 4) {
        rgba[i] = Math.round(((parseInt(nextToken(), 10) || 0) * 255) / maxVal);
        rgba[i + 1] = Math.round(((parseInt(nextToken(), 10) || 0) * 255) / maxVal);
        rgba[i + 2] = Math.round(((parseInt(nextToken(), 10) || 0) * 255) / maxVal);
        rgba[i + 3] = 255;
      }
    } else {
      throw new Error(`Unsupported Netpbm format: ${magic}`);
    }

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
    return c;
  }

  /* ==========================================================================
   * 7. SVG (Hybrid Vector Export: True Vector Shapes & Text + Raster Layers)
   * ========================================================================== */
  static encodeSvg(doc, scale = 1.0) {
    const outW = Math.max(1, Math.round(doc.width * scale));
    const outH = Math.max(1, Math.round(doc.height * scale));
    const esc = (s) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const elements = [];
    for (const lyr of doc.layers) {
      if (!lyr.visible || lyr.kind === 'adjustment') continue;
      const op = Math.max(0, Math.min(1, (lyr.opacity ?? 1) * (lyr.fill ?? 1)));
      const opAttr = op < 0.999 ? ` opacity="${op.toFixed(3)}"` : '';

      // True vector shapes when no complex raster effects/masks are attached
      const hasMaskOrFx = Boolean(lyr.maskCanvas && lyr.maskEnabled) || Object.values(lyr.styles || {}).some((v) => v?.enabled);
      if (lyr.kind === 'shape' && lyr.shapeData && !hasMaskOrFx) {
        const sd = lyr.shapeData;
        const x = sd.x ?? 0, y = sd.y ?? 0, w = sd.w ?? 100, h = sd.h ?? 100;
        const cx = x + w / 2, cy = y + h / 2;
        const rotDeg = ((sd.rotation || 0) * 180) / Math.PI;
        const tf = rotDeg ? ` transform="rotate(${rotDeg.toFixed(2)} ${cx} ${cy})"` : '';
        const fill = sd.fill && sd.fill !== 'none' ? esc(sd.fill) : 'none';
        const stroke = sd.strokeWidth > 0 ? ` stroke="${esc(sd.stroke || '#fff')}" stroke-width="${sd.strokeWidth}"` : '';

        if (sd.shapeType === 'ellipse') {
          elements.push(`  <ellipse cx="${cx}" cy="${cy}" rx="${Math.abs(w / 2)}" ry="${Math.abs(h / 2)}" fill="${fill}"${stroke}${opAttr}${tf} />`);
        } else if (sd.shapeType === 'polygon' || sd.shapeType === 'star') {
          const pts = sd.points || (sd.shapeType === 'star' ? 5 : 6);
          const steps = sd.shapeType === 'star' ? pts * 2 : pts;
          const orx = Math.abs(w) / 2, ory = Math.abs(h) / 2;
          const irx = sd.shapeType === 'star' ? orx * 0.45 : orx;
          const iry = sd.shapeType === 'star' ? ory * 0.45 : ory;
          const coords = [];
          for (let i = 0; i < steps; i++) {
            const rx = sd.shapeType === 'star' && i % 2 === 1 ? irx : orx;
            const ry = sd.shapeType === 'star' && i % 2 === 1 ? iry : ory;
            const a = (i * Math.PI * 2) / steps - Math.PI / 2;
            coords.push(`${(cx + rx * Math.cos(a)).toFixed(1)},${(cy + ry * Math.sin(a)).toFixed(1)}`);
          }
          elements.push(`  <polygon points="${coords.join(' ')}" fill="${fill}"${stroke}${opAttr}${tf} />`);
        } else {
          const rx = Math.min(sd.cornerRadius ?? 14, Math.abs(w) / 2, Math.abs(h) / 2);
          elements.push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke}${opAttr}${tf} />`);
        }
      } else if (lyr.kind === 'text' && lyr.textData && !hasMaskOrFx && (!lyr.textData.warp || lyr.textData.warp === 'none') && lyr.textData.orientation !== 'vertical') {
        const td = lyr.textData;
        const size = td.fontSize || 48;
        const lines = String(td.text || '').split('\n');
        const lh = size * (td.lineHeight || 1.25);
        const startY = (td.y ?? doc.height / 2) - (lines.length * lh) / 2 + lh / 2;
        const anchor = td.align === 'left' ? 'start' : td.align === 'right' ? 'end' : 'middle';
        const rotDeg = ((td.rotation || 0) * 180) / Math.PI;
        const tf = rotDeg ? ` transform="rotate(${rotDeg.toFixed(2)} ${td.x ?? doc.width / 2} ${td.y ?? doc.height / 2})"` : '';
        const strokeAttr = td.strokeWidth > 0 ? ` stroke="${esc(td.strokeColor || '#000')}" stroke-width="${td.strokeWidth}"` : '';
        const tspans = lines
          .map((ln, idx) => `<tspan x="${td.x ?? doc.width / 2}" y="${(startY + idx * lh).toFixed(1)}">${esc(ln)}</tspan>`)
          .join('');
        elements.push(
          `  <text font-family="${esc(td.fontFamily || 'sans-serif')}" font-size="${size}" font-weight="${esc(td.fontWeight || '600')}" font-style="${td.italic ? 'italic' : 'normal'}" fill="${esc(td.color || '#111')}" text-anchor="${anchor}" dominant-baseline="central"${strokeAttr}${opAttr}${tf}>${tspans}</text>`
        );
      } else {
        // Render layer (with mask & fx) to temporary canvas and embed crisp PNG layer
        const tmp = document.createElement('canvas');
        tmp.width = doc.width;
        tmp.height = doc.height;
        const tCtx = tmp.getContext('2d');
        const prevOp = lyr.opacity;
        const prevBm = lyr.blendMode;
        lyr.opacity = 1.0;
        lyr.blendMode = 'source-over';
        doc.renderSingleLayerToContext(lyr, tCtx, false);
        lyr.opacity = prevOp;
        lyr.blendMode = prevBm;
        const dataUrl = tmp.toDataURL('image/png');
        elements.push(`  <image id="${esc(lyr.name)}" x="0" y="0" width="${doc.width}" height="${doc.height}" href="${dataUrl}"${opAttr} />`);
      }
    }

    const svg =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${doc.width} ${doc.height}">\n` +
      elements.join('\n') +
      `\n</svg>\n`;
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  /* ==========================================================================
   * 8. PDF (Print-Ready Single-Page PDF 1.4 with Embedded JPEG DCTDecode)
   * ========================================================================== */
  static async encodePdf(canvas, quality = 0.92) {
    const w = canvas.width;
    const h = canvas.height;
    // Flatten onto white background for print PDF
    const flat = document.createElement('canvas');
    flat.width = w;
    flat.height = h;
    const fCtx = flat.getContext('2d');
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, 0, w, h);
    fCtx.drawImage(canvas, 0, 0);

    const jpgBlob = await new Promise((res) => flat.toBlob(res, 'image/jpeg', quality));
    const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());

    // PDF page points (72 pt/inch; scale nicely so 1px = 0.75pt @ 96 DPI)
    const ptW = Math.max(36, Math.round(w * 0.75 * 100) / 100);
    const ptH = Math.max(36, Math.round(h * 0.75 * 100) / 100);
    const enc = new TextEncoder();

    const chunks = [];
    const offsets = [0];
    let byteLen = 0;
    const pushStr = (s) => {
      const b = enc.encode(s);
      chunks.push(b);
      byteLen += b.length;
    };
    const pushBytes = (b) => {
      chunks.push(b);
      byteLen += b.length;
    };

    pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    offsets.push(byteLen);
    pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    offsets.push(byteLen);
    pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    offsets.push(byteLen);
    pushStr(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
    );

    offsets.push(byteLen);
    pushStr(
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgBytes.length} >>\nstream\n`
    );
    pushBytes(jpgBytes);
    pushStr('\nendstream\nendobj\n');

    const contentStream = `q\n${ptW} 0 0 ${ptH} 0 0 cm\n/Im0 Do\nQ\n`;
    offsets.push(byteLen);
    pushStr(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

    const xrefOffset = byteLen;
    pushStr(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    for (let i = 1; i < offsets.length; i++) {
      pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }
    pushStr(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    return new Blob(chunks, { type: 'application/pdf' });
  }

  /* ==========================================================================
   * 9. Camera RAW (DNG/CR2/NEF/ARW) Embedded JPEG Preview Extractor
   * ========================================================================== */
  static extractEmbeddedJpegBlob(bytes) {
    // Scan for largest JPEG SOI (FF D8 FF) ... EOI (FF D9) inside RAW/TIFF container
    let bestStart = -1;
    let bestEnd = -1;
    let bestLen = 0;

    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
        // Find matching EOI searching forward (skip nested EXIF thumbnails by checking candidate EOIs)
        for (let j = i + 64; j < bytes.length - 1; j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            const len = j + 2 - i;
            if (len > bestLen) {
              bestLen = len;
              bestStart = i;
              bestEnd = j + 2;
            }
          }
        }
      }
    }

    if (bestLen > 128 && bestStart >= 0) {
      return new Blob([bytes.subarray(bestStart, bestEnd)], { type: 'image/jpeg' });
    }
    return null;
  }

  /* ==========================================================================
   * 10. Unified Universal Decoder for ALL Supported Image Formats
   * ========================================================================== */
  static async decodeFileToDrawable(file) {
    const name = (file?.name || '').toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';

    // Pure-JS custom decoders for non-browser formats (TGA, TIFF, PPM/PGM, RAW)
    if (ext === 'tga') {
      return this.decodeTga(await file.arrayBuffer());
    }
    if (ext === 'ppm' || ext === 'pgm' || ext === 'pnm') {
      return this.decodePpm(await file.arrayBuffer());
    }
    if (ext === 'tif' || ext === 'tiff') {
      const res = this.decodeTiff(await file.arrayBuffer());
      if (res instanceof Blob) return this.decodeBlobNative(res);
      return res;
    }
    if (['dng', 'cr2', 'nef', 'arw', 'orf', 'raf', 'rw2'].includes(ext)) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const embedded = this.extractEmbeddedJpegBlob(bytes);
      if (embedded) return this.decodeBlobNative(embedded);
    }

    // SVG: render cleanly onto high-res canvas via HTMLImageElement
    if (ext === 'svg' || file.type === 'image/svg+xml') {
      const text = await file.text();
      const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
      return this.decodeBlobViaImageElement(blob);
    }

    // Native browser/WebView decode (PNG, JPG, WebP, AVIF, GIF, BMP, ICO, HEIC)
    return this.decodeBlobNative(file);
  }

  static async decodeBlobNative(blob) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(blob);
      } catch (_) {}
    }
    return this.decodeBlobViaImageElement(blob);
  }

  static decodeBlobViaImageElement(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Unsupported or corrupted image format'));
      };
      img.src = url;
    });
  }

  /* ==========================================================================
   * 11. Unified Multi-Format Encoder Dispatcher
   * ========================================================================== */
  static async encodeCanvasOrDoc(formatId, doc, outCanvas, { quality = 0.92, scale = 1.0, psdCodec = null, projectSerializer = null } = {}) {
    const meta = this.getFormatMeta(formatId);

    if (formatId === 'psd' && psdCodec) {
      const psdBytes = psdCodec.encodePsd(doc, doc.compositeCanvas);
      return { blob: new Blob([psdBytes], { type: meta.mime }), ext: meta.ext, mime: meta.mime };
    }
    if (formatId === 'psproj' && projectSerializer) {
      const snap = projectSerializer();
      return {
        blob: new Blob([JSON.stringify(snap)], { type: 'application/json' }),
        ext: 'psproj',
        mime: 'application/json'
      };
    }
    if (formatId === 'bmp') {
      return { blob: this.encodeBmp(outCanvas), ext: 'bmp', mime: meta.mime };
    }
    if (formatId === 'tga') {
      return { blob: this.encodeTga(outCanvas), ext: 'tga', mime: meta.mime };
    }
    if (formatId === 'tiff') {
      return { blob: this.encodeTiff(outCanvas), ext: 'tif', mime: meta.mime };
    }
    if (formatId === 'ico') {
      return { blob: await this.encodeIco(outCanvas), ext: 'ico', mime: meta.mime };
    }
    if (formatId === 'gif') {
      return { blob: this.encodeGif(outCanvas), ext: 'gif', mime: meta.mime };
    }
    if (formatId === 'ppm') {
      return { blob: this.encodePpm(outCanvas), ext: 'ppm', mime: meta.mime };
    }
    if (formatId === 'svg') {
      return { blob: this.encodeSvg(doc, scale), ext: 'svg', mime: meta.mime };
    }
    if (formatId === 'pdf') {
      return { blob: await this.encodePdf(outCanvas, quality), ext: 'pdf', mime: meta.mime };
    }

    // Native canvas encoders: PNG, JPEG, WEBP, AVIF
    const mime = meta.mime;
    const blob = await new Promise((resolve) => outCanvas.toBlob(resolve, mime, quality));
    if (blob && (formatId !== 'avif' || blob.type === 'image/avif')) {
      return { blob, ext: meta.ext, mime: blob.type || mime };
    }
    // Graceful fallback if AVIF native encoder isn't compiled into a specific Android WebView
    if (formatId === 'avif') {
      const fbBlob = await new Promise((resolve) => outCanvas.toBlob(resolve, 'image/webp', quality));
      return { blob: fbBlob, ext: 'webp', mime: 'image/webp', fallbackFrom: 'avif' };
    }
    const pngBlob = await new Promise((resolve) => outCanvas.toBlob(resolve, 'image/png'));
    return { blob: pngBlob, ext: 'png', mime: 'image/png' };
  }
}
