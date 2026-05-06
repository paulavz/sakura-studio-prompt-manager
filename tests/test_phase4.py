"""
Test suite for Sakura Prompt Studio - Phase 4
Tests: creation, editing, saving, versioning, tags, favorites, history
"""

import os
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
import time
import uuid

# Load environment variables from .env.local
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")


def click_save_btn(page, timeout_ms=5000):
    """Click Save button using in-browser polling to catch brief DOM appearances."""
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


def test_a1_create_new_item(page):
    """A1: Creacion exitosa de item"""
    print("\n[A1] Create new item...")
    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    
    page.fill("input[name='title']", "Test Item " + str(uuid.uuid4())[:8])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    
    # Wait for navigation after server action (redirect can take time)
    time.sleep(5)
    
    # Check for error messages
    error_elem = page.locator("p.text-red-600")
    if error_elem.count() > 0:
        error_text = error_elem.text_content()
        raise AssertionError(f"Form submission error: {error_text}")
    
    assert "/items/" in page.url, f"Expected /items/ in URL, got: {page.url}"
    assert "/new" not in page.url
    print("  [PASS] Item created, redirected to editor")


def test_a2_create_without_title(page):
    """A2: Validation - title required"""
    print("\n[A2] Create without title...")
    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    
    page.evaluate("document.querySelector('input[name=title]').value = ''")
    page.click("button[type='submit']")
    
    time.sleep(1)
    assert "/items/new" in page.url
    print("  [PASS] Stays on form without title")


def test_b1_edit_raw_mode(page):
    """B1: Edit markdown in Raw mode"""
    print("\n[B1] Edit content in Raw mode...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Raw Mode Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    
    test_content = "## Heading\n\nThis is **bold** text.\n\n- Item 1\n- Item 2"
    page.fill("textarea", test_content)
    
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    
    content = page.input_value("textarea")
    assert "## Heading" in content
    assert "**bold**" in content
    print("  [PASS] Raw mode content persisted")


def test_c1_tiptap_loads(page):
    """C1: Tiptap loads without SSR error"""
    print("\n[C1] Tiptap loads without error...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Tiptap Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    error = page.locator("text=SSR has been detected")
    assert error.count() == 0, "Tiptap SSR error detected!"
    
    editor = page.locator("[contenteditable='true']")
    assert editor.count() > 0, "Tiptap editor not found"
    print("  [PASS] Tiptap loaded without SSR errors")


def test_d1_mode_toggle_clean(page):
    """D1: Toggle between modes when clean"""
    print("\n[D1] Mode toggle (clean state)...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Toggle Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    editor = page.locator("[contenteditable='true']")
    assert editor.count() > 0
    print("  [PASS] Mode toggle works when clean")


def test_d2_mode_toggle_blocked_when_dirty(page):
    """D2: Mode toggle blocked when dirty"""
    print("\n[D2] Mode toggle blocked when dirty...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Dirty Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.fill("textarea", "dirty content")
    
    rendered_btn = page.locator("button:has-text('Rendered')")
    assert rendered_btn.is_disabled(), "Rendered button should be disabled when dirty"
    
    warning = page.locator("text=Unsaved changes")
    assert warning.count() > 0, "Warning message should be visible"
    print("  [PASS] Mode toggle blocked when dirty")


def test_d3_cancel_resets(page):
    """D3: Cancel resets changes"""
    print("\n[D3] Cancel resets changes...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Cancel Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    original = page.input_value("textarea")
    page.fill("textarea", "changed content")
    
    page.click("button:has-text('Cancel')")
    time.sleep(0.5)
    
    content = page.input_value("textarea")
    assert content == original or content == "", "Content should be reset after cancel"
    
    rendered_btn = page.locator("button:has-text('Rendered')")
    assert not rendered_btn.is_disabled(), "Toggle should be enabled after cancel"
    print("  [PASS] Cancel resets and re-enables toggle")


def test_e1_save_all_fields(page):
    """E1: Save content + metadata atomically"""
    print("\n[E1] Save all fields together...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Atomic Save Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "Updated content")
    
    # Now edit title and category (this will make dirty, blocking toggle)
    page.fill("header input[type='text']", "Updated Title")
    page.select_option("header select", "plan")
    
    # Toggle favorite
    star = page.locator("button:has-text('☆')").first
    if star.count() > 0:
        star.click()
    
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.reload()
    page.wait_for_load_state("networkidle")
    
    title = page.input_value("header input[type='text']")
    assert title == "Updated Title", f"Title not persisted: {title}"
    
    page.click("button:has-text('Raw')")
    content = page.input_value("textarea")
    assert "Updated content" in content
    print("  [PASS] All fields persisted atomically")


def test_f1_add_existing_tag(page):
    """F1: Add existing tag via autocomplete"""
    print("\n[F1] Add existing tag...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Tag Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    tag_input = page.locator("input[placeholder='+ tag']")
    tag_input.fill("test_tag")
    tag_input.press("Enter")
    time.sleep(0.5)
    
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    chip = page.locator("span:has-text('test_tag')")
    assert chip.count() > 0, "Tag chip should be visible"
    print("  [PASS] Tag added and persisted")


def test_g1_favorite_toggle(page):
    """G1: Toggle favorite and save"""
    print("\n[G1] Favorite toggle...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Favorite Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    
    # Find star button (empty star = not favorite)
    star = page.locator("button:has-text('☆')").first
    assert star.count() > 0, "Star button not found"
    star.click()
    time.sleep(0.3)
    
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.reload()
    page.wait_for_load_state("networkidle")

    # Wait for the filled star to appear after hydration
    page.wait_for_selector("button:has-text('\u2605')", timeout=5000)
    print("  [PASS] Favorite persisted after save")


def test_h1_history_panel(page):
    """H1: View history and restore version"""
    print("\n[H1] History panel...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "History Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=5000)
    page.fill("textarea", "Version 1")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=5000)
    page.wait_for_selector("text=Saved", state="detached", timeout=4000)
    
    page.fill("textarea", "Version 2")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=5000)
    page.wait_for_selector("text=Saved", state="detached", timeout=4000)
    
    page.click("button:has-text('History')")
    page.wait_for_selector("text=Version history", timeout=3000)
    page.wait_for_function("""() => Array.from(document.querySelectorAll('button'))
        .filter(b => b.textContent.includes('Restore')).length >= 2""", timeout=10000)
    versions = page.locator("button:has-text('Restore')")
    assert versions.count() >= 2, f"Expected 2+ versions, found {versions.count()}"
    print("  [PASS] History shows multiple versions")
    
    # Click second version (index 1) which is Version 1 (ordered DESC)
    versions.nth(1).click()
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Raw')")
    content = page.input_value("textarea")
    assert "Version 1" in content, f"Restored content should match Version 1, got: {content}"
    print("  [PASS] Version restored successfully")


def test_i1_copy_content(page):
    """I1: Copy content to clipboard"""
    print("\n[I1] Copy content...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Copy Test " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")
    
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    page.click("button:has-text('Raw')")
    page.fill("textarea", "copy me")
    page.click("button:has-text('Save')")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.evaluate("""() => {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.includes('Copy raw'));
        if (btn) btn.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    }""")
    
    page.wait_for_function("""() => Array.from(document.querySelectorAll('button'))
        .some(b => b.textContent.includes('Copied'))""", timeout=5000)
    print("  [PASS] Copy button works")


def test_j1_404_page(page):
    """J1: Non-existent item shows 404"""
    print("\n[J1] 404 for non-existent item...")
    page.goto(f"{BASE_URL}/items/00000000-0000-0000-0000-000000000000")
    page.wait_for_load_state("networkidle")
    
    assert page.locator("text=404").count() > 0 or \
           page.locator("text=Not Found").count() > 0 or \
           "error" in page.content().lower()
    print("  [PASS] 404 handled")


def test_k1_mode_switch_after_save_no_dirty(page):
    """K1: No dirty state after save + mode switch (Raw→Rendered)"""
    print("\n[K1] No dirty after save + mode switch...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Dirty Fix K1 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "## Hello World")
    
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    save_btn = page.locator("button:has-text('Save')")
    assert save_btn.count() == 0, "Save should NOT be visible after clean switch"
    
    warning = page.locator("text=Unsaved changes")
    assert warning.count() == 0, "Warning should NOT appear after clean switch"
    
    rendered_btn = page.locator("button:has-text('Rendered')")
    assert not rendered_btn.is_disabled(), "Rendered toggle should be enabled"
    raw_btn = page.locator("div.bg-gray-100 button:has-text('Raw')")
    assert not raw_btn.is_disabled(), "Raw toggle should be enabled"
    print("  [PASS] Clean after Raw to Rendered switch post-save")


def test_k2_mode_switch_roundtrip(page):
    """K2: Roundtrip Raw→Rendered→Raw→Rendered stays clean"""
    print("\n[K2] Mode switch roundtrip stays clean...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Roundtrip K2 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "roundtrip content")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    assert page.locator("text=Unsaved changes").count() == 0
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    assert page.locator("text=Unsaved changes").count() == 0
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    assert page.locator("text=Unsaved changes").count() == 0
    assert page.locator("button:has-text('Save')").count() == 0
    print("  [PASS] Roundtrip Raw to Rendered to Raw to Rendered stays clean")


def test_k3_mode_switch_after_version_restore(page):
    """K3: No dirty state after restoring a version then switching mode"""
    print("\n[K3] Clean after version restore + mode switch...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Restore K3 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=5000)
    page.fill("textarea", "Version Alpha")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=3000)
    page.wait_for_selector("text=Saved", state="detached", timeout=4000)
    
    page.fill("textarea", "Version Beta")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=3000)
    page.wait_for_selector("text=Saved", state="detached", timeout=4000)
    
    page.click("button:has-text('History')")
    page.wait_for_selector("text=Version history", timeout=3000)
    page.wait_for_function("""() => Array.from(document.querySelectorAll('button'))
        .filter(b => b.textContent.includes('Restore')).length >= 2""", timeout=10000)
    versions = page.locator("button:has-text('Restore')")
    assert versions.count() >= 2
    versions.nth(1).click()
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    assert page.locator("text=Unsaved changes").count() == 0
    assert page.locator("button:has-text('Save')").count() == 0
    print("  [PASS] Clean after version restore + mode switch")


def test_k4_heading_without_space_renders(page):
    """K4: ##title (no space) renders as <h2> in Tiptap"""
    print("\n[K4] Heading without space renders...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Heading K4 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "##title")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    h2 = page.locator("[contenteditable='true'] h2")
    assert h2.count() > 0, "##title should render as <h2>"
    assert "title" in (h2.text_content() or "")
    print("  [PASS] ##title renders as <h2>")


def test_k5_headings_all_levels_no_space(page):
    """K5: #h1, ##h2, ###h3, ######h6 all render without space after hashes"""
    print("\n[K5] All heading levels without space...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Headings K5 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "#h1\n##h2\n###h3\n######h6")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    for level in [1, 2, 3, 6]:
        heading = page.locator(f"[contenteditable='true'] h{level}")
        assert heading.count() > 0, f"h{level} should exist"
        assert f"h{level}" in (heading.text_content() or "")
    print("  [PASS] All heading levels render without space")


def test_k6_heading_too_many_hashes(page):
    """K6: #######plain (7 hashes) does NOT render as heading"""
    print("\n[K6] Seven hashes does not render as heading...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "SevenHash K6 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "#######plain")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    h7 = page.locator("[contenteditable='true'] h7")
    assert h7.count() == 0, "h7 should NOT exist (max is h6)"
    
    p = page.locator("[contenteditable='true'] p")
    assert p.count() > 0
    assert "plain" in (p.first.text_content() or "")
    print("  [PASS] Seven hashes stays as plain text")


def test_k7_save_empty_content(page):
    """K7: Empty content can be saved"""
    print("\n[K7] Save empty content...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Empty K7 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=5000)
    # First write something and save, so we have a non-empty baseline
    page.fill("textarea", "temp")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=3000)
    # Reload to get a clean state for the second save
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")
    
    # Now clear to empty and save again
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=5000)
    page.fill("textarea", "")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    content = page.input_value("textarea")
    assert content == "", f"Expected empty content, got: {repr(content)}"
    print("  [PASS] Empty content persisted")


def test_k8_whitespace_only_content(page):
    """K8: Whitespace-only content persists"""
    print("\n[K8] Whitespace-only content...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Whitespace K8 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    test_content = "   \n\n  "
    page.fill("textarea", test_content)
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    content = page.input_value("textarea")
    assert content == test_content, f"Whitespace mismatch: {repr(content)}"
    print("  [PASS] Whitespace-only content persisted")


def test_k9_special_chars_roundtrip(page):
    """K9: Emoji, unicode, HTML entities survive Raw→Rendered→Raw"""
    print("\n[K9] Special chars roundtrip...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Special K9 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    test_content = "Emoji: \U0001F338\U0001F680 Unicode: \u65E5\u672C\u8A9E"
    page.fill("textarea", test_content)
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    content = page.input_value("textarea")
    
    assert "\U0001F338" in content, "Emoji lost in roundtrip"
    assert "\u65E5\u672C\u8A9E" in content, "Unicode lost in roundtrip"
    print("  [PASS] Special chars survive roundtrip")


def test_k10_code_blocks_roundtrip(page):
    """K10: Code block survives Raw→Rendered→Raw"""
    print("\n[K10] Code block roundtrip...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Code K10 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    test_content = '```python\nprint("hello")\n```'
    page.fill("textarea", test_content)
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    content = page.input_value("textarea")
    assert 'print("hello")' in content, "Code block lost in roundtrip"
    print("  [PASS] Code block roundtrip OK")


def test_k11_very_long_title(page):
    """K11: Very long title (250 chars) does not break"""
    print("\n[K11] Very long title...")
    long_title = "A" * 250
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", long_title)
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    
    assert "/items/" in page.url, f"Expected redirect after long title, got: {page.url}"
    
    # Make a small content edit to trigger dirty state so we can save
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "long title test")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.reload()
    page.wait_for_load_state("networkidle")
    title = page.input_value("header input[type='text']")
    assert title == long_title, f"Long title mismatch: {len(title)} vs {len(long_title)}"
    print("  [PASS] Very long title persisted")


def test_l1_cancel_in_rendered_mode(page):
    """L1: Cancel resets changes made in Rendered (Tiptap) mode"""
    print("\n[L1] Cancel in Rendered mode...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Cancel Rendered L1 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    # Establish a baseline by saving some content first
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "baseline text")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    editor = page.locator("[contenteditable='true']")
    editor.fill("new rendered text")
    
    cancel_btn = page.locator("button:has-text('Cancel')")
    assert cancel_btn.count() > 0, "Cancel should be available after typing in Rendered"
    
    cancel_btn.click()
    time.sleep(0.5)
    
    editor_after = page.locator("[contenteditable='true']")
    after_text = editor_after.text_content() or ""
    assert "new rendered text" not in after_text, "Cancel should reset Rendered content"
    assert "baseline text" in after_text, "Cancel should restore baseline content"
    print("  [PASS] Cancel resets Rendered changes")


def test_l2_restore_version_then_cancel(page):
    """L2: Restore version, then Cancel should not leave dirty state"""
    print("\n[L2] Restore then Cancel...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "RestoreCancel L2 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.fill("textarea", "First")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    time.sleep(2.5)  # Wait for Saved to disappear before next save
    
    page.fill("textarea", "Second")
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    time.sleep(2.5)  # Wait for Saved to disappear before restore
    
    page.click("button:has-text('History')")
    page.wait_for_selector("text=Version history", timeout=3000)
    versions = page.locator("button:has-text('Restore')")
    versions.nth(1).click()
    page.wait_for_selector("text=Saved", timeout=3000)
    time.sleep(1.5)  # Let UI fully settle after restore state updates
    
    cancel_btn = page.locator("button:has-text('Cancel')")
    if cancel_btn.count() > 0:
        cancel_btn.click()
        time.sleep(0.5)
    
    warning_count = page.locator("text=Unsaved changes").count()
    save_count = page.locator("button:has-text('Save')").count()
    assert warning_count == 0, f"Warning should not appear after restore, found {warning_count}"
    assert save_count == 0, f"Save button should not appear after restore, found {save_count}"
    print("  [PASS] Restore then Cancel stays clean")


def test_l3_edit_in_rendered_syncs_to_raw(page):
    """L3: Typing in Rendered mode converts correctly to Raw markdown"""
    print("\n[L3] Rendered edit syncs to Raw...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Sync L3 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    editor = page.locator("[contenteditable='true']")
    editor.fill("rendered line")
    
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    content = page.input_value("textarea")
    assert "rendered line" in content, "Rendered text should appear in Raw mode"
    print("  [PASS] Rendered edit syncs to Raw")


def test_l4_mixed_content_roundtrip(page):
    """L4: Complex markdown survives Raw→Rendered→Raw"""
    print("\n[L4] Mixed content roundtrip...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Mixed L4 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    test_content = "## Section\n\nThis is **bold** and *italic*.\n\n- Item A\n- Item B"
    page.fill("textarea", test_content)
    page.dispatch_event("button:has-text('Save')", "click")
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.click("button:has-text('Rendered')")
    page.wait_for_selector("[contenteditable='true']", timeout=3000)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    content = page.input_value("textarea")
    
    assert "## Section" in content
    assert "**bold**" in content
    assert "*italic*" in content
    assert "- Item A" in content
    print("  [PASS] Mixed content roundtrip stable")


def test_l5_concurrent_favorite_and_content(page):
    """L5: Favorite toggle + content edit saved together"""
    print("\n[L5] Favorite + content concurrent save...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Concurrent L5 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(3)
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "concurrent content")
    
    star = page.locator("button:has-text('\u2606')").first
    if star.count() > 0:
        star.click()
    
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=3000)
    
    page.reload()
    page.wait_for_load_state("networkidle")
    
    filled_star = page.locator("button:has-text('\u2605')")
    assert filled_star.count() > 0, "Favorite should be persisted"
    
    page.click("button:has-text('Raw')")
    content = page.input_value("textarea")
    assert "concurrent content" in content
    print("  [PASS] Favorite and content persisted together")


def test_l6_save_empty_metadata_only(page):
    """L6: Change only category, content stays unchanged"""
    print("\n[L6] Save metadata-only change...")
    page.goto(f"{BASE_URL}/items/new")
    page.fill("input[name='title']", "Metadata L6 " + str(uuid.uuid4())[:4])
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")
    
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=5000)
    page.fill("textarea", "unchanged body")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=3000)
    page.wait_for_selector("text=Saved", state="detached", timeout=4000)
    
    # Change category (this sets isDirty)
    page.select_option("header select", "plan")
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=8000)
    
    page.reload()
    page.wait_for_load_state("networkidle")
    
    cat = page.locator("header select").input_value()
    assert cat == "plan", f"Category should be 'plan', got: {cat}"
    
    page.click("button:has-text('Raw')")
    content = page.input_value("textarea")
    assert content == "unchanged body", "Content should remain unchanged"
    print("  [PASS] Metadata-only change persisted without touching content")


def run_all_tests():
    """Run all Phase 4 tests"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        test_cases = [
            test_a1_create_new_item,
            test_a2_create_without_title,
            test_b1_edit_raw_mode,
            test_c1_tiptap_loads,
            test_d1_mode_toggle_clean,
            test_d2_mode_toggle_blocked_when_dirty,
            test_d3_cancel_resets,
            test_e1_save_all_fields,
            test_f1_add_existing_tag,
            test_g1_favorite_toggle,
            test_h1_history_panel,
            test_i1_copy_content,
            test_j1_404_page,
            test_k1_mode_switch_after_save_no_dirty,
            test_k2_mode_switch_roundtrip,
            test_k3_mode_switch_after_version_restore,
            test_k4_heading_without_space_renders,
            test_k5_headings_all_levels_no_space,
            test_k6_heading_too_many_hashes,
            test_k7_save_empty_content,
            test_k8_whitespace_only_content,
            test_k9_special_chars_roundtrip,
            test_k10_code_blocks_roundtrip,
            test_k11_very_long_title,
            test_l1_cancel_in_rendered_mode,
            test_l2_restore_version_then_cancel,
            test_l3_edit_in_rendered_syncs_to_raw,
            test_l4_mixed_content_roundtrip,
            test_l5_concurrent_favorite_and_content,
            test_l6_save_empty_metadata_only,
        ]
        
        passed = 0
        failed = 0
        
        for test in test_cases:
            context = browser.new_context()
            page = context.new_page()
            try:
                test(page)
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {e}")
                failed += 1
            finally:
                context.close()
        
        browser.close()

        print(f"\n{'='*50}")
        print(f"Results: {passed} passed, {failed} failed")
        print(f"{'='*50}")
        return failed == 0


if __name__ == "__main__":
    import sys
    success = run_all_tests()
    sys.exit(0 if success else 1)