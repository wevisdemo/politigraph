import { expect, test } from '@playwright/test';
import { TEST_USER } from '../fixtures';

test.describe('Authentication', () => {
	test('login success', async ({ page }) => {
		await page.goto('/login');

		await page.fill(
			'input[placeholder="username@wevis.info"]',
			TEST_USER.email,
		);
		await page.fill('input[placeholder="Password"]', TEST_USER.password);
		await page.click('button:has-text("Log in")');

		await page.waitForURL(/.*admin\/?$/);
		await expect(page.locator('h1, h2, h3').first()).toBeVisible();
	});

	test('login failure shows error', async ({ page }) => {
		await page.goto('/login');

		await page.fill(
			'input[placeholder="username@wevis.info"]',
			'wrong@email.com',
		);
		await page.fill('input[placeholder="Password"]', 'wrongpassword');
		await page.click('button:has-text("Log in")');

		await expect(page.locator('[role="alert"]')).toBeVisible();
		await expect(page.locator('[role="alert"]')).toContainText('Error');
	});

	test('unauthenticated user is redirected to /login', async ({ page }) => {
		await page.goto('/');

		await page.waitForURL(/.*admin\/login$/);
		await expect(page.locator('h1:has-text("Log in")')).toBeVisible();
	});
});
