import { expect, test } from '@playwright/test';
import {
	createTestMembership,
	createTestOrganization,
	createTestPerson,
	createTestPost,
	deleteTestLink,
	deleteTestMembership,
	deleteTestOrganization,
	deleteTestPerson,
	deleteTestPost,
	linkPostToOrganization,
} from '../shared/graphql-helpers';
import {
	confirmDeleteModal,
	fillClassification,
	fillOrganizationName,
	fillPost,
	genId,
	getMembershipRows,
	openAddMembershipModal,
	openEditMembershipModal,
	saveChanges,
	saveMembershipModal,
	setMembershipDate,
	waitForMembershipTable,
} from '../shared/ui-helpers';
import {
	addLink,
	fetchOrganizationDetail,
	fillPostMembershipPerson,
	getPostMembershipRows,
	getPostRows,
	openAddPostMembershipModal,
	openAddPostModal,
	openPostEditModal,
	savePostMembershipModal,
	savePostModal,
	selectPostMembershipType,
	waitForOrganizationDetail,
} from './helpers';

const uid = () => genId(test.info().workerIndex);

test.describe('Organization Detail - Edit & Persist', () => {
	let orgId: string;

	test.beforeEach(async ({ page }) => {
		const org = await createTestOrganization(
			page,
			`TestOrgDetail${uid()}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, orgId);
	});

	test('edit multiple fields and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const id = uid();
		const newName = `Updated${id}`;
		const newNameEn = `UpdatedEn${id}`;
		const newDesc = `Description ${id}`;

		await page.getByLabel('Name*').fill(newName);
		await page.getByLabel('Name (Eng)').fill(newNameEn);
		await page.getByLabel('Description').fill(newDesc);
		await page.getByLabel('Classification*').selectOption('CABINET');

		await saveChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail.name).toBe(newName);
		expect(detail.name_en).toBe(newNameEn);
		expect(detail.description).toBe(newDesc);
		expect(detail.classification).toBe('CABINET');
	});
});

test.describe('Organization Detail - Parent/Child Relationships', () => {
	let parentOrgId: string;
	let childOrgId: string;
	let mainOrgId: string;

	test.beforeEach(async ({ page }) => {
		const id = uid();
		[parentOrgId, childOrgId, mainOrgId] = await Promise.all(
			['ParentOrg', 'ChildOrg', 'MainOrg'].map(async (prefix) => {
				const org = await createTestOrganization(
					page,
					`${prefix}${id}`,
					'POLITICAL_PARTY',
				);
				return org.id;
			}),
		);
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, mainOrgId);
		await deleteTestOrganization(page, childOrgId);
		await deleteTestOrganization(page, parentOrgId);
	});

	test('add parent and child organizations via multi-select', async ({
		page,
	}) => {
		await page.goto(`/organizations/${mainOrgId}`);
		await waitForOrganizationDetail(page);

		for (const [label, query] of [
			['Parents', 'ParentOrg'],
			['Children', 'ChildOrg'],
		]) {
			const field = page
				.locator('.bx--list-box__wrapper')
				.filter({ has: page.locator(`label.bx--label:has-text("${label}")`) })
				.locator('.bx--combo-box');
			const input = field.locator('input[role="combobox"]');
			await input.click();
			await input.fill(query);
			await field
				.locator(`.bx--list-box__menu-item:has-text("${query}")`)
				.first()
				.click();
		}

		await saveChanges(page);

		const detail = await fetchOrganizationDetail(page, mainOrgId);
		expect(
			detail.parents.some((p: { id: string }) => p.id === parentOrgId),
		).toBe(true);
		expect(
			detail.children.some((c: { id: string }) => c.id === childOrgId),
		).toBe(true);
	});
});

test.describe('Organization Detail - Posts CRUD', () => {
	let orgId: string;

	test.beforeEach(async ({ page }) => {
		const org = await createTestOrganization(
			page,
			`PostOrg${uid()}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, orgId);
	});

	test('add post then delete it, persisting each step', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openAddPostModal(page);
		await page.locator('.post-modal input').first().fill('Persisted Role');
		await savePostModal(page);

		const rows = getPostRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText('Persisted Role');

		await saveChanges(page);

		const detailAfterAdd = await fetchOrganizationDetail(page, orgId);
		expect(detailAfterAdd.posts.map((p: { role: string }) => p.role)).toEqual([
			'Persisted Role',
		]);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);
		await expect(rows).toHaveCount(1);

		await rows.first().getByRole('button', { name: 'ลบ' }).click();
		await confirmDeleteModal(page, 'delete-post-modal');
		await expect(rows.first().locator('p.line-through').first()).toBeVisible();

		await saveChanges(page);

		const detailAfterDelete = await fetchOrganizationDetail(page, orgId);
		expect(detailAfterDelete.posts).toHaveLength(0);
		await deleteTestPost(page, detailAfterAdd.posts[0].id);
	});
});

test.describe('Organization Detail - Links', () => {
	let orgId: string;

	test.beforeEach(async ({ page }) => {
		const org = await createTestOrganization(
			page,
			`LinkOrg${uid()}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		const detail = await fetchOrganizationDetail(page, orgId);
		for (const link of detail?.links ?? []) {
			await deleteTestLink(page, link.id);
		}
		await deleteTestOrganization(page, orgId);
	});

	test('add link then delete and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const note = `Test Note ${uid()}`;
		const url = `https://example.com/${uid()}`;

		await addLink(page, note, url);
		await saveChanges(page);

		const detailAfterAdd = await fetchOrganizationDetail(page, orgId);
		expect(
			detailAfterAdd.links.some(
				(l: { note: string; url: string }) => l.note === note && l.url === url,
			),
		).toBe(true);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await page
			.locator('h4:has-text("References")')
			.locator('..')
			.getByRole('button', { name: 'Delete' })
			.first()
			.click();
		await saveChanges(page);

		const detailAfterDelete = await fetchOrganizationDetail(page, orgId);
		expect(detailAfterDelete.links).toHaveLength(0);
	});
});

test.describe('Organization Detail - Membership CRUD', () => {
	let orgId: string;
	let postOrgId: string;
	let postOrgName: string;
	let postId: string;
	let postRole: string;
	let altPostOrgId: string;
	let altPostOrgName: string;
	let altPostId: string;
	let altPostRole: string;
	const seededMembershipIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		const id = uid();
		postOrgName = `PostOrg${id}`;
		postRole = `PostRole${id}`;
		altPostOrgName = `AltOrg${id}`;
		altPostRole = `AltPost${id}`;

		const mainOrg = await createTestOrganization(
			page,
			`MainOrg${id}`,
			'POLITICAL_PARTY',
		);
		orgId = mainOrg.id;

		const postOrg = await createTestOrganization(
			page,
			postOrgName,
			'POLITICAL_PARTY',
		);
		postOrgId = postOrg.id;

		const post = await createTestPost(page, postRole);
		postId = post.id;
		await linkPostToOrganization(page, postId, postOrgId);

		const altPostOrg = await createTestOrganization(
			page,
			altPostOrgName,
			'POLITICAL_PARTY',
		);
		altPostOrgId = altPostOrg.id;

		const altPost = await createTestPost(page, altPostRole);
		altPostId = altPost.id;
		await linkPostToOrganization(page, altPostId, altPostOrgId);
	});

	test.afterEach(async ({ page }) => {
		for (const id of seededMembershipIds) {
			await deleteTestMembership(page, id);
		}
		seededMembershipIds.length = 0;
		await deleteTestOrganization(page, orgId);
		await deleteTestPost(page, postId);
		await deleteTestOrganization(page, postOrgId);
		await deleteTestPost(page, altPostId);
		await deleteTestOrganization(page, altPostOrgId);
	});

	test('add membership locally then persist via Save Changes', async ({
		page,
	}) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);
		await openAddMembershipModal(page);

		await fillClassification(page, 'POLITICAL_PARTY');
		await fillOrganizationName(page, postOrgName);
		await fillPost(page, postRole);
		await setMembershipDate(page, '2024-01-15');
		await saveMembershipModal(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toHaveClass(/FFF8E1/);
		await expect(rows.first()).toContainText(postOrgName);
		await expect(rows.first()).toContainText(postRole);

		await saveChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		for (const m of detail.memberships ?? []) {
			seededMembershipIds.push(m.id);
		}
		expect(detail.memberships).toHaveLength(1);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);
		await waitForMembershipTable(page);

		const persistedRows = getMembershipRows(page);
		await expect(persistedRows).toHaveCount(1);
		await expect(persistedRows.first()).toContainText(postOrgName);
		await expect(persistedRows.first()).not.toHaveClass(/FFF8E1/);
	});

	test('edit membership post selection persists via Save Changes', async ({
		page,
	}) => {
		const membership = await createTestMembership(
			page,
			orgId,
			postId,
			'Organization',
			{ start_date: '2024-01-01' },
		);
		seededMembershipIds.push(membership.id);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);
		await waitForMembershipTable(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText(postOrgName);

		await openEditMembershipModal(page);
		await fillOrganizationName(page, altPostOrgName);
		await fillPost(page, altPostRole);
		await saveMembershipModal(page);

		await expect(rows.first()).toContainText(altPostOrgName);
		await expect(rows.first()).toContainText(altPostRole);

		await saveChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		const updatedMembership = detail.memberships?.find(
			(m: { id: string }) => m.id === membership.id,
		);
		expect(updatedMembership).toBeDefined();
		expect(updatedMembership.posts[0].id).toBe(altPostId);
	});
});

test.describe('Organization Detail - Post Membership CRUD', () => {
	test.setTimeout(60000);

	let orgId: string;
	let postId: string;
	let personId: string;
	let personName: string;
	const seededMembershipIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		const id = uid();
		personName = `PostMemPerson${id}`;

		const org = await createTestOrganization(
			page,
			`PostMemOrg${id}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;

		const post = await createTestPost(page, `PostMemRole${id}`);
		postId = post.id;
		await linkPostToOrganization(page, postId, orgId);

		const person = await createTestPerson(page, {
			firstname: personName,
			lastname: 'Test',
		});
		personId = person.id;
	});

	test.afterEach(async ({ page }) => {
		for (const id of seededMembershipIds) {
			await deleteTestMembership(page, id);
		}
		seededMembershipIds.length = 0;
		await deleteTestPerson(page, personId);
		await deleteTestPost(page, postId);
		await deleteTestOrganization(page, orgId);
	});

	test('add membership to existing post and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const postRows = getPostRows(page);
		await expect(postRows).toHaveCount(1);
		await openPostEditModal(page, postRows.first());

		await openAddPostMembershipModal(page);
		await selectPostMembershipType(page, 'Person');
		await fillPostMembershipPerson(page, personName);
		await savePostMembershipModal(page);

		const pmRows = getPostMembershipRows(page);
		await expect(pmRows).toHaveCount(1);
		await expect(pmRows.first()).toContainText(personName);

		await savePostModal(page);
		await saveChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		const savedPost = detail.posts.find((p: { id: string }) => p.id === postId);
		expect(savedPost).toBeDefined();

		const postMemberships = savedPost?.memberships ?? [];
		expect(postMemberships.length).toBeGreaterThan(0);
		seededMembershipIds.push(postMemberships[0].id);
	});

	test('edit membership dates and persist', async ({ page }) => {
		const membership = await createTestMembership(
			page,
			orgId,
			postId,
			'Organization',
			{ start_date: '2024-01-01' },
		);
		seededMembershipIds.push(membership.id);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openPostEditModal(page, getPostRows(page).first());

		const pmRows = getPostMembershipRows(page);
		await expect(pmRows).toHaveCount(1);
		await pmRows.first().getByRole('button', { name: 'แก้ไข' }).click();
		await expect(
			page.locator('.post-membership-modal .bx--modal-container'),
		).toBeVisible();

		await setMembershipDate(page, '2025-06-15', {
			modal: '.post-membership-modal',
		});

		await savePostMembershipModal(page);
		await savePostModal(page);
		await saveChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		const updated = detail.memberships?.find(
			(m: { id: string }) => m.id === membership.id,
		);
		expect(updated).toBeDefined();
		expect(updated.start_date).toBe('2025-06-15');
	});

	test('delete membership from post and persist', async ({ page }) => {
		const membership = await createTestMembership(
			page,
			orgId,
			postId,
			'Organization',
		);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openPostEditModal(page, getPostRows(page).first());

		const pmRows = getPostMembershipRows(page);
		await expect(pmRows).toHaveCount(1);
		await pmRows.first().getByRole('button', { name: 'ลบ' }).click();
		await confirmDeleteModal(page, 'post-delete-membership-modal');

		await savePostModal(page);
		await saveChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(
			detail.memberships?.find((m: { id: string }) => m.id === membership.id),
		).toBeUndefined();
	});
});
