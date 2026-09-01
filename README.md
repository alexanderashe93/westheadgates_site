# Westhead Gates — brochure website

A three-page static site (home, gallery, contact) built to run on a Plesk
server. Plain HTML, CSS and JavaScript with two small PHP scripts — no build
step, no npm, no framework. Upload the files and it works.

---

## 1. Deploying to Plesk

1. In Plesk, open **Websites & Domains → File Manager** for your domain.
2. Upload the contents of this repository into `httpdocs/`
   (the files themselves, not the folder containing them).
3. Check **Websites & Domains → PHP Settings** shows PHP **7.4 or newer**
   and that PHP is switched on for the domain.
4. Make sure `api/cache/` is writable by the web server. Plesk usually
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

`api/images.php` reads the folder and returns JSON; `assets/js/gallery.js`
renders it. Results are cached in `api/cache/gallery.json` and the cache
invalidates automatically when a file is added, removed, renamed or when
`captions.json` changes — so reading image dimensions only happens when
something has actually changed.

If PHP is unavailable the script falls back to a static `images/images.json`,
and failing that shows a diagnostic message rather than an empty page.

---

## 4. The contact form

Edit **`api/config.php`** — it is the only file you need to touch:

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
time-on-page check, and a per-IP hourly rate limit — all configurable in
`api/config.php`. It works with JavaScript switched off, and validates
inline when it's on.

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

## 6. Colour scheme

The site uses the **Ironstone** scheme — near-black `#1f1e1c` with an oxblood
`#9c3327` accent on a warm off-white ground.

Everything is driven by six custom properties at the top of
`assets/css/style.css`:

```css
--dark:     #1f1e1c;   /* headings, header mark, footer, CTA ground */
--darker:   #141312;   /* footer base                                */
--accent:   #9c3327;   /* every action: buttons, links, active states */
--accent-d: #78251b;   /* the shadow under a button                  */
--warm:     #f6f4f1;   /* alternating section ground                 */
--line:     #e4e1db;   /* borders                                    */
```

Change those six and the whole site follows. Nothing else needs touching.

Type is **Bitter** for headings and **Libre Franklin** for body, loaded from
Google Fonts with real fallback stacks.

---

## 7. Files

```
index.html            Home
gallery.html          Gallery — auto-populated from /images/
contact.html          Contact — enquiry form and details
privacy.html          Privacy notice (scaffold — needs writing)
404.html              Not-found page

assets/css/style.css  All styling. Design tokens are at the top in :root.
assets/js/main.js     Mobile nav, optional-photo fallback, footer year
assets/js/gallery.js  Loads /images/, builds the grid, runs the lightbox
assets/js/contact.js  Inline validation and background submit
assets/img/           favicon.svg, plus hero.jpg / workshop.jpg (see below)

api/config.php        >>> EDIT THIS ONE <<<  email + gallery settings
api/images.php        Reads /images/ and returns JSON
api/contact.php       Validates and emails the contact form
api/cache/            Auto-generated. Safe to delete; rebuilds itself.

images/               >>> YOUR PHOTOS GO HERE <<<
.htaccess             Caching, security headers, tidy URLs, HTTPS redirect
robots.txt            Update the sitemap URL
sitemap.xml           Update the domain
.mockup/              Design canvas sources. Not served — safe to delete.
```

### Images you still need to add

| Path                            | Used for                              |
|---------------------------------|---------------------------------------|
| `assets/img/hero.jpg`           | Home page hero photo                  |
| `assets/img/workshop.jpg`       | "Why people choose us" section        |
| `assets/img/og.jpg`             | Link preview on social media (1200×630) |
| `assets/img/apple-touch-icon.png` | iOS home-screen icon (180×180)      |

All four are optional. The hero and workshop photos are marked
`data-optional`, so until you upload them the page hides the empty frame
rather than showing a broken image — nothing looks wrong, there is just less
on the page. The hero is worth getting right: it is the first thing anyone
sees.

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

```bash
php -S localhost:8000
```

Then open <http://localhost:8000>. The gallery and contact form both work
against the built-in server, so you can test properly before uploading.
