# Phase 9 visual fidelity — sub-plan to close pixel-perfect gaps

## Context

After two pipeline runs the user inspected the app at `localhost:3000` and
flagged visual deviations from the design mockup:

1. Tag chips all use a single neutral gray; mockup uses category-tinted
   pastel chips.
2. Sidebar branding 🌸 block reads visually weak.
3. Search bar lives as a sticky toolbar inside the gallery panel and breaks
   layout fidelity.
4. Sidebar background is white instead of the mockup's off-white.
5. `← Back to gallery` link is visible inside the embedded viewer (3rd pane),
   where it makes no sense.

**All five fall under PLAN.md Phase 9 — no new phase needed.** PLAN.md
sections that already cover these:

- § 9.1 Sidebar — branding block, density, ancho.
- § 9.3 Tag chips — explicit mention of `#E8F4FF` blue and `#F0F8E8` green.
- § 9.5 Layout — 3-pane proportions, separators.
- § 9.7 Token audit.
- § 9.8 Validation against the standalone HTML.

## Source of truth — non-negotiable

The authoritative reference is the **rendered output** of
`design/Sakura Prompt Studio _standalone_.html`, opened in a real browser.

That file is an Anthropic Design "standalone" export. Its first ~120 lines
are an SVG splash thumbnail used while the real HTML/CSS bundle (base64,
gzipped, embedded in the trailing `<script type="__bundler/manifest">` and
`<script type="__bundler/template">` tags) is unpacked client-side. **The
SVG thumbnail is NOT the design** — it is a loading placeholder. Reading
only the SVG (as the previous prompt revision did) leads to wrong inferences
about layout, search position, padding, colors, etc.

The implementer MUST:
1. Open the standalone HTML in a browser (or via Anthropic Design URL
   `https://api.anthropic.com/v1/design/h/Im0Zmylxn6IIBzFUt9rdug?open_file=Sakura+Prompt+Studio.html`).
2. Wait for the bundle to unpack ("Unpacking..." indicator clears).
3. Use **the rendered DOM** (via DevTools: getComputedStyle, exact px,
   actual class names, real positions) as the source of values.
4. Inspect at the same viewport as the app: 1440×900 first, then 1920×1080.

Do NOT derive values from the SVG thumbnail. Do NOT guess search position
or sidebar contents from the splash placeholder.

## Files to modify

- `phases/phase-9/02-build.prompt.md` — rewrite to anchor every per-region
  spec on the rendered standalone HTML, not the SVG. Add an explicit
  "Inspect the rendered mockup" step before any code edits, with a list of
  computed-style fields the implementer must extract per region.
- `components/item-card.tsx` — branch tag chip color by category.
- `components/item-view.tsx` — accept `embedded?: boolean` prop; hide
  back-link when embedded.
- `components/gallery.tsx` — pass `embedded={true}` to `<ItemView>`; align
  sidebar/gallery toolbar/search position to whatever the rendered mockup
  shows.
- `app/globals.css` — add any missing tokens the rendered mockup requires
  (e.g. `--color-sidebar-bg` if the mockup's sidebar isn't white). Do not
  invent tokens before reading the rendered mockup.

## Design

### 1. Rewrite `02-build.prompt.md` to enforce rendered-mockup discipline

Add a new section "0. Read the source of truth" at the very top of the
build prompt, ordered before any execution step:

```markdown
### 0. Read the source of truth (mandatory; failure here = STAGE_BLOCKED)

The mockup is `design/Sakura Prompt Studio _standalone_.html`. Its first
~120 lines are an SVG splash; the real HTML lives inside the trailing
__bundler/* script tags and renders only in a browser.

You MUST:
1. Render the file (the runner serves it at
   http://localhost:3000/design/Sakura%20Prompt%20Studio%20_standalone_.html
   — confirm reachable, or skip section and emit STAGE_BLOCKED with reason).
2. For each region (sidebar, gallery card, tag chip, viewer header, viewer
   prose, viewer code, separators), inspect computed style and capture:
   - background-color (rgb)
   - border (width, color, style)
   - border-radius (px)
   - padding (top right bottom left, px)
   - font-family / font-size / font-weight / line-height
   - exact pixel position of the search bar / "+ New" button / favorites
     toggle if present (these may live in a header row, in the sidebar, or
     not at all — the rendered mockup is authoritative).
3. Write the captured values to `phases/phase-9/PHASE9_MOCKUP_VALUES.md`
   as a single table before editing any component file. This file becomes
   the implementation contract — every CSS class you write must trace to a
   row in it.

Do NOT use the SVG splash placeholder values. Do NOT eyeball. If the
rendered mockup is unreachable, emit STAGE_BLOCKED.
```

### 2. Tag chips — category-derived color (PLAN.md § 9.3)

`components/item-card.tsx:32-38` currently renders every tag with one
neutral chip. Replace with a category-derived bg:

```ts
const TAG_BG: Record<ItemCategory, string> = {
  template:    "bg-tag-blue",
  plan:        "bg-tag-green",
  data_output: "bg-gray-surface",
  agente:      "bg-gray-surface",
  skill:       "bg-gray-surface",
};
```

Tokens `--color-tag-blue` (#E8F4FF) and `--color-tag-green` (#F0F8E8)
already exist in `app/globals.css:11-12`.

The exact mapping (which category gets which color, plus a possible 4th
color for `agente` or `skill`) MUST be confirmed against the rendered
mockup before merging. If the rendered mockup uses different categories or
different shades, update both the token values and the mapping.

### 3. Sidebar branding (PLAN.md § 9.1)

`gallery.tsx:64-71` already has the 🌸 + "Sakura" markup. Confirm against
rendered mockup whether:
- The icon sits inside a sakura-tinted square (PLAN.md and SVG suggest yes).
- The wordmark "Sakura" uses sakura color or black.
- A 1px separator follows the branding block before the category nav.

Adjust class names accordingly. Do NOT prescribe values from the SVG
thumbnail.

### 4. Sidebar background (PLAN.md § 9.1)

If the rendered mockup's sidebar background differs from `#FFFFFF`, add a
token in `app/globals.css` (`--color-sidebar-bg: <exact value>`) and apply
`bg-sidebar-bg` to the `<aside data-region="sidebar">`. Otherwise leave
`bg-white`.

### 5. Search bar / toolbar / "+ New" position

Currently `gallery.tsx:110-142` renders a sticky toolbar (search input +
favorites checkbox + "+ New" button) at the top of the gallery panel. This
likely diverges from the rendered mockup.

The implementer must:
1. Confirm where the rendered mockup places search, favorites, and "+ New".
2. Move each to the same position. The mockup is authoritative, including
   when it places these in the sidebar, in a top header bar, or elsewhere.
3. If the rendered mockup omits any of these controls, keep them but place
   them in the least disruptive equivalent location matching the mockup's
   visual language (e.g. sidebar bottom, icon-only in a corner).

### 6. ItemView embedded vs standalone

`components/item-view.tsx`:
- Add prop `embedded?: boolean` (default `false`).
- When `embedded === true`, do NOT render the `← Back to gallery` link
  (`item-view.tsx:266-268`).

`components/gallery.tsx:166-171` — pass `embedded`:
```tsx
<ItemView key={selectedItem.id} item={selectedItem} embedded ... />
```

`app/items/[id]/page.tsx` — leave unchanged. The standalone route keeps
its back link for direct deep-linking. Removing the route entirely is out
of scope for this sub-plan.

## Implementation flow

1. **Edit `02-build.prompt.md`** to encode sections §1–§6 above, with the
   new "Read the source of truth" header (§0) as the mandatory first step.
2. **Manual one-time pass** (Claude or human): open the rendered standalone
   mockup, capture computed values into
   `phases/phase-9/PHASE9_MOCKUP_VALUES.md`. This file is the contract for
   all subsequent automated runs.
3. **Re-run the pipeline**:
   ```powershell
   .\phases\phase-9\run-phase.ps1 -SkipTests -SkipReview
   ```
4. Inspect `localhost:3000` side-by-side with the rendered standalone
   mockup. Iterate prompt + run only if visual gaps remain.

## Verification

The implementation is complete when ALL of the following pass:

1. **`PHASE9_MOCKUP_VALUES.md` exists** with at least one row per region
   (sidebar, gallery card, tag chip per category, viewer header, viewer
   prose, viewer code, search position, "+ New" position, favorites
   position, separators) — each row citing the rendered standalone mockup
   value (rgb, px, font).
2. **Visual side-by-side at 1440px**: app's three regions match the
   rendered mockup within ~2px on padding/borders and exact match on
   colors. No structural differences (toolbar present in app but not in
   mockup, or vice versa).
3. **Tag chips** show the category-derived colors confirmed against the
   rendered mockup.
4. **Sidebar branding** matches rendered mockup styling (icon block,
   wordmark color, separator).
5. **No back-link in embedded view**: `/` shows no `← Back to gallery` in
   the third pane. `/items/<id>` standalone STILL shows the back link
   (regression check).
6. **Token cleanliness**: `python -m pytest tests/test_phase9_audit.py`
   exits 0. `node tests/visual/dom-audit.mjs` exits 0.
7. **No regression**: `npm run test:e2e` (Phase 7/8) passes.

## Out of scope

- Hover glow on cards (Phase 10).
- Petal rain on copy success (Phase 10).
- Removing the `/items/[id]` standalone route (would break Phase 3 deep
  links; deferred).
- Multi-user auth (Phase 11).
- Mobile/tablet responsiveness.
