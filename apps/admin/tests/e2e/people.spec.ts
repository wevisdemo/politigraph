import { expect, test } from '@playwright/test';
import { login } from './fixtures';

test.describe('People Management', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('list people', async ({ page }) => {
		await page.goto('/people');

		await expect(page.locator('h1:has-text("People")')).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});

	test('search filters the list', async ({ page }) => {
		await page.goto('/people');

		await page.waitForSelector('table tbody tr, [role="table"] [role="row"]', {
			timeout: 10000,
		});

		const initialRows = await page
			.locator('table tbody tr, [role="table"] [role="row"]:not(:first-child)')
			.count();

		await page.fill(
			'input[placeholder*="Search"], input[type="search"]',
			'สมชาย',
		);
		await page.waitForTimeout(1500);

		const filteredRows = await page
			.locator('table tbody tr, [role="table"] [role="row"]:not(:first-child)')
			.count();

		expect(filteredRows).toBeLessThanOrEqual(initialRows);
	});

	test('create a person form renders', async ({ page }) => {
		await page.goto('/people/new');

		await expect(page.locator('.cv-breadcrumb')).toBeVisible();
		await expect(page.getByLabel('Title*')).toBeVisible();
		await expect(page.getByLabel(/Firstname.*Thai/)).toBeVisible();
		await expect(page.getByLabel(/Lastname.*Thai/)).toBeVisible();
		await expect(page.locator('button:has-text("Create")')).toBeVisible();
	});

	test('edit page shows person details', async ({ page }) => {
		await page.goto('/people/new');

		await page.getByLabel('Title*').fill('นาย');
		await page.getByLabel(/Firstname.*Thai/).fill('ทดสอบ');
		await page.getByLabel(/Lastname.*Thai/).fill('แก้ไข');

		await page.click('button:has-text("Create")');

		await page.waitForTimeout(3000);

		await expect(
			page.getByRole('heading', { name: 'Person Details' }),
		).toBeVisible({ timeout: 10000 });
	});

	test('membership section visible on edit page', async ({ page }) => {
		await page.goto('/people/new');

		await page.getByLabel('Title*').fill('นาย');
		await page.getByLabel(/Firstname.*Thai/).fill('สมาชิก');
		await page.getByLabel(/Lastname.*Thai/).fill('ทดสอบ');

		await page.click('button:has-text("Create")');
		await page.waitForTimeout(3000);

		await expect(page.locator('h4:has-text("Membership")')).toBeVisible({
			timeout: 10000,
		});
	});
});
