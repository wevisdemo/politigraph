import { expect, test } from '@playwright/test';
import { login, TEST_USER } from '../fixtures';

test.describe('Change Password', () => {
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
});
