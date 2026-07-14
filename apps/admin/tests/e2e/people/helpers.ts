import { expect, type Page } from '@playwright/test';
import {
	createTestOrganization,
	createTestPost,
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

export async function createTestMembership(
	page: Page,
	personId: string,
	postId: string,
	dates?: { start_date?: string; end_date?: string },
) {
	const startDate = dates?.start_date ?? '2020-01-01';
	const endDate = dates?.end_date;

	const mutation = endDate
		? `
			mutation CreateTestMembership($personId: ID!, $postId: ID!, $startDate: Date!, $endDate: Date!) {
				createMemberships(
					input: [{
						start_date: $startDate
						end_date: $endDate
						members: {
							Person: {
								connect: [{ where: { node: { id: { eq: $personId } } } }]
							}
						}
						posts: {
							connect: [{ where: { node: { id: { eq: $postId } } } }]
						}
					}]
				) {
					memberships { id }
				}
			}
		`
		: `
			mutation CreateTestMembership($personId: ID!, $postId: ID!, $startDate: Date!) {
				createMemberships(
					input: [{
						start_date: $startDate
						members: {
							Person: {
								connect: [{ where: { node: { id: { eq: $personId } } } }]
							}
						}
						posts: {
							connect: [{ where: { node: { id: { eq: $postId } } } }]
						}
					}]
				) {
					memberships { id }
				}
			}
		`;

	const variables: Record<string, string> = {
		personId,
		postId,
		startDate,
		...(endDate ? { endDate } : {}),
	};

	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: { query: mutation, variables },
	});

	if (!response.ok()) {
		const body = await response.text();
		throw new Error(
			`createTestMembership failed: ${response.status()} ${body}`,
		);
	}
	const data = await response.json();
	if (data.errors) {
		throw new Error(
			`createTestMembership GraphQL errors: ${JSON.stringify(data.errors)}`,
		);
	}

	return data.data.createMemberships.memberships[0] as { id: string };
}

export async function deleteTestMembership(page: Page, id: string) {
	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation DeleteTestMembership($id: ID!) {
					deleteMemberships(where: { id: { eq: $id } }) { nodesDeleted }
				}
			`,
			variables: { id },
		},
	});
	expect(response.ok(), `Failed to delete membership ${id}`).toBeTruthy();
}

export async function waitForMembershipTable(page: Page) {
	await page.locator('h4:has-text("Membership")').waitFor({
		state: 'visible',
		timeout: TIMEOUTS.TABLE,
	});
	await page.waitForTimeout(500);
}

export async function openAddMembershipModal(page: Page) {
	await page
		.locator('h4:has-text("Membership")')
		.locator('..')
		.getByRole('button', { name: 'Add' })
		.click();

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
		.locator('.bx--data-table tbody tr, .bx--table tbody tr');
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
