"""
Test suite for Sakura Prompt Studio - Phase 5
Tests: variable engine, "Use Template" button, Drawer, copy result, no persistence

TDD: these tests are written BEFORE the feature is implemented.
They should fail (red phase) until the Drawer and variable engine are built.
"""

import os
import time
import uuid
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
MIN_VAR_LENGTH = int(os.getenv("MIN_VAR_LENGTH", "1"))
MAX_VAR_LENGTH = int(os.getenv("MAX_VAR_LENGTH", "4000"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def click_save_btn(page, timeout_ms=5000):
    """Click Save using in-browser polling to avoid Playwright navigation wait."""
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

    # Switch to Raw and save the content
    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    
    # Fill content and save using reliable approach
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
    page.evaluate("""() => {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.includes('Save') && !b.disabled);
        if (btn) btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    }""")
    
    page.wait_for_selector("text=Saved", timeout=15000)
    # Reload to ensure fresh state (Use Template button uses committed.content)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")

    return item_url


def open_drawer(page) -> None:
    """Click 'Use Template' and wait for the Drawer to appear."""
    page.wait_for_timeout(500)
    page.click("button:has-text('Use Template')", no_wait_after=True)
    page.wait_for_selector("[data-testid='variable-drawer']", timeout=5000)


# ---------------------------------------------------------------------------
# M — "Use Template" button visibility
# ---------------------------------------------------------------------------

def test_m1_use_template_visible_with_variables(page):
    """M1: 'Use Template' button is visible on an item that has variables."""
    print("\n[M1] 'Use Template' button visible when item has variables...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Template with vars {uid}",
        "Generate a plan for {{project_name}} using {{framework}}.",
    )

    btn = page.locator("button:has-text('Use Template')")
    assert btn.count() > 0, "'Use Template' button not found on item with variables"
    assert btn.is_visible(), "'Use Template' button is not visible"
    print("  [PASS] 'Use Template' visible with variables")


def test_m2_use_template_not_visible_without_variables(page):
    """M2: 'Use Template' button is NOT visible (or disabled) on item without variables."""
    print("\n[M2] 'Use Template' hidden/disabled on item without variables...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"No variables {uid}",
        "This prompt has no dynamic variables.",
    )

    btn = page.locator("button:has-text('Use Template')")
    is_absent = btn.count() == 0
    is_disabled = (not is_absent) and btn.is_disabled()
    assert is_absent or is_disabled, (
        "'Use Template' should be absent or disabled when item has no variables"
    )
    print("  [PASS] 'Use Template' absent or disabled without variables")


# ---------------------------------------------------------------------------
# N — Drawer opening
# ---------------------------------------------------------------------------

def test_n1_drawer_opens_from_right(page):
    """N1: Clicking 'Use Template' slides the Drawer in from the right."""
    print("\n[N1] Drawer opens from the right side...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Drawer test {uid}",
        "Describe {{topic}} in 3 points.",
    )

    # Drawer must not be visible before clicking
    assert page.locator("[data-testid='variable-drawer']").count() == 0, (
        "Drawer should not be visible before clicking 'Use Template'"
    )

    page.click("button:has-text('Use Template')")
    drawer = page.wait_for_selector("[data-testid='variable-drawer']", timeout=3000)
    assert drawer is not None, "Drawer did not appear after clicking 'Use Template'"

    # Verify drawer is on the right side: its left edge is in the right half of the viewport
    box = drawer.bounding_box()
    viewport_width = page.viewport_size["width"]
    assert box is not None, "Drawer has no bounding box"
    assert box["x"] > viewport_width / 2, (
        f"Drawer should be on the right side. x={box['x']}, viewport_width={viewport_width}"
    )
    print("  [PASS] Drawer appears from the right")


def test_n2_drawer_has_required_sections(page):
    """N2: Drawer contains an inputs section and the 'Copy Result' button."""
    print("\n[N2] Drawer contains inputs section and copy button...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Drawer sections {uid}",
        "Explain {{concept}} with examples in {{language}}.",
    )

    open_drawer(page)

    # Must have a container for variable inputs
    inputs_section = page.locator("[data-testid='variable-drawer'] [data-testid='variable-inputs']")
    assert inputs_section.count() > 0, "Drawer must have a 'variable-inputs' section"

    # Must have the "Copy Result" button
    copy_btn = page.locator("button:has-text('Copy Result')")
    assert copy_btn.count() > 0, "Drawer must have a 'Copy Result' button"
    print("  [PASS] Drawer structure correct")


def test_n3_drawer_can_be_closed(page):
    """N3: Drawer can be closed and disappears cleanly."""
    print("\n[N3] Drawer can be closed...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Drawer close {uid}",
        "Analyze {{data}}.",
    )

    open_drawer(page)
    assert page.locator("[data-testid='variable-drawer']").is_visible()

    # Close button (×) must exist inside the drawer
    close_btn = page.locator("[data-testid='variable-drawer'] button[aria-label='Close']")
    assert close_btn.count() > 0, "Drawer must have a close button with aria-label='Close'"
    close_btn.click()

    page.wait_for_selector("[data-testid='variable-drawer']", state="detached", timeout=2000)
    assert page.locator("[data-testid='variable-drawer']").count() == 0, (
        "Drawer should disappear after closing"
    )
    print("  [PASS] Drawer closes correctly")


# ---------------------------------------------------------------------------
# O — Variable inputs (dynamic generation)
# ---------------------------------------------------------------------------

def test_o1_single_variable_one_input(page):
    """O1: One unique variable -> exactly one input in the Drawer."""
    print("\n[O1] Single variable -> one input...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"One var {uid}",
        "Create a report about {{topic}}.",
    )

    open_drawer(page)

    inputs = page.locator("[data-testid='variable-drawer'] textarea, [data-testid='variable-drawer'] input[type='text']")
    assert inputs.count() == 1, f"Expected 1 input, found {inputs.count()}"
    print("  [PASS] One variable -> one input")


def test_o2_duplicate_variable_one_input(page):
    """O2: Same variable used twice -> only ONE input in the Drawer."""
    print("\n[O2] Duplicate variable -> one input...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Dup var {uid}",
        "The project {{name}} has name {{name}} and is ready.",
    )

    open_drawer(page)

    inputs = page.locator("[data-testid='variable-drawer'] textarea, [data-testid='variable-drawer'] input[type='text']")
    assert inputs.count() == 1, (
        f"Duplicate variable should produce only 1 input, found {inputs.count()}"
    )
    print("  [PASS] Duplicate variable -> one input only")


def test_o3_two_different_variables_two_inputs(page):
    """O3: Two different variables -> two inputs."""
    print("\n[O3] Two variables -> two inputs...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Two vars {uid}",
        "Migrate from {{current_engine}} to {{new_engine}} without downtime.",
    )

    open_drawer(page)

    inputs = page.locator("[data-testid='variable-drawer'] textarea, [data-testid='variable-drawer'] input[type='text']")
    assert inputs.count() == 2, f"Expected 2 inputs for 2 variables, found {inputs.count()}"
    print("  [PASS] Two variables -> two inputs")


def test_o4_similar_variable_names_are_separate(page):
    """O4: {{a}} and {{ab}} are treated as two distinct variables."""
    print("\n[O4] {{a}} and {{ab}} are separate variables...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Similar vars {uid}",
        "Short value: {{a}}. Extended value: {{ab}}.",
    )

    open_drawer(page)

    inputs = page.locator("[data-testid='variable-drawer'] textarea, [data-testid='variable-drawer'] input[type='text']")
    assert inputs.count() == 2, (
        f"{{a}} and {{ab}} must be treated as 2 separate inputs, found {inputs.count()}"
    )
    print("  [PASS] {{a}} and {{ab}} are separate")


def test_o5_variable_labels_match_names(page):
    """O5: Each input is labeled with the variable name (without {{ }})."""
    print("\n[O5] Input labels match variable names...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Labels {uid}",
        "Project: {{project_name}}, Environment: {{environment}}.",
    )

    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    assert drawer.locator("text=project_name").count() > 0, (
        "Label 'project_name' not found in Drawer"
    )
    assert drawer.locator("text=environment").count() > 0, (
        "Label 'environment' not found in Drawer"
    )
    print("  [PASS] Labels match variable names")


# ---------------------------------------------------------------------------
# P — Input validation (MIN_VAR_LENGTH / MAX_VAR_LENGTH)
# ---------------------------------------------------------------------------

def test_p1_empty_input_blocks_copy(page):
    """P1: Empty input disables or blocks 'Copy Result'."""
    print("\n[P1] Empty input blocks 'Copy Result'...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Empty input {uid}",
        "Analyze {{key_data}}.",
    )

    open_drawer(page)

    # Ensure the input is empty (it should be by default)
    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    inputs.first.fill("")

    copy_btn = page.locator("button:has-text('Copy Result')")
    assert copy_btn.is_disabled() or not copy_btn.is_enabled(), (
        "'Copy Result' should be disabled when input is empty"
    )
    print("  [PASS] Empty input blocks copy")


def test_p2_valid_input_enables_copy(page):
    """P2: Valid input (>= MIN_VAR_LENGTH) enables 'Copy Result'."""
    print("\n[P2] Valid input enables 'Copy Result'...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Valid input {uid}",
        "Describe {{product}}.",
    )

    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    inputs.first.fill("A" * MIN_VAR_LENGTH)

    copy_btn = page.locator("button:has-text('Copy Result')")
    assert copy_btn.is_enabled(), (
        f"'Copy Result' should be enabled with {MIN_VAR_LENGTH} character(s)"
    )
    print("  [PASS] Valid input enables copy")


def test_p3_max_length_accepted(page):
    """P3: Input of exactly MAX_VAR_LENGTH chars is accepted."""
    print(f"\n[P3] Input of {MAX_VAR_LENGTH} chars accepted...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Max length {uid}",
        "Content: {{body}}.",
    )

    open_drawer(page)

    long_value = "x" * MAX_VAR_LENGTH
    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    inputs.first.fill(long_value)

    copy_btn = page.locator("button:has-text('Copy Result')")
    assert copy_btn.is_enabled(), (
        f"'Copy Result' should be enabled at MAX_VAR_LENGTH ({MAX_VAR_LENGTH})"
    )

    # Check no error message visible at exactly MAX_VAR_LENGTH
    error = drawer.locator("[data-testid='var-error']")
    if error.count() > 0:
        assert not error.is_visible(), "No error should show at exactly MAX_VAR_LENGTH"
    print(f"  [PASS] {MAX_VAR_LENGTH} chars accepted")


def test_p4_above_max_length_blocked(page):
    """P4: Input exceeding MAX_VAR_LENGTH shows error and disables copy."""
    print(f"\n[P4] Input above {MAX_VAR_LENGTH} chars blocked...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Over max {uid}",
        "Text: {{body}}.",
    )

    open_drawer(page)

    over_limit = "x" * (MAX_VAR_LENGTH + 1)
    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    inputs.first.fill(over_limit)

    copy_btn = page.locator("button:has-text('Copy Result')")
    error = drawer.locator("[data-testid='var-error']")

    assert copy_btn.is_disabled(), (
        f"'Copy Result' must be disabled above MAX_VAR_LENGTH. Enabled={copy_btn.is_enabled()}"
    )
    assert error.count() > 0 and error.is_visible(), (
        "Error message must be visible above MAX_VAR_LENGTH"
    )
    print("  [PASS] Over max length is blocked with error")


# ---------------------------------------------------------------------------
# Q — Copy result (replacement + clipboard + feedback)
# ---------------------------------------------------------------------------

def test_q1_single_variable_replaced(page):
    """Q1: Single variable is replaced correctly in the output."""
    print("\n[Q1] Single variable replacement...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Replace single {uid}",
        "Write an article about {{topic}}.",
    )

    # Grant clipboard permissions
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    inputs.first.fill("artificial intelligence")

    page.click("button:has-text('Copy Result')")

    # Wait for feedback
    page.wait_for_selector(
        "[data-testid='copy-feedback']",
        timeout=3000
    )

    # Verify clipboard content
    clipboard_text = page.evaluate("navigator.clipboard.readText()")
    assert "artificial intelligence" in clipboard_text, (
        f"Clipboard should contain 'artificial intelligence', got: {clipboard_text!r}"
    )
    assert "{{topic}}" not in clipboard_text, (
        "Clipboard should not contain the raw placeholder {{topic}}"
    )
    print("  [PASS] Single variable replaced correctly")


def test_q2_all_occurrences_replaced(page):
    """Q2: One variable repeated twice -> both occurrences replaced by one input."""
    print("\n[Q2] All occurrences of repeated variable replaced...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Multi replace {uid}",
        "The client {{client}} requests that {{client}} be contacted.",
    )

    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    assert inputs.count() == 1, "Repeated variable must produce 1 input"
    inputs.first.fill("Acme Corp")

    page.click("button:has-text('Copy Result')")
    page.wait_for_selector(
        "[data-testid='copy-feedback']",
        timeout=3000
    )

    clipboard_text = page.evaluate("navigator.clipboard.readText()")
    assert clipboard_text.count("Acme Corp") == 2, (
        f"Both occurrences of {{client}} should be replaced. Got: {clipboard_text!r}"
    )
    assert "{{client}}" not in clipboard_text
    print("  [PASS] Both occurrences replaced by single input")


def test_q3_multiple_different_variables_replaced(page):
    """Q3: Multiple different variables -> each replaced with its own input value."""
    print("\n[Q3] Multiple variables each replaced correctly...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Multi vars replace {uid}",
        "Migrate from {{origin}} to {{destination}} in {{deadline}} days.",
    )

    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    assert inputs.count() == 3, f"Expected 3 inputs, got {inputs.count()}"

    # Fill by label — find each input next to its label
    for label_text, value in [
        ("origin", "MySQL"),
        ("destination", "Postgres"),
        ("deadline", "30"),
    ]:
        label = drawer.locator(f"label:has-text('{label_text}')")
        if label.count() > 0:
            # Standard label -> input association
            input_id = label.get_attribute("for")
            if input_id:
                drawer.locator(f"#{input_id}").fill(value)
            else:
                label.locator("xpath=following-sibling::*[self::textarea or self::input]").fill(value)
        else:
            # Fallback: fill by order if labels not found (test will still verify replacement)
            inputs.nth(["origin", "destination", "deadline"].index(label_text)).fill(value)

    page.click("button:has-text('Copy Result')")
    page.wait_for_selector(
        "[data-testid='copy-feedback']",
        timeout=3000
    )

    clipboard_text = page.evaluate("navigator.clipboard.readText()")
    assert "MySQL" in clipboard_text, f"'MySQL' not in clipboard: {clipboard_text!r}"
    assert "Postgres" in clipboard_text, f"'Postgres' not in clipboard: {clipboard_text!r}"
    assert "30" in clipboard_text, f"'30' not in clipboard: {clipboard_text!r}"
    assert "{{origin}}" not in clipboard_text
    assert "{{destination}}" not in clipboard_text
    assert "{{deadline}}" not in clipboard_text
    print("  [PASS] All variables replaced with correct values")


def test_q4_feedback_shown_after_copy(page):
    """Q4: A success feedback (toast or button state change) appears after copying."""
    print("\n[Q4] Feedback shown after successful copy...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Copy feedback {uid}",
        "Generate a summary of {{topic}}.",
    )

    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    inputs.first.fill("machine learning")

    page.click("button:has-text('Copy Result')")

    # At least one of these feedback indicators must appear
    feedback = page.locator(
        "[data-testid='copy-feedback']"
    )
    feedback.wait_for(state="visible", timeout=3000)
    assert feedback.is_visible(), "No copy feedback appeared after clicking 'Copy Result'"
    print("  [PASS] Feedback shown after copy")


# ---------------------------------------------------------------------------
# R — No persistence (Drawer is ephemeral)
# ---------------------------------------------------------------------------

def test_r1_drawer_state_lost_on_close(page):
    """R1: Filling inputs, closing Drawer, and reopening -> inputs are empty."""
    print("\n[R1] Drawer state not persisted on close...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Ephemeral {uid}",
        "Create a plan for {{objective}}.",
    )

    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    inputs.first.fill("launch the product to market")

    # Close Drawer
    close_btn = drawer.locator("button[aria-label='Close']")
    close_btn.click()
    page.wait_for_selector("[data-testid='variable-drawer']", state="detached", timeout=2000)

    # Reopen
    open_drawer(page)

    drawer2 = page.locator("[data-testid='variable-drawer']")
    inputs2 = drawer2.locator("textarea, input[type='text']")
    value_after = inputs2.first.input_value()
    assert value_after == "", (
        f"Drawer should be clean after close+reopen, but found: {value_after!r}"
    )
    print("  [PASS] Drawer state not persisted between open/close")


def test_r2_drawer_clean_after_page_reload(page):
    """R2: After page reload, Drawer opens clean (no lingering state)."""
    print("\n[R2] Drawer clean after page reload...")
    uid = str(uuid.uuid4())[:6]
    url = create_item_with_content(
        page,
        f"Reload clean {uid}",
        "Analyze {{data}}.",
    )

    open_drawer(page)
    drawer = page.locator("[data-testid='variable-drawer']")
    drawer.locator("textarea, input[type='text']").first.fill("previous value")

    # Reload without closing
    page.reload()
    page.wait_for_load_state("networkidle")

    # Drawer should not auto-open after reload
    assert page.locator("[data-testid='variable-drawer']").count() == 0, (
        "Drawer should not auto-open after page reload"
    )

    # Open fresh
    open_drawer(page)
    drawer2 = page.locator("[data-testid='variable-drawer']")
    value = drawer2.locator("textarea, input[type='text']").first.input_value()
    assert value == "", f"Drawer inputs should be empty after reload, found: {value!r}"
    print("  [PASS] Drawer clean after page reload")


# ---------------------------------------------------------------------------
# S — Edge cases
# ---------------------------------------------------------------------------

def test_s1_item_with_no_variables_has_no_drawer(page):
    """S1: An item without any {{ }} variables never shows the Drawer when 'Use Template' is absent."""
    print("\n[S1] No variables -> no Drawer accessible...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"No vars edge {uid}",
        "Prompt without dynamic variables.",
    )

    btn = page.locator("button:has-text('Use Template')")
    is_absent = btn.count() == 0
    is_disabled = (not is_absent) and btn.is_disabled()

    # If somehow the button is clickable, clicking it should NOT open the drawer
    if not is_absent and not is_disabled:
        btn.click()
        time.sleep(0.5)
        assert page.locator("[data-testid='variable-drawer']").count() == 0, (
            "Drawer must not open for items without variables"
        )
    else:
        assert is_absent or is_disabled

    assert page.locator("[data-testid='variable-drawer']").count() == 0
    print("  [PASS] No Drawer for items without variables")


def test_s2_variable_in_content_not_in_title(page):
    """S2: Variables in title are NOT detected; only content variables generate inputs."""
    print("\n[S2] Variables only from content, not from title...")
    uid = str(uuid.uuid4())[:6]
    # Title has {{this}} but content has {{real_var}}
    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    page.fill("input[name='title']", f"Template with title var {uid}")
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    real_url = page.evaluate("window.location.href")
    assert "/items/" in real_url and "/new" not in real_url
    page.goto(real_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)
    page.fill("textarea", "The result for {{real_var}} is here.")
    page.click("button:has-text('Save')", no_wait_after=True)
    page.wait_for_selector("text=Saved", timeout=5000)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")

    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    assert inputs.count() == 1, (
        f"Only content variables should generate inputs. Found {inputs.count()}"
    )

    # Verify it's 'real_var', not something from the title
    drawer_text = drawer.text_content() or ""
    assert "real_var" in drawer_text, "Input should be for 'real_var' from content"
    print("  [PASS] Only content variables generate inputs")


def test_s3_triple_braces_inner_detected(page):
    """S3: {{{triple}}} extracts the inner 'triple' as a variable.

    The regex pattern matches {{triple}} inside {{{triple}}}, so the inner
    variable name is extracted and the Drawer opens with a 'triple' input.
    """
    print("\n[S3] Triple braces behavior...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Triple braces {uid}",
        "This {{{triple}}} is not a valid variable syntax.",
    )

    btn = page.locator("button:has-text('Use Template')")
    is_absent = btn.count() == 0
    is_disabled = (not is_absent) and btn.is_disabled()

    assert not is_absent and not is_disabled, (
        "'Use Template' should be present because {{{triple}}} contains {{triple}}"
    )

    open_drawer(page)
    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    assert inputs.count() == 1, (
        f"{{{triple}}} should produce 1 input for 'triple'. Found {inputs.count()}"
    )

    assert drawer.locator("text=triple").count() > 0, "Label 'triple' not found in Drawer"
    print("  [PASS] Triple braces handled explicitly: inner 'triple' detected")


def test_s4_many_variables_all_inputs_rendered(page):
    """S4: Item with 5 unique variables produces exactly 5 inputs."""
    print("\n[S4] 5 variables -> 5 inputs in Drawer...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Five vars {uid}",
        "For {{a}}, {{b}}, {{c}}, {{d}}, {{e}}: generate a report.",
    )

    open_drawer(page)

    inputs = page.locator("[data-testid='variable-drawer'] textarea, [data-testid='variable-drawer'] input[type='text']")
    assert inputs.count() == 5, f"Expected 5 inputs for 5 variables, found {inputs.count()}"
    print("  [PASS] 5 variables -> 5 inputs")


def test_o6_whitespace_var_not_detected(page):
    """O6: {{ }} (whitespace-only) does NOT create a Drawer input."""
    print("\n[O6] Whitespace-only variable not detected...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Whitespace vars {uid}",
        "Start {{ }} and end {{}} with empty-looking variables.",
    )

    btn = page.locator("button:has-text('Use Template')")
    assert btn.count() == 0, (
        "'Use Template' should not appear when only whitespace/variable-like patterns exist"
    )
    print("  [PASS] Whitespace-only {{ }} does not trigger Use Template")


def test_o7_numeric_prefix_var_not_detected(page):
    """O7: {{3test}} (starts with digit) is NOT a valid variable."""
    print("\n[O7] Numeric prefix variable not detected...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Numeric prefix {uid}",
        "Value is {{3test}} and should not be treated as variable.",
    )

    btn = page.locator("button:has-text('Use Template')")
    is_absent = btn.count() == 0
    is_disabled = (not is_absent) and btn.is_disabled()
    assert is_absent or is_disabled, (
        "'Use Template' should not appear for {{3test}} (digit prefix)"
    )
    print("  [PASS] {{3test}} not detected as variable")


def test_o8_var_with_spaces_not_detected(page):
    """O8: {{var name}} (contains spaces) is NOT a valid variable."""
    print("\n[O8] Variable with spaces not detected...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Spaces in var {uid}",
        "Topic is {{var name}} and should not be treated as variable.",
    )

    btn = page.locator("button:has-text('Use Template')")
    is_absent = btn.count() == 0
    is_disabled = (not is_absent) and btn.is_disabled()
    assert is_absent or is_disabled, (
        "'Use Template' should not appear for {{var name}} (spaces)"
    )
    print("  [PASS] {{var name}} not detected as variable")


def test_o9_single_char_var_detected(page):
    """O9: {{a}} (single letter) IS detected as a valid variable."""
    print("\n[O9] Single char variable detected...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Single char var {uid}",
        "Letter: {{a}} is valid.",
    )

    btn = page.locator("button:has-text('Use Template')")
    assert btn.count() > 0, "'Use Template' should appear for {{a}}"
    assert btn.is_visible(), "'Use Template' should be visible"
    print("  [PASS] {{a}} detected as valid single-char variable")


def test_o10_underscore_var_detected(page):
    """O10: {{valid_name_123}} (snake_case with numbers) IS detected."""
    print("\n[O10] Snake_case variable with numbers detected...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Snake case var {uid}",
        "Use {{valid_name_123}} for this task.",
    )

    btn = page.locator("button:has-text('Use Template')")
    assert btn.count() > 0, "'Use Template' should appear for {{valid_name_123}}"
    assert btn.is_visible(), "'Use Template' should be visible"

    open_drawer(page)
    drawer = page.locator("[data-testid='variable-drawer']")
    assert drawer.locator("text=valid_name_123").count() > 0
    print("  [PASS] {{valid_name_123}} detected as valid snake_case variable")


def test_q5_whitespace_var_preserved(page):
    """Q5: {{ }} in content is preserved literally (not replaced) after copy.

    Uses a valid variable {{topic}} to open the drawer, then verifies that
    the whitespace-only {{ }} pattern is NOT substituted in the result.
    """
    print("\n[Q5] Whitespace variable preserved literally...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(
        page,
        f"Whitespace preserved {uid}",
        "Topic: {{topic}}, Token: {{ }} is empty.",
    )

    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    open_drawer(page)

    drawer = page.locator("[data-testid='variable-drawer']")
    inputs = drawer.locator("textarea, input[type='text']")
    assert inputs.count() == 1, "Only 1 valid variable should produce 1 input"

    inputs.first.fill("artificial intelligence")
    page.click("button:has-text('Copy Result')")
    page.wait_for_selector("[data-testid='copy-feedback']", timeout=3000)

    clipboard_text = page.evaluate("navigator.clipboard.readText()")
    assert "{{topic}}" not in clipboard_text, "Valid {{topic}} should be replaced"
    assert "{{ }}" in clipboard_text, (
        f"{{ }} should be preserved literally. Got: {clipboard_text!r}"
    )
    print("  [PASS] {{ }} preserved literally in copy result")


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

def run_all_tests():
    """Run all Phase 5 tests sequentially."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        test_cases = [
            # M — Button visibility
            test_m1_use_template_visible_with_variables,
            test_m2_use_template_not_visible_without_variables,
            # N — Drawer opening
            test_n1_drawer_opens_from_right,
            test_n2_drawer_has_required_sections,
            test_n3_drawer_can_be_closed,
            # O — Variable inputs
            test_o1_single_variable_one_input,
            test_o2_duplicate_variable_one_input,
            test_o3_two_different_variables_two_inputs,
            test_o4_similar_variable_names_are_separate,
            test_o5_variable_labels_match_names,
            test_o6_whitespace_var_not_detected,
            test_o7_numeric_prefix_var_not_detected,
            test_o8_var_with_spaces_not_detected,
            test_o9_single_char_var_detected,
            test_o10_underscore_var_detected,
            # P — Validation
            test_p1_empty_input_blocks_copy,
            test_p2_valid_input_enables_copy,
            test_p3_max_length_accepted,
            test_p4_above_max_length_blocked,
            # Q — Copy result
            test_q1_single_variable_replaced,
            test_q2_all_occurrences_replaced,
            test_q3_multiple_different_variables_replaced,
            test_q4_feedback_shown_after_copy,
            test_q5_whitespace_var_preserved,
            # R — No persistence
            test_r1_drawer_state_lost_on_close,
            test_r2_drawer_clean_after_page_reload,
            # S — Edge cases
            test_s1_item_with_no_variables_has_no_drawer,
            test_s2_variable_in_content_not_in_title,
            test_s3_triple_braces_inner_detected,
            test_s4_many_variables_all_inputs_rendered,
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
        print(f"Phase 5 Results: {passed} passed, {failed} failed")
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
