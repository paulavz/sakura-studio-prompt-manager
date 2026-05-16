# Phase 9 Audit — Fix Plan (one test at a time)

> Run each test in isolation. Diagnose. Fix. Re-run only that test. Move to next.

---

## Pre-flight

The 2 failing tests need a running dev server on `http://localhost:3000`.
The 2 passing tests are pure static scans (no server needed).

Open **two terminals** and keep them open for the whole session:

- **Terminal A — server (leave running):**
  ```bash
  npm run dev
  ```
  Wait until you see `Ready on http://localhost:3000`. Verify in browser once.

- **Terminal B — tests (one at a time):**
  Use this exact pattern: `pytest tests/test_phase9_audit.py::<TEST_NAME> -v`

If you don't want to keep the server up manually, use the helper:
```bash
python tests/run_tests_phase7.py  # adapt to phase9 if a runner exists
```
But for this plan, **one terminal per concern** is faster to debug.

---

## Test 1 — `test_no_hardcoded_sakura_outside_globals` ✅ PASSING

```bash
pytest tests/test_phase9_audit.py::test_no_hardcoded_sakura_outside_globals -v
```

- Currently **green**. Skip unless it regresses.
- If it ever fails: open the file:line printed in the violation, replace the literal `#FFB7C5` (or `255, 183, 197`) with the Tailwind token (`bg-sakura`, `text-sakura`, etc.) defined in `tailwind.config.ts`.

---

## Test 2 — `test_no_tailwind_arbitrary_colors` ✅ PASSING

```bash
pytest tests/test_phase9_audit.py::test_no_tailwind_arbitrary_colors -v
```

- Currently **green**. Skip unless it regresses.
- If it fails: the violation line uses `bg-[#xxx]` / `text-[#xxx]` etc. Replace with a named Tailwind class from `tailwind.config.ts`.

---

## Test 3 — `test_data_region_attributes_exist` ❌ FAILING

```bash
pytest tests/test_phase9_audit.py::test_data_region_attributes_exist -v
```

### Diagnosis

Error: `net::ERR_CONNECTION_REFUSED at http://localhost:3000/`.
The dev server is **not running**. The test never reaches the actual DOM assertion.

### Fix steps

1. In Terminal A, start the server: `npm run dev`. Wait for `Ready`.
2. In Terminal B, re-run **only this test**:
   ```bash
   pytest tests/test_phase9_audit.py::test_data_region_attributes_exist -v
   ```
3. **If still failing** with `Missing data-region attributes`, the server is up but the layout is missing required selectors. Required attributes:
   - `[data-region="sidebar"]`
   - `[data-region="gallery"]`
   - `[data-region="viewer"]`
   - `[data-region="layout-root"]`

   Read `tests/test_phase9_audit.py:18-23` for the full list.

4. Add the missing `data-region="..."` attribute to the corresponding component:
   - `layout-root` → outermost wrapper in `app/layout.tsx` (or `app/page.tsx` root div)
   - `sidebar` → sidebar component (likely `components/sidebar.tsx`)
   - `gallery` → `components/gallery.tsx` outer container
   - `viewer` → `components/item-view.tsx` outer container OR a viewer placeholder on `/`

   Use `Grep` to confirm where each component is mounted on `/`.

5. Re-run only this test until green.

### Skip-mode escape hatch

If you cannot start the dev server right now and want to ship the static scans only:
```bash
SKIP_DOM_TESTS=1 pytest tests/test_phase9_audit.py -v
```
Both DOM tests will be skipped (per the `pytest.mark.skipif` at line 159 / 204).

---

## Test 4 — `test_body_font_family_includes_inter` ❌ FAILING

```bash
pytest tests/test_phase9_audit.py::test_body_font_family_includes_inter -v
```

### Diagnosis

Same root cause as Test 3: `ERR_CONNECTION_REFUSED`. Server not running.

### Fix steps

1. Confirm Terminal A still has `npm run dev` running.
2. Re-run only this test:
   ```bash
   pytest tests/test_phase9_audit.py::test_body_font_family_includes_inter -v
   ```
3. **If still failing** with assertion `Expected body font-family to include 'Inter'`:
   - Open `app/layout.tsx`. Confirm `Inter` is imported from `next/font/google` and applied to `<body>` via `className={inter.className}` (or via CSS variable in `globals.css`).
   - If using a CSS variable: open `app/globals.css`, ensure `body { font-family: var(--font-inter), ... }` (or that Tailwind's `fontFamily.sans` includes Inter and the body has `font-sans`).
   - Hard refresh the browser to invalidate any cached font; re-run.

---

## Final verification (only after all 4 are individually green)

```bash
pytest tests/test_phase9_audit.py -v
```

Expected: `4 passed`.

---

## Quick-reference command table

| Test | Command |
|---|---|
| 1 | `pytest tests/test_phase9_audit.py::test_no_hardcoded_sakura_outside_globals -v` |
| 2 | `pytest tests/test_phase9_audit.py::test_no_tailwind_arbitrary_colors -v` |
| 3 | `pytest tests/test_phase9_audit.py::test_data_region_attributes_exist -v` |
| 4 | `pytest tests/test_phase9_audit.py::test_body_font_family_includes_inter -v` |
| All | `pytest tests/test_phase9_audit.py -v` |
| Skip DOM | `SKIP_DOM_TESTS=1 pytest tests/test_phase9_audit.py -v` |

PowerShell equivalent for env var:
```powershell
$env:SKIP_DOM_TESTS="1"; pytest tests/test_phase9_audit.py -v
```
