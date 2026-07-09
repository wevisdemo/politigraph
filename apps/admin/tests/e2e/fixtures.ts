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
	await page.waitForURL('/');
}

export async function createTestPerson(
	page: Page,
	person: { firstname: string; lastname: string; publishStatus?: string },
) {
	await page.goto('/people/new');
	await page.fill('input[label="First Name"]', person.firstname);
	await page.fill('input[label="Last Name"]', person.lastname);

	if (person.publishStatus) {
		await page.selectOption(
			'select[label="Publish Status"]',
			person.publishStatus,
		);
	}

	await page.click('button:has-text("Save")');
	await page.waitForURL(/\/people\/[a-zA-Z0-9-]+/);
}
