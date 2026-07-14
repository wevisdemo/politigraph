import { expect, test } from '@playwright/test';
import { login } from '../fixtures';

const listPages = [
	{ url: '/bills', heading: 'Bills' },
	{ url: '/people', heading: 'People' },
	{ url: '/organizations', heading: 'Organizations' },
	{ url: '/vote-events', heading: 'Vote Events' },
];

for (const { url, heading } of listPages) {
	test(`${heading} list page renders`, async ({ page }) => {
		await login(page);
		await page.goto(url);

		await expect(page.locator(`h1:has-text("${heading}")`)).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});
}
