import { test as base, type Page } from '@playwright/test';

export const TEST_USER = {
	email: 'admin@wevis.info',
	password: 'testpassword123',
};

export const test = base.extend<{
	authenticatedPage: Page;
}>({
	authenticatedPage: async ({ page }, use) => {
		await login(page);
		await use(page);
	},
});

export async function login(page: Page) {
	await page.goto('/login');
	await page.fill('input[placeholder="username@wevis.info"]', TEST_USER.email);
	await page.fill('input[placeholder="Password"]', TEST_USER.password);
	await page.click('button:has-text("Log in")');
	await page.waitForURL(/.*admin\/?$/);
}

export async function createTestPerson(
	page: Page,
	person: { firstname: string; lastname: string; publishStatus?: string },
) {
	await page.goto('/people/new');
	await page.getByLabel('Title*').fill('นาย');
	await page.getByLabel(/Firstname.*Thai/).fill(person.firstname);
	await page.getByLabel(/Lastname.*Thai/).fill(person.lastname);

	if (person.publishStatus) {
		await page.getByLabel(/Publish/).selectOption(person.publishStatus);
	}

	await page.click('button:has-text("Create")');

	// Wait for URL to change to a UUID-based path (not /new)
	await page.waitForURL(/\/people\/[0-9a-f]{8}-/, { timeout: 15000 });
}
