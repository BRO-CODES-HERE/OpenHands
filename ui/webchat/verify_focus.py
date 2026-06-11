import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Enable video recording by specifying record_video_dir in new_context
        context = await browser.new_context(record_video_dir=".")
        page = await context.new_page()

        await page.goto("http://localhost:5173")

        # Wait for the app to load
        await page.wait_for_selector(".sessions-list")

        # Mock DOM element creation since we are not fully connected
        await page.evaluate("""
            const nav = document.querySelector('.sessions-list');
            const mockSession = document.createElement('div');
            mockSession.className = 'session-item';
            mockSession.role = 'button';
            mockSession.tabIndex = 0;
            mockSession.innerHTML = `
                <span class="session-title">Mock Session</span>
                <button class="delete-btn" aria-label="Delete session" title="Delete session">✕</button>
            `;
            nav.appendChild(mockSession);
        """)

        # Focus the session item
        await page.focus(".session-item")
        await page.screenshot(path="screenshot_session_focus.png")
        await asyncio.sleep(1) # small delay for video

        # Focus the delete button inside it
        await page.focus(".session-item .delete-btn")
        await page.screenshot(path="screenshot_delete_focus.png")
        await asyncio.sleep(1) # small delay for video

        await context.close()
        await browser.close()

        print("Screenshots saved: screenshot_session_focus.png, screenshot_delete_focus.png")

if __name__ == "__main__":
    asyncio.run(main())
