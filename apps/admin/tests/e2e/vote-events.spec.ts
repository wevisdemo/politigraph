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

	test('create a vote event', async ({ page }) => {
		await page.goto('/vote-events/new');

		await expect(page.locator('h1, h2').first()).toBeVisible();

		await page.fill(
			'input[label="Title"], input[placeholder*="Title"]',
			'ลงมติทดสอบ E2E',
		);
		await page.fill('input[label="Date"]', '2024-01-15');
		await page.selectOption('select[label="Type"]', {
			index: 1,
		});

		await page.click('button:has-text("Save")');

		await page.waitForURL(/\/vote-events\/[a-zA-Z0-9-]+/);

		await expect(page.locator('text=ลงมติทดสอบ E2E')).toBeVisible();
	});

	test('edit vote counts', async ({ page }) => {
		await page.goto('/vote-events/new');
		await page.fill(
			'input[label="Title"], input[placeholder*="Title"]',
			'ลงมติแก้ไขคะแนน E2E',
		);
		await page.fill('input[label="Date"]', '2024-01-15');
		await page.selectOption('select[label="Type"]', { index: 1 });
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/vote-events\/[a-zA-Z0-9-]+/);

		await page.click('a:has-text("Votes"), button:has-text("Votes")');

		const agreeInput = page.locator(
			'input[label="Agree"], input:near(:text("เห็นด้วย"))',
		);
		await agreeInput.fill('100');

		const disagreeInput = page.locator(
			'input[label="Disagree"], input:near(:text("ไม่เห็นด้วย"))',
		);
		await disagreeInput.fill('50');

		await page.click('button:has-text("Save")');

		await expect(page.locator('text=100')).toBeVisible({ timeout: 10000 });
	});

	test('edit individual votes', async ({ page }) => {
		await page.goto('/vote-events/new');
		await page.fill(
			'input[label="Title"], input[placeholder*="Title"]',
			'ลงมติแก้ไขรายบุคคล E2E',
		);
		await page.fill('input[label="Date"]', '2024-01-15');
		await page.selectOption('select[label="Type"]', { index: 1 });
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/vote-events\/[a-zA-Z0-9-]+/);

		await page.click('a:has-text("Votes"), button:has-text("Votes")');

		const firstVoteRow = page
			.locator('table tbody tr, [role="table"] [role="row"]')
			.first();

		if (await firstVoteRow.isVisible()) {
			await firstVoteRow.click();

			await page.selectOption('select[label="Option"]', {
				index: 2,
			});

			await page.click('button:has-text("Save")');

			await expect(
				page.locator('.bx--inline-notification--success'),
			).toBeVisible({
				timeout: 10000,
			});
		}
	});

	test('use batch name correction', async ({ page }) => {
		await page.goto('/vote-events/new');
		await page.fill(
			'input[label="Title"], input[placeholder*="Title"]',
			'ลงมติแก้ไขชื่อ E2E',
		);
		await page.fill('input[label="Date"]', '2024-01-15');
		await page.selectOption('select[label="Type"]', { index: 1 });
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/vote-events\/[a-zA-Z0-9-]+/);

		await page.click('a:has-text("Votes"), button:has-text("Votes")');

		await page.click(
			'button:has-text("Batch Name Correction"), button:has-text("แก้ไขชื่อ")',
		);

		await expect(page.locator('.bx--modal, [role="dialog"]')).toBeVisible();

		await page.click('button:has-text("Cancel"), button[aria-label="Close"]');
	});

	test('publish and unpublish the vote event', async ({ page }) => {
		await page.goto('/vote-events/new');
		await page.fill(
			'input[label="Title"], input[placeholder*="Title"]',
			'ลงมติเผยแพร่ E2E',
		);
		await page.fill('input[label="Date"]', '2024-01-15');
		await page.selectOption('select[label="Type"]', { index: 1 });
		await page.click('button:has-text("Save")');
		await page.waitForURL(/\/vote-events\/[a-zA-Z0-9-]+/);

		await page.click('button:has-text("Publish")');

		await expect(page.locator('text=Published, text=PUBLISHED')).toBeVisible({
			timeout: 10000,
		});

		await page.click('button:has-text("Unpublish")');

		await expect(
			page.locator('text=Unpublished, text=UNPUBLISHED'),
		).toBeVisible({ timeout: 10000 });
	});
});
