# Mockup sources

Working files for the Westhead Gates design canvas. These are the source of
truth — the published canvas is regenerated from them, never edited directly.

The canvas has two pages, switched from the toolbar's pages menu.

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

Direction: **Forged** — charcoal `#0e1114` + brass `#c8a24a`,
Sora (headings) / Instrument Sans (body).

Anything in `[SQUARE BRACKETS]` is a placeholder awaiting real business
detail (phone, email, area covered, address, prices, reviews, towns).

`canvas.json` holds the layout, the page split and the sticky notes.
The generated canvas file is gitignored; it is rebuilt by re-seeding
from these sources.
