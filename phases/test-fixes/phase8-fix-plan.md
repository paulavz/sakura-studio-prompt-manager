# Phase 8 — Tag Management — Fix Plan (one test at a time)

> **Root cause is a single broken file.** All 33 tests are failing because `app/settings/tags/page.tsx` crashes on render with `ReferenceError: handleKeyDown is not defined`. Fix the file once → most tests will go green at the same time. Then iterate per remaining failure.

---

## Step 0 — Confirm the blocker (30 seconds)

```bash
# Server in Terminal A:
npm run dev
```

Visit `http://localhost:3000/settings/tags` in browser → page returns **500**. That's the symptom. Do **not** run any test until Step 1 is done — they will all fail with the same error and waste minutes.

---

## Step 1 — Fix `app/settings/tags/page.tsx` (the only real bug)

The file references **5 symbols that are never defined**:

| Line | Reference | What it should do |
|---|---|---|
| 116 | `handleKeyDown` | On Enter in the create input → call `handleCreate()` |
| 63, 89 | `fetchTags` | Call `getTagsWithUsage()` and `setTags(...)` + `setLoading(false)` |
| 162 | `startEditing(tag)` | `setEditingId(tag.id); setEditingValue(tag.slug)` |
| (missing) | `handleCreate` | Validate slug, call `createTag(input)`, refresh list, clear input |
| (missing) | `useEffect(() => { fetchTags() }, [])` | Initial load — without this `loading` stays `true` forever |

### Fix (single edit, top of component, after the existing `cancelEditing`):

```tsx
const fetchTags = useCallback(async () => {
  setLoading(true);
  const data = await getTagsWithUsage();
  setTags(data);
  setLoading(false);
}, []);

useEffect(() => {
  fetchTags();
}, [fetchTags]);

const handleCreate = async () => {
  setError("");
  const slug = input.trim().toLowerCase();
  if (!slug) return;
  if (!isValidSlug(slug)) {
    setError("Slug must be snake_case (lowercase, digits, underscores).");
    return;
  }
  const result = await createTag(slug);
  if (!result.success) {
    setError(result.error || "Failed to create tag");
    return;
  }
  setInput("");
  await fetchTags();
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleCreate();
  }
};

const startEditing = (tag: TagEntry) => {
  setEditingId(tag.id);
  setEditingValue(tag.slug);
};
```

Verify: visit `/settings/tags` → page loads with no console error. Stop here before touching tests.

---

## Step 2 — Run tests one by one

Use the **exact test name** with `::`. Do **not** run the whole file.

### Group A — Page loads (3 tests)

```bash
pytest tests/test_phase8.py::test_a1_settings_tags_page_accessible -v
pytest tests/test_phase8.py::test_a2_settings_tags_page_shows_title -v
pytest tests/test_phase8.py::test_a3_tag_input_present_and_editable -v
```

**Expected after Step 1:** all 3 pass. If A2 fails, the `<h2>` text doesn't match what the test expects — read the assertion message and adjust the heading.

### Group B — Listing (3 tests)

```bash
pytest tests/test_phase8.py::test_b1_existing_tags_listed -v
pytest tests/test_phase8.py::test_b2_empty_state_shows_message -v
pytest tests/test_phase8.py::test_b3_tags_sorted_alphabetically -v
```

**Likely fix if B3 fails:** sort in `fetchTags`:
```ts
setTags([...data].sort((a, b) => a.slug.localeCompare(b.slug)));
```
(Or do the sort server-side in `getTagsWithUsage`.)

### Group C — Create (use Read on test file to discover names)

```bash
pytest tests/test_phase8.py -v --collect-only | grep test_c
```
Then run each `test_c*` individually. Likely tests: create via Enter, validation error on bad slug, duplicate prevention.

### Group D / E / F — Rename, Delete, Usage count

Same pattern: `--collect-only | grep test_<letter>` to list, then one-by-one.

---

## Step 3 — Per-failure diagnosis loop

For each failing test:

1. Read the assertion message — it tells you the exact selector or text expected.
2. Open the test in `tests/test_phase8.py` and read the test body (it's the spec).
3. Make the **minimum** change to `page.tsx` (or `app/actions.ts` if a server action is missing/wrong).
4. Re-run **only that one test**.
5. Move to the next failing test.

Do **not** re-run the whole file until every individual test is green.

---

## Step 4 — Final pass

Only after every individual test passes:

```bash
pytest tests/test_phase8.py -v
```

Expected: `33 passed`.

---

## Quick command reference

| Action | Command |
|---|---|
| List all phase 8 tests | `pytest tests/test_phase8.py --collect-only -q` |
| Run one test | `pytest tests/test_phase8.py::<TEST_NAME> -v` |
| Run a group (regex) | `pytest tests/test_phase8.py -v -k "test_a"` |
| Stop on first failure | `pytest tests/test_phase8.py -v -x` |
| Full suite (last) | `pytest tests/test_phase8.py -v` |

---

## Why this plan is fast

- One bug (`handleKeyDown` + 4 missing symbols) blocks **all 33 tests**.
- Fix it once → at minimum half the suite passes immediately.
- Remaining failures will be small UX/copy/sort issues — each fixable in <2 minutes.
- One-by-one execution avoids 30+ Playwright contexts paying the same broken-page tax.
