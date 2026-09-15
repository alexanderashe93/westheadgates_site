#!/usr/bin/env node
/**
 * Build the gallery's photo list from whatever is in public/images/.
 *
 *   npm run build
 *
 * Nothing is hard-coded anywhere: add a photo to the folder, merge to main,
 * and the deploy picks it up. The rules are the ones the site was designed
 * around and they have not changed:
 *
 *   images/gate.jpg                   ->  no category
 *   images/sliding-gates/estate.jpg   ->  filter button "Sliding gates"
 *   01-estate-gates-in-oak.jpg        ->  caption "Estate gates in oak"
 *
 * To write a caption by hand instead, add public/images/captions.json:
 *
 *   { "sliding-gates/estate.jpg": "Estate gates in oak" }
 *
 * The output, public/images/images.json, is generated — it is not committed,
 * and gallery.js fetches it straight off the edge with no Worker involved.
 */

import { readdir, readFile, writeFile, stat, open } from 'node:fs/promises';
import { join } from 'node:path';
import { imageSize, HEADER_BYTES } from './imagesize.mjs';

/** The folder that is the website. */
const SITE = 'public';

/** Where photos live inside it, and the URL they are served under. */
const IMAGES = 'images';

/** Anything else in the folder is ignored. */
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];

/** Newest first. Set to 'name' to order by filename instead, which lets you
 *  control the order with prefixes like 01-, 02-, 03-. */
const SORT = 'newest';

const root = process.cwd();
const base = join(root, SITE, IMAGES);

const photos = [];

// The images folder itself, plus one level of sub-folders. One level is the
// limit on purpose: a folder is a filter button, and filters do not nest.
await scan(base, '', 0);

if (SORT === 'name') {
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  photos.sort((a, b) => collator.compare(a.key, b.key));
} else {
  photos.sort((a, b) => b.mtime - a.mtime);
}

const captions = await readCaptions();

const images = [];
for (const photo of photos) {
  const size = await dimensions(photo.path);
  images.push({
    src: encodePath(`${IMAGES}/${photo.key}`),
    caption: captions[photo.key] || captionFrom(photo.key),
    category: photo.category,
    width: size?.width ?? null,
    height: size?.height ?? null,
  });
}

const out = join(base, 'images.json');
await writeFile(out, JSON.stringify({ ok: true, count: images.length, images }, null, 2) + '\n');

console.log(`${images.length} photo${images.length === 1 ? '' : 's'} -> ${SITE}/${IMAGES}/images.json`);
if (!images.length) {
  console.log(`Nothing in ${SITE}/${IMAGES}/ yet. Drop some photos in and run this again.`);
}

/* --------------------------------------------------------------------------- */

async function scan(dir, prefix, depth) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;                                   // no images folder yet
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth === 0) await scan(path, `${entry.name}/`, 1);
      continue;
    }
    if (!EXTENSIONS.includes(extension(entry.name))) continue;
    const info = await stat(path);
    photos.push({
      path,
      key: prefix + entry.name,
      category: prefix ? titleCase(prefix.slice(0, -1).replace(/[-_]+/g, ' ')) : '',
      mtime: info.mtimeMs,
    });
  }
}

/** Pixel dimensions, so the gallery can reserve each tile's shape before the
 *  photo arrives and the page does not jump about as they load. */
async function dimensions(path) {
  let handle;
  try {
    handle = await open(path, 'r');
    const buffer = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0);
    return imageSize(buffer.subarray(0, bytesRead));
  } catch {
    return null;                              // a photo without them still renders
  } finally {
    await handle?.close();
  }
}

async function readCaptions() {
  try {
    const parsed = JSON.parse(await readFile(join(base, 'captions.json'), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** "01-estate-gates_in-oak.JPG" -> "Estate gates in oak" */
function captionFrom(key) {
  return titleCase(
    key.split('/').pop()
      .replace(/\.[^.]+$/, '')
      .replace(/^\d+\s*[-_. ]\s*/, '')        // drop an ordering prefix
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extension(name) {
  return name.split('.').pop().toLowerCase();
}

function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}
