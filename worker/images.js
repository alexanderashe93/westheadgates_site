/**
 * Westhead Gates — gallery image index for Cloudflare.
 *
 * The port of api/images.php. Same JSON, same rules, so the front end does
 * not know or care which one answered:
 *
 *   images/gate.jpg                   -> no category
 *   images/sliding-gates/estate.jpg   -> category "Sliding gates"
 *   01-estate-gates-in-oak.jpg        -> caption "Estate gates in oak"
 *
 * Where the photos live depends on how the Worker is bound:
 *
 *   R2 bucket (IMAGES)  the normal case. Drag photos into the bucket in the
 *                       Cloudflare dashboard and they appear on the site —
 *                       no redeploy, which is the whole point of the gallery.
 *   static assets       the fallback, reading the images/images.json written
 *                       by `npm run manifest`. Needs a deploy per photo.
 */

import { config } from './config.js';
import { imageSize, HEADER_BYTES } from './imagesize.js';

/** Dimensions come from each photo's header bytes, which costs one small
 *  ranged read per photo — but only when the edge cache has expired, so at
 *  most once every galleryCacheSeconds. Cap it anyway: beyond this the
 *  gallery still renders, the tiles just use the stand-in heights in
 *  gallery.js until the photos load. */
const MAX_DIMENSION_READS = 120;

export async function handleImages(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/images.php', request.url).toString(), {
    method: 'GET',
  });

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const payload = env.IMAGES
    ? await fromBucket(env)
    : await fromManifest(request, env);

  const response = json(payload, payload.ok ? 200 : 404, {
    'Cache-Control': `public, max-age=${config.galleryCacheSeconds}`,
  });

  if (payload.ok) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/* ------------------------------------------------------------------ R2 ---- */

async function fromBucket(env) {
  const objects = [];
  let cursor;

  do {
    const page = await env.IMAGES.list({ cursor, limit: 1000 });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  // Hand-written captions, if captions.json has been put in the bucket.
  const captions = await readCaptions(env);

  const files = objects
    .filter((o) => isPhoto(o.key))
    .map((o) => ({
      key: o.key,
      // Only the images folder itself and one level below it, as on Plesk.
      category: categoryOf(o.key),
      uploaded: o.uploaded ? new Date(o.uploaded).getTime() : 0,
    }))
    .filter((f) => f.category !== null);

  if (!files.length) {
    return {
      ok: true,
      count: 0,
      message: 'No photos in the bucket yet.',
      images: [],
    };
  }

  sortFiles(files, (f) => f.key, (f) => f.uploaded);

  // Dimensions let the gallery reserve the right shape before a photo loads,
  // so the page does not jump around as they arrive.
  let reads = 0;
  const images = [];
  for (const file of files) {
    const size = reads++ < MAX_DIMENSION_READS ? await sizeOf(env, file.key) : null;
    images.push({
      src: encodePath(file.key),
      caption: captions[relative(file.key)] || captionFrom(file.key),
      category: file.category,
      width: size?.width ?? null,
      height: size?.height ?? null,
    });
  }

  return { ok: true, count: images.length, cached: false, images };
}

async function sizeOf(env, key) {
  try {
    const object = await env.IMAGES.get(key, {
      range: { offset: 0, length: HEADER_BYTES },
    });
    if (!object) return null;
    return imageSize(await object.arrayBuffer());
  } catch {
    return null;   // a photo without dimensions still renders
  }
}

async function readCaptions(env) {
  try {
    const object = await env.IMAGES.get(`${config.imagesPath}/captions.json`);
    if (!object) return {};
    const parsed = JSON.parse(await object.text());
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------- static fallback --- */

async function fromManifest(request, env) {
  if (!env.ASSETS) {
    return {
      ok: false,
      message: 'No image source is configured. Bind an R2 bucket as IMAGES.',
      images: [],
    };
  }

  const url = new URL(`/${config.imagesPath}/images.json`, request.url);
  const response = await env.ASSETS.fetch(new Request(url, { method: 'GET' }));

  if (!response.ok) {
    return {
      ok: false,
      message:
        `No photos found. Either bind an R2 bucket as IMAGES, or run ` +
        `"npm run manifest" to build ${config.imagesPath}/images.json and deploy again.`,
      images: [],
    };
  }

  const data = await response.json();
  const images = Array.isArray(data) ? data : data.images || [];
  return { ok: true, count: images.length, cached: false, images };
}

/* --------------------------------------------------------------- helpers -- */

export function isPhoto(key) {
  const ext = key.split('.').pop().toLowerCase();
  return config.imageExtensions.includes(ext);
}

/**
 * Keys are stored exactly as the paths the browser asks for, so an object at
 * images/railings/juliet.jpg is served at /images/railings/juliet.jpg.
 * Returns the filter label, '' for a loose photo, or null for anything
 * nested deeper than one folder — which the PHP version ignores too.
 */
export function categoryOf(key) {
  const prefix = `${config.imagesPath}/`;
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const parts = rest.split('/');
  if (parts.length === 1) return '';
  if (parts.length === 2) return titleCase(parts[0].replace(/[-_]+/g, ' '));
  return null;
}

export function relative(key) {
  const prefix = `${config.imagesPath}/`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

/** "01-estate-gates_in-oak.JPG" -> "Estate gates in oak" */
export function captionFrom(key) {
  const file = key.split('/').pop().replace(/\.[^.]+$/, '');
  const name = file
    .replace(/^\d+\s*[-_. ]\s*/, '')     // drop an ordering prefix
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCase(name);
}

function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function encodePath(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function sortFiles(files, nameOf, timeOf) {
  if (config.gallerySort === 'name') {
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    files.sort((a, b) => collator.compare(nameOf(a), nameOf(b)));
  } else {
    files.sort((a, b) => timeOf(b) - timeOf(a));
  }
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}
