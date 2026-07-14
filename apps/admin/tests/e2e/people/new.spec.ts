import { expect, test } from '@playwright/test';
import { login } from '../fixtures';

test.describe('Create Person', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('create a person form renders', async ({ page }) => {
		await page.goto('/people/new');

		await expect(page.locator('.cv-breadcrumb')).toBeVisible();
		await expect(page.getByLabel('Title*')).toBeVisible();
		await expect(page.getByLabel(/Firstname.*Thai/)).toBeVisible();
		await expect(page.getByLabel(/Lastname.*Thai/)).toBeVisible();
		await expect(page.locator('button:has-text("Create")')).toBeVisible();
	});
});
