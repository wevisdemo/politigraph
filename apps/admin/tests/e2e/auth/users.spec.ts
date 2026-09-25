import { expect, test } from '@playwright/test';

test.describe('Users', () => {
	test('create, promote, reset password and remove a user', async ({
		page,
		playwright,
		baseURL,
	}) => {
		const email = `e2e-${test.info().workerIndex}-${Date.now()}@wevis.info`;
		const modal = page.locator('.bx--modal.is-visible');

		await page.goto('/users');

		await page.getByRole('button', { name: 'New User' }).click();
		await modal.getByLabel('Name').fill('E2E User');
		await modal.getByLabel('Email').fill(email);
		await modal.getByRole('button', { name: 'Create' }).click();
		await expect(modal).not.toBeVisible();

		const row = page.getByRole('row').filter({ hasText: email });
		await expect(row).toContainText('user');

		await row.getByRole('button', { name: 'Assign admin role' }).click();
		await expect(row).toContainText('admin');
		await expect(
			row.getByRole('button', { name: 'Remove admin role' }),
		).toBeVisible();

		await row.getByRole('button', { name: 'Change password' }).click();
		const newPassword = await modal.getByLabel('New password').inputValue();
		await modal.getByRole('button', { name: 'Change password' }).click();
		await expect(modal).not.toBeVisible();

		const api = await playwright.request.newContext({ baseURL });
		const signIn = await api.post('/auth/sign-in/email', {
			headers: { Origin: new URL(baseURL!).origin },
			data: { email, password: newPassword },
		});
		expect(signIn.status()).toBe(200);
		await api.dispose();

		await row.getByRole('button', { name: 'Remove user' }).click();
		await modal.getByRole('button', { name: 'Remove' }).click();
		await expect(row).not.toBeVisible();

		await expect(page.locator('.bg-red-50')).not.toBeVisible();
	});
});
