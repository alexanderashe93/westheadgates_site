#!/usr/bin/env node
/**
 * Build images/images.json from whatever is in images/.
 *
 * Only needed if you are NOT using the R2 bucket — with R2 the Worker reads
 * the bucket directly and there is no list to build. Run this before a deploy
 * and the photos ship with the site.
 *
 *   npm run manifest
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  config, SITE_DIR, findPhotos, dimensions, readCaptions,
  captionFrom, categoryOf, encodePath, relativeKey,
} from './lib.mjs';

const root = process.cwd();
const photos = await findPhotos(root);
const captions = await readCaptions(root);

const images = [];
for (const photo of photos) {
  const category = categoryOf(photo.key);
  if (category === null) continue;      // nested deeper than one folder
  const size = await dimensions(photo.path);
  images.push({
    src: encodePath(photo.key),
    caption: captions[relativeKey(photo.key)] || captionFrom(photo.key),
    category,
    width: size?.width ?? null,
    height: size?.height ?? null,
  });
}

const out = join(root, SITE_DIR, config.imagesPath, 'images.json');
await writeFile(out, JSON.stringify({ ok: true, count: images.length, images }, null, 2) + '\n');

console.log(`${images.length} photo${images.length === 1 ? '' : 's'} -> ${SITE_DIR}/${config.imagesPath}/images.json`);
if (!images.length) {
  console.log(`Nothing in ${SITE_DIR}/${config.imagesPath}/ yet. Drop some photos in and run this again.`);
}
