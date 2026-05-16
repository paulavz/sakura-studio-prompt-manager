# PLAN — UX polish post-schema migration (2026-05-15)

> **Sequenced after** `PLAN-DESIGN-DELTA-V2.md` § "Implementation status — RESUME HERE" Steps A–E. This plan addresses concrete regressions reported by the user after the partial sidebar/types refactor.
> **Reference design (authoritative):** `C:\Users\paula\Downloads\Projects\sakura-studio-promp-manager\design\last Sakura Prompt Studio _Demo standalone_.html`
> **Extracted JSX (source of truth for spacing/icons/cursors):**
> - Sidebar: `design/_extracted/2e46a690-1e09-49ed-8a64-1ec2edf6b3b9.jsx`
> - Markdown / Skills dropdown: `design/_extracted/3dd4d42d-a7df-4dc3-8b02-53ec9f74169f.jsx` (lines 120–162)

This plan does **not** implement anything. It catalogs the bugs and lists the exact files/lines to touch, in order.

---

## User-reported bugs (verbatim)

1. *"los cursor no se activan correctamente"* — buttons across the app do not show a pointer cursor on hover. Worst offenders are in the sidebar; also affects the toolbar buttons in the prompt viewer.
2. *"creo que en el menu de skill no salen las skills"* — opening the Add Skill dropdown shows no skills.
3. *"el menu de la sidebar no esta alineado con el diseno"* — sidebar nav items, group headers, and the footer Settings entry do not match the spacing and visual weight of the mockup.
4. *"la sidebar tambien tiene espacio e iconos incorrectos"* — the gap between `NavGroup`s is too large; subcategory icons under Templates are all `▸` instead of the per-item glyphs the mockup uses.
5. *"el icono de setting esta muy pequeno"* — the gear glyph in the footer Settings button is the wrong size and the button alignment differs from the mockup.

---

## Root-cause diagnosis (verified, not guessed)

### Bug 1 — Cursors do not activate

**Root cause: Tailwind v4 default change.** The project uses Tailwind v4 (`@import "tailwindcss"` + `@theme` block in `app/globals.css:1-3`). Tailwind v4 **removed the legacy `cursor: pointer` default on `button`, `[role="button"]`, and disabled-button-style elements** that v3 applied via preflight. Every `<button>` in the codebase now inherits `cursor: default` from the user-agent stylesheet unless an explicit `cursor-pointer` utility is applied.

Evidence:
- `Grep "cursor-pointer|cursor:"` returns only `components/item-view.tsx` and `components/item-card.tsx`. The 20+ `<button>` elements across `components/sidebar.tsx`, `components/nav-group.tsx`, `components/agent-selector.tsx`, `components/variable-drawer.tsx`, `components/history-drawer.tsx`, `components/skill-selector.tsx`, `app/settings/**`, `app/items/new/page.tsx` have no `cursor-pointer` utility.
- The design mockup (`design/_extracted/2e46a690…jsx:14`, `:42`, `:208`, etc.) sets `cursor: 'pointer'` inline on **every** interactive element. Confirms this is intended behavior — the bug is on our side, not the mockup.

### Bug 2 — Skills menu shows no skills

**Root cause: post-TRUNCATE empty DB, not a code bug.** `components/skill-selector.tsx:30` calls `getSkills()` (in `app/actions.ts:161-180`) which queries `items WHERE category='skill'`. After `001_clean_db.sql` ran (per `PLAN-DESIGN-DELTA-V2.md` § Implementation status), the `items` table is empty. The dropdown correctly renders `"No skills available. Create an item with category 'skill' first."` (line 102–104 of `skill-selector.tsx`).

This is **not** a regression in the component. The fix is **data**, not code: re-seed the DB after fixing `supabase/seed.sql` (covered in `PLAN-DESIGN-DELTA-V2.md` Step A).

There is one separate UX concern worth tracking, though: the empty-state copy itself does not match the design's tone (the design has no empty-state because the mockup is always seeded). See § Phase 3 below.

### Bug 3 — Sidebar nav items not aligned with design

The current sidebar (`components/sidebar.tsx`) is structurally close to the design but visually drifts on three axes:

| Aspect | Design value (from JSX) | Current value | File / line |
|---|---|---|---|
| `NavGroup` bottom margin | `marginBottom: '4px'` (line 6) | `mb-4` (=16px) | `components/nav-group.tsx:70` |
| Section header padding | `padding: '5px 12px'` (line 11) | `px-[12px] py-[5px]` ✅ matches | `components/nav-group.tsx:76` |
| Section header → first child gap | `marginTop: '2px'` (line 26) | `space-y-[1px]` on `<ul>` with no margin-top | `components/nav-group.tsx:94` |
| Nav item padding | `padding: '6px 12px'` (line 36) | `px-[12px] py-[6px]` ✅ matches | `components/sidebar.tsx:145, 163, 185, 207, 228` |
| Nav item icon gap | `gap: '8px'` (line 36) | `gap-[8px]` ✅ matches | same |
| Hover state | `background: 'var(--gray-50)'` + `color: 'var(--black)'` (lines 44–45) | `hover:bg-gray-50 hover:text-black` ✅ matches | same |
| Chevron rotation (closed) | `rotate(-90deg)` (line 21) | `rotate(0deg)` | `components/nav-group.tsx:14` |
| Chevron rotation (open) | `rotate(0deg)` (line 21) | `rotate(90deg)` | same |

**Conclusion:** the alignment problem is dominated by `mb-4` (~12px too much) and the inverted chevron rotation, not by item-level styling.

### Bug 4 — Wrong icons for Templates subcategories

Design (lines 170–179 of sidebar.jsx):
```js
['Planes', 'Test', 'Debug', 'n8n'].map(sub => (
  <NavItem … icon={sub === 'Planes' ? '▦' : sub === 'Test' ? '◎' : sub === 'Debug' ? '⬡' : '⟳'} … />
))
```
| Subcategory | Design glyph | Current glyph |
|---|---|---|
| Planes | `▦` | `▸` |
| Test | `◎` | `▸` |
| Debug | `⬡` | `▸` |
| n8n | `⟳` | `▸` |

Fix lives in `components/sidebar.tsx:192` — replace the single `▸` with a per-subcategory map.

Also: the design's `All Prompts` icon is `◈`, `Favorites` is `♡`, `All Agents` is `⌥`, `All Skills` is `✦`. The current code matches all of those. ✅

### Bug 5 — Footer Settings button: icon size + alignment

Design (lines 204–214 of sidebar.jsx) for the footer Settings button:
```js
<button onClick={onOpenSettings} style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 10px', fontSize: 13, color: 'var(--gray-600)',
  background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
}}>
  <span style={{ fontSize: 13, opacity: 0.7 }}>⚙</span>
  <span style={{ flex: 1 }}>Settings</span>
</button>
```

Key deltas in `components/sidebar.tsx:248-258`:
| Aspect | Design | Current | Action |
|---|---|---|---|
| Font size | `13px` | `text-[12px]` | Bump to `text-[13px]` |
| Icon size | explicit `fontSize: 13` on the `⚙` span | inherits parent `12px` | Wrap `⚙` in `<span className="text-[13px] opacity-70">` |
| Layout | left-aligned, label takes `flex: 1` | `justify-center` (centered) | Remove `justify-center`, add left-alignment + `flex-1` on the label span |
| Padding | `6px 10px` | `px-[10px] py-[6px]` ✅ matches | none |
| Icon opacity | `0.7` | `1` (inherited) | Add `opacity-70` to icon span |

Also: the design places `Settings` **above** the cherry blossom illustration. Current order is `Settings → CherryBranch → In flow` ✅ matches.

---

## Phase 1 — Global cursor fix (highest impact, smallest blast radius)

**Skills:** `tailwind-design-system`, `web-design-guidelines`.

**Decision required first:** choose **one** approach. Recommended is (A) because it matches Tailwind v3 behavior the codebase was originally written against, and avoids touching ~25 files.

- **(A) Global CSS rule in `app/globals.css`** *(Recommended)*
  Add inside the `@layer base` block (create it if missing — currently the file only has `@import` + `@theme`):
  ```css
  @layer base {
    button:not(:disabled),
    [role="button"]:not([aria-disabled="true"]) {
      cursor: pointer;
    }
  }
  ```
  Pros: one line, restores v3 behavior, respects `disabled` state automatically.
  Cons: implicit — devs new to the project may not know cursors are auto-applied.

- **(B) Explicit `cursor-pointer` utility on each `<button>`**
  Touches every interactive component file. Roughly 25 sites identified by `Grep -P "<button" --type tsx`. Pros: explicit. Cons: high churn, easy to forget on future buttons.

**Acceptance:** hovering any `<button>` (sidebar nav, NavGroup chevron, Add Skill, Use Template, Copy, Save, Cancel, history items, settings tags, drawer close ×, favorite heart) shows the pointer cursor. Hovering a `disabled` button keeps the default cursor.

**Files touched if (A):** `app/globals.css` only.

---

## Phase 2 — Sidebar spacing & chevron alignment

**Skills:** `web-design-guidelines`, `tailwind-design-system`.

Goal: bring sidebar metrics within 1px of the design.

### 2.1 — Tighten group spacing
- `components/nav-group.tsx:70` — change `mb-4` → `mb-[4px]`. Verified design value: 4px (sidebar.jsx line 6).
- `components/nav-group.tsx:94` — wrap children with a `mt-[2px]` (the design adds `marginTop: 2px` after the header, sidebar.jsx line 26). Either:
  - Add `className="mt-[2px] space-y-[1px]"` to the `<ul>` (still inside the `motion.div`), or
  - Put `marginTop` on the `motion.div` itself.
  Pick the first — keeps motion config clean.

### 2.2 — Fix chevron rotation direction
- `components/nav-group.tsx:14` — invert the rotation logic so closed = `-90deg`, open = `0deg`. Current is closed = `0`, open = `90deg`. The SVG path `M3 2L6 5L3 8` points **right** at rest, so rotation must lift it **up to point down** when open. Design does this via `transform: open ? 'rotate(0deg)' : 'rotate(-90deg)'` on a `M2 3.5L5 6.5L8 3.5` path that points **down** at rest.
- **Decision:** keep the existing SVG path and only flip the rotation. New rule: `transform: open ? "rotate(90deg)" : "rotate(0deg)"` is **already correct semantically** (right→down). The user perceives it as misaligned because the SVG path differs from the design — verify in the browser. If still off, swap the SVG path to `M2 3.5L5 6.5L8 3.5` and use the design rotation values.

### 2.3 — Subcategory icons under Templates
- `components/sidebar.tsx:192` — replace the literal `▸` with a per-subcategory glyph map. Extract a helper above the component:
  ```ts
  const SUBCATEGORY_ICONS: Record<string, string> = {
    Planes: "▦",
    Test: "◎",
    Debug: "⬡",
    n8n: "⟳",
  };
  ```
  Then `{SUBCATEGORY_ICONS[sub] ?? "▸"}` to keep a safe fallback for future subcategories.

### 2.4 — Verify icon weight/opacity on active items
The design's active icon stays at `opacity: 1`, inactive at `opacity: 0.7`. Current code matches (line 192 has `opacity-100` / `opacity-70` ternaries). ✅ Confirm visually after 2.1–2.3 land.

**Acceptance:** screenshots of the sidebar side-by-side with the mockup (`design/last Sakura Prompt Studio _Demo standalone_.html` opened in a browser) match within 2px on vertical spacing and exactly on iconography.

---

## Phase 3 — Footer Settings button

**Skills:** `web-design-guidelines`.

Patch in `components/sidebar.tsx:248-258`:
1. Remove `justify-center` from the `<Link>`.
2. Add `flex` + `items-center` + `gap-[8px]` (the design uses `gap: 8`, current uses `gap-[6px]`).
3. Bump label font to `text-[13px]`.
4. Wrap the `⚙` glyph in `<span className="text-[13px] opacity-70 shrink-0">⚙</span>`.
5. Wrap the `Settings` label in `<span className="flex-1">Settings</span>`.
6. Padding: change `px-[10px] py-[6px]` (already matches — keep).

**Acceptance:** the `⚙` glyph renders at the same visual size as a sidebar nav-item icon (13px). The label is left-aligned. Hover behavior already correct (`hover:bg-gray-50 hover:text-black`).

---

## Phase 4 — Skill dropdown empty state (cosmetic, optional)

**Skills:** `web-design-guidelines`.

The empty-state copy in `components/skill-selector.tsx:102-104` is functional but verbose. Design has no empty state (always seeded). Two options:

- **Keep as-is** — useful for users post-wipe.
- **Tone-match** — shorten to: `"No skills yet."` and add a subtle `"Create one →"` link to `/items/new?category=skill`.

Recommend **keep as-is** until a real user complains. The primary fix for "skills don't show" is the data re-seed in `PLAN-DESIGN-DELTA-V2.md` Step A — once that runs, this dropdown will populate.

**No file touches** unless the user explicitly wants the copy change.

---

## Phase 5 — Cursor fix sanity sweep on non-button interactives

**Skills:** `vercel-react-best-practices`, `web-design-guidelines`.

After Phase 1, audit interactive elements that are **not** `<button>` and may still have a default cursor:
- `<div role="button">` in `components/item-card.tsx:96-108` — covered by the global rule from Phase 1A if it uses `[role="button"]`. Verify.
- `<Link>` elements — get `cursor: pointer` from the user agent for `<a>`. ✅
- Clickable `<div>` without `role` — should be refactored to `<button>` rather than handled by CSS. Grep for `onClick=` on `<div>` and refactor any hits.

**Acceptance:** every clickable element has a pointer cursor; no clickable `<div>` without `role` remains.

---

## Verification (after Phases 1–3)

Run, in order:

```bash
npm run typecheck
npm run test
npm run test:e2e:playwright -- --grep "sidebar"
```

Manual visual check (golden path):
1. Open `/` in the browser.
2. Hover every group header — chevron rotates smoothly, cursor is pointer.
3. Hover every nav item — bg turns `gray-50`, cursor is pointer.
4. Verify Templates expands to show 4 items with `▦ Planes / ◎ Test / ⬡ Debug / ⟳ n8n`.
5. Click the footer Settings button — visually sized like a nav item, navigates to `/settings/tags`.
6. After seed.sql is re-applied (Step A of the V2 plan), click `Add Skill` in the prompt viewer — dropdown lists the seeded skills.
7. Open the Variables Drawer (any prompt with `{{ }}`) — close × button has pointer cursor.

---

## Out of scope for this plan

- Re-seeding the DB (`supabase/seed.sql` rewrite) — already tracked as **Step A** of `PLAN-DESIGN-DELTA-V2.md` § Implementation status. Must run before Phase 4 acceptance.
- Sidebar group reorganization (Templates/Agents/Skills) — already landed in `components/sidebar.tsx` per the user's mid-session edit.
- Variables Drawer redesign (360px width, progress bar) — tracked in `PLAN-DESIGN-DELTA-V2.md` § Phase 4.
- History Drawer width + global ConfirmDialog — tracked in `PLAN-DESIGN-DELTA-V2.md` § Phase 5.
- Markdown pink markers — `PLAN-DESIGN-DELTA-V2.md` § Phase 8.

---

## Implementation order (recommended)

1. **Phase 1 (cursors)** — one-line CSS change, unblocks every other test.
2. **Phase 2 (sidebar spacing + icons)** — visible win, no dependencies.
3. **Phase 3 (Settings button)** — small, contained.
4. *(External)* run Step A of V2 plan to repopulate seed data.
5. **Phase 5 (cursor sweep)** — covers stragglers.
6. *(Optional)* Phase 4 (empty-state copy) only if user requests.
