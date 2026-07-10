import { expect, test } from '@playwright/test';
import { login } from './fixtures';

test.describe('Organization Management', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('list organizations', async ({ page }) => {
		await page.goto('/organizations');

		await expect(page.locator('h1:has-text("Organizations")')).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});
});
