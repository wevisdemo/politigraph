import { expect, test } from '@playwright/test';
import { createTestPerson, login } from '../fixtures';
import {
	addLink,
	createTestMembership,
	createTestOrganization,
	createTestPost,
	deletePostMembership,
	deleteTestLink,
	deleteTestMembership,
	deleteTestOrganization,
	deleteTestPost,
	fetchOrganizationDetail,
	fillClassification,
	fillOrganizationName,
	fillPost,
	fillPostMembershipPerson,
	getMembershipRows,
	getPostMembershipRows,
	getPostRows,
	linkPostToOrganization,
	openAddMembershipModal,
	openAddPostMembershipModal,
	openAddPostModal,
	openPostEditModal,
	saveMembershipModal,
	saveOrganizationChanges,
	savePostMembershipModal,
	savePostModal,
	selectPostMembershipType,
	waitForMembershipTable,
	waitForOrganizationDetail,
} from './helpers';

const genId = () => `${test.info().workerIndex}-${Date.now()}`;

test.describe('Organization Detail - Edit & Persist', () => {
	let orgId: string;
	let orgName: string;

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		orgName = `TestOrgDetail${uid}`;

		const org = await createTestOrganization(page, orgName, 'POLITICAL_PARTY');
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, orgId);
	});

	test('detail page shows organization fields', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await expect(
			page.locator('h4:has-text("Organization Details")'),
		).toBeVisible();
		await expect(page.getByLabel('Name*')).toBeVisible();
		await expect(page.getByLabel('Name (Eng)')).toBeVisible();
		await expect(page.getByLabel('Description')).toBeVisible();
		await expect(page.getByLabel('Classification*')).toBeVisible();
	});

	test('edit multiple fields and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const uid = genId();
		const newName = `Updated${uid}`;
		const newNameEn = `UpdatedEn${uid}`;
		const newDesc = `Description ${uid}`;

		await page.getByLabel('Name*').clear();
		await page.getByLabel('Name*').fill(newName);

		await page.getByLabel('Name (Eng)').clear();
		await page.getByLabel('Name (Eng)').fill(newNameEn);

		await page.getByLabel('Description').clear();
		await page.getByLabel('Description').fill(newDesc);

		await page.getByLabel('Classification*').selectOption('CABINET');

		await saveOrganizationChanges(page);

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
		await login(page);

		const uid = genId();
		const parent = await createTestOrganization(
			page,
			`ParentOrg${uid}`,
			'POLITICAL_PARTY',
		);
		parentOrgId = parent.id;

		const child = await createTestOrganization(
			page,
			`ChildOrg${uid}`,
			'POLITICAL_PARTY',
		);
		childOrgId = child.id;

		const main = await createTestOrganization(
			page,
			`MainOrg${uid}`,
			'POLITICAL_PARTY',
		);
		mainOrgId = main.id;
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

		const parentWrapper = page
			.locator('.bx--list-box__wrapper')
			.filter({ has: page.locator('label.bx--label:has-text("Parents")') });
		await parentWrapper.waitFor({ state: 'visible', timeout: 10000 });
		const parentField = parentWrapper.locator('.bx--combo-box');
		const parentInput = parentField.locator('input[role="combobox"]');
		await parentInput.click();
		await page.waitForTimeout(300);
		await parentInput.fill('ParentOrg');
		await page.waitForTimeout(500);

		await parentField
			.locator(`.bx--list-box__menu-item:has-text("ParentOrg")`)
			.first()
			.click();
		await page.waitForTimeout(300);

		const childWrapper = page
			.locator('.bx--list-box__wrapper')
			.filter({ has: page.locator('label.bx--label:has-text("Children")') });
		await childWrapper.scrollIntoViewIfNeeded();
		await childWrapper.waitFor({ state: 'visible', timeout: 10000 });
		const childField = childWrapper.locator('.bx--combo-box');
		const childInput = childField.locator('input[role="combobox"]');
		await childInput.click();
		await page.waitForTimeout(300);
		await childInput.fill('ChildOrg');
		await page.waitForTimeout(500);

		await childField
			.locator(`.bx--list-box__menu-item:has-text("ChildOrg")`)
			.first()
			.click();
		await page.waitForTimeout(500);

		await saveOrganizationChanges(page);

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
		await login(page);

		const uid = genId();
		const org = await createTestOrganization(
			page,
			`PostOrg${uid}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, orgId);
	});

	test('add post locally', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openAddPostModal(page);

		await page
			.locator('.post-modal input[label="Role*"], .post-modal')
			.locator('input')
			.first()
			.fill('Test Role');

		await savePostModal(page);

		const rows = getPostRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText('Test Role');
	});

	test('add post persisted via Save Changes', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openAddPostModal(page);

		await page
			.locator('.post-modal input[label="Role*"], .post-modal')
			.locator('input')
			.first()
			.fill('Persisted Role');

		await savePostModal(page);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(
			detail.posts.some((p: { role: string }) => p.role === 'Persisted Role'),
		).toBe(true);
	});

	test('delete post locally', async ({ page }) => {
		const post = await createTestPost(page, `DeletePost${genId()}`);
		await linkPostToOrganization(page, post.id, orgId);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const rows = getPostRows(page);
		await expect(rows).toHaveCount(1);

		await rows.first().getByRole('button', { name: 'ลบ' }).click();

		const deleteModal = page.locator('.delete-post-modal .bx--modal-container');
		await expect(deleteModal).toBeVisible({ timeout: 5000 });
		await page
			.locator(
				'.delete-post-modal .bx--btn--danger, .delete-post-modal .bx--btn--primary',
			)
			.click();
		await page.waitForTimeout(500);

		await expect(rows.first().locator('p.line-through').first()).toBeVisible();

		await deleteTestPost(page, post.id);
	});
});

test.describe('Organization Detail - Links', () => {
	let orgId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		const org = await createTestOrganization(
			page,
			`LinkOrg${uid}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		const detail = await fetchOrganizationDetail(page, orgId);
		if (detail?.links) {
			for (const link of detail.links) {
				await deleteTestLink(page, link.id);
			}
		}
		await deleteTestOrganization(page, orgId);
	});

	test('add link then delete and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const note = `Test Note ${genId()}`;
		const url = `https://example.com/${genId()}`;

		await addLink(page, note, url);

		await saveOrganizationChanges(page);

		const detailAfterAdd = await fetchOrganizationDetail(page, orgId);
		expect(
			detailAfterAdd.links.some(
				(l: { note: string; url: string }) => l.note === note && l.url === url,
			),
		).toBe(true);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const refsSection = page.locator('h4:has-text("References")').locator('..');
		const deleteBtn = refsSection
			.getByRole('button', { name: 'Delete' })
			.first();
		await deleteBtn.click();
		await page.waitForTimeout(300);

		await saveOrganizationChanges(page);

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
		await login(page);

		const uid = genId();
		postOrgName = `PostOrg${uid}`;
		postRole = `PostRole${uid}`;
		altPostOrgName = `AltOrg${uid}`;
		altPostRole = `AltPost${uid}`;

		const mainOrg = await createTestOrganization(
			page,
			`MainOrg${uid}`,
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
		await waitForMembershipTable(page);

		await openAddMembershipModal(page);

		await fillClassification(page, 'POLITICAL_PARTY');
		await fillOrganizationName(page, postOrgName);
		await fillPost(page, postRole);
		await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const input = (globalThis as any).document.querySelector(
				'.membership-modal:not(.post-membership-modal) .membership-datepicker input',
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(input as any)._flatpickr.setDate('2024-01-15', true);
		});
		await page.waitForTimeout(300);
		await saveMembershipModal(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toHaveClass(/FFF8E1/);
		await expect(rows.first()).toContainText(postOrgName);
		await expect(rows.first()).toContainText(postRole);

		await saveOrganizationChanges(page);

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
			{
				start_date: '2024-01-01',
			},
		);
		seededMembershipIds.push(membership.id);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);
		await waitForMembershipTable(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText(postOrgName);

		await rows.first().getByRole('button', { name: 'แก้ไข' }).click();
		await page
			.locator(
				'.membership-modal:not(.post-membership-modal) .bx--modal-container',
			)
			.waitFor({
				state: 'visible',
				timeout: 5000,
			});

		await fillOrganizationName(page, altPostOrgName);
		await fillPost(page, altPostRole);

		await saveMembershipModal(page);

		const updatedRows = getMembershipRows(page);
		await expect(updatedRows.first()).toContainText(altPostOrgName);
		await expect(updatedRows.first()).toContainText(altPostRole);

		await saveOrganizationChanges(page);

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
	let orgName: string;
	let postId: string;
	let postRole: string;
	let personName: string;
	const seededMembershipIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		orgName = `PostMemOrg${uid}`;
		postRole = `PostMemRole${uid}`;
		personName = `PostMemPerson${uid}`;

		const org = await createTestOrganization(page, orgName, 'POLITICAL_PARTY');
		orgId = org.id;

		const post = await createTestPost(page, postRole);
		postId = post.id;
		await linkPostToOrganization(page, postId, orgId);

		await createTestPerson(page, {
			firstname: personName,
			lastname: 'Test',
		});
	});

	test.afterEach(async ({ page }) => {
		for (const id of seededMembershipIds) {
			await deleteTestMembership(page, id);
		}
		seededMembershipIds.length = 0;
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
		await saveOrganizationChanges(page);

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

		const postRows = getPostRows(page);
		await openPostEditModal(page, postRows.first());

		const pmRows = getPostMembershipRows(page);
		await expect(pmRows).toHaveCount(1);
		await pmRows.first().getByRole('button', { name: 'แก้ไข' }).click();

		await page
			.locator('.post-membership-modal .bx--modal-container')
			.waitFor({ state: 'visible', timeout: 5000 });

		await page.evaluate(() => {
			const inputs = document.querySelectorAll(
				'.post-membership-modal .membership-datepicker input',
			);
			if (inputs[0]) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(inputs[0] as any)._flatpickr.setDate('2025-06-15', true);
			}
		});
		await page.waitForTimeout(300);

		await savePostMembershipModal(page);
		await savePostModal(page);
		await saveOrganizationChanges(page);

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
		seededMembershipIds.push(membership.id);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const postRows = getPostRows(page);
		await openPostEditModal(page, postRows.first());

		const pmRows = getPostMembershipRows(page);
		await expect(pmRows).toHaveCount(1);
		await deletePostMembership(page, pmRows.first());

		await savePostModal(page);
		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		const deleted = detail.memberships?.find(
			(m: { id: string }) => m.id === membership.id,
		);
		expect(deleted).toBeUndefined();
		seededMembershipIds.length = 0;
	});

	test('new post shows membership hint instead of table', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openAddPostModal(page);

		const hint = page.locator(
			'.post-modal :text("Membership can be added after the post has been successfully created and saved.")',
		);
		await expect(hint).toBeVisible();

		const membershipTable = page.locator(
			'.post-modal h4:has-text("Memberships")',
		);
		await expect(membershipTable).not.toBeVisible();
	});
});
