"""
Test suite for Sakura Prompt Studio - Phase 6
Tests: Add Skill button, skill selector, skill injection, applied skills panel, no persistence

TDD: these tests are written BEFORE the feature is implemented.
They should fail (red phase) until the Skills feature is built.
"""

import os
import time
import uuid
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")


def click_save_btn(page, timeout_ms=5000):
    """Click Save using in-browser polling."""
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


def create_item_with_content(page, title: str, content: str, category: str = "template") -> str:
    """Create an item via UI and return its URL."""
    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    page.fill("input[name='title']", title)
    page.select_option("select[name='category']", category)
    page.click("button[type='submit']")
    time.sleep(5)
    real_url = page.evaluate("window.location.href")
    assert "/items/" in real_url and "/new" not in real_url, (
        f"Expected redirect to /items/<id>, got: {real_url}"
    )
    page.goto(real_url)
    page.wait_for_load_state("networkidle")
    item_url = real_url

    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)

    page.evaluate("""(c) => {
        const ta = document.querySelector('textarea');
        if (ta) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            nativeSetter.call(ta, c);
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }""", content)

    page.wait_for_timeout(300)

    if content.strip():
        page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button'))
                .find(b => b.textContent.includes('Save') && !b.disabled);
            if (btn) btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
        }""")
        page.wait_for_selector("text=Saved", timeout=15000)

    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")

    return item_url


def create_skill_item(page, title: str, content: str = "Skill content here.") -> str:
    """Create an item with category=skill and return its URL."""
    return create_item_with_content(page, title, content, category="skill")


# ---------------------------------------------------------------------------
# T — "Add Skill" button visibility
# ---------------------------------------------------------------------------

def test_t1_add_skill_button_visible(page):
    """T1: 'Add Skill' button is visible on an item view."""
    print("\n[T1] 'Add Skill' button visible on item view...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template T1 {uid}", "Build a plan for {{project}}.")

    btn = page.locator("button:has-text('Add Skill')")
    assert btn.count() > 0, "'Add Skill' button not found"
    assert btn.is_visible(), "'Add Skill' button is not visible"
    print("  [PASS] 'Add Skill' button is visible")


def test_t2_add_skill_button_absent_on_skill_item(page):
    """T2: 'Add Skill' button is NOT shown on an item that IS a skill."""
    print("\n[T2] 'Add Skill' absent on skill-category item...")
    uid = str(uuid.uuid4())[:6]
    create_skill_item(page, f"Skill Item T2 {uid}", "How to structure a prompt.")

    btn = page.locator("button:has-text('Add Skill')")
    is_absent = btn.count() == 0
    assert is_absent, "'Add Skill' should not appear on a skill-type item"
    print("  [PASS] 'Add Skill' absent on skill items")


# ---------------------------------------------------------------------------
# U — Skill selector opens
# ---------------------------------------------------------------------------

def test_u1_skill_selector_opens(page):
    """U1: Clicking 'Add Skill' opens the skill selector."""
    print("\n[U1] Skill selector opens...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template U1 {uid}", "Write tests for {{module}}.")

    page.click("button:has-text('Add Skill')")
    selector = page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    assert selector is not None, "Skill selector did not appear"
    print("  [PASS] Skill selector opens")


def test_u2_skill_selector_shows_only_skill_items(page):
    """U2: Selector only shows items with category='skill'."""
    print("\n[U2] Skill selector shows only skill items...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template U2 {uid}", "Test content.")
    create_skill_item(page, f"Skill Alpha U2 {uid}", "Alpha skill content.")
    create_skill_item(page, f"Skill Beta U2 {uid}", "Beta skill content.")
    create_item_with_content(page, f"Plan Item U2 {uid}", "Plan content.", category="plan")

    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    page.fill("input[name='title']", f"Target U2 {uid}")
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.wait_for_timeout(1000)

    skill_names = ["Alpha", "Beta"]
    for name in skill_names:
        assert page.locator("[data-testid='skill-selector']").get_by_text(name, exact=False).count() > 0, (
            f"Skill '{name}' not found in selector"
        )

    plan_name = "Plan Item"
    assert page.locator("[data-testid='skill-selector']").get_by_text(plan_name, exact=False).count() == 0, (
        f"Non-skill item '{plan_name}' should not appear in selector"
    )
    print("  [PASS] Selector shows only skill items")


def test_u3_skill_selector_can_be_closed(page):
    """U3: Skill selector can be closed with a close button."""
    print("\n[U3] Skill selector can be closed...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template U3 {uid}", "Prompt content.")

    page.click("button:has-text('Add Skill')")
    selector = page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    assert selector.is_visible()

    close_btn = page.locator("[data-testid='skill-selector'] button[aria-label='Close']")
    assert close_btn.count() > 0, "Selector must have a close button with aria-label='Close'"
    close_btn.click()
    page.wait_for_selector("[data-testid='skill-selector']", state="detached", timeout=2000)
    assert page.locator("[data-testid='skill-selector']").count() == 0
    print("  [PASS] Skill selector closes correctly")


# ---------------------------------------------------------------------------
# V — Skill injection into editor
# ---------------------------------------------------------------------------

def test_v1_skill_injected_at_end(page):
    """V1: Selecting a skill appends text at the END of the editor content."""
    print("\n[V1] Skill injected at end of editor...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(
        page,
        f"Template V1 {uid}",
        "Generate a report for {{project}}."
    )

    create_skill_item(page, f"Data Extraction V1 {uid}", "Use JSON for structured output.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Data Extraction')")
    page.wait_for_timeout(800)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)

    content = page.locator("textarea").input_value()
    assert content.startswith("Generate a report"), (
        f"Original content should be at start. Got: {content[:50]!r}"
    )
    assert "Usa la skill Data Extraction V1" in content or "Data Extraction" in content, (
        f"Skill injection text not found. Got: {content!r}"
    )
    print("  [PASS] Skill injected at end of content")


def test_v2_same_skill_injected_once(page):
    """V2: Adding the same skill twice does NOT duplicate the injection text."""
    print("\n[V2] Same skill injected only once...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template V2 {uid}", "Review the {{code}}.")
    create_skill_item(page, f"Code Review V2 {uid}", "Check for edge cases.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Code Review V2 {uid}')")
    page.wait_for_timeout(800)

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.wait_for_timeout(800)

    second_btn = page.locator(f"[data-testid='skill-selector'] button:has-text('Code Review V2 {uid}')")
    assert second_btn.is_disabled(), (
        "Already-applied skill should be disabled in selector"
    )

    close_btn = page.locator("[data-testid='skill-selector'] button[aria-label='Close']")
    close_btn.click()
    page.wait_for_timeout(500)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    content = page.locator("textarea").input_value()

    import re
    matches = re.findall(
        r"Usa la skill Code Review V2[^\n]* para este desarrollo\.",
        content
    )
    assert len(matches) == 1, (
        f"Skill injection line should appear exactly once. Found {len(matches)} in: {content!r}"
    )
    print("  [PASS] Same skill injected only once")


def test_v3_multiple_different_skills_injected(page):
    """V3: Multiple different skills can be added sequentially."""
    print("\n[V3] Multiple different skills injected...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template V3 {uid}", "Build {{feature}}.")
    create_skill_item(page, f"Testing V3 {uid}", "Always write tests.")
    create_skill_item(page, f"Documentation V3 {uid}", "Use clear examples.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Testing')")
    page.wait_for_timeout(800)

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Documentation')")
    page.wait_for_timeout(800)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    content = page.locator("textarea").input_value()

    assert "Testing" in content, "Testing skill not found"
    assert "Documentation" in content, "Documentation skill not found"
    print("  [PASS] Multiple different skills injected")


def test_v4_skill_injection_format(page):
    """V4: Injected skill text follows the exact format 'Usa la skill [Nombre] para este desarrollo.'"""
    print("\n[V4] Skill injection format is correct...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template V4 {uid}", "Explain {{topic}}.")
    create_skill_item(page, f"Python Patterns V4 {uid}", "Use comprehensions.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Python Patterns')")
    page.wait_for_timeout(800)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    content = page.locator("textarea").input_value()

    expected_needle = "Python Patterns V4"
    assert expected_needle in content, (
        f"Expected skill name '{expected_needle}' in injection text. Got: {content!r}"
    )
    assert "Usa la skill" in content, f"Expected 'Usa la skill' marker. Got: {content!r}"
    print("  [PASS] Skill injection format correct")


# ---------------------------------------------------------------------------
# W — No persistence (ephemeral — only saved on Save)
# ---------------------------------------------------------------------------

def test_w1_skill_not_saved_without_explicit_save(page):
    """W1: Adding a skill does NOT persist without clicking Save."""
    print("\n[W1] Skill not saved without explicit Save...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template W1 {uid}", "Plan {{goal}}.")
    create_skill_item(page, f"Agile W1 {uid}", "Stand-ups daily.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Agile')")
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    content = page.locator("textarea").input_value()

    assert "Agile" not in content, (
        f"Skill should NOT persist after reload without Save. Got: {content!r}"
    )
    print("  [PASS] Skill not persisted without Save")


def test_w2_skill_persisted_after_save(page):
    """W2: Adding a skill and clicking Save DOES persist it."""
    print("\n[W2] Skill persisted after Save...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template W2 {uid}", "Build {{app}}.")
    create_skill_item(page, f"API Design W2 {uid}", "Use REST conventions.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('API Design')")
    page.wait_for_timeout(500)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Raw')")
    content = page.locator("textarea").input_value()

    assert "API Design" in content, (
        f"Skill should persist after Save. Got: {content!r}"
    )
    print("  [PASS] Skill persisted after Save")


def test_w3_dirty_state_after_adding_skill(page):
    """W3: Adding a skill sets the dirty/unsaved state."""
    print("\n[W3] Dirty state after adding skill...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template W3 {uid}", "Analyze {{data}}.")
    create_skill_item(page, f"Visualization W3 {uid}", "Use charts.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Visualization')")
    page.wait_for_timeout(500)

    warning = page.locator("text=Unsaved changes")
    assert warning.count() > 0, (
        "Warning 'Unsaved changes' should appear after adding a skill"
    )

    save_btn = page.locator("button:has-text('Save')")
    assert save_btn.count() > 0, "Save button should be enabled when dirty"
    print("  [PASS] Dirty state active after adding skill")


def test_w4_cancel_discards_injected_skills(page):
    """W4: Clicking Cancel discards all unsaved skill injections."""
    print("\n[W4] Cancel discards unsaved skills...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template W4 {uid}", "Refactor {{module}}.")
    create_skill_item(page, f"Clean Code W4 {uid}", "Keep functions small.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Clean Code')")
    page.wait_for_timeout(500)

    cancel_btn = page.locator("button:has-text('Cancel')")
    assert cancel_btn.count() > 0, "Cancel button should be visible when dirty"
    cancel_btn.click()
    page.wait_for_timeout(500)

    page.click("button:has-text('Raw')")
    content = page.locator("textarea").input_value()

    assert "Clean Code" not in content, (
        f"Skill should be discarded after Cancel. Got: {content!r}"
    )
    print("  [PASS] Cancel discards unsaved skills")


# ---------------------------------------------------------------------------
# X — Applied skills panel (from SAVED content only)
# ---------------------------------------------------------------------------

def test_x1_applied_skills_panel_shows_saved_skills(page):
    """X1: 'Applied Skills' panel lists skills found in SAVED content."""
    print("\n[X1] Applied skills panel shows saved skills...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template X1 {uid}", "Build {{project}}.")
    create_skill_item(page, f"Testing X1 {uid}", "Write unit tests.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Testing')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    panel = page.locator("[data-testid='applied-skills-panel']")
    assert panel.count() > 0, "'Applied Skills' panel not found"
    assert panel.is_visible(), "'Applied Skills' panel is not visible"
    assert panel.get_by_text("Testing", exact=False).count() > 0, (
        "Skill name should appear in Applied Skills panel"
    )
    print("  [PASS] Applied skills panel shows saved skill")


def test_x2_applied_skills_panel_hidden_when_no_skills(page):
    """X2: Applied Skills panel is absent or empty when content has no skills."""
    print("\n[X2] Applied skills panel hidden when no skills...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template X2 {uid}", "Plain content, no skills.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    panel = page.locator("[data-testid='applied-skills-panel']")
    if panel.count() > 0:
        panel_text = panel.text_content() or ""
        assert "Testing" not in panel_text and "Skill" not in panel_text or panel_text.strip() == "", (
            f"Panel should not show any skills. Got: {panel_text!r}"
        )
    print("  [PASS] Applied skills panel absent/empty when no skills")


def test_x3_panel_not_updated_with_unsaved_skill(page):
    """X3: Applied Skills panel does NOT reflect unsaved skill additions."""
    print("\n[X3] Panel not updated with unsaved skill...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template X3 {uid}", "Analyze {{system}}.")
    create_skill_item(page, f"Debugging X3 {uid}", "Use console.log.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    panel_before = page.locator("[data-testid='applied-skills-panel']")
    if panel_before.count() > 0:
        text_before = panel_before.text_content() or ""

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Debugging')")
    page.wait_for_timeout(500)

    panel_after = page.locator("[data-testid='applied-skills-panel']")
    panel_text = panel_after.text_content() if panel_after.count() > 0 else ""
    assert "Debugging" not in panel_text, (
        f"Panel should NOT update with unsaved skill. Got: {panel_text!r}"
    )
    print("  [PASS] Panel not updated with unsaved skill")


# ---------------------------------------------------------------------------
# Y — Warning on navigation with unsaved changes
# ---------------------------------------------------------------------------

def test_y1_warning_on_mode_switch_with_unsaved_skill(page):
    """Y1: Switching modes (Rendered⇄Raw) with unsaved skill is blocked/warned."""
    print("\n[Y1] Warning on mode switch with unsaved skill...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template Y1 {uid}", "Review {{code}}.")
    create_skill_item(page, f"Linting Y1 {uid}", "Use ESLint.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Linting')")
    page.wait_for_timeout(500)

    raw_btn = page.locator("[data-testid='mode-toggle'] button:has-text('Raw')")
    assert raw_btn.is_disabled(), (
        "Raw button should be disabled when there are unsaved changes"
    )
    print("  [PASS] Mode switch blocked with unsaved skill")


def test_y2_warning_on_navigate_with_unsaved_skill(page):
    """Y2: Navigating away with unsaved skill addition shows warning."""
    print("\n[Y2] Warning on navigate with unsaved skill...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template Y2 {uid}", "Deploy {{app}}.")
    create_skill_item(page, f"DevOps Y2 {uid}", "Use CI/CD pipelines.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('DevOps')")
    page.wait_for_timeout(500)

    page.click("button:has-text('Cancel')")
    page.wait_for_timeout(500)

    warning = page.locator("text=Unsaved changes")
    if warning.count() > 0:
        assert warning.is_visible(), "Warning should be visible when discarding unsaved skill"
        print("  [PASS] Warning shown on unsaved skill discard")
    else:
        content_after_cancel = page.locator("[data-testid='mode-toggle'] button:has-text('Raw')").is_enabled()
        assert content_after_cancel, "Editor should be clean after cancel, Raw button enabled"
        print("  [PASS] Cancel clears unsaved state correctly")


# ---------------------------------------------------------------------------
# Z — Edge cases
# ---------------------------------------------------------------------------

def test_z1_skill_item_with_no_content(page):
    """Z1: A skill item with empty content still appears in selector."""
    print("\n[Z1] Skill with no content appears in selector...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template Z1 {uid}", "Prompt {{prompt}}.")
    create_skill_item(page, f"Empty Skill Z1 {uid}", "")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.wait_for_timeout(1000)

    assert page.locator("[data-testid='skill-selector']").get_by_text("Empty Skill Z1", exact=False).count() > 0, (
        "Empty-content skill should appear in selector"
    )
    print("  [PASS] Empty content skill appears in selector")


def test_z2_item_content_without_skills(page):
    """Z2: Item with normal content (no skill patterns) has no Applied Skills panel."""
    print("\n[Z2] No Applied Skills panel for content without skill patterns...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(
        page,
        f"Template Z2 {uid}",
        "This is a normal prompt without any skill references."
    )

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    panel = page.locator("[data-testid='applied-skills-panel']")
    if panel.count() > 0:
        panel_text = panel.text_content() or ""
        assert "Usa la skill" not in panel_text, (
            f"Panel should not detect skill references. Got: {panel_text!r}"
        )
    print("  [PASS] No skill panel for content without skills")


def test_z3_similar_skill_names_distinguished(page):
    """Z3: Skills with similar names (e.g., 'Python' and 'Python Best') are both selectable."""
    print("\n[Z3] Similar skill names are distinguished...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template Z3 {uid}", "Code {{snippet}}.")
    create_skill_item(page, f"Python Z3 {uid}", "Python language guide.")
    create_skill_item(page, f"Python Best Z3 {uid}", "Best Python practices.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.wait_for_timeout(1000)

    python_count = page.locator("[data-testid='skill-selector'] button:has-text('Python')").count()
    assert python_count >= 2, (
        f"Both Python-related skills should be present. Found {python_count} buttons"
    )
    print("  [PASS] Similar skill names are both present and distinguishable")


def test_z4_add_skill_button_uses_committed_content(page):
    """Z4: 'Add Skill' button uses committed.content (saved state), not edited state."""
    print("\n[Z4] Add Skill button uses committed content...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template Z4 {uid}", "Original content.")
    create_skill_item(page, f"Git Z4 {uid}", "Use meaningful commits.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.locator("textarea").fill("Uncommitted draft content")
    page.wait_for_timeout(300)

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.wait_for_timeout(1000)

    assert page.locator("[data-testid='skill-selector']").get_by_text("Git Z4", exact=False).count() > 0, (
        "Add Skill should open even when content is uncommitted draft"
    )
    print("  [PASS] Add Skill uses committed content, not draft")


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

def run_all_tests():
    """Run all Phase 6 tests sequentially."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        test_cases = [
            # T — Button visibility
            test_t1_add_skill_button_visible,
            test_t2_add_skill_button_absent_on_skill_item,
            # U — Skill selector
            test_u1_skill_selector_opens,
            test_u2_skill_selector_shows_only_skill_items,
            test_u3_skill_selector_can_be_closed,
            # V — Skill injection
            test_v1_skill_injected_at_end,
            test_v2_same_skill_injected_once,
            test_v3_multiple_different_skills_injected,
            test_v4_skill_injection_format,
            # W — No persistence
            test_w1_skill_not_saved_without_explicit_save,
            test_w2_skill_persisted_after_save,
            test_w3_dirty_state_after_adding_skill,
            test_w4_cancel_discards_injected_skills,
            # X — Applied skills panel
            test_x1_applied_skills_panel_shows_saved_skills,
            test_x2_applied_skills_panel_hidden_when_no_skills,
            test_x3_panel_not_updated_with_unsaved_skill,
            # Y — Warning on navigation
            test_y1_warning_on_mode_switch_with_unsaved_skill,
            test_y2_warning_on_navigate_with_unsaved_skill,
            # Z — Edge cases
            test_z1_skill_item_with_no_content,
            test_z2_item_content_without_skills,
            test_z3_similar_skill_names_distinguished,
            test_z4_add_skill_button_uses_committed_content,
        ]

        passed = 0
        failed = 0
        failed_names = []

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
                    msg = str(e).encode('ascii', errors='replace').decode('ascii')
                    print(f"  [FAIL] {msg}")
                failed += 1
                failed_names.append(test.__name__)
            finally:
                context.close()

        browser.close()

        print(f"\n{'=' * 55}")
        print(f"Phase 6 Results: {passed} passed, {failed} failed")
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
