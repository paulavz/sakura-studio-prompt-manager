# PLAN — Design Delta V2 (new Demo mockup vs current build)

> **Reference design (authoritative, local):** `C:\Users\paula\Downloads\Projects\sakura-studio-promp-manager\design\last Sakura Prompt Studio _Demo standalone_.html`
> Reference design (URL, secondary): `https://api.anthropic.com/v1/design/h/NChn6sxN06_LSWv_KtdrOA?open_file=Sakura+Prompt+Studio.html`
> Extracted JSX sources for diffing: `design/_extracted/` (Sidebar `2e46a690…jsx`, Gallery `37c85003…jsx`, PromptViewer + Markdown `3dd4d42d…jsx`, VariablesDrawer `1005dc1e…jsx`, HistoryDrawer `b7b23c8a…jsx`, Settings `d4270c88…jsx`, App `6e26f25d…jsx`, PetalRain `72f26093…jsx`).
> Scope: **planning only — no code changes**. Identify deltas between this newer "Demo" mockup and the current `improve-design` branch, and surface the open questions before touching code.
> Previous design pass landed in `PLAN-DESIGN-FIXES.md` (Phase 9.1 mockup, completed). This plan is the **next iteration** against a newer mockup (the "Demo" file cited above) that introduces structural changes: sidebar taxonomy (Templates/Agents/Skills), history drawer, settings subnav with sliders, dedicated "Use Template" button, etc.

---

## Skill assignments (from `.agents/skills/`)

Each phase below declares which skills to load before touching code. The available skills are documented in `PLAN-DESIGN-FIXES.md` (lines 8–14):

- `web-design-guidelines` — visual fidelity, spacing, typography decisions.
- `tailwind-design-system` — token usage, no hardcoded colors, theme consistency.
- `vercel-react-best-practices` — component structure, hooks, accessibility.
- `vercel-composition-patterns` — composition of compound components (collapsible nav, drawers, dropdowns).
- `tiptap` — editor extensions, marks/nodes, ProseMirror behavior.
- `webapp-testing` — Playwright/Vitest coverage for the changes.
- `supabase-postgres-best-practices` — DB schema work (only when a phase touches Postgres).

Per-phase skill picks are inlined under each Phase heading below.

---

## Phase 0 — Source of truth & guardrails

**Skills:** `web-design-guidelines`, `tailwind-design-system`.

- Local HTML is the authoritative reference (CLAUDE.md rule). The bundle was decoded into plain `.jsx`/`.js` files under `design/_extracted/` for diffing. Treat those as **read-only spec artifacts**, not deliverables.
- All UI strings in the new design include a few Spanish leftovers (`"Skills activas:"`, drawer placeholders `descripcion`/`objetivo`/`contexto`, Tweaks panel labels). CLAUDE.md requires English-only — implementations must translate these.
- Pink (`#FFB7C5`, `#C45E78`) and `sakura-soft` rgba values stay centralized in `app/globals.css @theme`. No new hardcoded literals in components — every new shade goes through a token (matches PLAN-DESIGN-FIXES § Phase 2 rule).
- Tweaks Panel (`6e26f25d…jsx` lines 148–176) is a **mockup-only edit-mode harness**. Out of scope; ignore.

---

## Phase 1 — Sidebar taxonomy & navigation model

**Skills:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `supabase-postgres-best-practices` (only if Q1 lands on a `subcategory` column migration).

**Design** (`design/_extracted/2e46a690-1e09-49ed-8a64-1ec2edf6b3b9.jsx`) renders these groups in order:
1. **Home** → `All Prompts`, `Favorites`
2. **Templates** → subcategory items `Planes`, `Test`, `Debug`, `n8n`
3. **Agents** → individual agent items (e.g. `PR.md`)
4. **Skills** → `All Skills`

Filters in design are keyed on `{ type: 'all' | 'favorites' | 'category' | 'subcategory' | 'search', value }`, where:
- `subcategory` matches a prompt-level field (`prompt.subcategory`)
- Templates section drives `subcategory` filters; Agents section drives `subcategory` filters where the value is an individual agent file name; Skills drives `category === 'Skills'`.

**Current app** (`components/sidebar.tsx`, `lib/database.types.ts`) uses a flat **Categories** group (template / plan / data_output / agente / skill) with no subcategory dimension. The schema (`items.category` text check constraint in CLAUDE.md) has no `subcategory` column.

### Deltas
| # | Area | Design | Current | Decision needed |
|---|---|---|---|---|
| 1.1 | Group structure | Home / Templates / Agents / Skills | Home / Categories / Settings | Reorganise to match design? |
| 1.2 | Subcategory dimension | Templates expand to Planes/Test/Debug/n8n | No subcategory field | Add `items.subcategory text` column + migration, or fake it with tag prefixes, or drop subcategories? |
| 1.3 | Agents section content | One nav item per agent file (e.g. `PR.md`) | `agente` is a category lumping all agent items | Render an item-per-agent inside the Agents group? If yes, click filters to that agent only (eq. `subcategory = 'PR.md'`)? |
| 1.4 | Settings entry | Footer button **outside** the nav list | Footer button + a `Settings` NavGroup item in the nav | Drop the in-nav Settings entry (use footer only, like design)? |
| 1.5 | Search location | Inside sidebar, sakura focus border | Inside sidebar (already aligned) | None — keep as is. |
| 1.6 | `data_output` / `plan` categories | Not represented in design | Present in schema and sidebar | Hide them from the sidebar, keep in schema for legacy items, or remove entirely? |

### Open questions (ask user)
- **Q1**: Should we add a real `subcategory` column to `items` (DB migration), or derive subcategories from tag prefixes / existing fields?
- **Q2**: The design's Agents section lists individual agents as nav items. Do you want one nav item per agent in the user's data, dynamically? Or hardcode known agents?
- **Q3**: The design drops the `data_output` and `plan` categories entirely. Are those still semantically used? Keep, hide, or remove?
- **Q4**: The current app has a `Settings` group inside the nav (`Phase 3` from previous plan). The design only exposes Settings via the footer button. Remove the in-nav group?

---

## Phase 2 — Gallery header & cards

**Skills:** `tailwind-design-system`, `web-design-guidelines`, `vercel-react-best-practices`.

**Design** (`design/_extracted/37c85003…jsx`):
- Gallery column is 320px.
- Header: filter label + `N prompts` + small chip `🌸 with variables`, **plus** a 28×28 `+` button (top-right) for "New prompt".
- `PromptCard`:
  - Title (13.5px, 600), 🌸 indicator when `hasVariables`, favourite heart (visible on hover or when favorite).
  - **Tags ARE pink when `prompt.hasVariables`** (color `#C45E78`, bg `rgba(255,183,197,0.18)`), grey otherwise.
  - Category pill uses fixed light backgrounds keyed off `prompt.category` (`Templates: #E8F4FF`, `Agentes: #F0F8E8`, `Skills: #FFF3E8`, `Favoritos: #FFF0F5`).
  - Hover: lift `translateY(-2px)` + sakura glow (`0 8px 24px var(--sakura-glow)`).
  - Active: `box-shadow: 0 0 0 2px var(--sakura), 0 4px 20px var(--sakura-glow)`.

**Current** (`components/gallery.tsx`, `components/item-card.tsx`):
- Gallery header already has `🌸 with variables` chip and `+` link (good).
- `item-card.tsx:67–71` was previously **forced neutral** for tags in `PLAN-DESIGN-FIXES § Phase 2`. The new design contradicts that — it explicitly paints tags pink when `hasVariables`.

### Deltas
| # | Component | Design | Current | Action |
|---|---|---|---|---|
| 2.1 | Card tag chip color | Pink when `hasVariables`, grey otherwise | Always neutral (per previous phase) | **Conflict** — see Q5 |
| 2.2 | Card hover shadow | `0 8px 24px var(--sakura-glow)` + `translateY(-2px)` lift | Already approximated | Audit values, align magnitude |
| 2.3 | Card active state | Pink ring + glow (clicking the card highlights it) | App routes to `/items/[id]`, so cards do not maintain an "active" state next to a visible viewer pane | Decide based on Q6 |
| 2.4 | Category pill bg palette | 4 fixed hex tints keyed off category | Token-driven `bg-tag-*` | Map current tokens to design's 4 hexes, or keep current palette? |

### Open questions
- **Q5**: The new design **reverses** the previous decision and paints tag chips pink when the prompt has variables. Do we follow the new design (revert Phase 2 from `PLAN-DESIGN-FIXES.md`), or keep the neutral chips because pink is "reserved" per CLAUDE.md?
- **Q6**: Does the gallery card need an "active selected" visual state? That only matters if the right-hand viewer pane is in the same screen as the gallery (Q11). On a routed `/items/[id]` page this becomes nav-state.

---

## Phase 3 — Prompt Viewer toolbar & buttons

**Skills:** `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns` (for the Add Skill dropdown).

**Design** (`design/_extracted/3dd4d42d…jsx` lines 164–388) toolbar order:
`Title + tags` → `[Render | Raw]` segmented toggle → **`✦ Add Skill`** dropdown button (with badge count) → **`Copy`** button (black bg, `✓ Copied` feedback) → **`🌸 Use Template`** button (only when `hasVariables`).

Also: a chips row below the toolbar shows added-but-unsaved skills with × removal. Label `"Skills activas:"` (Spanish — must become `"Active skills:"`).

**Current** (`components/item-view.tsx`):
- Has Copy, History toggle, Save bar, Skills/Agent panels. Need to verify exact button order and the presence of a `🌸 Use Template` button (the design makes it explicit and conditional, with pink outline + hover glow).

### Deltas
| # | Area | Design | Current | Action |
|---|---|---|---|---|
| 3.1 | "Use Template" button | Dedicated pink-outlined button visible only if `hasVariables` | Variables drawer opens from… verify (`components/variable-drawer.tsx` trigger location) | Add/relocate the button to match design styling |
| 3.2 | Add Skill UX | Inline dropdown attached to the button (`SkillsDropdown` component, 240px) | Existing skill picker — verify if it's a popover or full-page | Match dropdown layout/positioning |
| 3.3 | Skill chip row | Pink chips with `×` removal, **above** content, shown only when there are unsaved added skills | Verify — existing `applied-skills` panel may already render this | Compare and align |
| 3.4 | Assign Agent button | **Not present in design** | App has `Assign Agent` button (CLAUDE.md § 2-bis spec) | **Conflict** — see Q7 |
| 3.5 | Copy button style | Black bg → pink-soft on success (`✓ Copied`) | Already restyled in Phase 6 of prior plan | Verify final state matches |
| 3.6 | Tags in toolbar | Always pink mono chips | Verify current rendering | Align if neutral |

### Open questions
- **Q7**: The design **does not** show an "Assign Agent" button — agents are exposed only as sidebar items. CLAUDE.md §2-bis defines the Assign Agent feature as a first-class flow ("Actúa como el agente «X»…"). **Do we (a) remove the Assign Agent button to match the design, (b) keep it where it is, or (c) move agent assignment into the same dropdown as Add Skill?**
- **Q8**: The skill-chip row label `"Skills activas:"` is Spanish. Confirm target wording: `Active skills:` vs `Added skills:` vs no label.
- **Q9**: The design's "Use Template" button is **only** visible when the prompt contains `{{ }}`. Confirm that matches the desired UX (vs always visible/disabled).

---

## Phase 4 — Variables Drawer redesign

**Skills:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `tailwind-design-system`.

**Design** (`design/_extracted/1005dc1e…jsx`):
- Width **360px** (not 760px — supersedes Phase 6 of the previous plan which called for 760px).
- Backdrop blur overlay (`backdrop-filter: blur(2px)`).
- Header: `🌸 Use Template` + close ×, plus a **progress bar** (`filledCount / totalVars`) with sakura fill and glow.
- One input or textarea per variable, with:
  - Filled state: pink dot indicator, pink-tinted border + shadow, `#C45E78` label color.
  - `{{var}}` rendered as a mono code chip next to the label.
  - Auto-multiline for known long fields (`error_message`, `descripcion`, `objetivo`, `contexto`).
- "Result preview" panel appears once `filledCount > 0`, monospaced, max-height 180px.
- Footer: **full-width Copy button**, disabled style until `progress === 1`, with svg icon + `Copy Result` label, and a hint `"Complete all variables to copy"` below when incomplete.

**Current** (`components/variable-drawer.tsx`):
- Width `max-w-sm md:max-w-md` (≈ 384–448px). Close to 360px but should be locked.
- Has progress logic? Verify.
- Validation rendered as red borders + inline errors (PLAN-DESIGN-FIXES § Phase 6 said to remove that — confirm landed).

### Deltas (file ref: `components/variable-drawer.tsx`)
| # | Area | Design | Current | Action |
|---|---|---|---|---|
| 4.1 | Width | 360px fixed | `max-w-sm md:max-w-md` | Lock to 360px (add token `--width-vars`) |
| 4.2 | Progress bar in header | Yes, with `N/total` count and sakura glow | Verify presence | Add if missing |
| 4.3 | Filled-state styling | Pink dot, pink-tinted border, focus glow shadow | Verify | Align |
| 4.4 | Multiline auto-detect | Hardcoded list `[error_message, descripcion, objetivo, contexto]` (Spanish names) | Likely uses length heuristic or always textarea | Match logic but translate field names (Q10) |
| 4.5 | Result preview panel | Appears once any var is filled, monospaced | Verify | Add if missing |
| 4.6 | Copy button disabled until 100% | Yes — design forbids copying with empty vars | Verify | Align |
| 4.7 | "Complete all variables to copy" hint | Below the disabled button | Likely absent | Add |
| 4.8 | Validation (MIN/MAX length) | No red borders — just blocks the Copy button | Confirmed aligned in prior plan | Verify still holds |
| 4.9 | Spanish placeholder strings | `descripcion`, `objetivo`, `contexto` appear in the design | App should normalize to English | Translate / make case-insensitive (Q10) |

### Open questions
- **Q10**: The multiline-variable detection uses Spanish variable names hardcoded. Should the rule be language-agnostic (e.g. detect by length of suggested default, or by a regex on the variable name like `_text|_message|_description`), or keep an explicit allowlist?
- **Q11**: Width 360px conflicts with the previous plan's 760px decision. Confirm the new 360px width is correct.

---

## Phase 5 — History Drawer

**Skills:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`.

**Design** (`design/_extracted/b7b23c8a…jsx`):
- Dedicated right drawer, 360px wide.
- Header: `Version History` + `N / 50 versions stored`.
- Current version highlighted pink, restorable versions show a `Restore` button.
- Inline confirm dialog inside the drawer (`Restore this version? Your current changes will be discarded.`).

**Current**: `components/history-drawer.tsx` exists (referenced in PLAN-DESIGN-FIXES § Phase 1 results, `max-w-sm`).

### Deltas
| # | Area | Design | Current | Action |
|---|---|---|---|---|
| 5.1 | Width | 360px | `max-w-sm` (~384px) | Lock via token |
| 5.2 | Subtitle | `N / 50 versions stored` | Verify | Add if missing |
| 5.3 | Current-version pink highlight | `border-rgba(255,183,197,0.4)` + `bg-rgba(...,0.10)` | Verify | Align via tokens |
| 5.4 | Inline confirm dialog | Inside the drawer | Likely a separate `ConfirmDialog` overlay | Reuse `confirm-dialog` (or render in-place per design — Q12) |
| 5.5 | Trigger button | Where is it in the design? — not in toolbar shown; opens from `selectedPrompt` context. App needs a clear "History" button | Verify the trigger exists in `item-view.tsx` toolbar | Audit |

### Open questions
- **Q12**: Use an in-drawer confirm panel (as designed) or the global `ConfirmDialog` modal? In-drawer is lower-friction but adds a second pattern.

---

## Phase 6 — Settings: in-app route vs Next.js page

**Skills:** `vercel-react-best-practices`, `web-design-guidelines`, `tailwind-design-system`, `supabase-postgres-best-practices` (only if Q14 lands on persisting MIN/MAX_VAR_LENGTH in DB).

**Design** (`design/_extracted/d4270c88…jsx`):
- Settings is **not a Next.js page** in the mockup — it's a `route` state in `App` (`'app' | 'settings'`). Clicking the sidebar "Settings" button swaps the gallery+viewer pane for the Settings pane.
- Settings layout: **left subnav** (200px) with items `Tags`, `Variables Drawer`, plus three **dimmed/disabled** items marked `soon`: `Appearance`, `Shortcuts`, `Export / Import`.
- Top bar: `← Back to prompts` button + breadcrumb `Settings`.
- **Tags section**: full list with usage counts; `Delete` enabled only when `count === 0`; hover tooltip ("Used by N items. Reassign or remove from items first."); modal confirm for deletion; helper text "Renaming is not available in v1…".
- **Variables Drawer section**: two range sliders (`MIN_VAR_LENGTH`, `MAX_VAR_LENGTH`), env override hint (`SAKURA_MIN_VAR / SAKURA_MAX_VAR`), `Reset to defaults`, and an info pill.

**Current** (`app/settings/layout.tsx`, `app/settings/tags/page.tsx`, `app/settings/variables/page.tsx`):
- Uses Next.js `/settings/tags` and `/settings/variables` routes.
- PLAN-DESIGN-FIXES § Phase 4 already redesigned Settings to embed in the shared sidebar shell. So URL routes still exist but layout matches.
- Variables page is a `dl` of definitions, **not** interactive sliders.

### Deltas
| # | Area | Design | Current | Action |
|---|---|---|---|---|
| 6.1 | Routing | Pure client state | Next routes `/settings/...` | Keep routes (URL stability) but match visual — see Q13 |
| 6.2 | Subnav items | Tags, Variables Drawer, +3 dimmed `soon` | Tags, Variables only | Add the dimmed-with-`soon` placeholder items, or skip them |
| 6.3 | Variables page UI | Sliders + env hint + reset button + info pill | Static `dl` definitions | Replace with interactive sliders backed by env (Q14) |
| 6.4 | Tags delete UX | Disabled when in use + tooltip ("Reassign or remove…") | Verify current behavior | Add usage-count check + tooltip |
| 6.5 | "Renaming not available" helper | Below tag list | Verify | Add if missing |
| 6.6 | Confirm-delete modal | Inline, copy reads `Delete tag «slug»?` | Verify (already exists per Phase 4) | Align copy + use guillemets `«»` to match design |
| 6.7 | `Variables Drawer` label | Design uses this exact label (was `Variables`) | Verify | Rename if needed |

### Open questions
- **Q13**: Keep `/settings/tags` and `/settings/variables` as routed pages (deep-linkable, browser-back works), or collapse Settings into pure client state like the design? Recommend keeping routes.
- **Q14**: Should MIN/MAX_VAR_LENGTH be **editable** (persisted to DB / env)? CLAUDE.md spec defines them as env vars (`MIN_VAR_LENGTH`, `MAX_VAR_LENGTH`). The design suggests they are user-tunable via sliders. If user-tunable, where do values persist (per-user row in a `settings` table, localStorage, env only)?
- **Q15**: Do you want the dimmed `Appearance / Shortcuts / Export / Import` placeholder items? They communicate roadmap but add visual noise. Recommend **no** unless we wire at least one.

---

## Phase 7 — Petal rain & micro-animations

**Skills:** `web-design-guidelines`, `webapp-testing` (to lock the trigger via Playwright).

Design (`72f26093…jsx`): petal rain canvas overlay triggered on `onCopy`. Already implemented (`components/petal-rain.tsx`).

Deltas to verify:
- Animation duration / easing (~1.5 s).
- Triggered on both `Copy` (item view) and `Copy Result` (drawer).
- The Drawer's progress bar has `box-shadow: 0 0 6px var(--sakura)` once progress > 0. Verify.

No open questions; this is a verification pass.

---

## Phase 8 — Markdown rendering inside Render mode

**Skills:** `tiptap`, `web-design-guidelines`, `tailwind-design-system`.

Design (`3dd4d42d…jsx` lines 3–116) implements a hand-rolled renderer with sakura accents:
- `# H1` underlined with gray border, 22px / 700.
- `## H2` 16px / 600.
- Bullets render as **pink dot**.
- Numbered lists use **pink mono numbers**.
- Blockquotes have **pink left border**.
- `{{var}}` renders as inline pink mono chip with border.
- Checkboxes (`- [ ]`/`- [x]`) render as small squares with pink fill when checked.

**Current** uses Tiptap WYSIWYG + react-markdown / Shiki for raw render. Tiptap chips were fixed in PLAN-DESIGN-FIXES § Phase 5.

### Deltas
| # | Area | Design | Current | Action |
|---|---|---|---|---|
| 8.1 | Bullet marker | Pink dot | Default Tiptap disc | Style `ul > li::marker` or use a `BulletList` custom render |
| 8.2 | Ordered list numbers | Pink, mono | Default | Style `ol > li::marker` |
| 8.3 | Blockquote border | Pink 3px | Verify | Token-driven left border |
| 8.4 | Task list checkboxes | Pink fill when checked | Verify Tiptap TaskList extension styling | Style accordingly |
| 8.5 | Headings | Specific sizes/weights | Verify Tiptap defaults | Match in CSS |

### Open questions
- **Q16**: Are these markdown-render accents desired (they push more pink into the document body)? CLAUDE.md restricts pink to **3 official uses** (hover glow, variable chips, success animations). Adding it to bullets/numbers/quotes would **expand** that policy. Confirm before implementing.

---

## Phase 9 — String/i18n sweep on new design surfaces

**Skills:** `vercel-react-best-practices` (light — string sweep).

Strings introduced by the new mockup that need English review:
- `"Skills activas:"` → `"Active skills:"` (Phase 3).
- Drawer placeholder examples (`descripcion`, `objetivo`, `contexto`) — these come from sample data, but if multiline detection ships those names, they will leak into UI tooltips. Translate or refactor (Q10).
- Tweaks panel labels (`"Color Sakura"`, `"Tamaño de fuente"`, `"Modo Zen"`, `"Vista"`) — N/A, Tweaks is mockup-only.

No open questions if the above are translated as listed.

---

## Phase 10 — Verification & acceptance

**Skills:** `webapp-testing`, `web-design-guidelines`.

- Side-by-side screenshots of: sidebar (Templates/Agents/Skills groups), gallery card (with and without variables), prompt viewer toolbar (Add Skill + Copy + Use Template), variables drawer (with progress bar + preview), history drawer (with restore confirm), settings (tags + variables sliders).
- Full Playwright suite + unit tests green.
- Grep guards (CI-friendly): no new `#FFB7C5` / `#C45E78` literals outside `app/globals.css`; no Spanish UI copy (`activa`, `descripcion`, etc.).

---

## Decisions (resolved 2026-05-15)

All 16 questions have been answered by the user. Implementation must follow these:

| Q | Decision | Implementation note |
|---|---|---|
| **Q1** | **Add `items.subcategory text` column + migration** | New Supabase migration. Nullable. Values come from sidebar groups (`Planes`, `Test`, `Debug`, `n8n`). Update `lib/database.types.ts`. |
| **Q2** | **Single 'All Agents' item** in sidebar (like Skills → 'All Skills') | No per-agent items. The Agents group has one nav entry that filters `category='agente'`. |
| **Q3** | **Remove `data_output` and `plan` categories entirely** | DB migration: update the `items.category` check constraint to drop both values. Backfill existing rows (likely → `template` or `agente` — needs user review during migration). Update `CATEGORIES` / `CATEGORY_LABELS` in `lib/database.types.ts`. Update CLAUDE.md schema table. |
| **Q4** | **Settings only in footer button** | Remove the `NavGroup` for Settings from `components/sidebar.tsx`. Keep the footer button (already present). |
| **Q5** | **Tag chips pink when `hasVariables`** | Revert Phase 2 of `PLAN-DESIGN-FIXES.md`. Restore the conditional styling in `components/item-card.tsx`. Use tokens, not literals. |
| **Q6** | **Active card = sakura ring + glow** | Match design: `box-shadow: 0 0 0 2px var(--sakura), 0 4px 20px var(--sakura-glow)` on the selected card. State driven by `selectedItemId`. |
| **Q7** | **Keep separate `Assign Agent` button** | No change to `components/agent-selector.tsx`. Add a note in `PLAN-DESIGN-DELTA-V2.md` § Phase 3.4 that this is a deliberate divergence from the mockup, justified by CLAUDE.md §2-bis. |
| **Q8** | **Label = `Active skills:`** | Translate from `Skills activas:`. |
| **Q9** | **`🌸 Use Template` button only when prompt has `{{ }}`** | Conditional render in `components/item-view.tsx`. Use `hasVariables` from `lib/variables.ts`. |
| **Q10** | **Always use textarea (autosize)** | Replace the design's allowlist logic entirely. No input/textarea branching in `components/variable-drawer.tsx`. Autosize via `react-textarea-autosize` or manual `useLayoutEffect` measurement. |
| **Q11** | **Variables Drawer = 360px** | Add `--width-vars: 360px` token. Apply to `components/variable-drawer.tsx`. Supersedes the 760px from the previous plan. |
| **Q12** | **Use the global `ConfirmDialog`** for Restore | Reuse `components/confirm-dialog.tsx`. Do not embed an inline panel inside `components/history-drawer.tsx`. |
| **Q13** | **Keep `/settings/tags` and `/settings/variables` as Next routes** | No client-only `route` state. Build the subnav visually like the mockup, but each subnav item is a `<Link>` to the corresponding route. |
| **Q14** | **localStorage** for MIN/MAX_VAR_LENGTH overrides | Env vars stay as defaults. Reads: `localStorage.getItem('sakura.minVarLength') ?? env.MIN_VAR_LENGTH`. New hook `useVarLengthSettings()`. No DB schema change. |
| **Q15** | **Don't render dimmed 'soon' items** | Settings subnav shows only `Tags` and `Variables Drawer`. No Appearance / Shortcuts / Export / Import placeholders. |
| **Q16** | **Allow pink in markdown markers** (bullets, ordered numbers, blockquotes, checkboxes) | Update CLAUDE.md § "Reglas estéticas" to extend the "3 usos" rule with markdown markers. Style in `app/globals.css` via `prose` overrides or Tiptap node config. |

### Knock-on effects on CLAUDE.md

- Update `items.category` check constraint: drop `'plan'` and `'data_output'`, leaving `('template','agente','skill')`.
- Add `items.subcategory text` column (nullable) to the schema table.
- Extend "Rosa Sakura reservado para 3 usos" rule to also permit: list bullets, ordered list numbers, blockquote left border, checkbox fill (markdown-render only).
- Add a one-liner under § 2-bis Assigner de Agente noting that the dedicated button is preserved even though the Demo mockup does not show one (rationale: CLAUDE.md spec).

### Knock-on effects on existing code

- `lib/database.types.ts` — update `CATEGORIES`, `CATEGORY_LABELS`, type `ItemCategory`, regenerate Supabase types.
- `components/sidebar.tsx` — drop Settings NavGroup; reorganize categories into Templates/Agents/Skills with subcategory expansion under Templates.
- `components/gallery.tsx` — accept subcategory filter; add active-card state propagation.
- `components/item-card.tsx` — restore pink-when-`hasVariables` for tag chips; add active-card ring/glow.
- `components/item-view.tsx` — conditional `🌸 Use Template` button; `Active skills:` label.
- `components/variable-drawer.tsx` — lock 360px width; always textarea; progress bar + result preview + disabled-until-complete copy.
- `components/history-drawer.tsx` — lock 360px width; delegate confirm to global `ConfirmDialog`.
- `app/settings/layout.tsx`, `app/settings/variables/page.tsx` — interactive sliders backed by localStorage; subnav renamed to `Variables Drawer`.
- New migration in `supabase/migrations/` for the schema changes (Q1 + Q3).

---

## Implementation status (2026-05-15) — RESUME HERE

> **Read this section first before touching code.** It records exactly what was applied to the DB and the repo before the implementation was paused. The next model **must not re-run** any of the DONE items.

### ✅ DONE — DB migrations (already executed by the user in Supabase)

The following statements were executed by the user in the Supabase SQL Editor in this exact order. **Do not run again.**

1. **Data wipe** — `TRUNCATE TABLE public.versions, public.items, public.tags RESTART IDENTITY CASCADE`. All three tables are now empty.
2. **Drop legacy categories** — the `items.category` CHECK constraint was dropped and re-added as `CHECK (category IN ('template','agente','skill'))`. The legacy values `'plan'` and `'data_output'` are now rejected at insert/update time.
3. **Add subcategory column** — `ALTER TABLE public.items ADD COLUMN subcategory text` (nullable, no CHECK). Values expected for `category='template'`: `Planes | Test | Debug | n8n`. Null otherwise.

A repo-versioned migration mirroring these changes lives at:
`supabase/migrations/20260515120001_drop_legacy_categories_add_subcategory.sql`

### ✅ DONE — Code changes already applied

The following files were updated to match the new schema. **Verify them but do not redo them.**

| File | What changed |
|---|---|
| `supabase/migrations/20260515120001_drop_legacy_categories_add_subcategory.sql` | **New file.** Mirrors the DB statements above so the repo stays the source of truth. |
| `lib/database.types.ts` | Full rewrite. `ItemCategory` reduced to `"template" \| "agente" \| "skill"`. Added `TemplateSubcategory` type, `TEMPLATE_SUBCATEGORIES` const, and `subcategory: string \| null` field on the `Item` interface. `CATEGORY_LABELS` and `CATEGORIES` reflect the 3-value enum. |
| `app/actions.ts` (line ~16) | The local `CATEGORIES` array was trimmed to `["template", "agente", "skill"]`. |
| `components/item-card.tsx` (lines ~12–18) | The `CATEGORY_BG` record dropped the `plan` and `data_output` keys. |
| `components/sidebar.tsx` (lines ~70–80) | The `categoryCounts` initializer dropped `plan: 0` and `data_output: 0`. |
| `components/sidebar.tsx` (line ~186) | The category-icon ternary was simplified — was `template?'▦':plan?'◎':agente?'⌥':skill?'✦':'⬡'`, now `template?'▦':agente?'⌥':'✦'`. |

### ⛔ NOT YET DONE — Resume from here

These are the next concrete steps. They are intentionally narrow so the next model can start without re-deriving context.

#### Step A — Fix the seed file so it does not violate the new CHECK constraint

`supabase/seed.sql` still contains four rows with `category='plan'` or `category='data_output'`. Running this file as-is will fail with `23514` (check constraint violation).

For each of the eight INSERT rows in `supabase/seed.sql`:
- Row 1 `'Plan de testing E2E'` → change `'plan'` to `'template'`, and (optionally) include `'Planes'` in a new `subcategory` column in the INSERT.
- Row 3 `'Generar HTML semántico'` → change `'data_output'` to `'template'`.
- Row 7 `'Salida Excel desde Python'` → change `'data_output'` to `'template'`.
- Row 8 `'Plan de migración de BD'` → change `'plan'` to `'template'`, optionally `subcategory='Planes'`.

Decision needed inline (small): either (a) keep the INSERT shape and rely on `subcategory IS NULL`, or (b) extend each INSERT to include a `subcategory` column with values matching the new sidebar taxonomy. Recommended: (b), it gives the dev a realistic seed for Phase 1.

The seed file's instruction header is in Spanish — leave it as-is (it is operator instructions, not UI copy).

#### Step B — Decide whether to pass `subcategory` through `save_item_with_version`

The RPC at `supabase/migrations/20260513120001_save_item_with_version.sql` accepts `p_category text` but **no** `p_subcategory` param. As long as the UI does not let the user set a subcategory, this is fine — `subcategory` stays `NULL` for new saves.

Two paths:
- **(i)** Defer: leave the RPC alone for now. New items get `subcategory=NULL`. Phase 1 of the visual plan will assign subcategories via a separate `UPDATE` or via the New Item form once the UI exists.
- **(ii)** Eager: add `p_subcategory text default null` to the RPC and to `lib/versioning.ts` / `app/actions.ts:saveItem` so the field flows end-to-end before Phase 1 starts. Requires a new migration file (e.g. `20260515120002_save_item_with_version_subcategory.sql`) and updates to `lib/versioning.ts`.

Recommended: **(i) defer**, because the subcategory column is not yet driven by any UI input — wiring it through the save path now is dead code until Phase 1 lands the sidebar.

Whichever path is chosen, document the choice in this section before continuing.

#### Step C — Verify the repo is internally consistent

Quick grep checks (these should return zero hits in code, ignore docs/logs):

```bash
rg -n "data_output|\"plan\"|'plan'" --type ts --type tsx
rg -n "data_output|ItemCategory" --type ts --type tsx
```

If `rg` finds residual references in production code paths, fix them. Known-safe files to ignore:
- `phases/**` (historical logs and prompts)
- `PLAN-*.md` (this and other plan documents)
- `design/_extracted/**` (mockup spec, frozen)

#### Step D — Confirm `app/items/new/page.tsx` still compiles

It imports `CATEGORIES` and `CATEGORY_LABELS` from `lib/database.types.ts`. After the type change, the select dropdown will render only `Templates / Agents / Skills`. That is the desired behavior, no edits needed. Open the page and verify the dropdown renders 3 options.

#### Step E — Run the test suite once, before starting Phase 1

```bash
npm run typecheck
npm run test
npm run test:e2e:playwright
```

Expected failure points after the schema/types change:
- Any test fixture that builds an `Item` literal without `subcategory: null` — TypeScript will complain (the field is non-optional). Fix by adding `subcategory: null` to fixtures.
- Any test that asserts on `'plan'` / `'data_output'` as a category — drop or migrate those assertions.
- E2E tests that depend on seeded data may fail because the DB is empty; rerun `supabase/seed.sql` after Step A to repopulate.

Capture each failure, fix it inline, and only then proceed to Phase 1 below. If a failure looks structural (e.g. RPC signature mismatch), revisit Step B.

### ▶ After Steps A–E pass — start Phase 1 of the visual plan

The phases below (Phase 1 onward) are the implementation queue. **Do not start Phase 1 until Steps A–E above are green.** Phase 1 (sidebar reorganization) is the natural next move because:
- The DB now supports `subcategory`, but no UI consumes it yet.
- The sidebar is the first UI surface that needs to read `subcategory` (the Templates group expands to Planes/Test/Debug/n8n).
- Phase 1's tests will exercise the new column end-to-end, validating Step B's decision.

When starting Phase 1, re-read its skill list (`vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, optionally `supabase-postgres-best-practices`) and the design reference (`design/_extracted/2e46a690-1e09-49ed-8a64-1ec2edf6b3b9.jsx`).

---

## Implementation order (recommended)

1. **DB & types** (Q1, Q3) — migration + `lib/database.types.ts`. Everything else depends on the new shape.
2. **Sidebar** (Q2, Q4) — fast wins, removes obsolete UI.
3. **Cards** (Q5, Q6) — visual realignment.
4. **Viewer toolbar** (Q8, Q9; Q7 documented as kept).
5. **Variables Drawer** (Q10, Q11, Q14 read path).
6. **History Drawer** (Q12).
7. **Settings** (Q13, Q14 write path, Q15).
8. **Markdown styles** (Q16) + CLAUDE.md update.
9. **Verification** (visual diffs, Playwright, grep guards).

---

## Original open questions (now answered)

Numbered for traceability:

1. **Q1** Add real `subcategory` column to `items`, or derive from tags?
2. **Q2** Agents sidebar: one nav item per agent dynamically, or hardcoded?
3. **Q3** Keep, hide, or remove `data_output` and `plan` categories?
4. **Q4** Remove the in-nav `Settings` group (use footer button only)?
5. **Q5** Re-pink tag chips on cards when `hasVariables`? (Reverts a previous decision.)
6. **Q6** Maintain a gallery "active selected" card visual?
7. **Q7** Remove `Assign Agent` button to match design, keep it, or fold into the Add Skill dropdown?
8. **Q8** Confirm wording for the skill-chip row label (`Active skills:` vs `Added skills:` vs none).
9. **Q9** Show "Use Template" only when prompt has `{{ }}` (design behavior)?
10. **Q10** Multiline-variable detection: allowlist vs regex on suffix vs always textarea?
11. **Q11** Variables Drawer width: 360px (new) vs 760px (prior plan)?
12. **Q12** History Drawer restore confirm: in-drawer panel or global ConfirmDialog modal?
13. **Q13** Keep `/settings/tags` and `/settings/variables` as Next routes, or collapse into client state?
14. **Q14** MIN/MAX_VAR_LENGTH user-tunable sliders — persist where? (env only / localStorage / DB)
15. **Q15** Show dimmed `Appearance / Shortcuts / Export / Import` "soon" placeholders in Settings subnav?
16. **Q16** Allow pink in markdown body (bullets, numbers, blockquotes, checkboxes), breaking the "3 official uses" rule?

Buttons / elements present in the app but **not in the design**:
- `Assign Agent` button (Q7).
- `Settings` nav-group entry alongside the footer button (Q4).
- Possibly: `data_output` / `plan` filter chips, depending on Q3.

Buttons / elements in the design but **not in the app** (or partially):
- Per-agent items inside the Agents sidebar section (Q2).
- Subcategory items inside Templates (Planes/Test/Debug/n8n) (Q1).
- "🌸 Use Template" pink-outlined button (Q9).
- Progress bar + Result preview + disabled-until-complete Copy in Variables Drawer (Phase 4).
- MIN/MAX_VAR_LENGTH sliders + reset button in Settings (Q14).
- Dimmed roadmap entries in Settings subnav (Q15).
