from playwright.sync_api import sync_playwright, expect


def verify_accessibility():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to Dashboard
            page.goto("http://localhost:3000/")

            # Click on "Job Applications" in Sidebar
            page.get_by_role("button", name="Job Applications").click()

            # Wait for Job Applications page to load
            expect(page.get_by_role("heading", name="Job Applications")).to_be_visible()

            print("Job Applications page loaded.")

            # 1. Verify Notifications button
            notifications_btn = page.get_by_role("button", name="Notifications")
            expect(notifications_btn).to_be_visible()
            # Verify title attribute
            title = notifications_btn.get_attribute("title")
            assert title == "Notifications", f"Expected title 'Notifications', got '{title}'"
            print("Verified Notifications button accessible name and title.")

            # 2. Verify Search input
            search_input = page.get_by_label("Search applications")
            expect(search_input).to_be_visible()
            print("Verified Search input accessible name.")

            # 3. Verify More options button (first one)
            more_options_btn = page.get_by_role("button", name="More options").first
            expect(more_options_btn).to_be_visible()
            title = more_options_btn.get_attribute("title")
            assert title == "More options", f"Expected title 'More options', got '{title}'"
            print("Verified More options button accessible name and title.")

            # 4. Open Tailor Modal (optional but good to check close button)
            page.get_by_role("button", name="Tailor Resume").click()
            expect(page.get_by_role("heading", name="Tailor Resume to Job")).to_be_visible()

            # Verify Close button
            close_btn = page.get_by_role("button", name="Close")
            expect(close_btn).to_be_visible()
            title = close_btn.get_attribute("title")
            assert title == "Close", f"Expected title 'Close', got '{title}'"
            print("Verified Close button accessible name and title.")

            # Take screenshot of the Modal open
            page.screenshot(path="verification/verification_modal.png")
            print("Screenshot saved to verification/verification_modal.png")

            # Close the modal
            close_btn.click()

            # Take screenshot of the main page
            page.screenshot(path="verification/verification_page.png")
            print("Screenshot saved to verification/verification_page.png")

        finally:
            browser.close()


if __name__ == "__main__":
    verify_accessibility()
