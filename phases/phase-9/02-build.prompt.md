# Phase 9 — Pixel Perfect — STAGE 2: IMPLEMENTATION

You are a Principal Frontend Engineer. Make the app at `localhost:3000`
visually indistinguishable from the rendered mockup at 1440×900 and 1920×1080.

## EXECUTION PROTOCOL — read this before everything else

You MUST follow this protocol or the runner will kill you.

1. **Heartbeat.** Before each meaningful action print: `PROGRESS: <what you are doing>`.
   The runner kills any stage silent for 5 minutes.

2. **Self-abort on loops.** Same fix attempted 3× without progress → STOP. Print:
   `STAGE_BLOCKED: <what is blocking you, what you tried, what you need from a human>`
   Then exit. Do NOT retry.

3. **Last-line contract.** Last non-empty stdout line MUST be exactly:
   - `STAGE_COMPLETE` — finished all deliverables.
   - `STAGE_BLOCKED: <reason>` — cannot proceed.

4. **Token economy.** Prefer TODO list over rumination. List pending items in
   `PHASE9_TEST_PLAN.md` "Closed" section, emit `STAGE_COMPLETE`.

## §0. Read the source of truth (MANDATORY)

Two files in the repo are your design contract. Both are produced ONCE by a
human/Claude before this stage runs and committed to the repo. You only READ
them — you do NOT regenerate, render, or re-extract anything.

1. **`phases/phase-9/_mockup-source/`** — decoded contents of the standalone
   HTML bundle (raw HTML, CSS, JSX/TSX, Tailwind classes). This is the
   actual design source code, not the SVG splash placeholder.
2. **`phases/phase-9/PHASE9_MOCKUP_VALUES.md`** — a values table extracted
   from `_mockup-source/`: per region → background, border, radius, padding,
   font, position. Every CSS class you write must trace back to a row here.

If EITHER file is missing or empty:
- Emit `STAGE_BLOCKED: Mockup source files not committed yet. Need a one-time
  extraction pass before this stage can run. See plan in
  necesito-que-refinemos-mi-twinkling-pretzel.md §"Source of truth".`
- Do NOT try to render the standalone HTML yourself. Do NOT try to write a
  Playwright script. Do NOT eyeball the SVG splash in
  `design/Sakura Prompt Studio _standalone_.html` — it is a loading
  placeholder, not the design.

If both files are present: skim `_mockup-source/` to confirm structure, then
treat `PHASE9_MOCKUP_VALUES.md` as authoritative for every CSS value below.

## Mandatory references

- `CLAUDE.md` — token rules, three permitted Sakura uses.
- `PLAN.md` § 9.1–9.8.
- `phases/phase-9/PHASE9_MOCKUP_VALUES.md` — produced in §0, consumed by all later steps.
- `tailwind.config.ts`, `app/globals.css` — extend; do not duplicate tokens.

## Operating rules (non-negotiable)

1. **Every CSS value traces to `PHASE9_MOCKUP_VALUES.md`.** No eyeballing.
2. **Tokens, not arbitrary values.** Every color via `theme.extend.colors` or CSS
   custom property. No `bg-[#xxx]`, no inline color literals in components.
3. **Sakura discipline.** `#FFB7C5` only in `tailwind.config.ts` + `globals.css`.
   In components only via `text-sakura` / `bg-sakura` / `border-sakura` /
   `var(--color-sakura)`. Permitted uses: variable chips, sidebar branding (PLAN.md § 9.1).
   Hover glow + petal animations: Phase 10 — do NOT implement here.
3. **No new abstractions.** Per `CLAUDE.md`.
4. **Comments only for WHY when non-obvious.** Per `CLAUDE.md`.
5. **English everywhere.**

## §1. Structural fix FIRST (before anything else)

`app/page.tsx` currently wraps `<Gallery>` in a redundant `data-region="layout-root"`
div AND renders a second empty `data-region="viewer"`. Fix it so `page.tsx` returns
ONLY:

```tsx
return <Gallery items={typedItems} minVarLength={...} maxVarLength={...} />;
```

The canonical layout tree must live entirely inside `components/gallery.tsx`:

```
div[data-region="layout-root"].flex.h-screen.overflow-hidden
  aside[data-region="sidebar"]            ← width + bg from PHASE9_MOCKUP_VALUES.md
  main[data-region="gallery"]             ← width + bg from PHASE9_MOCKUP_VALUES.md
  div[data-region="viewer"].flex-1        ← takes remaining width
```

## §2. Layout proportions (`components/gallery.tsx`)

Apply widths and backgrounds from `PHASE9_MOCKUP_VALUES.md`. Three regions
separated by `border-r border-gray-line` (1px). Sidebar and gallery `shrink-0`
with explicit widths; viewer `flex-1`.

## §3. Sidebar branding + nav (PLAN.md § 9.1)

- Branding block at top: 🌸 inside a sakura-tinted square + "Sakura" wordmark.
  Exact dimensions, padding, and wordmark color from `PHASE9_MOCKUP_VALUES.md`.
- 1px `border-b border-gray-line` separator between branding and category nav
  IF the rendered mockup shows one.
- Category buttons: padding, font-size, weight, hover state — all from
  `PHASE9_MOCKUP_VALUES.md`. Active state highlighting per mockup.
- Only the branding 🌸 uses sakura color. Category items neutral.

## §4. Search + "+ New" + favorites — match mockup position

The current `gallery.tsx:110-142` renders a sticky toolbar at the top of the
gallery panel. This is likely WRONG.

Confirm against `PHASE9_MOCKUP_VALUES.md`:
- Where is the search bar in the rendered mockup? (sidebar bottom? top header? inline?)
- Where is "+ New"? (sidebar? gallery toolbar? floating?)
- Where is the favorites toggle? (filter chip in sidebar nav? icon? omitted?)

Move each control to its mockup position. If the mockup omits a control, place
it in the least disruptive equivalent location matching mockup styling.

The gallery panel's first visible content must match the mockup's first visible
content (likely a card, not a toolbar).

## §5. Gallery cards (`components/item-card.tsx`)

- Padding, border, radius, title typography, gap-between-cards: all from
  `PHASE9_MOCKUP_VALUES.md`.
- Default border: `border border-gray-line`.
- **Selected/active state**: add `isSelected?: boolean` prop. When true, border
  uses sakura per mockup spec. Pass `isSelected={selectedItem?.id === item.id}`
  from `gallery.tsx`.
- 🌸 variable indicator reuses `lib/variables.ts`.

## §6. Tag chips — category-derived color (PLAN.md § 9.3)

Replace the single neutral chip with a category-derived map:

```ts
import { ItemCategory } from "@/lib/database.types";

const TAG_BG: Record<ItemCategory, string> = {
  template:    "bg-tag-blue",     // confirm against PHASE9_MOCKUP_VALUES.md
  plan:        "bg-tag-green",
  data_output: "bg-gray-surface",
  agente:      "bg-gray-surface",
  skill:       "bg-gray-surface",
};
```

Tokens `--color-tag-blue` (#E8F4FF) and `--color-tag-green` (#F0F8E8) already
exist in `app/globals.css`. If `PHASE9_MOCKUP_VALUES.md` shows different shades
or different category mappings, update both the token and the map.

Apply: `border border-gray-line ${TAG_BG[item.category]} rounded-sm px-2 py-0.5 text-xs text-gray-700`.
Tag chips NEVER use sakura.

## §7. ItemView — embedded vs standalone

`components/item-view.tsx`:
- Add prop `embedded?: boolean` (default `false`).
- When `embedded === true`, do NOT render the `← Back to gallery` link
  (currently lines 266-268).

`components/gallery.tsx` — pass `embedded`:
```tsx
<ItemView key={selectedItem.id} item={selectedItem} embedded ... />
```

`app/items/[id]/page.tsx` — leave unchanged. Standalone route keeps the back link.

## §8. Variable chips
- Use `.variable-chip` class already in `globals.css`. Do not duplicate.

## §9. Viewer typography
- Inter for prose (`font-sans`). JetBrains Mono for code (`font-mono`).
- Confirm `next/font` wiring intact.

## §10. Token audit must be clean
- `pytest tests/test_phase9_audit.py` exits 0 before you stop.
- If it fails on a non-token issue (Playwright import etc.) after one fix-pass,
  document in `PHASE9_TEST_PLAN.md` "Closed → Deferred" and emit `STAGE_COMPLETE`.

## §11. No regressions
- Do NOT break Phase 7/8 interaction tests (`npm run test:e2e`).

## Out of scope (Phase 10)
- Hover glow on cards.
- Petal rain animation.
- Drawer easing.
- Mobile/tablet responsiveness.

## Output expected at end of stage

- `phases/phase-9/PHASE9_MOCKUP_VALUES.md` populated (≥1 row per region).
- `app/page.tsx` renders only `<Gallery>` with no wrapping layout divs.
- Three-pane layout matches mockup widths/backgrounds at 1440px.
- Tag chips show category-derived colors per `PHASE9_MOCKUP_VALUES.md`.
- Search/"+ New"/favorites placed per mockup.
- Cards have selected state from `PHASE9_MOCKUP_VALUES.md`.
- ItemView in 3rd pane has no back link; `/items/<id>` still does.
- `node tests/visual/dom-audit.mjs` passes.
- `pytest tests/test_phase9_audit.py` exits 0.
- Last two lines of stdout:
  1. `<short summary: files modified, key fixes applied>`
  2. `STAGE_COMPLETE`

If you cannot proceed: `STAGE_BLOCKED: <one paragraph>`.
