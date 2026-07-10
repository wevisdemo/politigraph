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

	test('change password', async ({ page }) => {
		await login(page);

		await page.goto('/change-password');
		await expect(page.locator('h1, h2').first()).toBeVisible();

		await page.fill('input[autocomplete="password"]', TEST_USER.password);

		const newPassword = 'newtestpassword123';
		await page.getByLabel('New Password', { exact: true }).fill(newPassword);
		await page
			.getByLabel('Confirm New Password', { exact: true })
			.fill(newPassword);

		await page.click('button:has-text("Change Password")');

		await expect(page.locator('h1:has-text("You\'re all set!")')).toBeVisible({
			timeout: 10000,
		});

		// Sign out and log back in with new password to change it back
		await page.click('button:has-text("Go to Sign In")');
		await page.waitForURL(/.*admin\/login$/);

		await page.fill(
			'input[placeholder="username@wevis.info"]',
			TEST_USER.email,
		);
		await page.fill('input[placeholder="Password"]', newPassword);
		await page.click('button:has-text("Log in")');
		await page.waitForURL(/.*admin\/?$/);

		await page.goto('/change-password');

		await page.fill('input[autocomplete="password"]', newPassword);
		await page
			.getByLabel('New Password', { exact: true })
			.fill(TEST_USER.password);
		await page
			.getByLabel('Confirm New Password', { exact: true })
			.fill(TEST_USER.password);
		await page.click('button:has-text("Change Password")');

		await expect(page.locator('h1:has-text("You\'re all set!")')).toBeVisible({
			timeout: 10000,
		});
	});

	test('create an API key', async ({ page }) => {
		await login(page);

		await page.goto('/api-keys');
		await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();

		await page.getByPlaceholder('Key name').fill('Test API Key');
		await page.click('button:has-text("Create")');

		await expect(page.getByRole('cell', { name: 'Test API Key' })).toBeVisible({
			timeout: 10000,
		});

		// Clean up — click delete button bypassing tooltip actionability
		const deleteBtn = page.locator('button').filter({ hasText: 'Delete' });
		await deleteBtn.evaluate((el) => el.click());
		await page.waitForTimeout(1000);

		await expect(
			page.getByRole('cell', { name: 'Test API Key' }),
		).not.toBeVisible();
	});
});
