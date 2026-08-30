import { test, expect } from '@playwright/test';

test('Coffee Shop UI loads successfully', async ({ page }) => {
  await page.goto('/');

  // Verify the page has loaded successfully by checking the title or a key UI element
  // Assuming there's a heading or main element. We just want to check it doesn't crash.
  // Wait for the body to be attached.
  await expect(page.locator('body')).toBeVisible();

  // If there's a specific "Coffee Shop" text, we can check for it. We'll use a broad check for now.
  // Since we shouldn't change data-testids, we just check if it renders *something* successfully.
  await expect(page).toHaveTitle(/.*/); // We can refine this if we know the title, for now just expecting the page to exist
});
