# PLAN — Design Fidelity Fixes

> Reference design: `design/Sakura Prompt Studio - Phase 9.1 _standalone_.html`
> Scope: align Settings page, editor variables, copy UX, tag colors, sidebar collapsibility, and stray Spanish copy with the Phase 9.1 mockup.
> **All UI strings must be in English (per CLAUDE.md language rule).**

Each phase declares which skill(s) from `.agents/skills/` to load before touching code. Available skills:
- `web-design-guidelines` — visual fidelity, spacing, typography decisions.
- `tailwind-design-system` — token usage, no hardcoded colors, theme consistency.
- `vercel-react-best-practices` — component structure, hooks, accessibility.
- `vercel-composition-patterns` — composition of compound components (collapsible nav, etc.).
- `tiptap` — editor extensions, marks/nodes, ProseMirror behavior.
- `webapp-testing` — Playwright/Vitest coverage for the changes.
- `supabase-postgres-best-practices` — only if a phase touches DB (none in this plan).

---

## Phase 1 — Audit & baseline

**Skills:** `web-design-guidelines`, `tailwind-design-system`.

Goal: lock down the exact deltas between current build and the Phase 9.1 mockup before writing code.

- [ ] Open `design/Sakura Prompt Studio - Phase 9.1 _standalone_.html` in a browser; capture screenshots of: full sidebar (collapsed + expanded states), Settings → Tags, Settings → Variables, editor with `{{variable}}` chips, copy button with petal animation, tag chips on cards.
- [ ] Diff against current screens (`/`, `/settings/tags`, `/settings/variables`, `/items/[id]`).
- [ ] List every token (color, spacing, radius, font size) used in the design that is missing from `app/globals.css` `@theme` block. Do not hardcode any new color in components — every new value lands in `globals.css` first.
- [ ] Output: a short delta table appended to this file (Phase 1 results) — no code yet.

**Done when:** explicit list of token additions + component changes is approved.

## Phase 1 Results — Audit & baseline

Screenshots captured during audit are stored in `phase1_audit/`:
- `design_full.png` — full Phase 9.1 mockup render
- `app_gallery.png` — current `/`
- `app_settings_tags.png` — current `/settings/tags`
- `app_settings_variables.png` — current `/settings/variables`

### 1. Missing / incorrect design tokens in `app/globals.css @theme`

| Token | Design Value | Current State | Notes |
|---|---|---|---|
| `--color-agent-border` | `#C8DCB4` | `#9DC9A0` (`--color-agent-pill-border`) | Value mismatch — design calls it `--agent-border` |
| `--color-agent-ink` | `#4E7A3A` | `#2F5132` (`--color-agent-pill-text`) | Value mismatch — design calls it `--agent-ink` |
| `--width-history` | `360px` | Missing | History drawer width (`components/history-drawer.tsx:97` uses `max-w-sm`) |
| `--width-vars-wide` | `760px` | Missing | Variable drawer width (`components/variable-drawer.tsx:154` uses `max-w-sm md:max-w-md`) |
| `--height-savebar` | `52px` | Missing | Save/Cancel bar height (`components/save-bar.tsx` has no height token) |
| `--animate-save-bar-up` | `240ms cubic-bezier(0.32, 0.72, 0, 1)` | Hardcoded `duration: 0.2, ease: "easeOut"` | Motion token missing |
| `--animate-save-bar-down` | `200ms ease-in` | Hardcoded same as up | Motion token missing |
| `--animate-history-drawer` | `280ms cubic-bezier(0.32, 0.72, 0, 1)` | Spring physics `stiffness: 340, damping: 32` | Motion token missing |
| `--animate-hover-glow` | `200ms cubic-bezier(0.2, 0, 0, 1)` | Hardcoded in `item-card.tsx:90` | Motion token missing |
| `--color-tag-text` / `--color-tag-bg` / `--color-tag-border` | Neutral gray family | Hardcoded `text-gray-600 bg-gray-100 border-gray-200` | Needs semantic token so chips stay neutral |

### 2. Component deltas (current build → Phase 9.1 mockup)

| Component / Lines | Current State | Design State | Tracking Phase |
|---|---|---|---|
| `components/item-card.tsx:67-71` | Tag chips turn pink (`text-variable-text bg-sakura-soft border-sakura/40`) when `hasVars` | Always neutral chip style; sakura indicator (🌸) already communicates variables | Phase 2 |
| `components/item-card.tsx:80` | Category pill uses hardcoded `CATEGORY_COLORS` class fork (`bg-tag-blue`, `bg-tag-pink`, etc.) | Should read bg from a token, not a hardcoded class fork | Phase 2 |
| `components/gallery.tsx:147-237` | Chevron SVG never rotates; sections never collapse | Collapsible disclosure groups with chevron rotation, `AnimatePresence` height animation, `localStorage` persistence, keyboard accessibility | Phase 3 |
| `app/settings/layout.tsx` | Standalone header + 192px left nav with text links; "← Back to gallery" | Embedded in shared sidebar/gallery shell; Settings replaces editor/viewer pane; vertical nav styled like sidebar items | Phase 4 |
| `app/settings/tags/page.tsx` | Generic create input, list rows, confirm-delete dialog; raw `bg-error / text-error` classes | Mockup paddings, radii, typography; semantic error tokens; consolidated confirm-dialog style | Phase 4 |
| `app/settings/variables/page.tsx` | Simple `dl` rows | Should match Tags row style from mockup | Phase 4 |
| `components/item-view.tsx:362-367` | Plain bordered "Copy raw" button; `handleCopy` does **not** trigger petal rain | Icon+label "Copy"; success state shows ✓ + "Copied" for ~1.4s; triggers `PetalRain` on success | Phase 6 |
| `components/variable-drawer.tsx:154` | Width `max-w-sm md:max-w-md` | 760px or 50% viewport | Phase 6 |
| `components/variable-drawer.tsx:205-209` | Red border + inline red error text when out of range | No red border, no inline error styling; validation blocks only the Copy button | Phase 6 |
| `components/variable-drawer.tsx:237-253` | Generic black/gray "Copy Result" button | Match mockup copy button style (same as item-view) | Phase 6 |
| `components/save-bar.tsx` | `y: 60, duration: 0.2, easeOut` | `translateY(100%) → 0`, `240ms`, `cubic-bezier(0.32, 0.72, 0, 1)` | Phase 6 |
| `app/items/new/page.tsx:28` | Placeholder `"Mi nuevo prompt..."` | `"My new prompt..."` | Phase 7 |

### 3. Cross-checks passed

- No `#FFB7C5` literal found outside `app/globals.css` and test helpers (good).
- `PetalRain` component is mounted in `item-view.tsx` (line 415) and not behind a conditional.
- Spanish UI string confirmed: only the placeholder in `app/items/new/page.tsx:28`.

---

## Phase 2 — Design tokens & tag color system

**Skills:** `tailwind-design-system`, `web-design-guidelines`.

The current `bg-tag-blue / pink / green / orange` palette is muted but the user reports tag colors look "strange" — they don't match the mockup, and the per-card override that paints all tags pink when the item has variables is conflating *category color* with *variable indicator*.

- [x] Add any missing category/tag tokens to `app/globals.css` `@theme` block (e.g. text-on-tag, hover-on-tag) matching the mockup's exact palette.
- [x] Remove the `hasVars ? sakura-soft : gray-100` branch in `components/item-card.tsx:67-71`. Tag chips should always use the neutral chip style; the sakura 🌸 indicator already communicates "has variables". Pink stays reserved for the 3 official Sakura uses (CLAUDE.md rule).
- [x] Verify Category pill in `components/item-card.tsx:80` reads its bg from a token, not a hardcoded class fork.

**Done when:** tag chips visually match design across all 5 categories; no `#FFB7C5` literal appears outside `globals.css`.

---

## Phase 3 — Sidebar: collapsible category groups

**Skills:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`.

`components/gallery.tsx:147-237` renders Home / Categories / Settings sections with a chevron SVG that **never rotates and never collapses anything**. Mockup shows each group is a collapsible disclosure.

- [x] Extract a small `<NavGroup label collapsible defaultOpen>` client component (composition pattern), backed by `useState`. Persist the open/closed state per group in `localStorage` so the user's layout sticks across reloads.
- [x] Animate the chevron rotation + section height (Framer Motion `AnimatePresence` with a height auto) to match the easing used in the rest of the app.
- [x] Keep keyboard accessibility: header is a `<button aria-expanded>` toggling an `aria-controls` region.
- [x] Replace the inline chevron SVG with a shared icon to avoid duplication between Home/Categories/Settings.

**Done when:** clicking "Home" or "Categories" collapses/expands the list with chevron rotation; state persists; no regressions in category filtering.

---

## Phase 4 — Settings page redesign

**Skills:** `web-design-guidelines`, `tailwind-design-system`, `vercel-react-best-practices`.

`app/settings/layout.tsx` is currently a generic header + 192px left nav with two text links — nothing like the mockup, which embeds Settings inside the same sidebar/gallery shell as the rest of the app.

- [x] Rebuild `app/settings/layout.tsx` to reuse the gallery sidebar shell (or a shared `<AppShell>` extracted from `components/gallery.tsx`). Settings becomes the third pane, replacing the editor/viewer pane — same header, same branding block, same footer, same tokens.
- [x] Inside the Settings pane: a vertical nav (Tags, Variables) styled like the sidebar `<NavGroup>` items, not as a separate left rail.
- [x] Tags page (`app/settings/tags/page.tsx`):
  - [x] Restyle the create-tag input, list rows, and confirm-delete dialog to match mockup paddings, radii, and typography.
  - [x] Replace `bg-error / text-error` raw classes with semantic tokens used elsewhere.
  - [x] Confirm dialog: align with `components/confirm-dialog.tsx` style if one exists (consolidate, don't duplicate).
- [x] Variables page (`app/settings/variables/page.tsx`): same treatment, dl rows match Tags row style.
- [x] No standalone "← Back to gallery" link — navigation lives in the sidebar, like the rest of the app.

**Done when:** `/settings/tags` and `/settings/variables` are visually indistinguishable from the mockup's Settings panel, including the surrounding sidebar.

---

## Phase 5 — Variable chips render pink inside the Tiptap editor

**Skills:** `tiptap`, `vercel-react-best-practices`.

`components/tiptap-variable-chip.ts` defines a `Mark` with `parseHTML` matching `span[data-testid="variable-chip"]`, and `lib/markdown.ts:34` already emits that span. User reports variables still don't show pink in the rendered (WYSIWYG) editor — investigate root cause.

- [x] Reproduce: open an item containing `{{foo}}` in Rendered mode and confirm the chip lacks pink styling.
- [x] Likely cause options (verify, don't guess):
  1. Tiptap's `StarterKit` is stripping the inline `style` attribute on the span; `Mark.renderHTML` runs only on edits, not on initial `setContent` parse — fix by ensuring `parseHTML` returns the attrs and `renderHTML` is authoritative.
  2. `htmlToMarkdown` is stripping the chip on the round-trip, so reopens render `{{foo}}` as plain text — fix by detecting `data-testid="variable-chip"` and emitting the raw `{{foo}}` form back.
  3. ProseMirror schema doesn't allow this Mark on the parent nodes — extend `addOptions` or convert to an inline atom Node if a Mark can't carry the styling reliably.
- [x] Move the chip's visual styling out of inline `style=` and into the `.variable-chip` CSS class already declared in `globals.css:79-89` — one source of truth.
- [x] Add a unit test for `markdownToHtml('hello {{foo}}')` and a Tiptap-mounted Playwright test that asserts the chip is `color: var(--color-variable-text)`.

**Done when:** typing `{{name}}` in rendered mode produces a pink chip; reopening a saved item keeps the chip pink; raw-mode round-trip preserves `{{name}}`.

---

## Phase 6 — Copy button restyle + petal rain trigger

**Skills:** `web-design-guidelines`, `vercel-react-best-practices`.

`components/item-view.tsx:362-367` shows a plain bordered "Copy raw" button. Mockup shows a styled button (icon + label) and the spec requires the petal-rain animation to fire on every successful copy.

- [x] Confirm `handleCopy` in `components/item-view.tsx` calls `setPetalTrigger((n) => n + 1)` after `navigator.clipboard.writeText` resolves. If missing, add it.
- [x] Cross-check `<PetalRain trigger={petalTrigger} />` is mounted in `item-view.tsx` and not behind a conditional that hides it.
- [x] Restyle the button to match the mockup: copy icon (lucide or inline SVG), label "Copy" (not "Copy raw" — the design label), success state shows ✓ + "Copied" for ~1.4 s, then resets. Token-based hover (no hardcoded colors).
- [x] Apply the same button treatment to the Drawer's "Copy Result" button (`components/variable-drawer.tsx:251`) — both copy paths trigger petals.
- [x] Playwright test: clicking Copy fires `<canvas>` from `PetalRain` for ≥1 frame.

**Done when:** Copy button matches design; clicking it copies to clipboard, shows success state, and renders the petal rain on both the viewer and the drawer.

---

## Phase 7 — English-only copy sweep

**Skills:** `vercel-react-best-practices` (light — mostly a string sweep).

Per CLAUDE.md the project must be English-only. Known offenders found:
- `app/items/new/page.tsx:28` — placeholder `"Mi nuevo prompt..."` → `"My new prompt..."`.
- Grep the whole repo (`.ts`, `.tsx`, `.md` user-facing strings, error messages) for Spanish stragglers: `Crear`, `Guardar`, `Cancelar`, `nuevo`, `aplicar`, `favoritos`, etc. CLAUDE.md itself is mostly Spanish — leave the spec file alone unless explicitly requested.

- [x] Replace any Spanish user-facing string with English (preserve `Actúa como el agente «X»` and `Usa la skill [X]` — those are protocol strings, not UI copy, defined in CLAUDE.md §2-bis / §2).
- [x] Update any test fixtures that assert on Spanish strings.

**Done when:** `rg -i "(crear|guardar|cancelar|favoritos|nuevo prompt)" --type tsx --type ts` returns no UI hits.

---

## Phase 8 — Verification & regression

**Skills:** `webapp-testing`, `web-design-guidelines`.

- [x] Visual diff: side-by-side mockup vs running app for Gallery, Item view, Settings (Tags + Variables), editor with variables, copy flow with petals. Screenshots captured in `phase8_screenshots/`.
- [x] Run the full Playwright suite (`npm run test:e2e:playwright`) and existing unit tests. Fixed 3 tests broken by renamed labels ("Copy raw" → "Copy", "Variables" → "Variables Drawer", removed "Back to gallery" link).
- [x] Add Playwright coverage for new flows: E12.6 verifies Copy button icon + label.
- [x] Confirm no `#FFB7C5` literals outside `globals.css`.

**Done when:** all suites green, screenshots match mockup, no `#FFB7C5` literals outside `globals.css`, no Spanish UI strings remain.

---

## Out of scope (deliberately not in this plan)

- DB / RLS / migration work (no schema changes implied by these visual fixes).
- Auth v2 flip (`NEXT_PUBLIC_AUTH_ENABLED`).
- Skills unification refactor (`PLAN-FIXES.md § Fase 3`) — independent track.
- New features beyond what the mockup shows.
