import type { Page } from '@playwright/test';

const seedPassword = process.env.SEED_ADMIN_PASSWORD;

if (!seedPassword) {
	throw new Error(
		'SEED_ADMIN_PASSWORD must be set to the password used by `bun run seed`',
	);
}

export const TEST_USER = {
	email: 'admin@wevis.info',
	password: seedPassword,
};

export async function login(page: Page) {
	await page.goto('/login');
	await page.fill('input[placeholder="username@wevis.info"]', TEST_USER.email);
	await page.fill('input[placeholder="Password"]', TEST_USER.password);
	await page.click('button:has-text("Log in")');
	await page.waitForURL(/.*admin\/?$/);
}
