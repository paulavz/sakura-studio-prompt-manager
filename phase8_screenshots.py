from playwright.sync_api import sync_playwright
import os

base = r'C:\Users\paula\Downloads\Projects\sakura-studio-promp-manager'
out_dir = os.path.join(base, 'phase8_screenshots')
os.makedirs(out_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # Gallery
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(out_dir, 'gallery.png'), full_page=False)

    # Settings Tags
    page.goto('http://localhost:3000/settings/tags')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(out_dir, 'settings_tags.png'), full_page=False)

    # Settings Variables
    page.goto('http://localhost:3000/settings/variables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(out_dir, 'settings_variables.png'), full_page=False)

    # Item view (seeded item with variables)
    page.goto('http://localhost:3000/items/00000000-0000-4000-a000-000000000001')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(out_dir, 'item_view.png'), full_page=False)

    # Item view in raw mode to see variable chips in editor
    raw_btn = page.locator('[data-testid="mode-toggle"] button:has-text("Raw")')
    if raw_btn.count() > 0:
        raw_btn.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(out_dir, 'item_view_raw.png'), full_page=False)

    browser.close()

print('Screenshots saved to', out_dir)
