import { expect, test } from '@playwright/test';

test.describe('API Keys', () => {
	test('create and delete an API key', async ({ page }) => {
		await page.goto('/api-keys');
		await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();

		const keyName = `Test Key ${test.info().workerIndex}-${Date.now()}`;
		await page.getByPlaceholder('Key name').fill(keyName);
		await page.click('button:has-text("Create")');

		const successModal = page.locator('.bx--modal.is-visible');
		await expect(successModal).toBeVisible({ timeout: 10000 });
		await successModal.getByRole('button', { name: 'Close' }).click();

		const createdCell = page.getByRole('cell', { name: keyName }).first();
		await expect(createdCell).toBeVisible({ timeout: 10000 });

		await createdCell
			.locator('xpath=ancestor::tr')
			.getByRole('button', { name: 'Delete' })
			.click();

		await expect(createdCell).not.toBeVisible();
	});
});
