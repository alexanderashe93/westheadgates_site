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

| Placeholder            | What to put there                                   |
|------------------------|-----------------------------------------------------|
| `[YOUR PHONE]`         | Displayed phone number, e.g. `01695 123456`         |
| `[YOURPHONE-E164]`     | Same number for `tel:` links, e.g. `+441695123456`  |
| `[YOUR MOBILE]`        | Mobile number                                        |
| `[YOUR EMAIL]`         | Enquiries address                                    |
| `[YOUR AREA]`          | Area covered, e.g. `West Lancashire and Merseyside` |
| `[YOUR TOWN]`          | Where the workshop is                                |
| `[YOUR-DOMAIN]`        | Domain, no `https://` — used in meta tags            |
| `[Workshop address]`   | Street address                                       |
| `[Town, Postcode]`     | Town and postcode                                    |
| `[NUMBER]`             | Company number and VAT number                        |

Page-specific ones to deal with before launch:

- **index.html** — the three hero statistics, the `[6–8] weeks` lead time,
  three testimonials, and the bracketed text in the *Safety & compliance*
  section (see §5).
- **contact.html** — opening hours, the Google Maps embed URL, and all six
  FAQ answers.
- **privacy.html** — currently a scaffold. It is a legal requirement once the
  contact form is live. Write it before launch.

Social links in the home page footer point at `[YOUR FACEBOOK URL]` and
`[YOUR INSTAGRAM URL]`. Delete the `.social` block if you'd rather not
link out.

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
'enquiry_recipients' => array('enquiries@yourdomain.co.uk'),
'mail_from'          => 'website@yourdomain.co.uk',
```

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

## 5. The safety & compliance section

The home page has a *Safety & compliance* section referencing **BS EN 12453**,
**BS EN 12604** and the **Supply of Machinery (Safety) Regulations 2008**.

The standard and regulation names are correct as supplied. **The descriptions
of what each one covers are placeholders reading `[CONFIRM …]`.** They were
deliberately not written from memory — the source documents could not be
opened from the environment this site was built in, and publishing inaccurate
regulatory claims on a commercial site carries real risk.

Fill those in from your own copies of the standards before the site goes
live, or delete the section. The same applies to the servicing-frequency FAQ
on the contact page.

---

## 6. Files

```
index.html            Home
gallery.html          Gallery — auto-populated from /images/
contact.html          Contact, form, map, FAQ
privacy.html          Privacy notice (scaffold — needs writing)
404.html              Not-found page

assets/css/style.css  All styling. Design tokens are at the top in :root.
assets/js/main.js     Nav, scroll reveals, footer year
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
| `assets/img/hero.jpg`           | Home page hero background             |
| `assets/img/workshop.jpg`       | "Built in the workshop" section       |
| `assets/img/og.jpg`             | Link preview on social media (1200×630) |
| `assets/img/apple-touch-icon.png` | iOS home-screen icon (180×180)      |

All four are optional — the pages degrade to the dark gradient without them,
so nothing breaks. The hero is worth getting right: it is the first thing
anyone sees.

---

## 7. Editing pages later

The navigation and footer are repeated in each HTML file. That is the trade
for a site with no build step: changing the phone number means editing it in
each page. With three pages that is a fair deal, and it means anyone can edit
the site in Plesk's file manager without tooling.

Colours, fonts and spacing are CSS custom properties at the top of
`assets/css/style.css` — change `--brass` in one place and it updates
everywhere.

---

## 8. Local preview

```bash
php -S localhost:8000
```

Then open <http://localhost:8000>. The gallery and contact form both work
against the built-in server, so you can test properly before uploading.
