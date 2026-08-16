# markulie.github.io

Personal portfolio. Plain HTML — no build step, no Node, no dependencies. Every
file is served exactly as it sits on disk.

Published by GitHub Pages straight from this branch: **Settings → Pages →
Source → Deploy from a branch → `main` / `(root)`**. There is no CI; `git push`
is the entire pipeline.

To work on it locally, open `index.html` in a browser, or:

```bash
python3 -m http.server 8000
```

## Layout

```
  index.html            9 pages, hand-editable
  about.html
  light-of-life.html
  luneta.html
  trains.html
  playa.html
  legal-notice.html
  privacy.html
  404.html
  assets/
    css/site.css        every style, once
    js/site.js          every behaviour, once
    fonts/              Share Tech Mono, self-hosted
    img/                pre-generated WebP
    favicon.png
  demos/smoothfollow/   Unity WebGL build, untouched
  media/playa.mp4
  robots.txt
  sitemap.xml
  .nojekyll             tells Pages to serve the files untouched
```

## How pages are wired

There are no templates, so each page is a full HTML document. Two attributes do
what the old per-page JavaScript constants used to:

| Was | Is now |
| --- | --- |
| `const PAGE_MODE = 'dark'` | `<html lang="en" data-theme="dark">` |
| `const MINIGAME_ENABLED = true` | `<canvas id="flowField" data-game="true">` |

Setting the palette in the markup means no script runs before paint, so there
is no flash of the wrong theme. Current assignment: `index`, `playa`, and `404`
are dark; everything else is light. The particle field runs on `index` and
`about` only — the pages that had it originally.

Everything shared — header, footer, styles, behaviour — lives in `site.css` and
`site.js`. The markup for the header and footer is repeated per page, because
plain HTML has no includes; if you change a nav link, change it in all nine
files. That repetition is the price of having no build step, and it is the one
thing to stay disciplined about. Find-and-replace across `*.html` handles it.

### Cache busting

Both shared files are linked with a version query:

```html
<link rel="stylesheet" href="assets/css/site.css?v=1" />
<script src="assets/js/site.js?v=1" defer></script>
```

**After editing `site.css` or `site.js`, bump that number in all nine pages.**
Without it, returning visitors keep the old cached copy and your change appears
not to have shipped. A build tool does this automatically with content hashes;
here it is a manual step, and it is the easiest thing on this page to forget.

## Adding a project

Copy an existing `<article class="card">` block in `index.html` and edit it.
The grid is **not sorted** — the order the `<article>` blocks appear in the file
is the order they appear on the page, curated by hand. Move a block to move a
card.

Only the first three cards should carry `fetchpriority="high"` (they are above
the fold); every card after them uses `loading="lazy" decoding="async"`. If you
reorder, move those attributes too.

The card image needs to be WebP, cropped to 800×600. One file per card — no
`srcset` ladders. Generate it with `npx`, no install required:

```bash
npx sharp-cli -i cover.jpg -o assets/img --format webp --quality 90 resize 800 600 --fit cover
```

Then reference it:

```html
<img
  src="assets/img/myproject.webp"
  width="800" height="600" alt="" loading="lazy" decoding="async"
/>
```

Always keep `width`/`height` — they reserve the space so the page doesn't jump
while images load. **Every card is exactly 800×600**, so export new card art at
that size or larger; anything smaller has to be enlarged and will look soft.

Also add the page to `sitemap.xml` if it is a new page rather than a new card.

## Adding a demo (Unity WebGL, etc.)

`demos/` holds anything playable or runnable that ships as its own self-contained
page — a game, a tool demo, a shader showcase. It is deliberately not called
`games/`, because not everything you embed will be one.

Point Unity's build output at `demos/<name>/` and commit. Unity's own
`index.html`, `Build/`, and `TemplateData/` are used untouched, so a rebuild is
just overwriting the folder. Link it from a card with `href="demos/<name>/"` and
export a `cover.jpg` for it by hand. The `demo.json` beside it records the card
text; nothing reads it automatically in this plain-HTML setup, but it keeps the
folder self-describing.

Set **Compression Format: Disabled** in Player Settings → Publishing Settings
(or Gzip with Decompression Fallback). GitHub Pages cannot send the
`Content-Encoding` header a Brotli build needs.

## What is already handled

- Every image is WebP. All 17 project cards are exactly 800×600.
- Fonts are self-hosted — a page load contacts **no third party at all**.
- One `h1`, one description, canonical URL, and Open Graph tags per page.
- No horizontal scroll at 375px; tap targets are at least 44px.
- `prefers-reduced-motion` stops the particle field and the typing effect.
- The particle canvas is devicePixelRatio-aware and pauses on a hidden tab.
- Images live in `assets/img/<page>/`, one folder per page that uses them.
  Anything used by more than one page sits at `assets/img/` alongside those
  folders (currently just `og-default.jpg`, the shared social card).
- The Playa hero video is re-encoded to 1600×900 / 30 fps / 4.6 MB (from
  1080p60 at 17.9 MB) with `+faststart`, and is not fetched on page load at all
  — `site.js` attaches it only on a wide viewport with a fast connection, and
  only once it scrolls into view.
