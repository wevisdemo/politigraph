import { expect, type Page } from '@playwright/test';
import {
	createTestOrganization,
	createTestPost,
	deleteTestLink,
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

export async function savePostModal(page: Page) {
	const primaryBtn = page.locator('.post-modal .bx--btn--primary');
	await expect(primaryBtn).toBeEnabled({ timeout: 5000 });
	await primaryBtn.click();
	await page.waitForTimeout(500);
}

export function getPostRows(page: Page) {
	return page
		.locator(
			'h4.bx--data-table-header__title:has-text("Posts"), h4:has-text("Posts")',
		)
		.locator('..')
		.locator('..')
		.locator('.bx--data-table tbody tr, .bx--table tbody tr');
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
						posts { id role }
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
