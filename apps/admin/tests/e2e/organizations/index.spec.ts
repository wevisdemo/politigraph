import { expect, test } from '@playwright/test';
import { login } from '../fixtures';
import {
	createTestOrganization,
	deleteTestOrganization,
	waitForOrganizationTable,
} from './helpers';

const genId = () => `${test.info().workerIndex}-${Date.now()}`;

test.describe('Organization List', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navigate from list to detail page', async ({ page }) => {
		const uid = genId();
		const orgName = `TestOrgNav${uid}`;
		const org = await createTestOrganization(page, orgName, 'POLITICAL_PARTY');

		try {
			await page.goto('/organizations');
			await waitForOrganizationTable(page);

			const orgLink = page.locator(`a:has-text("${orgName}")`).first();
			await expect(orgLink).toBeVisible({ timeout: 10000 });
			await orgLink.click();

			await page.waitForURL(/\/organizations\/[0-9a-f]{8}-/, {
				timeout: 10000,
			});

			await expect(
				page.locator('h4:has-text("Organization Details")'),
			).toBeVisible();
		} finally {
			await deleteTestOrganization(page, org.id);
		}
	});
});
