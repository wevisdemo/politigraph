import { test as setup } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config';
import { login } from './fixtures';

const WARM_UP_ROUTES = [
	'/bills',
	'/organizations',
	'/people',
	'/vote-events',
	'/users',
	'/api-keys',
	'/people/new',
	'/bills/warm-up',
	'/organizations/warm-up',
	'/people/warm-up',
	'/vote-events/warm-up',
	'/vote-events/warm-up/votes',
];

setup('authenticate', async ({ page }) => {
	setup.setTimeout(120_000);

	await login(page);
	await page.context().storageState({ path: STORAGE_STATE });

	// Compile every page up front so the cold dev server doesn't reload under the parallel tests
	for (const route of WARM_UP_ROUTES) {
		await page.goto(route);
		// Placeholder IDs may never go idle; compiling the route is all that matters
		await page
			.waitForLoadState('networkidle', { timeout: 10_000 })
			.catch(() => {});
	}
});
