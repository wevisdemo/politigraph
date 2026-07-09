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

	test('create an organization', async ({ page }) => {
		await page.goto('/organizations/new');

		await expect(page.locator('h1, h2').first()).toBeVisible();

		await page.fill('input[label="Name"]', 'องค์กรทดสอบ E2E');
		await page.selectOption('select[label="Classification"]', {
			index: 1,
		});

		await page.click('button:has-text("Save")');

		await page.waitForURL(/\/organizations\/[a-zA-Z0-9-]+/);

		await expect(page.locator('text=องค์กรทดสอบ E2E')).toBeVisible();
	});

	test('edit an organization', async ({ page }) => {
		await page.goto('/organizations/new');
		await page.fill('input[label="Name"]', 'องค์กรเดิม E2E');
		await page.selectOption('select[label="Classification"]', {
			index: 1,
		});
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/organizations\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Edit"), button[aria-label="Edit"]');

		await page.fill('input[label="Name"]', 'องค์กรใหม่ E2E');

		await page.click('button:has-text("Save")');

		await expect(page.locator('text=องค์กรใหม่ E2E')).toBeVisible({
			timeout: 10000,
		});
	});

	test('add a post', async ({ page }) => {
		await page.goto('/organizations/new');
		await page.fill('input[label="Name"]', 'องค์กรตำแหน่ง E2E');
		await page.selectOption('select[label="Classification"]', {
			index: 1,
		});
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/organizations\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Add Post")');

		await page.fill('input[label="Role"]', 'ตำแหน่งทดสอบ');

		await page.click('button:has-text("Save")');

		await expect(page.locator('text=ตำแหน่งทดสอบ')).toBeVisible({
			timeout: 10000,
		});
	});

	test('add a membership', async ({ page }) => {
		await page.goto('/organizations/new');
		await page.fill('input[label="Name"]', 'องค์กรสมาชิก E2E');
		await page.selectOption('select[label="Classification"]', {
			index: 1,
		});
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/organizations\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Add Membership")');

		await page.selectOption('select[label="Member"]', {
			index: 1,
		});

		await page.click('button:has-text("Save")');

		await expect(
			page
				.locator('.bx--structured-list-tbody .bx--structured-list-row')
				.first(),
		).toBeVisible({ timeout: 10000 });
	});
});
