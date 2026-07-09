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

	test('create a bill', async ({ page }) => {
		await page.goto('/bills/new');

		await expect(page.locator('h1, h2').first()).toBeVisible();

		await page.fill('input[label="Title"]', 'กฎหมายทดสอบ E2E');
		await page.fill(
			'textarea[label="Description"], input[label="Description"]',
			'รายละเอียดกฎหมายทดสอบ',
		);
		await page.selectOption('select[label="Type"], select[label="Bill Type"]', {
			index: 1,
		});

		await page.click('button:has-text("Save")');

		await page.waitForURL(/\/bills\/[a-zA-Z0-9-]+/);

		await expect(page.locator('text=กฎหมายทดสอบ E2E')).toBeVisible();
	});

	test('edit a bill', async ({ page }) => {
		await page.goto('/bills/new');
		await page.fill('input[label="Title"]', 'กฎหมายเดิม E2E');
		await page.fill(
			'textarea[label="Description"], input[label="Description"]',
			'รายละเอียดเดิม',
		);
		await page.selectOption('select[label="Type"], select[label="Bill Type"]', {
			index: 1,
		});
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/bills\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Edit"), button[aria-label="Edit"]');

		await page.fill('input[label="Title"]', 'กฎหมายใหม่ E2E');

		await page.click('button:has-text("Save")');

		await expect(page.locator('text=กฎหมายใหม่ E2E')).toBeVisible({
			timeout: 10000,
		});
	});

	test('add a bill event', async ({ page }) => {
		await page.goto('/bills/new');
		await page.fill('input[label="Title"]', 'กฎหมายเหตุการณ์ E2E');
		await page.fill(
			'textarea[label="Description"], input[label="Description"]',
			'รายละเอียด',
		);
		await page.selectOption('select[label="Type"], select[label="Bill Type"]', {
			index: 1,
		});
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/bills\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Add Event")');

		await page.selectOption('select[label="Event Type"]', {
			index: 1,
		});
		await page.fill('input[label="Date"]', '2024-01-15');

		await page.click('button:has-text("Save")');

		await expect(
			page
				.locator('.bx--structured-list-tbody .bx--structured-list-row')
				.first(),
		).toBeVisible({ timeout: 10000 });
	});

	test('link a bill to a vote event', async ({ page }) => {
		await page.goto('/bills/new');
		await page.fill('input[label="Title"]', 'กฎหมายเชื่อมโยง E2E');
		await page.fill(
			'textarea[label="Description"], input[label="Description"]',
			'รายละเอียด',
		);
		await page.selectOption('select[label="Type"], select[label="Bill Type"]', {
			index: 1,
		});
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/bills\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Link Vote Event")');

		await page
			.locator('input[type="checkbox"], input[type="radio"]')
			.first()
			.check();
		await page.click('button:has-text("Link")');

		await expect(page.locator('[href*="/vote-events/"]').first()).toBeVisible({
			timeout: 10000,
		});
	});
});
