/**
 * Westhead Gates Ltd — Cloudflare Worker.
 *
 * The site is static HTML and stays that way. Cloudflare serves every page,
 * stylesheet, script and photo straight off the edge without waking this
 * Worker; the gallery reads a list built at deploy time, so it needs no code
 * either. The one thing that cannot be a file is the contact form, and that
 * is all this handles.
 *
 *   POST /api/contact   ->  worker/contact.js
 *   everything else     ->  the static site in public/
 */

import { handleContact } from './contact.js';

/** The header block a normal server would apply. public/_headers sets the
 *  same ones on the static files; this covers the Worker's own replies. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    try {
      if (path === '/api/contact') {
        return withHeaders(await handleContact(request, env));
      }
      if (path.startsWith('/api/')) {
        return withHeaders(new Response('Not found', { status: 404 }));
      }
      // Only /api/* reaches the Worker (see run_worker_first in
      // wrangler.toml), so this is a safety net rather than the usual path.
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(`westheadgates: ${error.stack || error.message}`);
      return withHeaders(new Response('Something went wrong.', { status: 500 }));
    }
  },
};

function withHeaders(response) {
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
