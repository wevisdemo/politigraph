import { expect, type Page } from '@playwright/test';

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
	const response = await page.request.post('/graphql', {
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
	expect(response.ok(), `Failed to delete organization ${id}`).toBeTruthy();
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
	const response = await page.request.post('/graphql', {
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
	expect(response.ok(), `Failed to delete post ${id}`).toBeTruthy();
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

export async function deleteTestLink(page: Page, id: string) {
	const response = await page.request.post('/graphql', {
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
	expect(response.ok(), `Failed to delete link ${id}`).toBeTruthy();
}
