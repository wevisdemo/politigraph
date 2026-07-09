import { expect, test } from '@playwright/test';
import { login, TEST_USER } from './fixtures';

test.describe('Authentication', () => {
	test('login success', async ({ page }) => {
		await page.goto('/login');

		await page.fill(
			'input[placeholder="username@wevis.info"]',
			TEST_USER.email,
		);
		await page.fill('input[placeholder="Password"]', TEST_USER.password);
		await page.click('button:has-text("Log in")');

		await page.waitForURL('/');
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

		await expect(page.locator('.bx--inline-notification')).toBeVisible();
		await expect(page.locator('.bx--inline-notification')).toContainText(
			'Error',
		);
	});

	test('unauthenticated user is redirected to /login', async ({ page }) => {
		await page.goto('/');

		await page.waitForURL('/login');
		await expect(page.locator('h1:has-text("Log in")')).toBeVisible();
	});

	test('change password', async ({ page }) => {
		await login(page);

		await page.goto('/change-password');
		await expect(page.locator('h1, h2').first()).toBeVisible();

		await page.fill('input[autocomplete="password"]', TEST_USER.password);

		const newPassword = 'newtestpassword123';
		await page.fill('input[label="New Password"]', newPassword);
		await page.fill('input[label="Confirm New Password"]', newPassword);

		await page.click('button:has-text("Change Password")');

		await expect(page.locator('.bx--inline-notification--success')).toBeVisible(
			{
				timeout: 10000,
			},
		);

		await page.fill('input[autocomplete="password"]', newPassword);
		await page.fill('input[label="New Password"]', TEST_USER.password);
		await page.fill('input[label="Confirm New Password"]', TEST_USER.password);
		await page.click('button:has-text("Change Password")');

		await expect(page.locator('.bx--inline-notification--success')).toBeVisible(
			{
				timeout: 10000,
			},
		);
	});

	test('create an API key', async ({ page }) => {
		await login(page);

		await page.goto('/api-keys');
		await expect(page.locator('h1, h2').first()).toBeVisible();

		await page.click('button:has-text("Create API Key")');

		await page.fill('input[label="Name"]', 'Test API Key');
		await page.click('button:has-text("Save")');

		await expect(page.locator('text=Test API Key')).toBeVisible({
			timeout: 10000,
		});

		// Clean up - delete the API key
		await page.click('button[aria-label="Delete"]:near(:text("Test API Key"))');
		await page.click('button:has-text("Confirm")');

		await expect(page.locator('text=Test API Key')).not.toBeVisible();
	});
});
