import { test as setup } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config';
import { login } from './fixtures';

setup('authenticate', async ({ page }) => {
	await login(page);
	await page.context().storageState({ path: STORAGE_STATE });
});
