# Mockup sources

Working files for the Westhead Gates design canvas. These are the source of
truth — the published canvas is regenerated from them, never edited directly.

The canvas has two pages, switched from the toolbar's pages menu.

## Page 4 — "Trade site — current"  ← current direction

A change of premise, not another skin. Every earlier attempt was an
agency-looking site; this is built for the actual customer — 45–70, has a
driveway, deciding whether to trust a stranger with several thousand pounds.

| File               | Artboard |
|--------------------|----------|
| `HomeT.dc.html`    | Home     |
| `MobileT.dc.html`  | Mobile   |

**Rules this direction follows**

- Prices published on every service. Competitors hide them.
- Phone number in the top bar, header, hero, CTA and footer; a sticky
  two-button call bar on mobile.
- Reviews carry names, towns and dates, badged as verified.
- 17px body text, high contrast — the audience wears reading glasses.
- Conventional layout, familiar on purpose, so nothing gets missed.
- Buttons that look like buttons.

Palette: `#17352a` deep green, `#c2410c` burnt orange for every action,
`#f7f6f3` warm off-white ground.
Type: Bitter (headings, sturdy slab) / Libre Franklin (body, plainly
readable).

Pages 0–3 below are superseded and kept only as a record of what was tried.

## Page 3 — "Direction D — developed"  ← current

**Direction D (Contrast) is the chosen look.** White, true black, one
electric accent; Archivo Black caps, hard rules, square corners everywhere.

| File               | Artboard |
|--------------------|----------|
| `HomeD.dc.html`    | Home     |
| `GalleryD.dc.html` | Gallery  |
| `MobileD.dc.html`  | Mobile   |

**Dark-first.** Near-black ground, white type, one electric accent.

Two live tweaks on each artboard:

- `theme` — `dark` (default) or `light`. Drives a set of custom properties
  (`--bg --fg --fg2 --rule --strong --panel --panelfg --bar`), so the whole
  artboard flips with one control. The safety section deliberately inverts
  against whichever ground is active.
- `accent` — `#a4432a` oxblood (default), `#6d7f8c` slate, `#8f9686` sage,
  `#b8ab8e` stone. All desaturated; `--accentfg` flips automatically so
  label text stays readable on the two pale ones.

The accent is used sparingly by design: small labels, 5px dots, thin rules
and one button per section. It is never a full-bleed colour field — that
was what made the earlier acid-lime version read as bright and youthful.

The same token set is what the real stylesheet will use, so the theme
switch is not a mockup trick — it survives into the build.

Not built yet. The live site still carries the old charcoal-and-brass style.

## Page 0 — "Directions — all four"

Four aesthetic directions, rendered so they could be judged on sight.
**D was chosen** — see page 3. Kept for reference.

| File            | Direction     | Feel                                  |
|-----------------|---------------|---------------------------------------|
| `DirA.dc.html`  | A · Yard      | Warm, plain-spoken, honest trade      |
| `DirB.dc.html`  | B · Blueprint | Technical, precise, engineered        |
| `DirC.dc.html`  | C · Estate    | Quiet, refined, expensive             |
| `DirD.dc.html`  | D · Contrast  | Loud, confident, modern               |

Each board carries its own palette and type specimen at the foot.

## Page 1 — "Site — built"

The pages that are built, tested and pushed — plus one proposal.

`HomeSimple.dc.html` is a proposed replacement for the home page: image-led,
five sections instead of nine. Not built. `Main.dc.html` is what is live.

| File                 | Artboard                      |
|----------------------|-------------------------------|
| `HomeSimple.dc.html` | Home — simplified (proposed)  |
| `Main.dc.html`       | Home — as built               |
| `Gallery.dc.html`   | Gallery page          |
| `Contact.dc.html`   | Contact page          |
| `Lightbox.dc.html`  | Gallery lightbox      |
| `Mobile.dc.html`    | Mobile — home         |

## Page 2 — "SEO plan"

Proposed, not built. Awaiting approval.

| File                     | Artboard                     |
|--------------------------|------------------------------|
| `Architecture.dc.html`   | 1 — Site architecture        |
| `Service.dc.html`        | 2 — Service page template    |
| `SEOSpec.dc.html`        | 3 — Technical SEO spec       |

## Conventions

Direction: **undecided** — the pages on page 1 are still in the rejected
"Forged" style (charcoal + brass, Sora / Instrument Sans). They will be
re-skinned once a direction is picked from page 0. Because the stylesheet
is driven by CSS custom properties, that is a palette-and-font swap rather
than a rebuild.

Anything in `[SQUARE BRACKETS]` is a placeholder awaiting real business
detail (phone, email, area covered, address, prices, reviews, towns).

`canvas.json` holds the layout, the page split and the sticky notes.
The generated canvas file is gitignored; it is rebuilt by re-seeding
from these sources.
