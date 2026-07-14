import { expect, type Page } from '@playwright/test';

const TIMEOUTS = {
	TABLE: 10000,
	SAVE: 3000,
	TOAST: 5000,
} as const;

export { TIMEOUTS };

export async function createTestOrganization(
	page: Page,
	name: string,
	classification: string,
) {
	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation CreateTestOrganization($id: ID!, $name: String!, $classification: OrganizationType!) {
					createOrganizations(
						input: [{ id: $id, name: $name, classification: $classification }]
					) {
						organizations { id name }
					}
				}
			`,
			variables: { id: crypto.randomUUID(), name, classification },
		},
	});

	expect(response.ok()).toBeTruthy();
	const data = await response.json();
	expect(data.errors, JSON.stringify(data.errors)).toBeUndefined();
	expect(data.data?.createOrganizations?.organizations).toHaveLength(1);

	return data.data.createOrganizations.organizations[0] as {
		id: string;
		name: string;
	};
}

export async function deleteTestOrganization(page: Page, id: string) {
	await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation DeleteTestOrganization($id: ID!) {
					deleteOrganizations(where: { id: { eq: $id } }) { nodesDeleted }
				}
			`,
			variables: { id },
		},
	});
}

export async function createTestPost(page: Page, role: string) {
	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation CreateTestPost($role: String!) {
					createPosts(input: [{ role: $role }]) {
						posts { id role }
					}
				}
			`,
			variables: { role },
		},
	});

	expect(response.ok()).toBeTruthy();
	const data = await response.json();
	expect(data.errors, JSON.stringify(data.errors)).toBeUndefined();
	expect(data.data?.createPosts?.posts).toHaveLength(1);

	return data.data.createPosts.posts[0] as { id: string; role: string };
}

export async function deleteTestPost(page: Page, id: string) {
	await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation DeleteTestPost($id: ID!) {
					deletePosts(where: { id: { eq: $id } }) { nodesDeleted }
				}
			`,
			variables: { id },
		},
	});
}

export async function linkPostToOrganization(
	page: Page,
	postId: string,
	orgId: string,
) {
	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation LinkPostToOrg($postId: ID!, $orgId: ID!) {
					updatePosts(
						where: { id: { eq: $postId } }
						update: {
							organizations: {
								connect: [{ where: { node: { id: { eq: $orgId } } } }]
							}
						}
					) { posts { id } }
				}
			`,
			variables: { postId, orgId },
		},
	});

	expect(response.ok()).toBeTruthy();
	const data = await response.json();
	expect(data.errors, JSON.stringify(data.errors)).toBeUndefined();
}

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

export async function cancelPostModal(page: Page) {
	const secondaryBtn = page.locator('.post-modal .bx--btn--secondary');
	await secondaryBtn.click();
	await page.waitForTimeout(300);
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

export function getOrganizationLinks(page: Page) {
	return page.locator('h4:has-text("References")').locator('..').locator('..');
}

export async function fetchOrganizationDetail(page: Page, orgId: string) {
	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `{
				organizations(where: { id: { eq: "${orgId}" } }) {
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
			}`,
		},
	});

	const data = await response.json();
	return data.data?.organizations?.[0];
}

export async function deleteTestLink(page: Page, id: string) {
	await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation DeleteTestLink($id: ID!) {
					deleteLinks(where: { id: { eq: $id } }) { nodesDeleted }
				}
			`,
			variables: { id },
		},
	});
}
