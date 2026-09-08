# Westhead Gates Ltd — brochure website

A three-page static site (home, gallery, contact). Plain HTML, CSS and
JavaScript — no framework, no build step for the site itself.

It runs on either of two hosts, from the same source:

| Host           | What runs the two dynamic bits                       |
|----------------|------------------------------------------------------|
| **Plesk**      | `public/api/*.php` — upload and it works              |
| **Cloudflare** | `worker/` — a Worker doing the same two jobs (§10)    |

**`public/` is the website.** Everything outside it — `worker/`, `scripts/`,
`.mockup/` — is tooling and never reaches the web.

---

## 1. Deploying to Plesk

1. In Plesk, open **Websites & Domains → File Manager** for your domain.
2. Upload the contents of **`public/`** into `httpdocs/`
   (the files inside it, not the folder itself).
3. Check **Websites & Domains → PHP Settings** shows PHP **7.4 or newer**
   and that PHP is switched on for the domain.
4. Make sure `public/api/cache/` is writable by the web server. Plesk usually
   handles this; if the gallery seems slow on every load, set that folder to
   `755` and confirm its owner matches the domain's system user.
5. Install an SSL certificate (**SSL/TLS Certificates → Let's Encrypt**),
   then uncomment the HTTPS redirect block in `.htaccess`.

That's the whole deployment. There is nothing to compile.

---

## 2. Filling in your details

Every placeholder is wrapped in `[SQUARE BRACKETS]` so you can find them all:

```bash
grep -rn "\[" --include="*.html" --include="*.php" . | grep -v node_modules
```

The ones that appear on every page:

| Placeholder            | Count | What to put there                                  |
|------------------------|-------|----------------------------------------------------|
| `[YOUR PHONE]`         | 13    | Displayed number, e.g. `01695 123456`              |
| `[YOURPHONE-E164]`     | 13    | Same number for `tel:` links, e.g. `+441695123456` |
| `[YOUR MOBILE]`        | 1     | Mobile number                                       |
| `[YOUR AREA]`          | 4     | Area covered, e.g. `West Lancashire`                |
| `[YOUR TOWN]`          | 4     | Where the workshop is                               |
| `[Unit / street]`      | 2     | Street address                                      |
| `[Town]` `[Postcode]`  | 10    | Town and postcode                                   |
| `[NUMBER]`             | 6     | Company number and VAT number                       |

**Already filled in:** the email `info@westhead-gates.co.uk` and the domain
`westhead-gates.co.uk` (meta tags, sitemap, robots.txt and `api/config.php`).

Page-specific ones to deal with before launch:

- **index.html** — the line under the hero buttons (`[25] years in the trade ·
  [500]+ gates fitted · Fully insured`) and the `[12] month guarantee`. If any
  of those numbers aren't real, delete them rather than rounding — this is
  the one thing customers actually check.
- **contact.html** — opening hours and the `[one working day]` response time.
- **privacy.html** — a scaffold. It is a legal requirement once the contact
  form is live. Write it before launch.

---

## 3. The gallery

**Drop photos into `/images/` and they appear.** Nothing is hard-coded and
there is no list to maintain. Delete a photo and it disappears.

Sub-folders become filter buttons:

```
images/
  driveway-gates/          ->  a "Driveway gates" filter
    01-oak-clad-gates.jpg
  railings/                ->  a "Railings" filter
    juliet-balcony.jpg
  a-loose-photo.jpg        ->  appears under "All", no category
```

Use no sub-folders and the filter row hides itself.

**Captions** come from the filename — `estate-gates-in-oak.jpg` becomes
"Estate gates in oak", and a `01-` style ordering prefix is stripped. To
write captions by hand, create `images/captions.json`:

```json
{
  "driveway-gates/oak-clad-gates.jpg": "Oak-clad gates, Ormskirk",
  "railings/juliet-balcony.jpg": "Juliet balcony, powder-coated black"
}
```

**Order** is newest-first by file date. To control it yourself, set
`'gallery_sort' => 'name'` in `api/config.php` and prefix filenames with
`01-`, `02-` and so on.

**Resize before uploading** — around 2000px on the long edge at ~80% quality.
Camera originals are often 8MB+, which makes the gallery painful on mobile
data. There is no server-side resizing.

### How it works

`assets/js/gallery.js` asks `api/images.php` for the photo list and renders
it. What answers depends on the host:

- **On Plesk**, `public/api/images.php` reads the folder. Results are cached
  in `api/cache/gallery.json`, and the cache invalidates automatically when a
  file is added, removed, renamed, or when `captions.json` changes.
- **On Cloudflare**, the Worker lists the R2 bucket instead and caches the
  result at the edge for five minutes. Same JSON, same rules — sub-folders
  are still categories, filenames are still captions.

If neither is available the script falls back to a static
`images/images.json`, and failing that shows a diagnostic message rather than
an empty page.

---

## 4. The contact form

There is one settings file per host, and they hold the same settings:
**`public/api/config.php`** for Plesk, **`worker/config.js`** for Cloudflare.
Change the recipient in one, change it in the other.

On Plesk, edit `public/api/config.php`:

```php
'enquiry_recipients' => array('info@westhead-gates.co.uk'),   // already set
'mail_from'          => 'website@westhead-gates.co.uk',       // already set
```

Enquiries go to **info@westhead-gates.co.uk**. The one job left is to create
the `website@westhead-gates.co.uk` mailbox in Plesk under **Mail → Create
Email Address** — it is what the site sends *from*.

`mail_from` **must be an address on your own domain**, and ideally a real
mailbox created in Plesk under **Mail → Create Email Address**. Sending from
the visitor's own address is what lands enquiries in spam or gets them
rejected by SPF. The visitor's address goes in `Reply-To`, so hitting reply
in your inbox still works.

The form is protected by three layers: a hidden honeypot field, a minimum
time-on-page check, and a per-IP hourly rate limit. It works with JavaScript
switched off, and validates inline when it's on. All three behave the same on
both hosts; see §10 for how sending differs on Cloudflare, which has no mail
server of its own.

**Test it end to end before launch**, and check the message doesn't land in
spam. If nothing arrives, look at the domain's error log in Plesk under
**Logs** — failures are recorded there via `error_log()`.

---

## 5. Safety claims

The home page says, under *Why people choose us*:

> **Safety-tested and certified.** An automatic gate is legally machinery —
> we treat it that way.

That is deliberately a plain statement of practice rather than a claim about
what any particular standard requires. The earlier draft named BS EN 12453,
BS EN 12604 and the Supply of Machinery (Safety) Regulations 2008 with
descriptions of each; those descriptions were never written, because the
source documents you sent were blocked by this environment's network policy
and inaccurate regulatory claims on a commercial site carry real risk.

If you want the standards named on the site, send me the relevant passages
and I'll write that section properly. As it stands the line is safe to
publish.

---

## 6. Branding and colour

### The logo

`assets/img/logo.svg` is the logo you supplied, converted from the PDF into
SVG so it stays sharp at any size and loads in a single small file. Nothing
was redrawn — the paths and both metallic gradients are the artwork itself.

It appears in the header and in the footer, and it drives three other files
generated from the same artwork:

| File                              | What it is                              |
|-----------------------------------|-----------------------------------------|
| `assets/img/logo.svg`             | The full logo, header and footer         |
| `assets/img/favicon.svg`          | The gate alone, on black — browser tab   |
| `assets/img/apple-touch-icon.png` | The same, 180×180, for iOS home screens  |
| `assets/img/og.png`               | The link-preview card, 1200×630          |

**To replace the logo**, drop a new `assets/img/logo.svg` (or `.png`) in and
change the `src` in the four HTML files. If the file is ever missing the site
falls back to a plain mark and wordmark rather than showing a broken image.

**The header is dark on purpose.** The wordmark is a metallic gradient running
from white on the left to near-black on the right, which is designed to sit on
a dark ground — on a white bar the left half of "WESTHEAD" disappears. The bar
is `#1a1a1a` rather than pure black so the last two letters still separate
from it.

### Colour

Taken from the logo and the flyer: black ground, brass accent, silver
secondary. Everything is driven by the custom properties at the top of
`assets/css/style.css`:

```css
--dark:     #111111;   /* headings, footer, CTA ground                */
--darker:   #000000;   /* footer base                                 */
--head:     #1a1a1a;   /* the header bar                              */
--accent:   #d9a227;   /* every action: buttons, links, active states */
--accent-d: #a87814;   /* the shadow under a button                   */
--accent-t: #111111;   /* text sitting on the accent                  */
--silver:   #b9b9b9;   /* the flyer's secondary band                  */
--warm:     #f5f4f2;   /* alternating section ground                  */
--line:     #e2e0dc;   /* borders                                     */
```

Change those and the whole site follows. Nothing else needs touching.

The brass in the logo is CMYK **C38 M56 Y98 K25** — that is the value in the
artwork itself. `--accent` is a brighter screen gold, because the print value
is too dark to work as a button next to white. If your designer has an agreed
RGB or hex for screen, put it in `--accent` and the site takes it.

Type is **Bitter** for headings and **Libre Franklin** for body, loaded from
Google Fonts with real fallback stacks.

---

## 7. Files

```
public/                       >>> THE WEBSITE <<<  this is what gets uploaded
  index.html                  Home
  gallery.html                Gallery — auto-populated from the photos
  contact.html                Contact — enquiry form and details
  privacy.html                Privacy notice (scaffold — needs writing)
  404.html                    Not-found page

  assets/css/style.css        All styling. Design tokens are at the top in :root.
  assets/js/main.js           Mobile nav, logo swap, optional photos, footer year
  assets/js/gallery.js        Loads the photo list, builds the grid and lightbox
  assets/js/contact.js        Inline validation and background submit
  assets/img/                 The logo, favicon and link-preview card

  api/config.php              >>> EDIT THIS ONE (Plesk) <<<  email + gallery
  api/images.php              Reads images/ and returns JSON
  api/contact.php             Validates and emails the contact form
  api/cache/                  Auto-generated. Safe to delete; rebuilds itself.

  images/                     >>> YOUR PHOTOS GO HERE <<<  (Plesk; R2 on Cloudflare)
  .htaccess                   Caching, security headers, tidy URLs, HTTPS redirect
  _headers                    The same, for Cloudflare's static files
  .assetsignore               What inside public/ Cloudflare must not publish
  robots.txt                  Update the sitemap URL
  sitemap.xml                 Update the domain

worker/                       The Cloudflare Worker — see §10
scripts/                      Deployment helpers — see §10
wrangler.toml                 Cloudflare bindings and settings
.mockup/                      Design sources and the client prototype. Not served.
```

### Photos you still need to add

| Path                              | Used for                       |
|-----------------------------------|--------------------------------|
| `public/assets/img/hero.jpg`      | Home page hero photo           |
| `public/assets/img/workshop.jpg`  | "Why people choose us" section |

Both are marked `data-optional`, so until you upload them the page hides the
empty frame rather than showing a broken image — nothing looks wrong, there
is just less on the page. The hero is worth getting right: it is the first
thing anyone sees.

The favicon, the iOS icon and the link-preview card are already there,
generated from the logo — see §6.

---

## 8. Editing pages later

The navigation and footer are repeated in each HTML file. That is the trade
for a site with no build step: changing the phone number means editing it in
four places. With three pages plus the privacy notice that is a fair deal,
and it means anyone can edit the site in Plesk's file manager without
tooling. If the site ever grows past about six pages, say so and I'll convert
the header and footer to PHP includes — still no build step, one file to
edit.

Colours, fonts and spacing are CSS custom properties at the top of
`assets/css/style.css` — see §6.

---

## 9. Local preview

**The Plesk build** — PHP's own server is enough:

```bash
cd public && php -S localhost:8000
```

**The Cloudflare build** — run the Worker exactly as it will run live:

```bash
npm install          # once
npm run dev          # http://localhost:8787
```

Both serve the whole site with a working gallery and contact form, so you can
test properly before uploading anything.

To try the contact form locally without sending real email, start it with the
console provider — the enquiry is printed in the terminal instead:

```bash
npx wrangler dev --var MAIL_PROVIDER:log
```

And to fill the local gallery from the photos in `public/images/`:

```bash
R2_TARGET=local npm run push-images
```

---

## 10. Deploying to Cloudflare

Workers cannot run PHP, so the two dynamic parts are ported: `worker/` does
the same two jobs, answering on the same URLs (`/api/images.php` and
`/api/contact.php`). The HTML, CSS and JavaScript are untouched and identical
on both hosts.

Two things genuinely change, because Cloudflare has no filesystem and no mail
server:

| On Plesk                        | On Cloudflare                                |
|---------------------------------|----------------------------------------------|
| Photos in `public/images/`      | Photos in an **R2 bucket**                    |
| `mail()` via the local server   | An **email API** — Resend, SendGrid or Mailgun |

### First deployment

```bash
npm install
npx wrangler login
```

**1. Create the photo bucket.**

```bash
npx wrangler r2 bucket create westhead-gates-images
npm run push-images          # uploads what is in public/images/
```

**2. Set up sending.** Pick a provider, verify `westhead-gates.co.uk` with
them, create an API key, then:

```bash
npx wrangler secret put MAIL_API_KEY
```

The provider is chosen by `MAIL_PROVIDER` in `wrangler.toml` — `resend`
(the default and the least setup), `sendgrid`, or `mailgun`. Verifying the
domain is the step that keeps enquiries out of the junk folder; without it
they will be rejected or filtered.

**3. Turn on the rate limit** (optional but worth it):

```bash
npx wrangler kv namespace create RATE
```

Paste the id it prints into the `[[kv_namespaces]]` block in `wrangler.toml`
and uncomment it. Without this the form still works, it just isn't limited.

**4. Deploy.**

```bash
npm run deploy
```

**5. Point the domain at it.** In the Cloudflare dashboard, open the Worker,
then **Settings → Domains & Routes → Add custom domain**, and add
`westhead-gates.co.uk` and `www.westhead-gates.co.uk`. TLS is issued
automatically — there is no certificate to install and no HTTPS redirect to
uncomment.

### Adding photos afterwards

**Cloudflare dashboard → R2 → westhead-gates-images → Upload.** Drag the
photos in and they are on the site within five minutes. No deploy, no
developer, and folders inside the bucket become the gallery's filter buttons
exactly as they do on Plesk.

`npm run push-images` does the same thing in bulk from `public/images/`.

### Not using R2?

Comment out the `[[r2_buckets]]` block in `wrangler.toml`. The gallery then
reads a list built from `public/images/` at deploy time:

```bash
npm run manifest && npm run deploy
```

The catch is that every new photo needs a deploy, which is exactly what the
bucket avoids. Use R2 unless there is a reason not to.

### Watching it run

```bash
npm run tail
```

Live logs from the deployed Worker. A failed enquiry is written there in
full, so nothing is lost while a mail provider is being sorted out.

### What is where

```
wrangler.toml         Bindings and settings. Bucket name, mail provider.
worker/config.js      >>> EDIT THIS ONE <<<  the Cloudflare twin of api/config.php
worker/index.js       Routing, and the security headers .htaccess sets on Plesk
worker/images.js      The gallery index — lists R2, applies the naming rules
worker/contact.js     The enquiry form — validation and spam checks
worker/mail.js        Sending, via Resend / SendGrid / Mailgun
worker/imagesize.js   Reads pixel dimensions from image headers
scripts/push-images.mjs   Bulk upload public/images/ to the bucket
scripts/manifest.mjs      Builds images/images.json for the no-R2 route
public/_headers       Caching and security headers for the static files
public/.assetsignore  What inside public/ must not be published to Cloudflare
```
