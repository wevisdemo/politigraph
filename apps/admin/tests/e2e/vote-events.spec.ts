import { expect, test } from '@playwright/test';
import { login } from './fixtures';

test.describe('Vote Events & Votes', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('list vote events', async ({ page }) => {
		await page.goto('/vote-events');

		await expect(page.locator('h1:has-text("Vote Events")')).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});
});
