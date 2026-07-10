import { expect, test } from '@playwright/test';
import { login } from './fixtures';

test.describe('Bill Lifecycle', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('list bills', async ({ page }) => {
		await page.goto('/bills');

		await expect(page.locator('h1:has-text("Bills")')).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});
});
