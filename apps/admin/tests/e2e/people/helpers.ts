import { expect, type Page } from '@playwright/test';
import {
	createTestMembership,
	createTestOrganization,
	createTestPost,
	deleteTestMembership,
	deleteTestOrganization,
	deleteTestPost,
	linkPostToOrganization,
} from '../shared/graphql-helpers';

export {
	createTestOrganization,
	deleteTestOrganization,
	createTestPost,
	deleteTestPost,
	linkPostToOrganization,
	createTestMembership,
	deleteTestMembership,
};

const TIMEOUTS = {
	TABLE: 10000,
	SAVE: 3000,
	TOAST: 5000,
} as const;

export { TIMEOUTS };

export const ORGANIZATION_CLASSIFICATIONS = {
	HOUSE_OF_REPRESENTATIVE: 'HOUSE_OF_REPRESENTATIVE',
	HOUSE_OF_SENATE: 'HOUSE_OF_SENATE',
	CABINET: 'CABINET',
	POLITICAL_PARTY: 'POLITICAL_PARTY',
} as const;

export async function waitForMembershipTable(page: Page) {
	await page.locator('h4:has-text("Membership")').waitFor({
		state: 'visible',
		timeout: TIMEOUTS.TABLE,
	});
	await page.waitForTimeout(500);
}

export async function openAddMembershipModal(page: Page) {
	const header = page.locator('h4:has-text("Membership")');
	await header.waitFor({ state: 'visible', timeout: TIMEOUTS.TABLE });
	const section = header.locator('..').locator('..');
	await section.getByRole('button', { name: 'Add' }).click();

	await page.locator('.membership-modal .bx--modal-container').waitFor({
		state: 'visible',
		timeout: 5000,
	});
	await page.waitForTimeout(300);
}

const CLASSIFICATION_LABELS: Record<string, string> = {
	HOUSE_OF_REPRESENTATIVE: 'สส.',
	HOUSE_OF_SENATE: 'สว.',
	CABINET: 'ครม.',
	POLITICAL_PARTY: 'พรรคการเมือง',
};

export async function fillClassification(page: Page, value: string) {
	const classificationField = page
		.locator('.membership-modal .bx--combo-box')
		.first();
	await classificationField.waitFor({ state: 'visible', timeout: 5000 });

	const labelText = CLASSIFICATION_LABELS[value] ?? value;
	const input = classificationField.locator('input[role="combobox"]');
	await input.click();
	await page.waitForTimeout(300);
	await input.press('ArrowDown');
	await page.waitForTimeout(500);

	const menuItem = classificationField.locator(
		`.bx--list-box__menu-item:has-text("${labelText}")`,
	);
	await menuItem.waitFor({ state: 'visible', timeout: 5000 });
	await menuItem.click();
	await page.waitForTimeout(500);
}

export async function fillOrganizationName(page: Page, name: string) {
	const orgField = page.locator('.membership-modal .bx--combo-box').nth(1);
	await orgField.waitFor({ state: 'visible', timeout: 5000 });

	const input = orgField.locator('input[role="combobox"]');
	await input.click();
	await page.waitForTimeout(300);
	await input.fill(name);
	await page.waitForTimeout(500);

	await orgField
		.locator(`.bx--list-box__menu-item:has-text("${name}")`)
		.click();
	await page.waitForTimeout(500);
}

export async function fillPost(page: Page, role: string) {
	const postField = page.locator('.membership-modal .bx--combo-box').nth(2);
	await postField.waitFor({ state: 'visible', timeout: 5000 });

	const input = postField.locator('input[role="combobox"]');
	await input.click();
	await page.waitForTimeout(300);
	await input.fill(role);
	await page.waitForTimeout(500);

	await postField
		.locator(`.bx--list-box__menu-item:has-text("${role}")`)
		.click();
	await page.waitForTimeout(500);
}

export async function saveMembershipModal(page: Page) {
	const primaryBtn = page.locator('.membership-modal .bx--btn--primary');
	await expect(primaryBtn).toBeEnabled({ timeout: 5000 });
	await primaryBtn.click();
	await page.waitForTimeout(500);
}

export function getMembershipRows(page: Page) {
	return page
		.locator('h4:has-text("Membership")')
		.locator('..')
		.locator('..')
		.locator(
			'.bx--data-table tbody tr:not([data-testid="empty-state"]), .bx--table tbody tr:not([data-testid="empty-state"])',
		);
}

export async function savePageChanges(page: Page) {
	await page.getByRole('button', { name: 'Save Changes' }).click();
	await page.waitForTimeout(TIMEOUTS.SAVE);
	const toast = page.locator(
		'[role="alert"].bx--toast-notification[kind="success"]',
	);
	await expect(toast).toContainText('เรียบร้อย', { timeout: TIMEOUTS.TOAST });
	await page.waitForTimeout(TIMEOUTS.SAVE);
}
