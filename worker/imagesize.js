/**
 * Read an image's pixel dimensions out of its header bytes.
 *
 * On Plesk this job is done by PHP's getimagesize(). A Worker has no image
 * library, but every format the site accepts states its size in the first
 * few hundred bytes, so parsing the header is enough — and it means only the
 * head of each object has to be read, not the whole photo.
 *
 * Returns { width, height } or null if the format isn't recognised.
 */

/** How many bytes of a file this needs. JPEG can carry large EXIF blocks
 *  before the frame header, so give it room. */
export const HEADER_BYTES = 65536;

export function imageSize(buffer) {
  const b = new Uint8Array(buffer);
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 16) return null;

  // ---- PNG: an 8-byte signature, then IHDR with width/height as big-endian.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: v.getUint32(16), height: v.getUint32(20) };
  }

  // ---- GIF: "GIF87a"/"GIF89a", then width/height as little-endian.
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { width: v.getUint16(6, true), height: v.getUint16(8, true) };
  }

  // ---- RIFF container: WebP.
  if (str(b, 0, 4) === 'RIFF' && str(b, 8, 4) === 'WEBP') {
    return webp(b, v);
  }

  // ---- ISO base media container: AVIF (and HEIC), size is in the ispe box.
  if (str(b, 4, 4) === 'ftyp') {
    return ispe(b, v);
  }

  // ---- JPEG: walk the marker segments to the start-of-frame.
  if (b[0] === 0xff && b[1] === 0xd8) {
    return jpeg(b, v);
  }

  return null;
}

function str(b, at, len) {
  let s = '';
  for (let i = at; i < at + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function webp(b, v) {
  const kind = str(b, 12, 4);
  // Lossy: VP8 bitstream, dimensions 14 bytes into the chunk.
  if (kind === 'VP8 ') {
    return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
  }
  // Lossless: VP8L packs width-1 and height-1 into 28 bits after the signature.
  if (kind === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  // Extended: VP8X carries canvas size as two 24-bit little-endian values.
  if (kind === 'VP8X') {
    const w = b[24] | (b[25] << 8) | (b[26] << 16);
    const h = b[27] | (b[28] << 8) | (b[29] << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

function ispe(b, v) {
  // The image spatial extents box states the size. Scanning for the tag is
  // enough here: walking the full box tree buys nothing for a header read.
  for (let i = 0; i + 20 < b.length; i++) {
    if (b[i] === 0x69 && b[i + 1] === 0x73 && b[i + 2] === 0x70 && b[i + 3] === 0x65) {
      // tag, then a 4-byte version/flags field, then width and height.
      return { width: v.getUint32(i + 8), height: v.getUint32(i + 12) };
    }
  }
  return null;
}

function jpeg(b, v) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }        // resynchronise on padding
    const marker = b[i + 1];
    // Standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = v.getUint16(i + 2);
    if (length < 2) return null;
    // SOF0..SOF15, excluding the DHT/JPG/DAC markers that share the range.
    const isFrame = marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return { height: v.getUint16(i + 5), width: v.getUint16(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}
