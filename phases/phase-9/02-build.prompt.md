# Phase 9 — Pixel Perfect — STAGE 2: IMPLEMENTATION

You are a Principal Frontend Engineer. Make the app visually indistinguishable
from the mockup at 1440×900 and 1920×1080.

## EXECUTION PROTOCOL — read this before everything else

You MUST follow this protocol or the runner will kill you.

1. **Heartbeat.** Before each meaningful action print: `PROGRESS: <what you are doing>`.
   The runner kills any stage silent for 5 minutes.

2. **Self-abort on loops.** Same fix attempted 3× without progress → STOP. Print:
   `STAGE_BLOCKED: <what is blocking you, what you tried, what you need from a human>`
   Then exit. Do NOT retry.

3. **Last-line contract.** The last non-empty line of your stdout MUST be exactly:
   - `STAGE_COMPLETE` — finished all deliverables.
   - `STAGE_BLOCKED: <reason>` — cannot proceed.

4. **Token economy.** Prefer a TODO list over rumination. Write what you have, list
   pending items in `PHASE9_TEST_PLAN.md` "Closed" section, emit `STAGE_COMPLETE`.

## Mockup reference

The source of visual truth is `design/Sakura Prompt Studio _standalone_.html`.
It contains an SVG with viewBox="0 0 400 280". Translate proportions to real CSS —
do NOT use SVG pixel values as CSS pixels.

### Extracted layout proportions (translate to CSS as shown)

| Region  | SVG x-range | Proportion | CSS target |
|---------|-------------|------------|------------|
| Sidebar | 0–80        | 20%        | `w-[200px] shrink-0` |
| Gallery | 81–205      | 31%        | `w-[340px] shrink-0` |
| Viewer  | 206–400     | 49%        | `flex-1` |

### Extracted component values

**Sidebar**
- Background: `#FAFAFA` → `bg-gray-surface`
- Right separator: 1px `#E8E8E8` → `border-r border-gray-line`
- Branding block: 🌸 icon in `rounded-md bg-sakura/40 border border-sakura` + "Sakura" in `text-sakura text-sm font-semibold`
- Category items: `text-xs` labels, left padding `px-3 py-2`

**Gallery cards**
- Card border radius: `rx=6` → `rounded-md` (6px)
- Card border default: 1px `#E8E8E8` → `border border-gray-line`
- Card border **selected/active**: 1.5px `#FFB7C5` → `border-[1.5px] border-sakura`
- Card padding: 6px from SVG (title starts 6px inside card) → `p-3`
- Card title: `text-sm font-semibold text-[#222]`
- Gap between cards: `gap-3`
- Right separator: 1px `#E8E8E8` at x=205 → `border-r border-gray-line`

**Tag chips** (neutral, never sakura)
- Default chip: `#F5F5F5` → `bg-gray-surface border border-gray-line`
- Radius: `rx=2` → `rounded-sm`
- Padding: `px-2 py-0.5 text-xs`

**Variable chips** (sakura, in viewer content)
- Background: `rgba(255,183,197,0.2)` → `bg-sakura/20`
- Border: `rgba(255,183,197,0.5)` → `border border-sakura/50`
- Text color: `#C45E78` → `text-variable-text`
- Radius: `rx=4` → `rounded`
- Use existing `.variable-chip` CSS class from `globals.css` — do NOT duplicate.

**Viewer**
- Padding: `px-6 py-5`
- Title: `text-base font-semibold text-[#111]`
- Prose font: Inter (via `font-sans`)
- Code font: JetBrains Mono (via `font-mono`)

**Three-pane separators**
- Both separators are 1px `#E8E8E8` → `border-r border-gray-line` on sidebar and gallery.

## Structural fix required FIRST (before anything else)

`app/page.tsx` currently wraps `<Gallery>` in a second `data-region="layout-root"`
and renders a second empty `data-region="viewer"`. This creates a broken double
layout. Fix it so `page.tsx` renders ONLY `<Gallery items={...} .../>` with no
wrapping divs that add extra data-region attrs.

The canonical layout tree must be exactly this (all inside `components/gallery.tsx`):

```
div[data-region="layout-root"].flex.h-screen.overflow-hidden
  aside[data-region="sidebar"].w-[200px].shrink-0.border-r.border-gray-line
  main[data-region="gallery"].w-[340px].shrink-0.border-r.border-gray-line.overflow-y-auto
  div[data-region="viewer"].flex-1.overflow-y-auto
```

## Required execution order

### 0. Fix `app/page.tsx`
Remove the wrapping div and the duplicate `data-region="viewer"`. The file should
return just:
```tsx
return <Gallery items={typedItems} minVarLength={...} maxVarLength={...} />;
```

### 1. Fix layout proportions in `components/gallery.tsx`
- `data-region="layout-root"`: `flex h-screen overflow-hidden bg-white`
- `data-region="sidebar"`: `w-[200px] shrink-0 border-r border-gray-line overflow-y-auto bg-gray-surface`
- `data-region="gallery"`: `w-[340px] shrink-0 border-r border-gray-line overflow-y-auto bg-white flex flex-col`
  - Remove `grid grid-cols-1` — the gallery is a flex column, not a CSS grid.
  - The card list inside is `flex flex-col gap-3 p-4`.
- `data-region="viewer"`: `flex-1 overflow-y-auto bg-white`

### 2. Fix sidebar branding + category nav
- Branding div: `px-4 py-4 border-b border-gray-line`
- Category buttons: `px-3 py-2 text-xs` (not `text-sm`)
- Only the branding 🌸 icon uses sakura; category buttons use `text-gray-600` / `text-black`

### 3. Fix gallery cards in `components/item-card.tsx`
- Card padding: `p-3` (not `p-6`)
- Card border radius: `rounded-md`
- Add selected state: the `onSelect` variant needs a prop `isSelected?: boolean` that
  switches border from `border-gray-line` to `border-sakura border-[1.5px]`
- Pass `isSelected={selectedItem?.id === item.id}` from `gallery.tsx`

### 4. Fix tag chips
- `rounded-sm bg-gray-surface border border-gray-line px-2 py-0.5 text-xs text-gray-600`
- Never use sakura on tag chips.

### 5. Confirm variable chips
- Use `.variable-chip` class already in `globals.css`. If markdown renderer or Tiptap
  is wrapping `{{var}}` spans — confirm the class is applied. Do not duplicate styles.

### 6. Token audit
- `pytest tests/test_phase9_audit.py` exits 0 before you stop.
- If it fails on a non-token issue after one fix-pass, document in
  `PHASE9_TEST_PLAN.md` "Closed → Deferred" and emit `STAGE_COMPLETE`.

### 7. No regressions
- Do NOT break existing Phase 7/8 interaction tests (`npm run test:e2e`).

## Out of scope (Phase 10)
- Hover glow on cards.
- Petal rain animation.
- Drawer easing.
- Mobile/tablet responsiveness.

## Output expected at end of stage

- `app/page.tsx` renders only `<Gallery>` with no wrapping layout divs.
- Three-pane layout at 1440px: sidebar 200px | gallery 340px | viewer flex-1.
- Cards at `p-3 rounded-md`, selected card has `border-sakura border-[1.5px]`.
- `node tests/visual/dom-audit.mjs` passes.
- `pytest tests/test_phase9_audit.py` exits 0.
- Last two lines of stdout:
  1. `<short summary: files modified, key fixes applied>`
  2. `STAGE_COMPLETE`

If you cannot proceed: `STAGE_BLOCKED: <one paragraph>`.
