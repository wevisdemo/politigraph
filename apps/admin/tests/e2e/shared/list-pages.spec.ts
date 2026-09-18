import { expect, test } from '@playwright/test';

const listPages = [
	{ url: '/bills', heading: 'Bills' },
	{ url: '/people', heading: 'People' },
	{ url: '/organizations', heading: 'Organizations' },
	{ url: '/vote-events', heading: 'Vote Events' },
];

test('list pages render a heading and a table', async ({ page }) => {
	for (const { url, heading } of listPages) {
		await page.goto(url);

		await expect(page.locator(`h1:has-text("${heading}")`)).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	}
});
