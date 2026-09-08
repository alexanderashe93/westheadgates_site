/**
 * Shared bits for the deployment scripts.
 *
 * The naming rules live in worker/images.js and are imported rather than
 * repeated, so a caption or a category label can never mean one thing when
 * the Worker reads the bucket and another when a script writes the manifest.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../worker/config.js';
import { imageSize, HEADER_BYTES } from '../worker/imagesize.js';
import { isPhoto, categoryOf, captionFrom, encodePath } from '../worker/images.js';

export { config, isPhoto, categoryOf, captionFrom, encodePath };

/**
 * The folder that is the website. Photo keys stay URL-shaped — "images/x.jpg"
 * both in R2 and in the manifest — so only the scripts, which touch the disk,
 * need to know that the website lives one level down.
 */
export const SITE_DIR = 'public';

/**
 * Every photo in images/, plus one level of sub-folders — the same two levels
 * the PHP scans. Returns them ordered as the site will show them.
 */
export async function findPhotos(root = process.cwd()) {
  const base = join(root, SITE_DIR, config.imagesPath);
  const out = [];

  const scan = async (dir, prefix, depth) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;   // no images folder yet
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth === 0) await scan(path, `${prefix}${entry.name}/`, 1);
        continue;
      }
      const key = `${config.imagesPath}/${prefix}${entry.name}`;
      if (!isPhoto(key)) continue;
      const info = await stat(path);
      out.push({ path, key, mtime: info.mtimeMs, bytes: info.size });
    }
  };

  await scan(base, '', 0);

  if (config.gallerySort === 'name') {
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    out.sort((a, b) => collator.compare(a.key, b.key));
  } else {
    out.sort((a, b) => b.mtime - a.mtime);
  }
  return out;
}

/** Pixel dimensions, read from the file's header. Null if unreadable. */
export async function dimensions(path) {
  try {
    const handle = await import('node:fs/promises').then((m) => m.open(path, 'r'));
    try {
      const buffer = Buffer.alloc(HEADER_BYTES);
      const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0);
      return imageSize(buffer.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

/** Hand-written captions from images/captions.json, if it exists. */
export async function readCaptions(root = process.cwd()) {
  try {
    const text = await readFile(join(root, SITE_DIR, config.imagesPath, 'captions.json'), 'utf8');
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function relativeKey(key) {
  const prefix = `${config.imagesPath}/`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}
