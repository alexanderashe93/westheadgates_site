#!/usr/bin/env node
/**
 * Upload everything in images/ to the R2 bucket.
 *
 *   npm run push-images
 *
 * This is a convenience for the first load and for bulk changes. Day to day
 * the client does not need it: photos can be dragged straight into the bucket
 * in the Cloudflare dashboard, and the gallery picks them up on its own.
 *
 * Set R2_TARGET=local to fill the bucket that `npm run dev` uses instead of
 * the real one, so the gallery can be tried out before anything is published.
 */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config, SITE_DIR, findPhotos } from './lib.mjs';

const CONTENT_TYPES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  json: 'application/json',
};

const target = process.env.R2_TARGET === 'local' ? '--local' : '--remote';
const bucket = await bucketName();
const root = process.cwd();
const photos = await findPhotos(root);

if (!photos.length) {
  console.log(`Nothing in ${SITE_DIR}/${config.imagesPath}/ to upload.`);
  process.exit(0);
}

console.log(`Uploading ${photos.length} photo${photos.length === 1 ? '' : 's'} to ${bucket} (${target.slice(2)})\n`);

let done = 0;
for (const photo of photos) {
  const args = [
    'wrangler', 'r2', 'object', 'put', `${bucket}/${photo.key}`,
    '--file', photo.path,
    '--content-type', CONTENT_TYPES[extension(photo.key)] || 'application/octet-stream',
    target,
  ];

  await run(args);
  done++;
  console.log(`  ${String(done).padStart(3)}/${photos.length}  ${photo.key}`);
}

// Hand-written captions belong in the bucket too, next to the photos.
const captionsPath = join(root, SITE_DIR, config.imagesPath, 'captions.json');
if (existsSync(captionsPath)) {
  await run([
    'wrangler', 'r2', 'object', 'put', `${bucket}/${config.imagesPath}/captions.json`,
    '--file', captionsPath, '--content-type', 'application/json', target,
  ]);
  console.log('\n  captions.json uploaded');
}

console.log('\nDone. The gallery will show them within ' +
  `${Math.round(config.galleryCacheSeconds / 60)} minutes.`);

/* --------------------------------------------------------------- helpers -- */

function extension(key) {
  return key.split('.').pop().toLowerCase();
}

/** Read the bucket name out of wrangler.toml rather than repeating it here. */
async function bucketName() {
  const toml = await readFile(join(process.cwd(), 'wrangler.toml'), 'utf8');
  // Only look at lines that are actually in force, not the commented examples.
  const line = toml
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('#'))
    .find((l) => l.includes('bucket_name'));
  const match = line && line.match(/bucket_name\s*=\s*"([^"]+)"/);
  if (!match) {
    console.error('No active bucket_name found in wrangler.toml — is the R2 binding commented out?');
    process.exit(1);
  }
  return match[1];
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args.slice(0, 5).join(' ')} exited with ${code}`));
    });
  });
}
