from playwright.sync_api import sync_playwright
import json, os, re

base = r'C:\Users\paula\Downloads\Projects\sakura-studio-promp-manager'
design_path = os.path.join(base, 'design', 'Sakura Prompt Studio - Phase 9.1 _standalone_.html')
out_dir = os.path.join(base, 'phase1_audit')
os.makedirs(out_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # 1. Open design mockup
    page.goto(f'file:///{design_path.replace("\\", "/")}')
    page.wait_for_timeout(5000)  # wait for bundle unpack + render
    page.wait_for_load_state('networkidle')
    page.screenshot(path=os.path.join(out_dir, 'design_full.png'), full_page=True)

    # Extract text content to understand what's rendered
    text = page.inner_text('body')
    with open(os.path.join(out_dir, 'design_text.txt'), 'w', encoding='utf-8') as f:
        f.write(text)

    # Try to inspect styles of common elements if they exist
    selectors = [
        ('sidebar', 'aside, nav, [class*="sidebar"], [class*="nav"]'),
        ('card', '[class*="card"], .card'),
        ('tag', '[class*="tag"], .tag, .chip'),
        ('button', 'button'),
        ('settings', '[class*="setting"]'),
    ]
    styles = {}
    for name, sel in selectors:
        el = page.locator(sel).first
        if el.count() > 0:
            try:
                computed = el.evaluate('el => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, radius: s.borderRadius, padding: s.padding, fontSize: s.fontSize, border: s.border }; }')
                styles[name] = computed
            except Exception as e:
                styles[name] = str(e)
        else:
            styles[name] = 'not found'

    with open(os.path.join(out_dir, 'design_styles.json'), 'w', encoding='utf-8') as f:
        json.dump(styles, f, indent=2)

    # 2. Open current app
    try:
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(out_dir, 'app_gallery.png'), full_page=True)

        # Settings tags
        page.goto('http://localhost:3000/settings/tags')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(out_dir, 'app_settings_tags.png'), full_page=True)

        # Settings variables
        page.goto('http://localhost:3000/settings/variables')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(out_dir, 'app_settings_variables.png'), full_page=True)

        # Item view (need an item id, skip if none)
        # We'll just capture what we can.
    except Exception as e:
        with open(os.path.join(out_dir, 'app_error.txt'), 'w') as f:
            f.write(str(e))

    browser.close()

print('Done. Output in', out_dir)
