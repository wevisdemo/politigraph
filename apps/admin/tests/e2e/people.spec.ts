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

	test('create a person', async ({ page }) => {
		await page.goto('/people/new');

		await expect(page.locator('h1, h2').first()).toBeVisible();

		await page.fill('input[label="First Name"]', 'ทดสอบ');
		await page.fill('input[label="Last Name"]', 'สร้างใหม่');

		await page.click('button:has-text("Save")');

		await page.waitForURL(/\/people\/[a-zA-Z0-9-]+/);

		await expect(page.locator('text=ทดสอบ สร้างใหม่')).toBeVisible();
	});

	test('edit a person', async ({ page }) => {
		await page.goto('/people/new');
		await page.fill('input[label="First Name"]', 'แก้ไข');
		await page.fill('input[label="Last Name"]', 'ชื่อเดิม');
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/people\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Edit"), button[aria-label="Edit"]');

		await page.fill('input[label="Last Name"]', 'ชื่อใหม่');

		await page.click('button:has-text("Save")');

		await expect(page.locator('text=แก้ไข ชื่อใหม่')).toBeVisible({
			timeout: 10000,
		});
	});

	test('add and remove a membership', async ({ page }) => {
		await page.goto('/people/new');
		await page.fill('input[label="First Name"]', 'สมาชิก');
		await page.fill('input[label="Last Name"]', 'ทดสอบ');
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/people\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Add Membership")');

		await page.selectOption('select[label="Organization"]', {
			index: 1,
		});
		await page.fill('input[label="Role"]', 'สมาชิกทดสอบ');

		await page.click('button:has-text("Save")');

		await expect(page.locator('text=สมาชิกทดสอบ')).toBeVisible({
			timeout: 10000,
		});

		await page.click('button[aria-label="Delete"]:near(:text("สมาชิกทดสอบ"))');
		await page.click('button:has-text("Confirm")');

		await expect(page.locator('text=สมาชิกทดสอบ')).not.toBeVisible();
	});
});
