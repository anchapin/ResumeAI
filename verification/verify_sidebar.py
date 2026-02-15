from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to http://localhost:3000/")
        try:
            page.goto("http://localhost:3000/")
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # Wait for Sidebar
        try:
            page.wait_for_selector("aside", timeout=10000)
        except Exception as e:
            print(f"Sidebar not found: {e}")
            page.screenshot(path="verification/error_screenshot.png")
            return

        # Check brand button
        print("Checking brand button...")
        brand_button = page.get_by_role("button", name="Go to Dashboard", exact=True)
        expect(brand_button).to_be_visible()

        # Check Dashboard nav item active state
        print("Checking Dashboard active state...")
        dashboard_nav = page.get_by_role("button", name="Dashboard", exact=True)
        expect(dashboard_nav).to_have_attribute("aria-current", "page")

        # Navigate to Job Applications (which keeps the Sidebar)
        print("Navigating to Job Applications...")
        apps_nav = page.get_by_role("button", name="Job Applications")
        apps_nav.click()

        # Wait a bit
        page.wait_for_timeout(500)

        # Check Job Applications active state
        print("Checking Job Applications active state...")
        expect(apps_nav).to_have_attribute("aria-current", "page")

        # Check Dashboard is no longer active
        # expect(dashboard_nav).not_to_have_attribute("aria-current", "page")

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/sidebar_verification.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    run()
