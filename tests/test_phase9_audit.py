"""
Phase 9 Audit Tests — Pixel Perfect Stage 1.

Static + DOM audit, no visual diff:
1. Hardcoded color scan: fail if #FFB7C5 / 255, 183, 197 appears outside globals.css or tailwind.config.ts
2. Token usage scan: fail if components use Tailwind arbitrary color values (bg-[#...], text-[#...], border-[#...])
3. Three-region contract: boot app, assert data-region attributes exist
4. Font wiring: assert body font-family includes Inter
"""

import os
import re
import pytest
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REGIONS = {
    "sidebar": '[data-region="sidebar"]',
    "gallery": '[data-region="gallery"]',
    "viewer": '[data-region="viewer"]',
    "layout-root": '[data-region="layout-root"]',
}

SCAN_DIRS = [
    os.path.join(BASE_DIR, "app"),
    os.path.join(BASE_DIR, "components"),
    os.path.join(BASE_DIR, "lib"),
    os.path.join(BASE_DIR, "tests"),
]

ALLOWED_SAKURA_FILES = {
    os.path.normpath(os.path.join(BASE_DIR, "app", "globals.css")),
    os.path.normpath(os.path.join(BASE_DIR, "tailwind.config.ts")),
    os.path.normpath(os.path.join(BASE_DIR, "tailwind.config.js")),
}

# The audit file itself references #FFB7C5 in pattern definitions (false positive)
AUDIT_FILE = os.path.normpath(os.path.abspath(__file__))
# Test helper files contain reference design values intentionally
REGIONS_HELPER = os.path.normpath(os.path.join(BASE_DIR, "tests", "visual", "helpers", "regions.ts"))
COMPARE_HELPER = os.path.normpath(os.path.join(BASE_DIR, "tests", "visual", "helpers", "compare-to-baseline.ts"))
# Visual test spec files contain sakura values intentionally for testing DOM assertions
VISUAL_SPECS_DIR = os.path.normpath(os.path.join(BASE_DIR, "tests", "visual"))

SCAN_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".css", ".py", ".html"}

SAKURA_HEX_RE = re.compile(r"#FFB7C5", re.IGNORECASE)
SAKURA_RGB_RE = re.compile(r"255,\s*183,\s*197")
ARBITRARY_COLOR_RE = re.compile(
    r"(?:bg|text|border|ring|shadow|divide|outline|placeholder|from|to|via)-\[#[0-9a-fA-F]{3,8}\]"
)
ARBITRARY_COLOR_CLASS_RE = re.compile(r"\[(?:bg|text|border|ring):#")

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

# ---------------------------------------------------------------------------
# 1. Hardcoded sakura color scan
# ---------------------------------------------------------------------------


def test_no_hardcoded_sakura_outside_globals():
    """Walk app/, components/, lib/, tests/ and fail if any file other than
    globals.css and tailwind.config.ts contains #FFB7C5 or 255, 183, 197."""
    violations = []
    exclude_dir = os.path.join(BASE_DIR, "tests", "visual", "__screenshots__")

    for scan_dir in SCAN_DIRS:
        if not os.path.isdir(scan_dir):
            continue
        for root, _dirs, files in os.walk(scan_dir):
            norm_root = os.path.normpath(root)
            if norm_root.startswith(exclude_dir):
                continue
            for fname in files:
                fpath = os.path.normpath(os.path.join(root, fname))
                _, ext = os.path.splitext(fname)
                if ext.lower() not in SCAN_EXTENSIONS:
                    continue
                if fpath in ALLOWED_SAKURA_FILES:
                    continue
                if fpath == AUDIT_FILE:
                    continue
                if fpath == REGIONS_HELPER:
                    continue
                if fpath == COMPARE_HELPER:
                    continue
                # Visual test specs contain sakura values intentionally for assertions
                if norm_root.startswith(VISUAL_SPECS_DIR):
                    continue
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                except Exception:
                    continue

                for line_no, line in enumerate(content.splitlines(), 1):
                    if SAKURA_HEX_RE.search(line):
                        violations.append(
                            f"{fpath}:{line_no}: found #FFB7C5 (hardcoded sakura hex)"
                        )
                    if SAKURA_RGB_RE.search(line):
                        violations.append(
                            f"{fpath}:{line_no}: found '255, 183, 197' (hardcoded sakura RGB)"
                        )

    error_msg = "Hardcoded sakura color violations:\n" + "\n".join(violations)
    assert len(violations) == 0, error_msg


# ---------------------------------------------------------------------------
# 2. Tailwind arbitrary color value scan
# ---------------------------------------------------------------------------


def test_no_tailwind_arbitrary_colors():
    """Fail if any component uses bg-[#...], text-[#...], border-[#...] or
    any Tailwind arbitrary color value."""
    violations = []
    arbitrary_dirs = [
        os.path.join(BASE_DIR, "app"),
        os.path.join(BASE_DIR, "components"),
    ]

    for scan_dir in arbitrary_dirs:
        if not os.path.isdir(scan_dir):
            continue
        for root, _dirs, files in os.walk(scan_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                _, ext = os.path.splitext(fname)
                if ext.lower() not in {".ts", ".tsx", ".js", ".jsx"}:
                    continue
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                except Exception:
                    continue

                for line_no, line in enumerate(content.splitlines(), 1):
                    if ARBITRARY_COLOR_RE.search(line):
                        violations.append(
                            f"{fpath}:{line_no}: found Tailwind arbitrary color value"
                        )
                    if ARBITRARY_COLOR_CLASS_RE.search(line):
                        violations.append(
                            f"{fpath}:{line_no}: found Tailwind arbitrary color class"
                        )

    error_msg = "Tailwind arbitrary color violations:\n" + "\n".join(violations)
    assert len(violations) == 0, error_msg


# ---------------------------------------------------------------------------
# 3. Three-region contract (requires running dev server)
# ---------------------------------------------------------------------------


@pytest.mark.skipif(
    os.getenv("SKIP_DOM_TESTS") == "1",
    reason="SKIP_DOM_TESTS=1 set — skipping DOM contract tests",
)
def test_data_region_attributes_exist():
    """Boot the dev server (or use a running one) and assert all data-region
    attributes from REGIONS exist on /."""
    expected_regions = {
        "sidebar": REGIONS["sidebar"],
        "gallery": REGIONS["gallery"],
        "viewer": REGIONS["viewer"],
        "layout-root": REGIONS["layout-root"],
    }

    missing = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        try:
            page.goto(BASE_URL)
            page.wait_for_load_state("networkidle")

            for name, selector in expected_regions.items():
                count = page.locator(selector).count()
                if count == 0:
                    missing.append(f"{selector} ({name})")

        finally:
            context.close()
            browser.close()

    if missing:
        pytest.fail(
            "Missing data-region attributes on /:\n"
            + "\n".join(f"  - {m}" for m in missing)
            + "\nStage 2 must add these attributes to components."
        )


# ---------------------------------------------------------------------------
# 4. Font wiring
# ---------------------------------------------------------------------------


@pytest.mark.skipif(
    os.getenv("SKIP_DOM_TESTS") == "1",
    reason="SKIP_DOM_TESTS=1 set — skipping DOM contract tests",
)
def test_body_font_family_includes_inter():
    """Assert getComputedStyle(document.body).fontFamily includes Inter."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        try:
            page.goto(BASE_URL)
            page.wait_for_load_state("networkidle")

            font_family = page.evaluate(
                "() => getComputedStyle(document.body).fontFamily"
            )
            assert "Inter" in font_family, (
                f"Expected body font-family to include 'Inter', got: {font_family}"
            )
        finally:
            context.close()
            browser.close()