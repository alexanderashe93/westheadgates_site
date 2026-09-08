/**
 * Westhead Gates — Cloudflare Worker.
 *
 * The site is static HTML and stays that way. This Worker exists to do the
 * two jobs the PHP does on Plesk, and to apply the headers .htaccess applies
 * there. Everything else is handed straight to Cloudflare's static assets.
 *
 *   /api/images.php     the gallery index      -> worker/images.js
 *   /api/contact.php    the enquiry form       -> worker/contact.js
 *   /images/...         photos, from R2 when a bucket is bound
 *   anything else       the static site
 *
 * The .php paths are kept deliberately: they are what the front end already
 * asks for, so one set of HTML, CSS and JavaScript deploys to both hosts
 * with nothing to change. The extensionless forms work too.
 */

import { handleImages } from './images.js';
import { handleContact } from './contact.js';
import { config } from './config.js';

/** Applied to every response, matching the header block in .htaccess. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  // Cloudflare terminates TLS, so unlike on Plesk this is safe from day one.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);

    try {
      if (path === '/api/images.php' || path === '/api/images') {
        return finish(await handleImages(request, env, ctx));
      }

      if (path === '/api/contact.php' || path === '/api/contact') {
        return finish(await handleContact(request, env));
      }

      // Nothing else under /api/ is a real endpoint. The PHP source and the
      // cache folder are excluded from the upload by .assetsignore, but say
      // so plainly rather than letting them fall through to the 404 page.
      if (path.startsWith('/api/')) {
        return finish(new Response('Not found', { status: 404 }));
      }

      if (env.IMAGES && path.startsWith(`/${config.imagesPath}/`)) {
        return finish(await serveImage(path, request, env));
      }

      return finish(await serveAsset(request, env));
    } catch (error) {
      console.error(`westheadgates: ${error.stack || error.message}`);
      return finish(new Response('Something went wrong.', { status: 500 }));
    }
  },
};

/* ---------------------------------------------------------------- photos -- */

async function serveImage(path, request, env) {
  const key = path.slice(1);   // "/images/x.jpg" -> "images/x.jpg"

  // captions.json is data for the gallery index, not something to serve.
  if (key === `${config.imagesPath}/captions.json`) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.IMAGES.get(key, {
    // Lets the browser skip the download when it already has the file.
    onlyIf: request.headers,
    range: request.headers,
  });

  if (!object) {
    // Not in the bucket: it may still be a file shipped with the site.
    return serveAsset(request, env);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=2592000');   // a month, as .htaccess

  if (!('body' in object)) {
    return new Response(null, { status: 304, headers });   // matched onlyIf
  }
  if (object.range && object.size && object.range.length !== object.size) {
    const { offset = 0, length = object.size } = object.range;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
}

/* ------------------------------------------------------------- the site --- */

/**
 * Hand back to Cloudflare's static assets. Caching and security headers for
 * those come from public/_headers, so there is nothing to add here — this is
 * the fallback for a photo that isn't in the bucket, and the safety net if
 * run_worker_first is ever widened in wrangler.toml.
 */
async function serveAsset(request, env) {
  if (!env.ASSETS) {
    return new Response('No static assets are bound to this Worker.', { status: 500 });
  }
  return env.ASSETS.fetch(request);
}

function finish(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
