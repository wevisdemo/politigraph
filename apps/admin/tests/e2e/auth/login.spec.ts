import { expect, test } from '@playwright/test';
import { login, TEST_USER } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

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

	test('login returns to the page the user was redirected from', async ({
		page,
	}) => {
		await page.goto('/people?page=2');

		await page.waitForURL(/.*admin\/login\?redirect=\/people\?page=2$/);

		await page.fill(
			'input[placeholder="username@wevis.info"]',
			TEST_USER.email,
		);
		await page.fill('input[placeholder="Password"]', TEST_USER.password);
		await page.click('button:has-text("Log in")');

		await page.waitForURL(/.*admin\/people\?page=2$/);
	});

	test('login page opened directly keeps its redirect', async ({ page }) => {
		await page.goto('/login?redirect=/people?page=2');

		await page.fill(
			'input[placeholder="username@wevis.info"]',
			TEST_USER.email,
		);
		await page.fill('input[placeholder="Password"]', TEST_USER.password);
		await page.click('button:has-text("Log in")');

		await page.waitForURL(/.*admin\/people\?page=2$/);
	});

	test('logged-in user opening the login page is sent to its redirect', async ({
		page,
	}) => {
		await login(page);
		await page.goto('/login?redirect=/people');

		await page.waitForURL(/.*admin\/people$/);
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
