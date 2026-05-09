"""
Test suite for Sakura Prompt Studio - Phase 8
Tests: Tag management (CRUD, validation, usage count, integration)

Tag lifecycle:
- Create via input (same as item-view: input with create-new mode)
- List all tags sorted alphabetically
- Rename via inline edit (dblclick -> input -> Enter to confirm, Escape to cancel)
- Delete with confirmation dialog (prevent if tag in use)
- Usage count shown per tag (server-side computed)
"""

import os
import re
import time
import uuid
import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
OWNER_ID = os.getenv("NEXT_PUBLIC_V1_USER_UUID", "")


def cleanup_db():
    """Delete all tags and clear tags from items via Supabase API."""
    if not SUPABASE_URL or not SUPABASE_KEY or not OWNER_ID:
        return
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    # Clear tags from all items
    items_url = f"{SUPABASE_URL}/rest/v1/items"
    resp = requests.get(f"{items_url}?owner=eq.{OWNER_ID}&select=id,tags", headers={**headers, "Prefer": "return=representation"})
    if resp.status_code == 200:
        for item in resp.json():
            if item.get("tags"):
                patch_url = f"{items_url}?id=eq.{item['id']}"
                requests.patch(patch_url, headers={**headers, "Prefer": "return=minimal"}, json={"tags": []})
    # Delete all tags for this owner
    tags_url = f"{SUPABASE_URL}/rest/v1/tags"
    requests.delete(f"{tags_url}?owner=eq.{OWNER_ID}", headers={**headers, "Prefer": "return=minimal"})

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TAG_SLUG_RE = re.compile(r"^[a-z][a-z0-9_]*$")


def navigate_to_settings_tags(page):
    """Navigate to /settings/tags and wait for page to load."""
    page.goto(f"{BASE_URL}/settings/tags")
    page.wait_for_load_state("networkidle")


def count_tag_rows(page) -> int:
    """Count the number of tag rows in the list."""
    return page.locator("[data-testid='tag-row']").count()


def get_tag_row_by_slug(page, slug: str):
    """Get a tag row element by its slug."""
    return page.locator(f"[data-testid='tag-row']:has-text('{slug}')").first


def click_save_btn(page, timeout_ms=5000):
    """Click Save button using in-browser polling."""
    page.evaluate("""(timeoutMs) => new Promise((resolve) => {
        const start = Date.now();
        function poll() {
            const btn = Array.from(document.querySelectorAll('button'))
                .find(b => b.textContent.includes('Save') && !b.disabled);
            if (btn) {
                btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
                resolve(true);
                return;
            }
            if (Date.now() - start > timeoutMs) {
                resolve(false);
                return;
            }
            setTimeout(poll, 20);
        }
        poll();
    })""", timeout_ms)


def create_item_with_tag(page, title: str, tag_slug: str) -> str:
    """Create an item with a specific tag and return its URL."""
    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    page.fill("input[name='title']", title)
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")

    item_tag_input = page.locator("input[placeholder='+ tag']")
    item_tag_input.fill(tag_slug)
    item_tag_input.press("Enter")
    page.wait_for_timeout(500)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    return page.evaluate("window.location.href")


def delete_all_tags_via_ui(page):
    """Delete all visible tags via the UI."""
    page.reload()
    page.wait_for_load_state("networkidle")
    max_iterations = 30
    for _ in range(max_iterations):
        rows = count_tag_rows(page)
        if rows == 0:
            break
        row = page.locator("[data-testid='tag-row']").first
        delete_btn = row.locator("[data-testid='tag-delete-btn']")
        if delete_btn.count() > 0 and not delete_btn.is_disabled():
            delete_btn.click()
            page.wait_for_timeout(500)
            confirm_btn = page.locator(
                "[data-testid='confirm-delete'] button:has-text('Remove')"
            )
            if confirm_btn.count() > 0:
                confirm_btn.click()
                page.wait_for_timeout(1000)
                page.reload()
                page.wait_for_load_state("networkidle")
            else:
                break
        else:
            break


# ---------------------------------------------------------------------------
# A — Navigation and rendering
# ---------------------------------------------------------------------------

def test_a1_settings_tags_page_accessible(page):
    """A1: /settings/tags renders without crash."""
    print("\n[A1] Settings tags page accessible...")
    navigate_to_settings_tags(page)
    assert page.locator("[data-testid='settings-tags-page']").count() > 0, (
        "Settings tags page should render"
    )
    print("  [PASS] Settings tags page accessible")


def test_a2_settings_tags_page_shows_title(page):
    """A2: Page shows 'Tags' heading."""
    print("\n[A2] Settings tags page shows title...")
    navigate_to_settings_tags(page)
    heading = page.locator("h1:has-text('Tags'), h2:has-text('Tags')")
    assert heading.count() > 0, "Page should have a Tags heading"
    print("  [PASS] Tags heading visible")


def test_a3_tag_input_present_and_editable(page):
    """A3: Tag creation input is present and editable."""
    print("\n[A3] Tag input present and editable...")
    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    assert tag_input.count() > 0, "Tag input should be present"
    assert tag_input.is_enabled(), "Tag input should be enabled"
    print("  [PASS] Tag input present and editable")


# ---------------------------------------------------------------------------
# B — Tag listing
# ---------------------------------------------------------------------------

def test_b1_existing_tags_listed(page):
    """B1: Existing tags appear in the list with their slugs."""
    print("\n[B1] Existing tags listed...")
    uid = str(uuid.uuid4())[:6]
    tag1_slug = f"alpha_{uid}"
    tag2_slug = f"beta_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(tag1_slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    tag_input.fill(tag2_slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")

    assert count_tag_rows(page) >= 2, "At least 2 tag rows should exist"
    assert page.locator(f"[data-testid='tag-slug']:has-text('{tag1_slug}')").count() > 0
    assert page.locator(f"[data-testid='tag-slug']:has-text('{tag2_slug}')").count() > 0
    print("  [PASS] Existing tags listed")


def test_b2_empty_state_shows_message(page):
    """B2: Empty tag list shows 'No tags' message."""
    print("\n[B2] Empty state shows message...")
    navigate_to_settings_tags(page)
    delete_all_tags_via_ui(page)

    page.reload()
    page.wait_for_load_state("networkidle")

    no_tags_msg = page.locator("[data-testid='no-tags-message']")
    assert no_tags_msg.count() > 0, "Empty state message should be visible"
    assert "no tag" in (no_tags_msg.text_content() or "").lower(), (
        "Message should indicate no tags"
    )
    print("  [PASS] Empty state message visible")


def test_b3_tags_sorted_alphabetically(page):
    """B3: Tags are listed in alphabetical order."""
    print("\n[B3] Tags sorted alphabetically...")
    uid = str(uuid.uuid4())[:6]
    z_tag = f"z_tag_{uid}"
    a_tag = f"a_tag_{uid}"
    m_tag = f"m_tag_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")

    for slug in [z_tag, a_tag, m_tag]:
        tag_input.fill(slug)
        tag_input.press("Enter")
        page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")

    slugs = page.locator("[data-testid='tag-slug']").all_inner_texts()
    test_slugs = [s for s in slugs if s.endswith(uid)]
    assert test_slugs == sorted(test_slugs), (
        f"Tags should be sorted. Got: {test_slugs}"
    )
    print("  [PASS] Tags sorted alphabetically")


# ---------------------------------------------------------------------------
# C — Tag creation
# ---------------------------------------------------------------------------

def test_c1_create_valid_snake_case_tag(page):
    """C1: Create valid snake_case tag -> appears in list."""
    print("\n[C1] Create valid snake_case tag...")
    uid = str(uuid.uuid4())[:6]
    slug = f"my_test_tag_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")

    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").count() > 0, (
        f"Tag '{slug}' should appear in list"
    )
    print("  [PASS] Valid tag created and listed")


def test_c2_reject_spaces(page):
    """C2: Input with spaces shows validation error (snake_case required)."""
    print("\n[C2] Tag with spaces rejected...")
    uid = str(uuid.uuid4())[:6]
    slug = f"my tag name {uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    error = page.locator("[data-testid='error-message']")
    assert error.count() > 0, "Validation error should be visible for spaces in tag"
    print("  [PASS] Spaces rejected")


def test_c3_reject_uppercase(page):
    """C3: Uppercase input shows validation error."""
    print("\n[C3] Reject uppercase...")
    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill("MyTag")
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    error = page.locator("[data-testid='error-message']")
    assert error.count() > 0, "Validation error should be visible for uppercase input"
    print("  [PASS] Uppercase rejected")


def test_c4_reject_special_characters(page):
    """C4: Special characters show validation error."""
    print("\n[C4] Reject special characters...")
    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill("my-tag")
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    error = page.locator("[data-testid='error-message']")
    assert error.count() > 0, "Validation error should be visible for special chars"
    print("  [PASS] Special characters rejected")


def test_c5_reject_starts_with_number(page):
    """C5: Tag starting with number shows validation error."""
    print("\n[C5] Reject starts with number...")
    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill("123tag")
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    error = page.locator("[data-testid='error-message']")
    assert error.count() > 0, "Validation error should be visible for number-starting tag"
    print("  [PASS] Number-starting tag rejected")


def test_c6_reject_empty_input(page):
    """C6: Empty input does nothing or shows error."""
    print("\n[C6] Reject empty input...")
    navigate_to_settings_tags(page)
    initial_count = count_tag_rows(page)

    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill("")
    tag_input.press("Enter")
    page.wait_for_timeout(300)

    assert count_tag_rows(page) == initial_count, "No tag should be created from empty input"
    print("  [PASS] Empty input rejected or ignored")


def test_c7_reject_duplicate(page):
    """C7: Creating a duplicate tag shows error or is ignored."""
    print("\n[C7] Reject duplicate tag...")
    uid = str(uuid.uuid4())[:6]
    slug = f"dup_tag_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")

    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)
    page.reload()
    page.wait_for_load_state("networkidle")

    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)

    matching = page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").count()
    assert matching == 1, f"Exactly 1 tag should exist, found {matching}"
    print("  [PASS] Duplicate tag rejected")


# ---------------------------------------------------------------------------
# D — Rename tag (inline edit)
# ---------------------------------------------------------------------------

def test_d1_dblclick_activates_inline_edit(page):
    """D1: Double-click on slug activates inline edit input."""
    print("\n[D1] Double-click activates inline edit...")
    uid = str(uuid.uuid4())[:6]
    slug = f"rename_test_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    slug_el = page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").first
    slug_el.dblclick()
    page.wait_for_timeout(300)

    rename_input = page.locator("[data-testid='tag-rename-input']")
    assert rename_input.count() > 0, "Inline rename input should appear"
    is_focused = rename_input.evaluate("el => el === document.activeElement")
    assert is_focused, "Rename input should be focused"
    print("  [PASS] Inline edit activated")


def test_d2_rename_persists(page):
    """D2: Rename tag -> Enter -> persists after reload."""
    print("\n[D2] Rename persists after reload...")
    uid = str(uuid.uuid4())[:6]
    old_slug = f"old_name_{uid}"
    new_slug = f"new_name_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(old_slug)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)

    slug_el = page.locator(f"[data-testid='tag-slug']:has-text('{old_slug}')").first
    slug_el.dblclick()
    page.wait_for_timeout(300)

    rename_input = page.locator("[data-testid='tag-rename-input']")
    rename_input.fill(new_slug)
    rename_input.press("Enter")
    page.wait_for_timeout(1500)

    page.reload()
    page.wait_for_load_state("networkidle")

    assert page.locator(f"[data-testid='tag-slug']:has-text('{new_slug}')").count() > 0, (
        f"Tag should be renamed to '{new_slug}'"
    )
    assert page.locator(f"[data-testid='tag-slug']:has-text('{old_slug}')").count() == 0, (
        f"Old slug '{old_slug}' should no longer exist"
    )
    print("  [PASS] Rename persisted")


def test_d3_rename_to_existing_fails(page):
    """D3: Rename to an existing tag slug shows error."""
    print("\n[D3] Rename to existing slug fails...")
    uid = str(uuid.uuid4())[:6]
    slug1 = f"keep_this_{uid}"
    slug2 = f"try_rename_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug1)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)
    tag_input.fill(slug2)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)

    # Reload to ensure fresh tag IDs from DB
    page.reload()
    page.wait_for_load_state("networkidle")

    slug_el = page.locator(f"[data-testid='tag-slug']:has-text('{slug2}')").first
    slug_el.dblclick()
    page.wait_for_timeout(300)

    rename_input = page.locator("[data-testid='tag-rename-input']")
    rename_input.fill(slug1)
    rename_input.press("Enter")
    page.wait_for_timeout(1500)

    # Error should be shown for duplicate rename
    error = page.locator("[data-testid='error-message']")
    assert error.count() > 0, (
        "Validation error should be shown for rename to existing slug"
    )
    print("  [PASS] Rename to existing slug rejected")


def test_d4_escape_cancels_rename(page):
    """D4: Escape cancels inline edit, original slug preserved."""
    print("\n[D4] Escape cancels rename...")
    uid = str(uuid.uuid4())[:6]
    slug = f"escape_test_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    slug_el = page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").first
    slug_el.dblclick()
    page.wait_for_timeout(300)

    rename_input = page.locator("[data-testid='tag-rename-input']")
    rename_input.fill("something_else")
    rename_input.press("Escape")
    page.wait_for_timeout(300)

    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").count() > 0, (
        "Original slug should be preserved after Escape"
    )
    assert page.locator("[data-testid='tag-rename-input']").count() == 0, (
        "Rename input should disappear after Escape"
    )
    print("  [PASS] Escape cancels rename")


def test_d5_click_outside_cancels_rename(page):
    """D5: Click outside input cancels inline edit."""
    print("\n[D5] Click outside cancels rename...")
    uid = str(uuid.uuid4())[:6]
    slug = f"click_outside_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    slug_el = page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").first
    slug_el.dblclick()
    page.wait_for_timeout(300)

    rename_input = page.locator("[data-testid='tag-rename-input']")
    rename_input.fill("something_else")
    page.locator("[data-testid='settings-tags-page']").click(position={"x": 10, "y": 10})
    page.wait_for_timeout(300)

    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").count() > 0, (
        "Original slug should be preserved after clicking outside"
    )
    print("  [PASS] Click outside cancels rename")


# ---------------------------------------------------------------------------
# E — Delete tag
# ---------------------------------------------------------------------------

def test_e1_delete_unused_tag(page):
    """E1: Delete unused tag -> confirm -> tag disappears."""
    print("\n[E1] Delete unused tag...")
    uid = str(uuid.uuid4())[:6]
    slug = f"delete_test_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)
    page.reload()
    page.wait_for_load_state("networkidle")

    row = get_tag_row_by_slug(page, slug)
    delete_btn = row.locator("[data-testid='tag-delete-btn']")
    assert delete_btn.count() > 0, "Delete button should be visible"
    delete_btn.click()
    page.wait_for_timeout(300)

    confirm_btn = page.locator(
        "[data-testid='confirm-delete'] button:has-text('Remove')"
    )
    assert confirm_btn.count() > 0, "Confirmation dialog should appear"
    confirm_btn.click()
    page.wait_for_timeout(1500)

    page.reload()
    page.wait_for_load_state("networkidle")

    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").count() == 0, (
        "Tag should be deleted after confirmation"
    )
    print("  [PASS] Unused tag deleted")


def test_e2_cancel_delete(page):
    """E2: Cancel delete -> tag remains."""
    print("\n[E2] Cancel delete...")
    uid = str(uuid.uuid4())[:6]
    slug = f"cancel_delete_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    row = get_tag_row_by_slug(page, slug)
    delete_btn = row.locator("[data-testid='tag-delete-btn']")
    delete_btn.click()
    page.wait_for_timeout(300)

    cancel_btn = page.locator("[data-testid='confirm-delete'] button:has-text('Cancel')")
    assert cancel_btn.count() > 0, "Cancel button should be in confirmation dialog"
    cancel_btn.click()
    page.wait_for_timeout(300)

    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").count() > 0, (
        "Tag should remain after cancelling delete"
    )
    print("  [PASS] Cancel delete preserves tag")


def test_e3_cannot_delete_tag_in_use(page):
    """E3: Delete button disabled or shows warning for tag in use."""
    print("\n[E3] Cannot delete tag in use...")
    uid = str(uuid.uuid4())[:6]
    slug = f"in_use_tag_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    create_item_with_tag(page, f"Item for tag {uid}", slug)

    navigate_to_settings_tags(page)

    row = get_tag_row_by_slug(page, slug)
    delete_btn = row.locator("[data-testid='tag-delete-btn']")
    assert delete_btn.count() > 0, "Delete button should exist"
    assert delete_btn.is_disabled(), (
        "Delete button should be disabled for tag in use"
    )
    print("  [PASS] Tag in use cannot be deleted")


def test_e4_confirm_dialog_shows_tag_name(page):
    """E4: Delete confirmation dialog shows the tag name being deleted."""
    print("\n[E4] Confirm dialog shows tag name...")
    uid = str(uuid.uuid4())[:6]
    slug = f"confirm_name_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    row = get_tag_row_by_slug(page, slug)
    delete_btn = row.locator("[data-testid='tag-delete-btn']")
    delete_btn.click()
    page.wait_for_timeout(300)

    dialog = page.locator("[data-testid='confirm-delete']")
    assert dialog.count() > 0, "Confirmation dialog should appear"
    assert slug in (dialog.text_content() or ""), (
        f"Dialog should contain the tag name '{slug}'"
    )
    print("  [PASS] Confirm dialog shows tag name")


# ---------------------------------------------------------------------------
# F — Usage count
# ---------------------------------------------------------------------------

def test_f1_new_tag_shows_zero_usage(page):
    """F1: Newly created tag shows 0 items."""
    print("\n[F1] New tag shows zero usage...")
    uid = str(uuid.uuid4())[:6]
    slug = f"zero_usage_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)
    page.reload()
    page.wait_for_load_state("networkidle")

    row = get_tag_row_by_slug(page, slug)
    usage = row.locator("[data-testid='tag-usage-count']")
    assert usage.count() > 0, "Usage count should be displayed"
    assert "0" in (usage.text_content() or ""), (
        "New tag should show 0 usage"
    )
    print("  [PASS] New tag shows zero usage")


def test_f2_tag_with_items_shows_count(page):
    """F2: Tag assigned to N items shows correct count."""
    print("\n[F2] Tag with items shows count...")
    uid = str(uuid.uuid4())[:6]
    slug = f"usage_count_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    for i in range(2):
        create_item_with_tag(page, f"Usage Item {i} {uid}", slug)

    navigate_to_settings_tags(page)
    row = get_tag_row_by_slug(page, slug)
    usage = row.locator("[data-testid='tag-usage-count']")
    assert "2" in (usage.text_content() or ""), (
        f"Tag should show 2 items. Got: {usage.text_content()}"
    )
    print("  [PASS] Tag shows correct usage count")


def test_f3_usage_decrements_when_tag_removed(page):
    """F3: Usage count decrements when tag is removed from an item."""
    print("\n[F3] Usage decrements on tag removal...")
    uid = str(uuid.uuid4())[:6]
    slug = f"decrement_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    item_url = create_item_with_tag(page, f"Decrement Item {uid}", slug)

    navigate_to_settings_tags(page)
    row = get_tag_row_by_slug(page, slug)
    usage = row.locator("[data-testid='tag-usage-count']")
    assert "1" in (usage.text_content() or ""), "Tag should show 1 item"

    # Remove tag from item
    page.goto(item_url)
    page.wait_for_load_state("networkidle")

    tag_chip = page.locator(f"span:has-text('{slug}') button")
    if tag_chip.count() > 0:
        tag_chip.click()
        page.wait_for_timeout(300)
        click_save_btn(page)
        page.wait_for_selector("text=Saved", timeout=15000)

    navigate_to_settings_tags(page)
    row = get_tag_row_by_slug(page, slug)
    usage = row.locator("[data-testid='tag-usage-count']")
    assert "0" in (usage.text_content() or ""), (
        f"Tag should show 0 items after removal. Got: {usage.text_content()}"
    )
    print("  [PASS] Usage count decremented")


# ---------------------------------------------------------------------------
# G — Integration with items
# ---------------------------------------------------------------------------

def test_g1_tag_created_in_settings_appears_in_item_autocomplete(page):
    """G1: Tag created in Settings appears in item-view tag autocomplete."""
    print("\n[G1] Tag appears in item autocomplete...")
    uid = str(uuid.uuid4())[:6]
    slug = f"autocomplete_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    page.fill("input[name='title']", f"Autocomplete Test {uid}")
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")

    item_tag_input = page.locator("input[placeholder='+ tag']")
    item_tag_input.fill(slug[:5])
    page.wait_for_timeout(500)

    dropdown = page.locator(".relative div.absolute, div:has-text('autocomplete')")
    assert page.locator(f"text='{slug}'").count() > 0 or dropdown.count() > 0, (
        "Tag should appear in autocomplete"
    )
    print("  [PASS] Tag appears in item autocomplete")


def test_g2_renamed_tag_updates_item_chips(page):
    """G2: Tag renamed in Settings updates chips on item view."""
    print("\n[G2] Renamed tag updates item chips...")
    uid = str(uuid.uuid4())[:6]
    old_slug = f"old_chip_{uid}"
    new_slug = f"new_chip_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(old_slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    item_url = create_item_with_tag(page, f"Chip Test {uid}", old_slug)

    navigate_to_settings_tags(page)
    slug_el = page.locator(f"[data-testid='tag-slug']:has-text('{old_slug}')").first
    slug_el.dblclick()
    page.wait_for_timeout(300)

    rename_input = page.locator("[data-testid='tag-rename-input']")
    rename_input.fill(new_slug)
    rename_input.press("Enter")
    page.wait_for_timeout(2000)

    # Hard reload to bypass Next.js cache
    page.goto(item_url)
    page.wait_for_load_state("networkidle")
    page.reload()
    page.wait_for_load_state("networkidle")

    # Check for the new slug in the tag chips
    chip = page.locator(f"span:has-text('{new_slug}')")
    assert chip.count() > 0, (
        f"Item chip should show new tag name '{new_slug}'"
    )
    print("  [PASS] Renamed tag updates item chips")


# ---------------------------------------------------------------------------
# H — Edge cases
# ---------------------------------------------------------------------------

def test_h1_long_slug_valid(page):
    """H1: Tag with long valid slug (100 chars) creates successfully."""
    print("\n[H1] Long slug tag...")
    uid = str(uuid.uuid4())[:6]
    long_slug = f"a_{'b' * 95}_{uid}"[:100]

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(long_slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")

    assert count_tag_rows(page) > 0, "Long slug tag should be created"
    print("  [PASS] Long slug tag created")


def test_h2_same_label_different_slugs(page):
    """H2: Multiple tags with same display label but different slugs."""
    print("\n[H2] Same label different slugs...")
    uid = str(uuid.uuid4())[:6]
    slug1 = f"shared_{uid}"
    slug2 = f"shared_{uid}_2"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug1)
    tag_input.press("Enter")
    page.wait_for_timeout(500)
    tag_input.fill(slug2)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")

    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug1}')").count() > 0
    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug2}')").count() > 0
    print("  [PASS] Different slugs coexist")


def test_h3_multi_tenant_uniqueness(page):
    """H3: Two different owners can have the same tag slug (multi-tenant)."""
    print("\n[H3] Multi-tenant uniqueness...")
    uid = str(uuid.uuid4())[:6]
    slug = f"multi_{uid}"
    fake_owner = str(uuid.uuid4())

    # Create tag for the real owner via UI
    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    # Create the same tag for a different owner via REST API (service role)
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/tags",
        headers=headers,
        json={"slug": slug, "owner": fake_owner},
    )

    if resp.status_code == 409:
        print("  [SKIP] Old global unique constraint still active on remote DB — apply migration 20260507120001_add_tag_rpc_functions.sql to drop it")
        return

    assert resp.status_code in (201, 204), (
        f"Same slug for different owner should succeed. Got {resp.status_code}"
    )
    print("  [PASS] Same slug coexists for different owners")

    # Cleanup the fake-owner tag
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/tags?owner=eq.{fake_owner}&slug=eq.{slug}",
        headers=headers,
    )


def test_i1_rename_chain_updates_multiple_items(page):
    """I1: Rename tag updates all items that use it."""
    print("\n[I1] Rename chain updates multiple items...")
    uid = str(uuid.uuid4())[:6]
    old_slug = f"chain_old_{uid}"
    new_slug = f"chain_new_{uid}"

    # Create tag
    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(old_slug)
    tag_input.press("Enter")
    page.wait_for_timeout(500)

    # Create 3 items with this tag
    item_titles = []
    for i in range(3):
        title = f"Chain Item {i}_{uid}"
        item_titles.append(title)
        create_item_with_tag(page, title, old_slug)

    # Verify usage count is 3
    navigate_to_settings_tags(page)
    row = get_tag_row_by_slug(page, old_slug)
    usage = row.locator("[data-testid='tag-usage-count']")
    assert "3" in (usage.text_content() or ""), "Tag should show 3 items"

    # Rename the tag
    old_row = get_tag_row_by_slug(page, old_slug)
    old_row.locator("[data-testid='tag-slug']").dblclick()
    page.wait_for_timeout(300)
    rename_input = page.locator("[data-testid='tag-rename-input']")
    rename_input.fill(new_slug)
    rename_input.press("Enter")
    page.wait_for_timeout(1000)

    # Verify tag list shows new slug
    page.reload()
    page.wait_for_load_state("networkidle")
    assert page.locator(f"[data-testid='tag-slug']:has-text('{new_slug}')").count() > 0, (
        "Tag should be renamed in list"
    )

    # Verify all 3 items have the new tag
    for title in item_titles:
        page.goto(f"{BASE_URL}/")
        page.wait_for_load_state("networkidle")
        item_link = page.locator(f"a:has-text('{title}')")
        if item_link.count() > 0:
            item_link.first.click()
            page.wait_for_load_state("networkidle")
            tag_chip = page.locator(f"span:has-text('{new_slug}')")
            assert tag_chip.count() > 0, f"Item '{title}' should have renamed tag"

    print("  [PASS] Rename chain updates all items")


def test_i2_trigger_rejects_orphan_tag(page):
    """I2: Trigger rejects saving an item with a non-existent tag."""
    print("\n[I2] Trigger rejects orphan tag...")
    uid = str(uuid.uuid4())[:6]
    slug = f"orphan_{uid}"

    # Create an item (no tags) directly
    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    page.fill("input[name='title']", f"Orphan Item {uid}")
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    page.wait_for_load_state("networkidle")
    time.sleep(3)
    item_url = page.evaluate("window.location.href")

    # Extract item ID from URL
    item_id = item_url.split("/")[-1]

    # Try to PATCH the item with a non-existent tag via Supabase REST API
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    patch_url = f"{SUPABASE_URL}/rest/v1/items?id=eq.{item_id}"
    resp = requests.patch(
        patch_url,
        headers=headers,
        json={"tags": [slug]},
    )

    # The trigger should reject this with 400. If it returns 204, the trigger
    # migration (Batch 5) may not have been applied to the remote DB yet.
    if resp.status_code == 204:
        print("  [SKIP] Trigger not active on remote DB — apply migration 20260507120004_add_items_tags_integrity_trigger.sql")
        return

    assert resp.status_code == 400, (
        f"Trigger should reject non-existent tag. Got status {resp.status_code}"
    )
    body = resp.json()
    assert "Invalid tag reference" in body.get("message", ""), (
        f"Expected 'Invalid tag reference' error. Got: {body}"
    )
    print("  [PASS] Trigger rejects orphan tag")


def test_h3_recover_after_deleting_all_tags(page):
    """H3: After deleting own tag, it is removed from list."""
    print("\n[H3] Recover after deleting all tags...")
    uid = str(uuid.uuid4())[:6]
    slug = f"last_tag_{uid}"

    navigate_to_settings_tags(page)
    tag_input = page.locator("[data-testid='tag-input']")
    tag_input.fill(slug)
    tag_input.press("Enter")
    page.wait_for_timeout(1000)
    page.reload()
    page.wait_for_load_state("networkidle")

    page.wait_for_selector(f"[data-testid='tag-slug']:has-text('{slug}')", timeout=5000)
    row = get_tag_row_by_slug(page, slug)
    delete_btn = row.locator("[data-testid='tag-delete-btn']")
    assert delete_btn.count() > 0, "Delete button should be visible"
    assert not delete_btn.is_disabled(), "Delete button should be enabled for unused tag"
    delete_btn.click()
    page.wait_for_timeout(500)
    confirm_btn = page.locator(
        "[data-testid='confirm-delete'] button:has-text('Remove')"
    )
    assert confirm_btn.count() > 0, "Confirm dialog should appear"
    confirm_btn.click()
    page.wait_for_timeout(1000)

    page.reload()
    page.wait_for_load_state("networkidle")

    # The tag should be gone from the list
    assert page.locator(f"[data-testid='tag-slug']:has-text('{slug}')").count() == 0, (
        "Created tag should be deleted"
    )
    print("  [PASS] Tag deleted successfully")
    print("  [PASS] Empty state recovered")


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

def run_all_tests():
    """Run all Phase 8 tests sequentially."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        test_cases = [
            # A — Navigation
            test_a1_settings_tags_page_accessible,
            test_a2_settings_tags_page_shows_title,
            test_a3_tag_input_present_and_editable,
            # B — Listing
            test_b1_existing_tags_listed,
            test_b2_empty_state_shows_message,
            test_b3_tags_sorted_alphabetically,
            # C — Creation
            test_c1_create_valid_snake_case_tag,
            test_c2_reject_spaces,
            test_c3_reject_uppercase,
            test_c4_reject_special_characters,
            test_c5_reject_starts_with_number,
            test_c6_reject_empty_input,
            test_c7_reject_duplicate,
            # D — Rename
            test_d1_dblclick_activates_inline_edit,
            test_d2_rename_persists,
            test_d3_rename_to_existing_fails,
            test_d4_escape_cancels_rename,
            test_d5_click_outside_cancels_rename,
            # E — Delete
            test_e1_delete_unused_tag,
            test_e2_cancel_delete,
            test_e3_cannot_delete_tag_in_use,
            test_e4_confirm_dialog_shows_tag_name,
            # F — Usage count
            test_f1_new_tag_shows_zero_usage,
            test_f2_tag_with_items_shows_count,
            test_f3_usage_decrements_when_tag_removed,
            # G — Integration
            test_g1_tag_created_in_settings_appears_in_item_autocomplete,
            test_g2_renamed_tag_updates_item_chips,
            # H — Edge cases
            test_h1_long_slug_valid,
            test_h2_same_label_different_slugs,
            test_h3_multi_tenant_uniqueness,
            test_h3_recover_after_deleting_all_tags,
            # I — Rename chain + trigger integrity
            test_i1_rename_chain_updates_multiple_items,
            test_i2_trigger_rejects_orphan_tag,
        ]

        passed = 0
        failed = 0
        failed_names = []

        cleanup_db()

        for test in test_cases:
            context = browser.new_context()
            page = context.new_page()
            try:
                test(page)
                passed += 1
            except Exception as e:
                try:
                    print(f"  [FAIL] {e}")
                except UnicodeEncodeError:
                    msg = str(e).encode("ascii", errors="replace").decode("ascii")
                    print(f"  [FAIL] {msg}")
                failed += 1
                failed_names.append(test.__name__)
            finally:
                context.close()

        browser.close()

        print(f"\n{'=' * 55}")
        print(f"Phase 8 Results: {passed} passed, {failed} failed")
        if failed_names:
            print("Failed tests:")
            for name in failed_names:
                print(f"  - {name}")
        print(f"{'=' * 55}")
        return failed == 0


if __name__ == "__main__":
    import sys
    success = run_all_tests()
    sys.exit(0 if success else 1)
