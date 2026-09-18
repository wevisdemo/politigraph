import { expect, type Locator, type Page } from '@playwright/test';
import { gql } from '../shared/graphql-helpers';

const TABLE_ROWS =
	'.bx--data-table tbody tr:not([data-testid="empty-state"]), .bx--table tbody tr:not([data-testid="empty-state"])';
const POSTS_HEADER =
	'h4.bx--data-table-header__title:has-text("Posts"), h4:has-text("Posts")';
const POST_MODAL = '.post-modal';
const POST_MEMBERSHIP_MODAL = '.post-membership-modal';

export async function waitForOrganizationTable(page: Page) {
	await expect(page.locator('h1:has-text("Organizations")')).toBeVisible({
		timeout: 10000,
	});
}

export async function waitForOrganizationDetail(page: Page) {
	await expect(page.locator('h4:has-text("Organization Details")')).toBeVisible(
		{ timeout: 10000 },
	);
}

export async function openAddPostModal(page: Page) {
	await page
		.locator(POSTS_HEADER)
		.locator('..')
		.locator('..')
		.getByRole('button', { name: 'Add' })
		.click();
	await expect(
		page.locator(`${POST_MODAL} .bx--modal-container`),
	).toBeVisible();
}

export function getPostRows(page: Page) {
	return page
		.locator(POSTS_HEADER)
		.locator('..')
		.locator('..')
		.locator(TABLE_ROWS);
}

export async function addLink(page: Page, note: string, url: string) {
	await page.getByRole('button', { name: 'Add a link' }).last().click();

	const lastNoteInput = page
		.locator('label:has-text("Notes")')
		.last()
		.locator('..')
		.locator('input');
	await lastNoteInput.fill(note);

	const lastUrlInput = page
		.locator('label:has-text("URL")')
		.last()
		.locator('..')
		.locator('input');
	await lastUrlInput.fill(url);
}

export async function fetchOrganizationDetail(page: Page, orgId: string) {
	const { organizations } = await gql(
		page,
		`query GetOrganization($id: ID!) {
			organizations(where: { id: { eq: $id } }) {
				id
				name
				name_en
				description
				classification
				parents { id name }
				children { id name }
				posts { id role memberships { id start_date end_date posts { id role } } }
				memberships { id start_date end_date posts { id role organizations { id name } } }
				links { id note url }
			}
		}`,
		{ id: orgId },
	);
	return organizations[0];
}

export async function openPostEditModal(page: Page, postRow: Locator) {
	await postRow.getByRole('button', { name: 'แก้ไข' }).click();
	await expect(
		page.locator(`${POST_MODAL} .bx--modal-container`),
	).toBeVisible();
}

export function getPostMembershipRows(page: Page) {
	return page
		.locator(`${POST_MODAL} .bx--modal-container`)
		.locator('h4:has-text("Memberships")')
		.locator('..')
		.locator('..')
		.locator(TABLE_ROWS);
}

export async function openAddPostMembershipModal(page: Page) {
	await page
		.locator(`${POST_MODAL} .bx--modal-container`)
		.locator('h4:has-text("Memberships")')
		.locator('..')
		.locator('..')
		.getByRole('button', { name: 'Add' })
		.click();
	await expect(
		page.locator(`${POST_MEMBERSHIP_MODAL} .bx--modal-container`),
	).toBeVisible();
}

export async function selectPostMembershipType(
	page: Page,
	type: 'Person' | 'Organization',
) {
	await page.locator(`${POST_MEMBERSHIP_MODAL} .bx--dropdown`).click();
	await page
		.locator(`${POST_MEMBERSHIP_MODAL} .bx--dropdown-item:has-text("${type}")`)
		.first()
		.click();
}

export async function fillPostMembershipPerson(page: Page, personName: string) {
	const personField = page.locator(`${POST_MEMBERSHIP_MODAL} .bx--combo-box`);
	const input = personField.locator('input[role="combobox"]');
	await input.click();
	await input.fill(personName);
	await personField
		.locator(`.bx--list-box__menu-item:has-text("${personName}")`)
		.first()
		.click();
}

export async function savePostMembershipModal(page: Page) {
	const primaryBtn = page.locator(`${POST_MEMBERSHIP_MODAL} .bx--btn--primary`);
	await expect(primaryBtn).toBeEnabled();
	await primaryBtn.click();
	await expect(
		page.locator(`${POST_MEMBERSHIP_MODAL} .bx--modal-container`),
	).toBeHidden();
}

export async function savePostModal(page: Page) {
	const primaryBtn = page.locator(
		`${POST_MODAL} .bx--modal-footer .bx--btn--primary`,
	);
	await expect(primaryBtn).toBeEnabled();
	await primaryBtn.click();
	await expect(page.locator(`${POST_MODAL} .bx--modal-container`)).toBeHidden();
}
