# Phase 9 — Mockup values (extracted from `_mockup-source/`)

**Source**: `phases/phase-9/_mockup-source/sidebar.jsx`, `gallery.jsx`, `_template.json`
extracted by `phases/phase-9/extract-mockup.mjs` from
`design/Sakura Prompt Studio _standalone_.html`. These ARE the design.
Every CSS class written for Phase 9 must trace back to a row in this file.

## Design tokens (root CSS variables from the mockup)

| Token | Value | Notes |
|---|---|---|
| `--sakura` | `#FFB7C5` | already in our `globals.css` |
| `--sakura-soft` | `rgba(255, 183, 197, 0.15)` | for branding icon bg |
| `--sakura-glow` | `rgba(255, 183, 197, 0.4)` | for box-shadow glow on active/hover cards (Phase 10 owns hover) |
| `--gray-50` | `#FAFAFA` | search input bg, hover row bg |
| `--gray-100` | `#F5F5F5` | active nav item bg, neutral chip bg, badge bg |
| `--gray-200` | `#E8E8E8` | all 1px borders |
| `--gray-300` | `#D0D0D0` | inactive favorite icon |
| `--gray-400` | `#A0A0A0` | meta labels, section headers, count badge text |
| `--gray-600` | `#666666` | secondary text |
| `--gray-800` | `#222222` | not used in current sidebar/gallery |
| `--sidebar-w` | `224px` | sidebar fixed width |
| `--radius` | `8px` | cards |
| `--radius-sm` | `5px` | nav items, search box, "+" button |

## Layout

| Region | Width | Background | Right border |
|---|---|---|---|
| Sidebar | `224px` fixed | `white` | `1px solid #E8E8E8` |
| Gallery | `320px` fixed | `white` | `1px solid #E8E8E8` |
| Viewer | `flex-1` | `white` | none |

## Sidebar

### Branding block (top)
- Padding: `16px 14px 14px`, `border-bottom: 1px solid #E8E8E8`
- Layout: `display:flex; align-items:center; gap:9px`
- Icon box: `26x26 px`, `border-radius:7px`, `bg: rgba(255,183,197,0.15)`, `border: 1px solid #FFB7C5`
- Icon glyph: 🌸 (font-size 15px, centered)
- Title text: "Sakura Studio" (`13px`, `font-weight:600`, `letter-spacing:-0.01em`)
- Subtitle text: "Prompt Manager" (`10px`, `color:#A0A0A0`, `margin-top:1px`)

### Search block (under branding, INSIDE sidebar — not in gallery toolbar)
- Padding: `10px 12px`, `border-bottom: 1px solid #E8E8E8`
- Input wrapper: `display:flex; align-items:center; gap:7px`, `bg:#FAFAFA`, `border:1px solid #E8E8E8`, `border-radius:5px`, `padding:6px 9px`
- Search icon: 12x12 SVG, stroke `#A0A0A0`
- Input: `font-size:12px`, no border, no outline, placeholder "Search…"

### Nav (collapsible sections)
- Wrapper: `flex:1; overflow-y:auto; padding:8px 8px 0`
- Section header (e.g. "Home", "Templates", "Agents", "Skills"):
  `padding:5px 12px`, `font-size:10px`, `font-weight:600`, `letter-spacing:0.08em`, `text-transform:uppercase`, `color:#A0A0A0`
  - Includes a chevron SVG (10x10) that rotates `0deg` (open) / `-90deg` (closed)
- Nav item: `padding:6px 12px`, `font-size:13px`, `gap:8px`, `border-radius:5px`
  - Inactive: `color:#666666`, `font-weight:400`, no bg
  - Active: `color:#000`, `font-weight:500`, `bg:#F5F5F5`
  - Hover (inactive): `bg:#FAFAFA`, `color:#000`
  - Icon span: `font-size:13px`, `opacity: active?1:0.7`
  - Count badge: `font-size:10px`, `bg:#F5F5F5`, `border-radius:10px`, `padding:1px 6px`, `min-width:18px`, color `#A0A0A0`

### Sections to render
- "Home" → All Prompts (◈), Favorites (♡)
- "Templates" → Planes (▦), Test (◎), Debug (⬡), n8n (⟳)
- "Agents" → PR.md (⌥)
- "Skills" → All Skills (✦)

### Footer (the "arbolito de sakura" the user noticed missing)
- Padding: `12px 8px 8px`, `border-top: 1px solid #E8E8E8`
- `display:flex; flex-direction:column; align-items:center; gap:10px`
- **CherryBranch SVG**: viewBox `0 0 180 120`, `width:100%; max-width:180px; opacity:0.6`. Branch path strokes `#888`, blossoms (5-petal ellipses) fill `#FFB7C5` opacity `0.75`, falling petals fill `#FFB7C5` opacity `0.4`. Full SVG at `_mockup-source/sidebar.jsx:60-103`. **Copy the SVG verbatim into `components/sidebar.tsx` (or wherever the sidebar lives) — do NOT reinterpret.**
- "In flow" indicator: 6x6 sakura dot with `box-shadow:0 0 6px var(--sakura)`, animated via `@keyframes zen-pulse` (2.5s ease-in-out infinite, opacity 0.5↔1 + glow 4px↔10px). Label "In flow", font-size 10px, color `#A0A0A0`.

## Gallery panel (320px)

### Header
- Padding: `14px 16px 12px`, `border-bottom: 1px solid #E8E8E8`
- Layout: `display:flex; align-items:center; justify-content:space-between`
- Left side:
  - Filter label: `font-size:14px`, `font-weight:600`, `letter-spacing:-0.01em` (e.g. "All Prompts", "Favorites", "Planes")
  - Sub-row (`margin-top:3px`, `gap:8px`):
    - Count text: `"{N} prompt(s)"`, `font-size:11px`, `color:#A0A0A0`
    - "🌸 with variables" badge: `font-size:10px`, `color:#C45E78`, `bg:rgba(255,183,197,0.15)`, `border:1px solid rgba(255,183,197,0.3)`, `border-radius:4px`, `padding:2px 6px`
- Right side: "+ New" button — square `28x28`, `border-radius:5px`, `border:1px solid #E8E8E8`, `color:#A0A0A0`, just `+` glyph (font-size 13px). Hover: bg `#FAFAFA`, color black.

### Card list
- Wrapper: `flex:1; overflow-y:auto; padding:10px 12px; display:flex; flex-direction:column; gap:6px`
- Empty state: centered 🌸 (font-size 28px, opacity 0.4) + "No prompts found" (font-size 12px, gray-400)

## Card (`PromptCard`)

| Property | Value |
|---|---|
| bg | `white` |
| border | `1px solid #E8E8E8` (default) → `transparent` (active or hover) |
| border-radius | `8px` |
| padding | `14px 16px` |
| transition | `all 0.2s cubic-bezier(0.2, 0, 0, 1)` |
| transform | `translateY(-2px)` on hover |
| box-shadow (rest) | `0 1px 3px rgba(0,0,0,0.05)` |
| box-shadow (active) | `0 0 0 2px var(--sakura), 0 4px 20px var(--sakura-glow)` |
| box-shadow (hover) | `0 0 0 1px var(--sakura), 0 8px 24px var(--sakura-glow), 0 2px 8px rgba(0,0,0,0.06)` (Phase 10 owns this) |

### Card top row (title + icons)
- `display:flex; align-items:center; gap:6px; margin-bottom:8px`
- Title: `flex:1`, `font-size:13.5px`, `font-weight:600`, `color:#000`, `letter-spacing:-0.01em`, `line-height:1.35`
- 🌸 indicator (when `hasVariables`): `font-size:13px`, `flex-shrink:0`
- Favorite ♡/♥ button: `font-size:14px`, color `#D0D0D0` (off) / `var(--sakura)` (on, with `drop-shadow(0 0 3px var(--sakura))`). Visible on hover or when favorite. Animation/glow → Phase 10.

### Card tags row
- `display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px`
- Tag chip (variables prompt): `bg:rgba(255,183,197,0.18)`, `border:1px solid rgba(255,183,197,0.4)`, `color:#C45E78`
- Tag chip (normal prompt): `bg:#F5F5F5`, `border:1px solid #E8E8E8`, `color:#666666`
- Common: `font-size:10px`, `font-weight:500`, `border-radius:4px`, `padding:2px 6px`, `font-family: var(--font-mono)`, `white-space:nowrap`

### Card bottom row (category badge + date)
- `display:flex; align-items:center; justify-content:space-between`
- Category badge: `font-size:10px`, `font-weight:500`, `color:#666666`, `border:1px solid #E8E8E8`, `border-radius:4px`, `padding:2px 7px`. Background varies by category:
  | Category | bg color |
  |---|---|
  | Templates | `#E8F4FF` (blue) |
  | Agentes | `#F0F8E8` (green) |
  | Skills | `#FFF3E8` (orange) |
  | Favoritos | `#FFF0F5` (pink) |
  | (other / fallback) | `#F5F5F5` (gray-100) |
- Date text: `font-size:10px`, `color:#A0A0A0`, `font-family: var(--font-mono)`

## Variable chips (in viewer body)

Per `_mockup-source/markdown.jsx` (not enumerated here in detail). Use existing
`.variable-chip` class in `app/globals.css` — confirm it matches:
- bg `rgba(255,183,197,0.2)` (mockup uses 0.18 in tag chips; aligning to 0.2 is acceptable)
- border `1px solid rgba(255,183,197,0.5)` (mockup uses 0.4)
- color `#C45E78`
- `font-family: var(--font-mono)`

If discrepancies matter, adjust `--color-sakura-20` and `--color-sakura-50` in
`globals.css` to `0.18` and `0.4` respectively.

## Gotchas / decisions

1. **Sidebar bg is white, NOT `#FAFAFA`.** The user's earlier observation
   ("sidebar otro color") was actually about contrast against the sakura icon,
   not about the bg color itself. The sidebar bg is `var(--white)`; only the
   search input wrapper inside the sidebar uses `#FAFAFA` as a subtle inset.
2. **Search bar lives in the SIDEBAR, not the gallery toolbar.** The current
   `gallery.tsx:110-142` sticky toolbar must be removed entirely. Search moves
   to the sidebar between branding and nav.
3. **"+ New" button** is a `28x28` square in the gallery panel header
   (top-right), not the current black-pill `+ New` button.
4. **Favorites toggle** is per-card (♥ on hover/when on), NOT a top-level
   filter checkbox. The "Favorites" filter lives in the sidebar nav under "Home".
5. **CherryBranch SVG** at sidebar footer is the "arbolito" the user noticed
   missing. Copy the full SVG from `_mockup-source/sidebar.jsx:60-103`.
6. **Tag chips by category** map cleanly to our 5 categories (mockup categories
   are Templates / Agentes / Skills / Favoritos; ours are template / agente /
   skill / data_output / plan). Suggested mapping for our categories:
   - `template` → `#E8F4FF` (blue)
   - `agente` → `#F0F8E8` (green)
   - `skill` → `#FFF3E8` (orange)
   - `plan` → `#FFF0F5` (pink)
   - `data_output` → `#F5F5F5` (gray-100, fallback)
7. **Hover glow on cards** is in the mockup but PLAN.md § 9.2 reserves it for
   Phase 10. Active-state shadow (when card is selected) IS in scope for
   Phase 9 — it is a static visual indicator, not animation.
8. **Tag chip style depends on `prompt.hasVariables`**, not on category. Cards
   with variables get sakura-tinted tags; cards without get neutral gray tags.
   Category color appears only on the bottom-right badge.

## New tokens to add to `app/globals.css`

```css
@theme {
  /* existing... */
  --color-tag-blue: #E8F4FF;     /* already present, confirm */
  --color-tag-green: #F0F8E8;    /* already present, confirm */
  --color-tag-orange: #FFF3E8;   /* NEW — Skills */
  --color-tag-pink: #FFF0F5;     /* NEW — Favoritos / plan */
  --color-gray-50: #FAFAFA;      /* NEW — search inset bg */
  --color-gray-300: #D0D0D0;     /* NEW — favorite off */
  --color-gray-400: #A0A0A0;     /* may already exist as token */
  --sidebar-width: 224px;        /* NEW */
  --gallery-width: 320px;        /* NEW */
  --radius-sm: 5px;              /* NEW */
}
```

Update tailwind extend (or rely on Tailwind v4 auto-pickup if using `@theme`).
