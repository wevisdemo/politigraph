import { expect, test } from '@playwright/test';
import {
	createTestOrganization,
	deleteTestOrganization,
} from '../shared/graphql-helpers';
import { genId } from '../shared/ui-helpers';
import { waitForOrganizationTable } from './helpers';

test.describe('Organization List', () => {
	test('navigate from list to detail page', async ({ page }) => {
		const orgName = `TestOrgNav${genId(test.info().workerIndex)}`;
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
