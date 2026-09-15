# Westhead Gates Ltd — brochure website

A three-page static site (home, gallery, contact) hosted on Cloudflare.
Plain HTML, CSS and JavaScript — no framework, no front-end build.

**`public/` is the website.** Everything outside it — `worker/`, `scripts/`,
`.github/` — is tooling and never reaches the web.

Almost all of it is static files served straight off Cloudflare's edge. One
small Worker handles the contact form, because that is the only thing that
cannot be a file.

---

## 1. Deploying

**Merge to `main`.** That is the whole deployment.

The GitHub Action in `.github/workflows/deploy.yml` builds the gallery's
photo list and pushes the site to Cloudflare on every merge. There is nothing
to run by hand.

First-time setup is in §8. To deploy from your own machine instead:

```bash
npm install
npm run deploy
```

---

## 2. Filling in your details

Everything still unconfirmed is wrapped in `[SQUARE BRACKETS]`:

```bash
grep -rno '\[[^]]*\]' public/*.html
```

What is left:

| Placeholder                     | Where            | What to put there              |
|---------------------------------|------------------|--------------------------------|
| `[NUMBER]` ×6                   | every page footer| Company number and VAT number  |
| `[25]` `[500]` `[12]`           | home             | Years, jobs completed, guarantee |
| `[7.30am – 5pm]` `[8am – 12pm]` | contact          | Real opening hours             |
| `[one working day]`             | contact          | Response time you will honour  |
| `[State a real retention period.]` | privacy       | How long enquiries are kept    |

The name, address, phone, email and domain are all filled in.

**On the three home page numbers:** if any of them aren't real, delete the
line rather than rounding. It is the one thing customers actually check.

**privacy.html is a scaffold.** It is a legal requirement once the contact
form is live. Write it before launch.

---

## 3. The gallery

**Put photos in `public/images/`, merge to main, and they appear.** Nothing
is hard-coded and there is no list to maintain. Delete a photo and it goes.

Sub-folders become filter buttons:

```
public/images/
  sliding-gates/           ->  a "Sliding gates" filter
    01-oak-clad-gates.jpg
  staircases/              ->  a "Staircases" filter
    spiral-in-oak.jpg
  a-loose-photo.jpg        ->  appears under "All", no category
```

Use no sub-folders and the filter row hides itself. Folders only go one level
deep, because a folder is a filter button and filters do not nest.

**Captions** come from the filename — `estate-gates-in-oak.jpg` becomes
"Estate gates in oak", and a `01-` style ordering prefix is stripped. To
write captions by hand, create `public/images/captions.json`:

```json
{
  "sliding-gates/oak-clad-gates.jpg": "Oak-clad gates, 4.2m opening",
  "staircases/spiral-in-oak.jpg": "Spiral staircase, steel and oak"
}
```

**Order** is newest-first by file date. To control it yourself, change `SORT`
to `'name'` at the top of `scripts/build-gallery.mjs` and prefix filenames
with `01-`, `02-` and so on.

**Resize before committing** — around 2000px on the long edge at ~80%
quality. Camera originals are often 8MB+, which makes the gallery painful on
mobile data, and they go into git history for good. There is no server-side
resizing.

### How it works

`scripts/build-gallery.mjs` walks `public/images/` and writes
`public/images/images.json` — every photo with its caption, category and
pixel dimensions. It runs in the GitHub Action before each deploy, so the
list is always in step with the folder.

`public/assets/js/gallery.js` fetches that file and renders the grid. It is a
static file served off the edge, so the gallery costs no Worker invocations
at all and the Worker never touches a photo.

`images.json` is generated and deliberately **not** committed — it would
conflict on every branch that adds a photo.

---

## 4. The contact form

Edit **`worker/config.js`** — it is the only file you need to touch:

```js
enquiryRecipients: ['info@westhead-gates.co.uk'],   // already set
mailFrom: 'website@westhead-gates.co.uk',           // already set
```

Enquiries go to **info@westhead-gates.co.uk**.

A Worker has no mail server of its own, so the message goes out over HTTPS
through a provider — Resend, SendGrid or Mailgun, chosen by `MAIL_PROVIDER`
in `wrangler.toml`. Setting that up is §8.

`mailFrom` **must be an address on a domain you have verified with that
provider**. That verification is the step that keeps enquiries out of the
junk folder; without it they get filtered or rejected outright by SPF. The
visitor's own address goes in `Reply-To`, so hitting reply in your inbox
still works.

The form is protected by three layers: a hidden honeypot field, a minimum
time-on-page check, and a per-IP hourly rate limit — all set in
`worker/config.js`. It works with JavaScript switched off, and validates
inline when it's on.

**Test it end to end before launch**, and check the message doesn't land in
spam. If nothing arrives, run `npm run tail` and submit the form again: a
failed send writes the whole enquiry to the log, so nothing is lost while a
provider is being sorted out.

---

## 5. Claims on the site

There are none that need backing up, and that is deliberate.

An earlier draft sold gate automation and said the gates were "safety-tested
and certified", naming BS EN 12453, BS EN 12604 and the Supply of Machinery
(Safety) Regulations 2008. All of it came out when the client's own flyer
arrived listing six services, none of them automation or repairs. Nothing in
the material they sent supports a certification claim, and an inaccurate
regulatory claim on a commercial site carries real risk.

If they do fit motors and certify powered gates, say so and I'll write that
section properly — but send the relevant passages with it, because the
standards documents were blocked by this environment's network policy and I
won't paraphrase a regulation I haven't read.

The only unverified things left on the site are the numbers in §2.

---

## 6. Branding and colour

### The logo

`public/assets/img/logo.svg` is the logo you supplied, converted from the PDF into
SVG so it stays sharp at any size and loads in a single small file. Nothing
was redrawn — the paths and both metallic gradients are the artwork itself.

It appears in the header and in the footer, and it drives three other files
generated from the same artwork:

| File                                     | What it is                        |
|------------------------------------------|-----------------------------------|
| `public/assets/img/logo.svg`             | The full logo, header and footer  |
| `public/assets/img/favicon.svg`          | The gate alone, on black — browser tab |
| `public/assets/img/apple-touch-icon.png` | The same, 180×180, for iOS home screens |
| `public/assets/img/og.png`               | The link-preview card, 1200×630   |

**To replace the logo**, drop a new `public/assets/img/logo.svg` (or `.png`) in and
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
`public/assets/css/style.css`:

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
public/                     >>> THE WEBSITE <<<  everything here is published
  index.html                Home
  gallery.html              Gallery — filled from images/images.json
  contact.html              Contact — enquiry form and details
  privacy.html              Privacy notice (scaffold — needs writing)
  404.html                  Not-found page

  assets/css/style.css      All styling. Design tokens are at the top in :root.
  assets/js/main.js         Mobile nav, logo swap, optional photos, footer year
  assets/js/gallery.js      Loads the photo list, builds the grid and lightbox
  assets/js/contact.js      Inline validation and background submit
  assets/img/               The logo, favicon and link-preview card

  images/                   >>> YOUR PHOTOS GO HERE <<<
  images/captions.json      Optional hand-written captions
  _headers                  Caching and security headers for the static files
  .assetsignore             What inside public/ must not be published
  robots.txt                Update the sitemap URL
  sitemap.xml               Update the domain

worker/index.js             Routing and security headers
worker/config.js            >>> EDIT THIS ONE <<<  who gets the enquiries
worker/contact.js           The enquiry form — validation and spam checks
worker/mail.js              Sending, via Resend / SendGrid / Mailgun

scripts/build-gallery.mjs   Builds images/images.json from public/images/
scripts/imagesize.mjs       Reads pixel dimensions from image headers

.github/workflows/deploy.yml   Deploys on merge to main
wrangler.toml               Cloudflare settings and bindings
.mockup/                    Design sources and the client prototype. Not served.
```

### Photos you still need to add

| Path                              | Used for                       |
|-----------------------------------|--------------------------------|
| `public/assets/img/hero.jpg`      | Home page hero photo           |
| `public/assets/img/workshop.jpg`  | "Why people choose us" section |

Both are marked `data-optional`, so until you add them the page hides the
empty frame rather than showing a broken image — nothing looks wrong, there
is just less on the page. The hero is worth getting right: it is the first
thing anyone sees.

The favicon, the iOS icon and the link-preview card are already there,
generated from the logo — see §6.

---

## 8. Editing pages later

The navigation and footer are repeated in each HTML file. That is the trade
for pages with no build step: changing the phone number means editing it in
four places. With three pages plus the privacy notice that is a fair deal,
and it keeps the pages editable by anyone who can read HTML. If the site ever
grows past about six pages, say so and I'll turn the header and footer into
one shared piece.

Colours, fonts and spacing are CSS custom properties at the top of
`public/assets/css/style.css` — see §6.

---

## 9. Local preview

```bash
npm install          # once
npm run dev          # http://localhost:8787
```

That builds the gallery list and runs the Worker exactly as it runs live, so
the whole site works locally — gallery, filters, lightbox and form.

To try the contact form without sending real email, start it with the console
provider and the enquiry is printed in your terminal instead:

```bash
npx wrangler dev --var MAIL_PROVIDER:log
```

---

## 10. Cloudflare setup

Only needed once. After this, merging to `main` is the whole deployment.

### The GitHub Action

`.github/workflows/deploy.yml` builds the gallery and deploys on every merge
to `main`. It needs two repository secrets, under **Settings → Secrets and
variables → Actions**:

| Secret                  | Where it comes from                                    |
|-------------------------|--------------------------------------------------------|
| `CLOUDFLARE_API_TOKEN`  | Cloudflare → My Profile → API Tokens → **Edit Cloudflare Workers** template |
| `CLOUDFLARE_ACCOUNT_ID` | the right-hand side of the Workers dashboard            |

You can also redeploy by hand from the **Actions** tab without pushing
anything — the workflow has a `workflow_dispatch` trigger.

### Sending email

Pick a provider, verify `westhead-gates.co.uk` with them, create an API key,
then set it once:

```bash
npx wrangler secret put MAIL_API_KEY
```

It is stored encrypted on Cloudflare, never in the repository. `resend` is
the default and the least setup; `sendgrid` and `mailgun` also work — change
`MAIL_PROVIDER` in `wrangler.toml`. Mailgun also needs `MAILGUN_DOMAIN`.

Verifying the domain is not optional. It is what stops enquiries being
filtered as spam.

### Rate limiting (optional)

```bash
npx wrangler kv namespace create RATE
```

Paste the id it prints into the `[[kv_namespaces]]` block in `wrangler.toml`
and uncomment it. Without this the form still works, it just isn't limited.

### The domain

In the Cloudflare dashboard, open the Worker, then **Settings → Domains &
Routes → Add custom domain**, and add `westhead-gates.co.uk` and
`www.westhead-gates.co.uk`. TLS is issued automatically — there is no
certificate to install and no HTTPS redirect to configure.

### Watching it run

```bash
npm run tail
```

Live logs from the deployed Worker.
