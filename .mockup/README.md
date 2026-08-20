# Mockup sources

Working files for the Westhead Gates design canvas. These are the source of
truth — the published canvas is regenerated from them, never edited directly.

The canvas has two pages, switched from the toolbar's pages menu.

## Page 3 — "Direction D — developed"  ← current

**Direction D (Contrast) is the chosen look.** White, true black, one
electric accent; Archivo Black caps, hard rules, square corners everywhere.

| File               | Artboard |
|--------------------|----------|
| `HomeD.dc.html`    | Home     |
| `GalleryD.dc.html` | Gallery  |
| `MobileD.dc.html`  | Mobile   |

The accent is a live tweak on each artboard (`accent` prop, colour editor)
with four candidates: `#d8f000` acid lime (default), `#ff4d00` safety
orange, `#ffd400` industrial yellow, `#2ee6a8` signal green. It drives a
`--accent` custom property, so one change re-skins the whole artboard.

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
