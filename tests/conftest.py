"""Pytest configuration and shared fixtures."""
import pytest
from playwright.sync_api import sync_playwright

from cleanup_db import cleanup_all


@pytest.fixture(autouse=True)
def cleanup_after_each_test():
    """Run database cleanup once after each test function finishes."""
    yield
    print("\n[CLEANUP] Running post-test database cleanup...")
    cleanup_all()


@pytest.fixture
def page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        pg = context.new_page()
        yield pg
        context.close()
        browser.close()
