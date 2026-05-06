"""
Test suite for Sakura Prompt Studio - Phase 7
Tests: Assign Agent button, agent selector, agent injection, agent badge,
       persistence, replacement, detection (lib/agent.ts), dirty state, edge cases.

TDD: these tests are written BEFORE the feature is implemented.
They should fail (red phase) until the Agent Assigner feature is built.

Agent marker format (injected at START of content):
    Actúa como el agente «Agent Name» para este desarrollo.

Separator «» (guillemets U+00AB/U+00BB) chosen because they survive the
markdown → Tiptap → Turndown round-trip. Brackets [/] get escaped to \[/\]
by Turndown and would silently break detection after any rendered-mode edit.
"""

import os
import re
import time
import uuid
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

AGENT_MARKER_RE = re.compile(r"Actúa como el agente «(.+?)» para este desarrollo\.")


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


def create_agent_item(page, title: str, content: str = "Agent system prompt here.") -> str:
    """Create an item with category=agente and return its URL."""
    return create_item_with_content(page, title, content, category="agente")


def get_raw_content(page) -> str:
    """Switch to Raw mode and return the current textarea content."""
    raw_btn = page.locator("[data-testid='mode-toggle'] button:has-text('Raw')")
    if raw_btn.count() > 0 and not raw_btn.is_disabled():
        raw_btn.click()
        page.wait_for_selector("textarea", timeout=3000)
    return page.locator("textarea").input_value()


# ---------------------------------------------------------------------------
# A — "Assign Agent" button visibility
# ---------------------------------------------------------------------------

def test_a1_assign_agent_button_visible_on_template(page):
    """A1: 'Assign Agent' button is visible on a template item view."""
    print("\n[A1] 'Assign Agent' button visible on template item view...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template A1 {uid}", "Build a plan for {{project}}.")

    btn = page.locator("button:has-text('Assign Agent')")
    assert btn.count() > 0, "'Assign Agent' button not found on template item"
    assert btn.is_visible(), "'Assign Agent' button is not visible"
    print("  [PASS] 'Assign Agent' button is visible on template")


def test_a2_assign_agent_button_absent_on_agent_item(page):
    """A2: 'Assign Agent' button is NOT shown on an item that IS an agent."""
    print("\n[A2] 'Assign Agent' absent on agent-category item...")
    uid = str(uuid.uuid4())[:6]
    create_agent_item(page, f"Agent A2 {uid}", "You are a specialized agent.")

    btn = page.locator("button:has-text('Assign Agent')")
    assert btn.count() == 0, "'Assign Agent' should not appear on an agent-type item"
    print("  [PASS] 'Assign Agent' absent on agent items")


def test_a3_assign_agent_button_is_separate_from_add_skill(page):
    """A3: 'Assign Agent' and 'Add Skill' are separate, independent buttons."""
    print("\n[A3] 'Assign Agent' and 'Add Skill' are separate buttons...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template A3 {uid}", "Write tests for {{module}}.")

    assign_btn = page.locator("button:has-text('Assign Agent')")
    skill_btn = page.locator("button:has-text('Add Skill')")

    assert assign_btn.count() > 0, "'Assign Agent' button not found"
    assert skill_btn.count() > 0, "'Add Skill' button not found"
    assert assign_btn.get_attribute("id") != skill_btn.get_attribute("id"), (
        "Buttons should be distinct elements"
    )
    print("  [PASS] Both buttons exist and are separate")


# ---------------------------------------------------------------------------
# B — Agent selector
# ---------------------------------------------------------------------------

def test_b1_agent_selector_opens(page):
    """B1: Clicking 'Assign Agent' opens the agent selector."""
    print("\n[B1] Agent selector opens on button click...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template B1 {uid}", "Review {{code}}.")

    page.click("button:has-text('Assign Agent')")
    selector = page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    assert selector is not None, "Agent selector did not appear"
    assert selector.is_visible(), "Agent selector is not visible"
    print("  [PASS] Agent selector opens")


def test_b2_agent_selector_shows_only_agent_items(page):
    """B2: Selector only shows items with category='agente', not templates or skills."""
    print("\n[B2] Agent selector shows only agente items...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template B2 {uid}", "Prompt content.")
    create_agent_item(page, f"Senior Dev Agent B2 {uid}", "You are a senior developer.")
    create_agent_item(page, f"QA Agent B2 {uid}", "You are a QA engineer.")
    create_item_with_content(page, f"Skill B2 {uid}", "A skill.", category="skill")

    page.goto(f"{BASE_URL}/items/new")
    page.wait_for_load_state("networkidle")
    page.fill("input[name='title']", f"Target B2 {uid}")
    page.select_option("select[name='category']", "template")
    page.click("button[type='submit']")
    time.sleep(5)
    page.goto(page.evaluate("window.location.href"))
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.wait_for_timeout(1000)

    agent_names = ["Senior Dev Agent", "QA Agent"]
    for name in agent_names:
        assert page.locator("[data-testid='agent-selector']").get_by_text(name, exact=False).count() > 0, (
            f"Agent '{name}' not found in selector"
        )

    for non_agent in ["Template B2", "Skill B2"]:
        assert page.locator("[data-testid='agent-selector']").get_by_text(non_agent, exact=False).count() == 0, (
            f"Non-agent item '{non_agent}' should not appear in agent selector"
        )
    print("  [PASS] Selector shows only agente items")


def test_b3_agent_selector_can_be_closed(page):
    """B3: Agent selector can be closed with a close button (aria-label='Close')."""
    print("\n[B3] Agent selector can be closed...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Template B3 {uid}", "Build {{feature}}.")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)

    close_btn = page.locator("[data-testid='agent-selector'] button[aria-label='Close']")
    assert close_btn.count() > 0, "Agent selector must have a close button with aria-label='Close'"
    close_btn.click()
    page.wait_for_selector("[data-testid='agent-selector']", state="detached", timeout=2000)
    assert page.locator("[data-testid='agent-selector']").count() == 0
    print("  [PASS] Agent selector closes correctly")


# ---------------------------------------------------------------------------
# C — Agent injection into editor
# ---------------------------------------------------------------------------

def test_c1_agent_injected_at_start_of_content(page):
    """C1: Selecting an agent injects 'Actúa como el agente «Name»...' at the START of content."""
    print("\n[C1] Agent marker injected at START of content...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(
        page, f"Template C1 {uid}", "Generate a report for {{project}}."
    )
    create_agent_item(page, f"Report Agent C1 {uid}", "You specialize in reports.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Report Agent C1')")
    page.wait_for_timeout(800)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    content = get_raw_content(page)

    assert content.startswith("Actúa como el agente «"), (
        f"Content should start with agent marker. Got: {content[:80]!r}"
    )
    assert "Report Agent C1" in content, (
        f"Agent name should be in marker. Got: {content[:80]!r}"
    )
    assert "Generate a report" in content, (
        f"Original content should be preserved after marker. Got: {content!r}"
    )
    print("  [PASS] Agent marker injected at start of content")


def test_c2_agent_marker_format(page):
    """C2: Injected agent marker follows exact format 'Actúa como el agente «Name» para este desarrollo.'"""
    print("\n[C2] Agent marker format is correct...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template C2 {uid}", "Explain {{topic}}.")
    create_agent_item(page, f"Python Expert C2 {uid}", "You are a Python expert.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Python Expert C2 {uid}')")
    page.wait_for_timeout(800)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    content = get_raw_content(page)

    match = AGENT_MARKER_RE.search(content)
    assert match is not None, (
        f"Expected 'Actúa como el agente «Name» para este desarrollo.' pattern. Got: {content[:80]!r}"
    )
    assert match.group(1) == f"Python Expert C2 {uid}", (
        f"Extracted name mismatch. Got: {match.group(1)!r}"
    )
    print("  [PASS] Agent marker format is correct")


def test_c3_agent_not_saved_without_explicit_save(page):
    """C3: Assigning an agent does NOT persist without clicking Save."""
    print("\n[C3] Agent injection not persisted without Save...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template C3 {uid}", "Plan {{goal}}.")
    create_agent_item(page, f"Planner C3 {uid}", "You plan projects.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Planner C3')")
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")
    content = get_raw_content(page)

    assert "Actúa como el agente «" not in content, (
        f"Agent marker should NOT persist after reload without Save. Got: {content!r}"
    )
    print("  [PASS] Agent not persisted without Save")


# ---------------------------------------------------------------------------
# D — Agent badge in UI
# ---------------------------------------------------------------------------

def test_d1_agent_badge_shows_assigned_agent(page):
    """D1: 'Agente asignado' badge shows the correct agent name from SAVED content."""
    print("\n[D1] Agent badge shows saved agent name...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template D1 {uid}", "Build {{app}}.")
    create_agent_item(page, f"App Builder D1 {uid}", "You build web apps.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('App Builder D1')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    assert badge.count() > 0, "'Agente asignado' badge not found"
    assert badge.is_visible(), "Badge is not visible"
    assert badge.get_by_text("App Builder D1", exact=False).count() > 0, (
        f"Agent name not shown in badge. Badge text: {badge.text_content()!r}"
    )
    print("  [PASS] Agent badge shows correct name")


def test_d2_badge_shows_no_agent_when_none_assigned(page):
    """D2: Badge shows 'Sin agente asignado' when no agent is in saved content."""
    print("\n[D2] Badge shows 'Sin agente asignado' when no agent assigned...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(
        page, f"Template D2 {uid}", "Plain content without any agent."
    )

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    assert badge.count() > 0, "Badge element should always be present"
    badge_text = badge.text_content() or ""
    assert "Sin agente" in badge_text or "No agent" in badge_text.lower(), (
        f"Badge should say 'Sin agente asignado' when empty. Got: {badge_text!r}"
    )
    print("  [PASS] Badge shows 'Sin agente asignado'")


def test_d3_badge_not_updated_with_unsaved_agent(page):
    """D3: Badge does NOT update to reflect an assigned-but-unsaved agent."""
    print("\n[D3] Badge not updated with unsaved agent...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template D3 {uid}", "Analyze {{data}}.")
    create_agent_item(page, f"Analyst D3 {uid}", "You analyze data.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    badge_before = page.locator("[data-testid='assigned-agent-badge']").text_content() or ""

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Analyst D3')")
    page.wait_for_timeout(500)

    badge_after = page.locator("[data-testid='assigned-agent-badge']").text_content() or ""
    assert "Analyst D3" not in badge_after, (
        f"Badge should NOT show unsaved agent. Got: {badge_after!r}"
    )
    assert badge_before == badge_after or "Sin agente" in badge_after, (
        f"Badge should not change before Save. Was: {badge_before!r}, Now: {badge_after!r}"
    )
    print("  [PASS] Badge not updated with unsaved agent")


def test_d4_badge_shows_pending_removal_after_unassign(page):
    """D4: After clicking Remove (unsaved), badge shows agent name with pending-removal indicator."""
    print("\n[D4] Badge shows pending removal after unassign...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template D4 {uid}", "Do the task.")
    create_agent_item(page, f"Removable D4 {uid}", "To be removed.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Removable D4')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    remove_btn = page.locator("[data-testid='unassign-agent-btn']")
    assert remove_btn.count() > 0, "Remove button must be visible when a committed agent exists"
    remove_btn.click()
    page.wait_for_timeout(500)

    badge = page.locator("[data-testid='assigned-agent-badge']")
    badge_text = badge.text_content() or ""
    assert "removing" in badge_text.lower() or "line-through" in (badge.get_attribute("style") or ""), (
        f"Badge should indicate pending removal. Got: {badge_text!r}"
    )
    print("  [PASS] Badge shows pending removal after unassign")


# ---------------------------------------------------------------------------
# E — Persistence (save + reload)
# ---------------------------------------------------------------------------

def test_e1_agent_persists_after_save_and_reload(page):
    """E1: Assigned agent persists after Save and full page reload."""
    print("\n[E1] Agent persists after Save and reload...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template E1 {uid}", "Refactor {{module}}.")
    create_agent_item(page, f"Refactor Agent E1 {uid}", "You refactor code.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Refactor Agent E1')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    content = get_raw_content(page)

    assert "Actúa como el agente «" in content, "Agent marker should persist after Save and reload"
    assert "Refactor Agent E1" in content, "Agent name should persist in content"

    badge = page.locator("[data-testid='assigned-agent-badge']")
    assert badge.get_by_text("Refactor Agent E1", exact=False).count() > 0, (
        "Badge should still show agent name after reload"
    )
    print("  [PASS] Agent persists after Save and reload")


def test_e2_version_created_on_agent_save(page):
    """E2: Saving with an agent creates a new version entry."""
    print("\n[E2] Save with agent creates a new version...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template E2 {uid}", "Deploy {{service}}.")
    create_agent_item(page, f"DevOps Agent E2 {uid}", "You handle deployments.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('DevOps Agent E2')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.click("button:has-text('History')")
    page.wait_for_selector("[data-testid='version-history']", timeout=5000)

    version_entries = page.locator("[data-testid='version-entry']")
    assert version_entries.count() >= 1, (
        "At least one version entry should exist after saving with agent"
    )
    print("  [PASS] Version created on agent save")


def test_e3_version_restore_removes_agent(page):
    """E3: Restoring a version without an agent removes the agent from the badge."""
    print("\n[E3] Version restore removes agent...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template E3 {uid}", "Do the task.")
    create_agent_item(page, f"Agent E3 {uid}", "Agent content.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Agent E3 {uid}')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    assert badge.get_by_text(f"Agent E3 {uid}", exact=False).count() > 0, (
        "Badge should show agent before restore"
    )

    page.click("button:has-text('History')")
    page.wait_for_selector("[data-testid='version-history']", timeout=5000)
    page.wait_for_timeout(500)

    version_entries = page.locator("[data-testid='version-entry']")
    assert version_entries.count() >= 1, "At least one version should exist"

    restore_btns = page.locator("[data-testid='version-entry'] button:has-text('Restore')")
    assert restore_btns.count() >= 2, f"At least two versions should exist (original + agent-assigned), got {restore_btns.count()}"
    restore_btns.last.click()
    page.wait_for_selector("text=Saved", timeout=15000)
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge_text = page.locator("[data-testid='assigned-agent-badge']").text_content() or ""
    assert f"Agent E3 {uid}" not in badge_text, (
        f"Agent should be removed after restoring version without agent. Got: {badge_text!r}"
    )
    print("  [PASS] Version restore removes agent")


def test_e4_version_restore_changes_agent(page):
    """E4: Restoring a version with a different agent updates the badge to show the old agent."""
    print("\n[E4] Version restore changes agent...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template E4 {uid}", "Do the task.")
    create_agent_item(page, f"Agent Alpha E4 {uid}", "First agent.")
    create_agent_item(page, f"Agent Beta E4 {uid}", "Second agent.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Agent Alpha E4 {uid}')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Agent Beta E4 {uid}')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    assert badge.get_by_text(f"Agent Beta E4 {uid}", exact=False).count() > 0, (
        "Badge should show Beta before restore"
    )

    page.click("button:has-text('History')")
    page.wait_for_selector("[data-testid='version-history']", timeout=5000)
    page.wait_for_timeout(500)

    restore_btns = page.locator("[data-testid='version-entry'] button:has-text('Restore')")
    assert restore_btns.count() >= 3, f"At least three versions should exist (original + alpha + beta), got {restore_btns.count()}"
    restore_btns.nth(1).click()
    page.wait_for_selector("text=Saved", timeout=15000)
    page.wait_for_timeout(500)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge_text = page.locator("[data-testid='assigned-agent-badge']").text_content() or ""
    assert f"Agent Alpha E4 {uid}" in badge_text, (
        f"Badge should show Alpha after restoring first version. Got: {badge_text!r}"
    )
    assert f"Agent Beta E4 {uid}" not in badge_text, (
        f"Badge should not show Beta after restore. Got: {badge_text!r}"
    )
    print("  [PASS] Version restore changes agent")


# ---------------------------------------------------------------------------
# F — Agent replacement (only 1 at a time)
# ---------------------------------------------------------------------------

def test_f1_second_agent_replaces_first(page):
    """F1: Selecting a second agent replaces the first — only 1 agent marker in content."""
    print("\n[F1] Second agent replaces first agent...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template F1 {uid}", "Build {{feature}}.")
    create_agent_item(page, f"Agent Alpha F1 {uid}", "Agent alpha.")
    create_agent_item(page, f"Agent Beta F1 {uid}", "Agent beta.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Agent Alpha F1')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Agent Beta F1')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    content = get_raw_content(page)

    markers = AGENT_MARKER_RE.findall(content)
    assert len(markers) == 1, (
        f"Exactly 1 agent marker expected after replacement. Found {len(markers)} in: {content!r}"
    )
    assert "Agent Beta F1" in markers[0], (
        f"Second agent should be present. Got: {markers[0]!r}"
    )
    assert "Agent Alpha F1" not in content, (
        f"First agent should be removed after replacement. Got: {content!r}"
    )
    print("  [PASS] Second agent correctly replaces first")


def test_f2_only_one_agent_marker_ever_present(page):
    """F2: Content never contains more than one AGENT marker, even after multiple assignments."""
    print("\n[F2] Never more than 1 agent marker in content...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template F2 {uid}", "Review {{system}}.")
    create_agent_item(page, f"Agent One F2 {uid}", "First agent.")
    create_agent_item(page, f"Agent Two F2 {uid}", "Second agent.")
    create_agent_item(page, f"Agent Three F2 {uid}", "Third agent.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    for agent_name in [f"Agent One F2 {uid}", f"Agent Two F2 {uid}", f"Agent Three F2 {uid}"]:
        page.click("button:has-text('Assign Agent')")
        page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
        page.click(f"[data-testid='agent-selector'] button:has-text('{agent_name}')")
        page.wait_for_timeout(500)
        click_save_btn(page)
        page.wait_for_selector("text=Saved", timeout=15000)
        page.reload()
        page.wait_for_load_state("networkidle")

    content = get_raw_content(page)
    markers = AGENT_MARKER_RE.findall(content)
    assert len(markers) == 1, (
        f"Exactly 1 agent marker expected. Found {len(markers)}: {markers!r}"
    )
    assert "Agent Three F2" in markers[0], (
        f"Last assigned agent should be the current one. Got: {markers[0]!r}"
    )
    print("  [PASS] Only 1 agent marker present after multiple assignments")


def test_f3_current_agent_shown_as_selected_in_selector(page):
    """F3: When opening the selector, the currently assigned agent is visually marked."""
    print("\n[F3] Currently assigned agent shown as selected in selector...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template F3 {uid}", "Write {{doc}}.")
    create_agent_item(page, f"Writer Agent F3 {uid}", "You write documentation.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Writer Agent F3 {uid}')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.wait_for_timeout(800)

    current_agent_btn = page.locator(
        f"[data-testid='agent-selector'] button:has-text('Writer Agent F3 {uid}')"
    )
    assert current_agent_btn.count() > 0, "Current agent should appear in selector"

    is_marked = current_agent_btn.get_attribute("aria-current") == "true"
    assert is_marked, (
        "Currently assigned agent should have aria-current='true' in the selector"
    )
    print("  [PASS] Current agent visually marked in selector")


# ---------------------------------------------------------------------------
# G — Detection (lib/agent.ts behavior via UI)
# ---------------------------------------------------------------------------

def test_g1_agent_detected_from_saved_content(page):
    """G1: Agent is detected from saved content on page load (lib/agent.ts detection)."""
    print("\n[G1] Agent detected from saved content...")
    uid = str(uuid.uuid4())[:6]
    raw_content = f"Actúa como el agente «Injected Agent G1 {uid}» para este desarrollo.\n\nDo the task."
    template_url = create_item_with_content(page, f"Template G1 {uid}", raw_content)

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    assert badge.count() > 0, "Badge should be present"
    assert badge.get_by_text(f"Injected Agent G1 {uid}", exact=False).count() > 0, (
        f"Agent name should be detected from saved content. Badge: {badge.text_content()!r}"
    )
    print("  [PASS] Agent detected from saved content")


def test_g2_no_agent_detected_without_marker(page):
    """G2: No agent is detected when content has no AGENT marker."""
    print("\n[G2] No agent detected without marker in content...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(
        page, f"Template G2 {uid}", "Just plain content. No agent marker here."
    )

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    badge_text = badge.text_content() if badge.count() > 0 else ""
    assert "Sin agente" in badge_text or "No agent" in badge_text.lower() or badge_text.strip() == "", (
        f"No agent should be detected from plain content. Badge: {badge_text!r}"
    )
    print("  [PASS] No agent detected from plain content")


def test_g3_agent_not_detected_after_marker_manually_removed(page):
    """G3: If user manually removes the marker from raw content and saves, no agent is shown."""
    print("\n[G3] Agent not detected after marker manually removed...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(
        page,
        f"Template G3 {uid}",
        f"Actúa como el agente «Old Agent G3 {uid}» para este desarrollo.\n\nOriginal task."
    )

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Raw')")
    page.wait_for_selector("textarea", timeout=3000)

    page.evaluate("""() => {
        const ta = document.querySelector('textarea');
        if (ta) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            nativeSetter.call(ta, 'Content with agent manually removed.');
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }""")
    page.wait_for_timeout(300)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    badge_text = badge.text_content() if badge.count() > 0 else ""
    assert "Old Agent G3" not in badge_text, (
        f"Removed agent should not show in badge. Got: {badge_text!r}"
    )
    assert "Sin agente" in badge_text or "No agent" in badge_text.lower() or badge_text.strip() == "", (
        f"Badge should show 'Sin agente' after marker manually removed. Got: {badge_text!r}"
    )
    print("  [PASS] Removed agent marker not detected after save")


# ---------------------------------------------------------------------------
# H — Dirty state
# ---------------------------------------------------------------------------

def test_h1_dirty_state_after_assigning_agent(page):
    """H1: Assigning an agent marks the item as having unsaved changes."""
    print("\n[H1] Dirty state after assigning agent...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template H1 {uid}", "Analyze {{data}}.")
    create_agent_item(page, f"Analyst H1 {uid}", "Data analyst.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Analyst H1')")
    page.wait_for_timeout(500)

    warning = page.locator("text=Unsaved changes")
    assert warning.count() > 0, "'Unsaved changes' warning should appear after assigning agent"

    save_btn = page.locator("button:has-text('Save')")
    assert save_btn.count() > 0, "Save button should be enabled when dirty"
    print("  [PASS] Dirty state active after assigning agent")


def test_h2_cancel_discards_unsaved_agent(page):
    """H2: Clicking Cancel discards the unsaved agent assignment."""
    print("\n[H2] Cancel discards unsaved agent assignment...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template H2 {uid}", "Review {{code}}.")
    create_agent_item(page, f"Reviewer H2 {uid}", "Code reviewer.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Reviewer H2')")
    page.wait_for_timeout(500)

    cancel_btn = page.locator("button:has-text('Cancel')")
    assert cancel_btn.count() > 0, "Cancel button should be visible when dirty"
    cancel_btn.click()
    page.wait_for_timeout(500)

    content = get_raw_content(page)
    assert "Actúa como el agente «" not in content, (
        f"Agent marker should be discarded after Cancel. Got: {content!r}"
    )
    print("  [PASS] Cancel discards unsaved agent")


def test_h3_mode_switch_blocked_with_unsaved_agent(page):
    """H3: Switching between Rendered/Raw modes is blocked when agent is unsaved."""
    print("\n[H3] Mode switch blocked with unsaved agent...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template H3 {uid}", "Code {{snippet}}.")
    create_agent_item(page, f"Coder H3 {uid}", "Coding assistant.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Coder H3')")
    page.wait_for_timeout(500)

    raw_btn = page.locator("[data-testid='mode-toggle'] button:has-text('Raw')")
    assert raw_btn.is_disabled(), (
        "Raw toggle should be disabled when there are unsaved agent changes"
    )
    print("  [PASS] Mode switch blocked with unsaved agent")


# ---------------------------------------------------------------------------
# I — Edge cases
# ---------------------------------------------------------------------------

def test_i1_multiple_markers_in_content_uses_first(page):
    """I1: If content somehow has multiple AGENT markers (bad state), UI uses only the first."""
    print("\n[I1] Multiple markers in content — UI uses first one...")
    uid = str(uuid.uuid4())[:6]
    malformed = (
        f"Actúa como el agente «First Agent I1 {uid}» para este desarrollo.\n\nDo the task.\n\n"
        f"Actúa como el agente «Second Agent I1 {uid}» para este desarrollo.\n\nExtra marker."
    )
    template_url = create_item_with_content(page, f"Template I1 {uid}", malformed)

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    badge_text = badge.text_content() if badge.count() > 0 else ""
    assert f"First Agent I1 {uid}" in badge_text, (
        f"UI should use the FIRST marker. Badge: {badge_text!r}"
    )
    assert f"Second Agent I1 {uid}" not in badge_text, (
        f"Second marker should not appear in badge. Badge: {badge_text!r}"
    )
    print("  [PASS] Multiple markers — first one used")


def test_i2_assigning_agent_fixes_multiple_markers(page):
    """I2: Assigning a new agent via UI replaces ALL existing markers with exactly one."""
    print("\n[I2] Assigning agent fixes multiple-marker bad state...")
    uid = str(uuid.uuid4())[:6]
    malformed = (
        f"Actúa como el agente «Old One I2 {uid}» para este desarrollo.\n\nContent.\n\n"
        f"Actúa como el agente «Old Two I2 {uid}» para este desarrollo.\n\nMore content."
    )
    template_url = create_item_with_content(page, f"Template I2 {uid}", malformed)
    create_agent_item(page, f"Clean Agent I2 {uid}", "Clean state agent.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Clean Agent I2 {uid}')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    content = get_raw_content(page)

    markers = AGENT_MARKER_RE.findall(content)
    assert len(markers) == 1, (
        f"Should have exactly 1 marker after assignment. Found {len(markers)}: {markers!r}"
    )
    assert f"Clean Agent I2 {uid}" in markers[0], (
        f"New agent should be the only marker. Got: {markers[0]!r}"
    )
    print("  [PASS] Multiple markers fixed to exactly 1 after reassignment")


def test_i3_rapid_agent_changes_result_in_last_selected(page):
    """I3: Rapidly changing agents in the selector results in only the last one being set."""
    print("\n[I3] Rapid agent changes — last selection wins...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template I3 {uid}", "Quick {{task}}.")
    create_agent_item(page, f"Fast Alpha I3 {uid}", "First fast agent.")
    create_agent_item(page, f"Fast Beta I3 {uid}", "Second fast agent.")
    create_agent_item(page, f"Fast Gamma I3 {uid}", "Third fast agent.")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    for agent_name in [f"Fast Alpha I3 {uid}", f"Fast Beta I3 {uid}"]:
        page.click("button:has-text('Assign Agent')")
        page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
        page.click(f"[data-testid='agent-selector'] button:has-text('{agent_name}')")
        page.wait_for_timeout(200)

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Fast Gamma I3 {uid}')")
    page.wait_for_timeout(500)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")
    content = get_raw_content(page)

    markers = AGENT_MARKER_RE.findall(content)
    assert len(markers) == 1, (
        f"Exactly 1 marker expected after rapid changes. Found {len(markers)}: {markers!r}"
    )
    assert f"Fast Gamma I3 {uid}" in markers[0], (
        f"Last assigned agent should win. Got: {markers[0]!r}"
    )
    print("  [PASS] Last agent selection wins after rapid changes")


def test_i4_assign_agent_button_absent_on_skill_item(page):
    """I4: 'Assign Agent' button is NOT shown on a skill-category item."""
    print("\n[I4] 'Assign Agent' absent on skill item...")
    uid = str(uuid.uuid4())[:6]
    create_item_with_content(page, f"Skill I4 {uid}", "Skill content.", category="skill")

    btn = page.locator("button:has-text('Assign Agent')")
    assert btn.count() == 0, "'Assign Agent' should not appear on skill items"
    print("  [PASS] 'Assign Agent' absent on skill items")


def test_i5_agent_badge_and_skill_panel_coexist(page):
    """I5: Agent badge and Applied Skills panel can coexist on the same item."""
    print("\n[I5] Agent badge and Skills panel coexist...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template I5 {uid}", "Do {{task}}.")
    create_agent_item(page, f"Combo Agent I5 {uid}", "Combined agent.")
    create_item_with_content(page, f"Combo Skill I5 {uid}", "Skill content.", category="skill")

    page.goto(template_url)
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Combo Agent I5')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    page.click("button:has-text('Add Skill')")
    page.wait_for_selector("[data-testid='skill-selector']", timeout=5000)
    page.click(f"[data-testid='skill-selector'] button:has-text('Combo Skill I5')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    agent_badge = page.locator("[data-testid='assigned-agent-badge']")
    skills_panel = page.locator("[data-testid='applied-skills-panel']")

    assert agent_badge.count() > 0, "Agent badge should be present"
    assert agent_badge.get_by_text("Combo Agent I5", exact=False).count() > 0, (
        "Agent badge should show agent name"
    )
    assert skills_panel.count() > 0, "Skills panel should be present"
    assert skills_panel.get_by_text("Combo Skill I5", exact=False).count() > 0, (
        "Skills panel should show skill name"
    )
    print("  [PASS] Agent badge and Skills panel coexist correctly")


# ---------------------------------------------------------------------------
# J — Round-trip and unassign
# ---------------------------------------------------------------------------

def test_j1_agent_marker_survives_rendered_edit(page):
    """J1: Agent marker survives a keystroke in Rendered mode — round-trip safety."""
    print("\n[J1] Agent marker survives rendered-mode edit...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template J1 {uid}", "Do the task.")
    create_agent_item(page, f"Survivor J1 {uid}", "Survives round-trip.")

    # Assign and save
    page.goto(template_url)
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Survivor J1 {uid}')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    # Reload and edit in Rendered mode (mode switch is only blocked when dirty)
    page.reload()
    page.wait_for_load_state("networkidle")

    editor_locator = page.locator(".ProseMirror")
    assert editor_locator.count() > 0, "Rendered editor (ProseMirror) must be present"
    editor_locator.click()
    # Control+End moves to end of document, ensuring the edit lands
    # in the body paragraph — not inside the agent line at position 0.
    page.keyboard.press("Control+End")
    page.keyboard.type(" extra")
    page.wait_for_timeout(500)

    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge = page.locator("[data-testid='assigned-agent-badge']")
    badge_text = badge.text_content() or ""
    assert f"Survivor J1 {uid}" in badge_text, (
        f"Agent badge should survive rendered-mode editing. Badge: {badge_text!r}"
    )
    print("  [PASS] Agent marker survives rendered-mode round-trip")


def test_j2_unassign_agent(page):
    """J2: Clicking '× Remove' unassigns the agent from saved content."""
    print("\n[J2] Unassign agent via Remove button...")
    uid = str(uuid.uuid4())[:6]
    template_url = create_item_with_content(page, f"Template J2 {uid}", "Do the task.")
    create_agent_item(page, f"Removable J2 {uid}", "To be removed.")

    # Assign and save
    page.goto(template_url)
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Assign Agent')")
    page.wait_for_selector("[data-testid='agent-selector']", timeout=5000)
    page.click(f"[data-testid='agent-selector'] button:has-text('Removable J2 {uid}')")
    page.wait_for_timeout(500)
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    # Remove button should be visible for a committed agent
    remove_btn = page.locator("[data-testid='unassign-agent-btn']")
    assert remove_btn.count() > 0, "Remove button must be visible when a committed agent exists"
    remove_btn.click()
    page.wait_for_timeout(500)

    # Badge still shows committed agent — not yet saved
    badge_text = page.locator("[data-testid='assigned-agent-badge']").text_content() or ""
    assert f"Removable J2 {uid}" in badge_text, (
        f"Badge should still reflect committed agent before save. Got: {badge_text!r}"
    )

    # After save, agent should be gone
    click_save_btn(page)
    page.wait_for_selector("text=Saved", timeout=15000)

    page.reload()
    page.wait_for_load_state("networkidle")

    badge_text = page.locator("[data-testid='assigned-agent-badge']").text_content() or ""
    assert f"Removable J2 {uid}" not in badge_text, (
        f"Agent should be removed after save. Got: {badge_text!r}"
    )
    assert "Sin agente" in badge_text or "No agent" in badge_text.lower(), (
        f"Badge should show 'Sin agente asignado' after unassign. Got: {badge_text!r}"
    )
    print("  [PASS] Agent unassigned and removed from saved content")


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

def run_all_tests():
    """Run all Phase 7 tests sequentially."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        test_cases = [
            # A — Button visibility
            test_a1_assign_agent_button_visible_on_template,
            test_a2_assign_agent_button_absent_on_agent_item,
            test_a3_assign_agent_button_is_separate_from_add_skill,
            # B — Agent selector
            test_b1_agent_selector_opens,
            test_b2_agent_selector_shows_only_agent_items,
            test_b3_agent_selector_can_be_closed,
            # C — Agent injection
            test_c1_agent_injected_at_start_of_content,
            test_c2_agent_marker_format,
            test_c3_agent_not_saved_without_explicit_save,
            # D — Agent badge
            test_d1_agent_badge_shows_assigned_agent,
            test_d2_badge_shows_no_agent_when_none_assigned,
            test_d3_badge_not_updated_with_unsaved_agent,
            test_d4_badge_shows_pending_removal_after_unassign,
            # E — Persistence
            test_e1_agent_persists_after_save_and_reload,
            test_e2_version_created_on_agent_save,
            test_e3_version_restore_removes_agent,
            test_e4_version_restore_changes_agent,
            # F — Replacement
            test_f1_second_agent_replaces_first,
            test_f2_only_one_agent_marker_ever_present,
            test_f3_current_agent_shown_as_selected_in_selector,
            # G — Detection
            test_g1_agent_detected_from_saved_content,
            test_g2_no_agent_detected_without_marker,
            test_g3_agent_not_detected_after_marker_manually_removed,
            # H — Dirty state
            test_h1_dirty_state_after_assigning_agent,
            test_h2_cancel_discards_unsaved_agent,
            test_h3_mode_switch_blocked_with_unsaved_agent,
            # I — Edge cases
            test_i1_multiple_markers_in_content_uses_first,
            test_i2_assigning_agent_fixes_multiple_markers,
            test_i3_rapid_agent_changes_result_in_last_selected,
            test_i4_assign_agent_button_absent_on_skill_item,
            test_i5_agent_badge_and_skill_panel_coexist,
            # J — Round-trip and unassign
            test_j1_agent_marker_survives_rendered_edit,
            test_j2_unassign_agent,
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
                    msg = str(e).encode("ascii", errors="replace").decode("ascii")
                    print(f"  [FAIL] {msg}")
                failed += 1
                failed_names.append(test.__name__)
            finally:
                context.close()

        browser.close()

        print(f"\n{'=' * 55}")
        print(f"Phase 7 Results: {passed} passed, {failed} failed")
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
