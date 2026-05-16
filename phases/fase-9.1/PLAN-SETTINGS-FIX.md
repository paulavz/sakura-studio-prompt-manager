# Plan: Fix Settings Page to Match Phase 9.1 Design

> **Source:** `design/Sakura Prompt Studio - Phase 9.1 _standalone_.html`, Blocks 6.2-6.5, mockups m13-m17
> **Target:** `app/settings/` (layout, tags/page, variables/page)

---

## Gaps: Tags Page (`app/settings/tags/page.tsx`)

### 1.1 New-tag input → expandable form panel
- **Current:** Slim `<input>` + small `+` button side by side
- **Design:** Full-width sakura-glow-bordered area (`box-shadow: 0 0 0 3px sakuraSoft`), monospace input, help text below, Create/Cancel buttons row
- **Fix:** Toggle via header `+` button. When open: sakura-bordered input panel with Create/Cancel footer

### 1.2 Header `+` button (add)
- **Current:** No `+` button in header
- **Design:** `28×28` bordered rounded button in header top-right
- **Fix:** Add button, click toggles the new-tag form panel (#1.1)

### 1.3 Tag list layout → table rows
- **Current:** Bordered cards (`rounded-md border px-4 py-3`) per tag
- **Design:** `gridTemplateColumns: 1fr 140px 100px` with `border-bottom: 1px solid g100` separators. Slug in monospace 13px | "used by N items" 11px gray-400 | Delete button
- **Fix:** Single bordered container with row-based entries

### 1.4 Delete button → bordered pill
- **Current:** Plain text "Delete" link
- **Design:** Bordered pill (`border: 1px solid g200`, `borderRadius: 5px`, `padding: 4px 10px`). Disabled state: gray bg/text, `cursor: not-allowed`
- **Fix:** Replace text with bordered button using design tokens

### 1.5 Disabled Delete tooltip (add)
- **Current:** Only `title` attribute
- **Design:** Dark tooltip (`background: #222, color: white`) on hover: "Used by N items. Reassign or remove from items first."
- **Fix:** Add hover tooltip for non-deletable tags (count > 0)

### 1.6 Remove rename feature
- **Current:** Double-click inline edit + `renameTag` RPC
- **Design:** Spec states "Renaming is not available in v1"
- **Fix:** Remove rename editor, keep bottom message about rename workaround

### 1.7 Delete confirm (refine)
- **Current:** Shared `ConfirmDialog` — close enough
- **Design:** Title uses guillemets: `Delete tag «slug»?`, "This cannot be undone.", overlay blur on content
- **Fix:** Pass guillemet-wrapped slug in title, otherwise current dialog works

---

## Gaps: Variables Page (`app/settings/variables/page.tsx`)

### 2.1 Text display → slider visuals
- **Current:** `<dl>` definition list with text values
- **Design:** Interactive sliders with sakura progress bars, round handles, min/max labels
- **Fix:** Replace with read-only slider visuals (interactive editing requires server env restart = v2)

### 2.2 Reset to defaults button (add)
- **Current:** No button
- **Design:** `ToolbarBtn label="Reset to defaults"` bottom-right
- **Fix:** Add display-only button with note: defaults set via `.env.local`

### 2.3 Info box (add)
- **Current:** Plain gray text
- **Design:** SakuraSoft-bg box (`background: sakuraSoft`, `border: 1px solid sakuraBorder`), heading "How this is applied" in sakuraInk, description text
- **Fix:** Replace text lines with sakura-tinted info box

---

## Gaps: Settings Layout (`app/settings/layout.tsx`)

### 3.1 Title typography
- **Current:** `text-[10px]`
- **Design:** `fontSize: 11px`
- **Fix:** Change to `text-[11px]`

### 3.2 Subnav already close to design
- Icons match: `#` (Tags), `🌸` (Variables), `◐` (Appearance), `⌘` (Shortcuts), `⇅` (Export)
- Active state: gray-100 bg, black text ✅
- "soon" labels ✅
- Width ~200px ✅

---

## Files to modify
| File | Scope |
|---|---|
| `app/settings/tags/page.tsx` | Major: input panel, table layout, tooltip, remove rename |
| `app/settings/variables/page.tsx` | Major: sliders + info box |
| `app/settings/layout.tsx` | Minor: title font size |
| `tests/e2e/settings-navigation.spec.ts` | Update selectors if needed |

## Out of scope
- Interactive sliders (server-side env vars = v2)
- Appearance, Shortcuts, Export/Import pages (still "soon")
