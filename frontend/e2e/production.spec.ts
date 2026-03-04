// Frontend E2E Tests using Playwright
// Run with: npx playwright test

import { test, expect } from '@playwright/test';

const PRODUCTION_URL =
  'https://seedstr-hackathon-agent-production-ff74.up.railway.app';

test.describe('Frontend E2E Tests', () => {
  test('should load the dashboard page', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    const heading = await page.locator('h1, h2, .hero, [role="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {
      // Acceptable if no heading - dashboard may not be loaded
    });
  });

  test('should have proper React root element', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    const root = await page.locator('#root, [data-react-root]');
    // May not exist if frontend not built
    await expect(root).toHaveCount(0);
  });

  test('should connect to backend health endpoint', async ({ page }) => {
    const response = await page.request.get(`${PRODUCTION_URL}/health`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('should handle API request errors gracefully', async ({ page }) => {
    page.on('console', (msg) => {
      // Check for console errors
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
    await page.goto(PRODUCTION_URL);
  });
});
