import { expect, test } from '@playwright/test';
import { login } from '../fixtures';

test.describe('API Keys', () => {
	test('create and delete an API key', async ({ page }) => {
		await login(page);

		await page.goto('/api-keys');
		await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();

		const keyName = `Test Key ${test.info().workerIndex}-${Date.now()}`;
		await page.getByPlaceholder('Key name').fill(keyName);
		await page.click('button:has-text("Create")');

		const successModal = page.locator('.bx--modal.is-visible');
		await expect(successModal).toBeVisible({ timeout: 10000 });
		await successModal.getByRole('button', { name: 'Close' }).click();
		await page.waitForTimeout(500);

		const createdCell = page.getByRole('cell', { name: keyName }).first();
		await expect(createdCell).toBeVisible({ timeout: 10000 });

		const row = createdCell.locator('xpath=ancestor::tr');
		const deleteBtn = row.getByRole('button', { name: 'Delete' });
		await deleteBtn.click();
		await page.waitForTimeout(2000);

		await expect(createdCell).not.toBeVisible();
	});
});
