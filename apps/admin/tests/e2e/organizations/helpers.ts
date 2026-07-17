import { expect, type Locator, type Page } from '@playwright/test';
import { createTestPerson } from '../fixtures';
import {
	createTestMembership,
	createTestOrganization,
	createTestPost,
	deleteTestLink,
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
	deleteTestLink,
	createTestMembership,
	deleteTestMembership,
	createTestPerson,
};

const TIMEOUTS = {
	TABLE: 10000,
	SAVE: 3000,
	TOAST: 5000,
} as const;

export { TIMEOUTS };

export async function waitForOrganizationTable(page: Page) {
	await page.locator('h1:has-text("Organizations")').waitFor({
		state: 'visible',
		timeout: TIMEOUTS.TABLE,
	});
	await page.waitForTimeout(500);
}

export async function waitForOrganizationDetail(page: Page) {
	await page.locator('h4:has-text("Organization Details")').waitFor({
		state: 'visible',
		timeout: TIMEOUTS.TABLE,
	});
	await page.waitForTimeout(500);
}

export async function saveOrganizationChanges(page: Page) {
	await page.getByRole('button', { name: 'Save Changes' }).click();
	await page.waitForTimeout(TIMEOUTS.SAVE);
	const toast = page.locator(
		'[role="alert"].bx--toast-notification[kind="success"]',
	);
	await expect(toast).toContainText('เรียบร้อย', { timeout: TIMEOUTS.TOAST });
	await page.waitForTimeout(TIMEOUTS.SAVE);
}

export async function openAddPostModal(page: Page) {
	const postsHeader = page.locator(
		'h4.bx--data-table-header__title:has-text("Posts"), h4:has-text("Posts")',
	);
	await postsHeader.waitFor({ state: 'visible', timeout: 10000 });
	const postsSection = postsHeader.locator('..').locator('..');
	await postsSection.getByRole('button', { name: 'Add' }).click();

	await page.locator('.post-modal .bx--modal-container').waitFor({
		state: 'visible',
		timeout: 5000,
	});
	await page.waitForTimeout(300);
}

export function getPostRows(page: Page) {
	return page
		.locator(
			'h4.bx--data-table-header__title:has-text("Posts"), h4:has-text("Posts")',
		)
		.locator('..')
		.locator('..')
		.locator(
			'.bx--data-table tbody tr:not([data-testid="empty-state"]), .bx--table tbody tr:not([data-testid="empty-state"])',
		);
}

export async function addLink(page: Page, note: string, url: string) {
	await page.getByRole('button', { name: 'Add a link' }).last().click();
	await page.waitForTimeout(500);

	const linkInputs = page.locator('label:has-text("Notes")');
	const lastNoteInput = linkInputs.last().locator('..').locator('input');
	await lastNoteInput.waitFor({ state: 'visible', timeout: 5000 });
	await lastNoteInput.fill(note);

	const urlInputs = page.locator('label:has-text("URL")');
	const lastUrlInput = urlInputs.last().locator('..').locator('input');
	await lastUrlInput.fill(url);
}

export async function fetchOrganizationDetail(page: Page, orgId: string) {
	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				query GetOrganization($id: ID!) {
					organizations(where: { id: { eq: $id } }) {
						id
						name
						name_en
						description
						classification
						founding_date
						dissolution_date
						color
						parents { id name }
						children { id name }
						posts { id role memberships { id start_date end_date posts { id role } } }
						memberships { id start_date end_date posts { id role organizations { id name } } }
						links { id note url }
					}
				}
			`,
			variables: { id: orgId },
		},
	});

	expect(response.ok(), `Failed to fetch organization ${orgId}`).toBeTruthy();
	const data = await response.json();
	return data.data?.organizations?.[0];
}

export async function waitForMembershipTable(page: Page) {
	await page.locator('h4:has-text("Membership")').waitFor({
		state: 'visible',
		timeout: TIMEOUTS.TABLE,
	});
	await page.waitForTimeout(500);
}

const MEMBER_FIXED_MODAL = '.membership-modal:not(.post-membership-modal)';
const POST_MEMBERSHIP_MODAL = '.post-membership-modal';
const POST_DELETE_MODAL = '.post-delete-membership-modal';

export async function openAddMembershipModal(page: Page) {
	const header = page.locator('h4:has-text("Membership")');
	await header.waitFor({ state: 'visible', timeout: TIMEOUTS.TABLE });
	const section = header.locator('..').locator('..');
	await section.getByRole('button', { name: 'Add' }).click();

	await page.locator(`${MEMBER_FIXED_MODAL} .bx--modal-container`).waitFor({
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
		.locator(`${MEMBER_FIXED_MODAL} .bx--combo-box`)
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
	const orgField = page.locator(`${MEMBER_FIXED_MODAL} .bx--combo-box`).nth(1);
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
	const postField = page.locator(`${MEMBER_FIXED_MODAL} .bx--combo-box`).nth(2);
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
	const primaryBtn = page.locator(`${MEMBER_FIXED_MODAL} .bx--btn--primary`);
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

export async function openPostEditModal(page: Page, postRow: Locator) {
	await postRow.getByRole('button', { name: 'แก้ไข' }).click();
	await page.locator('.post-modal .bx--modal-container').waitFor({
		state: 'visible',
		timeout: 5000,
	});
	await page.waitForTimeout(300);
}

export function getPostMembershipRows(page: Page) {
	const postModal = page.locator('.post-modal .bx--modal-container');
	return postModal
		.locator('h4:has-text("Memberships")')
		.locator('..')
		.locator('..')
		.locator(
			'.bx--data-table tbody tr:not([data-testid="empty-state"]), .bx--table tbody tr:not([data-testid="empty-state"])',
		);
}

export async function openAddPostMembershipModal(page: Page) {
	const postModal = page.locator('.post-modal .bx--modal-container');
	const membershipsHeader = postModal.locator('h4:has-text("Memberships")');
	const section = membershipsHeader.locator('..').locator('..');
	await section.getByRole('button', { name: 'Add' }).click();

	await page.locator(`${POST_MEMBERSHIP_MODAL} .bx--modal-container`).waitFor({
		state: 'visible',
		timeout: 5000,
	});
	await page.waitForTimeout(300);
}

export async function selectPostMembershipType(
	page: Page,
	type: 'Person' | 'Organization',
) {
	const dropdown = page.locator(`${POST_MEMBERSHIP_MODAL} .bx--dropdown`);
	await dropdown.waitFor({ state: 'visible', timeout: 5000 });
	await dropdown.click();
	await page.waitForTimeout(300);
	await page
		.locator(`${POST_MEMBERSHIP_MODAL} .bx--dropdown-item:has-text("${type}")`)
		.first()
		.click();
	await page.waitForTimeout(300);
}

export async function fillPostMembershipPerson(page: Page, personName: string) {
	const personField = page.locator(`${POST_MEMBERSHIP_MODAL} .bx--combo-box`);
	await personField.waitFor({ state: 'visible', timeout: 5000 });
	const input = personField.locator('input[role="combobox"]');
	await input.click();
	await page.waitForTimeout(300);
	await input.fill(personName);
	await page.waitForTimeout(500);
	await personField
		.locator(`.bx--list-box__menu-item:has-text("${personName}")`)
		.first()
		.click();
	await page.waitForTimeout(300);
}

export async function savePostMembershipModal(page: Page) {
	const primaryBtn = page.locator(`${POST_MEMBERSHIP_MODAL} .bx--btn--primary`);
	await expect(primaryBtn).toBeEnabled({ timeout: 5000 });
	await primaryBtn.click();
	await page.waitForTimeout(500);
}

export async function deletePostMembership(page: Page, row: Locator) {
	await row.getByRole('button', { name: 'ลบ' }).click();
	const deleteModal = page.locator(`${POST_DELETE_MODAL} .bx--modal-container`);
	await expect(deleteModal).toBeVisible({ timeout: 5000 });
	await page
		.locator(
			`${POST_DELETE_MODAL} .bx--btn--danger, ${POST_DELETE_MODAL} .bx--btn--primary`,
		)
		.click();
	await page.waitForTimeout(500);
}

export async function savePostModal(page: Page) {
	const primaryBtn = page.locator(
		'.post-modal .bx--modal-footer .bx--btn--primary',
	);
	await expect(primaryBtn).toBeEnabled({ timeout: 5000 });
	await primaryBtn.click();
	await page.waitForTimeout(500);
}
