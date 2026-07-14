import { expect, test } from '@playwright/test';
import { createTestPerson, login } from '../fixtures';
import {
	createTestMembership,
	createTestOrganization,
	createTestPost,
	deleteTestMembership,
	deleteTestOrganization,
	deleteTestPost,
	fillClassification,
	fillOrganizationName,
	fillPost,
	getMembershipRows,
	linkPostToOrganization,
	openAddMembershipModal,
	ORGANIZATION_CLASSIFICATIONS,
	saveMembershipModal,
	savePageChanges,
	waitForMembershipTable,
} from './helpers';

const genId = () => `${test.info().workerIndex}-${Date.now()}`;

test.describe('Membership CRUD', () => {
	let orgId: string;
	let orgName: string;
	let postId: string;
	let postRole: string;
	let personId: string;
	const seededMembershipIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		orgName = `TestOrg${uid}`;
		postRole = `TestPost${uid}`;

		const org = await createTestOrganization(
			page,
			orgName,
			ORGANIZATION_CLASSIFICATIONS.POLITICAL_PARTY,
		);
		orgId = org.id;

		const post = await createTestPost(page, postRole);
		postId = post.id;

		await linkPostToOrganization(page, postId, orgId);

		await createTestPerson(page, {
			firstname: 'สมาชิก',
			lastname: `ทดสอบ${uid}`,
		});
		personId = page.url().split('/people/')[1];
	});

	test.afterEach(async ({ page }) => {
		for (const id of seededMembershipIds) {
			await deleteTestMembership(page, id);
		}
		seededMembershipIds.length = 0;
		await deleteTestOrganization(page, orgId);
		await deleteTestPost(page, postId);
	});

	test('add membership locally then persist via Save Changes', async ({
		page,
	}) => {
		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		await openAddMembershipModal(page);

		await fillClassification(
			page,
			ORGANIZATION_CLASSIFICATIONS.POLITICAL_PARTY,
		);
		await fillOrganizationName(page, orgName);
		await fillPost(page, postRole);
		await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const input = (globalThis as any).document.querySelector(
				'.membership-modal .membership-datepicker input',
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(input as any)._flatpickr.setDate('2024-01-15', true);
		});
		await page.waitForTimeout(300);
		await saveMembershipModal(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toHaveClass(/FFF8E1/);
		await expect(rows.first()).toContainText(orgName);
		await expect(rows.first()).toContainText(postRole);

		await savePageChanges(page);

		const createdMemberships = await page.request.post('/graphql', {
			headers: { 'Content-Type': 'application/json' },
			data: {
				query: `{
					people(where: { id: { eq: "${personId}" } }) {
						memberships { id }
					}
				}`,
			},
		});
		expect(createdMemberships.ok()).toBeTruthy();
		const createdData = await createdMemberships.json();
		for (const m of createdData.data?.people?.[0]?.memberships ?? []) {
			seededMembershipIds.push(m.id);
		}

		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		const persistedRows = getMembershipRows(page);
		await expect(persistedRows).toHaveCount(1);
		await expect(persistedRows.first()).toContainText(orgName);
		await expect(persistedRows.first()).not.toHaveClass(/FFF8E1/);
	});

	test('edit membership then persist via Save Changes', async ({ page }) => {
		const membership = await createTestMembership(page, personId, postId, {
			start_date: '2024-01-01',
			end_date: '2024-06-30',
		});
		seededMembershipIds.push(membership.id);

		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);

		await rows.first().getByRole('button', { name: 'แก้ไข' }).click();
		await page.locator('.membership-modal .bx--modal-container').waitFor({
			state: 'visible',
			timeout: 5000,
		});

		await expect(
			page.locator('.membership-modal .bx--modal-header__heading'),
		).toContainText(/edit/i);

		await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const inputs = (globalThis as any).document.querySelectorAll(
				'.membership-modal .membership-datepicker input',
			);
			const endInput = inputs[inputs.length - 1];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(endInput as any)._flatpickr.setDate('2025-12-31', true);
		});
		await page.waitForTimeout(500);

		await saveMembershipModal(page);
		await savePageChanges(page);

		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		const refreshedRows = getMembershipRows(page);
		await expect(refreshedRows).toHaveCount(1);
		await expect(refreshedRows.first()).toContainText('2568');
	});

	test('delete membership then persist via Save Changes', async ({ page }) => {
		const membership = await createTestMembership(page, personId, postId);
		seededMembershipIds.push(membership.id);

		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);

		await rows.first().getByRole('button', { name: 'ลบ' }).click();

		const deleteModal = page.locator(
			'.delete-membership-modal .bx--modal-container',
		);
		await expect(deleteModal).toBeVisible({ timeout: 5000 });
		await page
			.locator(
				'.delete-membership-modal .bx--btn--danger, .delete-membership-modal .bx--btn--primary',
			)
			.click();
		await page.waitForTimeout(500);

		await expect(rows.first().locator('p.line-through').first()).toBeVisible();

		await savePageChanges(page);

		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		const persistedRows = getMembershipRows(page);
		await expect(persistedRows).toHaveCount(0);
	});
});

test.describe('Membership - House of Representative Fields', () => {
	let repOrgId: string;
	let repOrgName: string;
	let repPostId: string;
	let repPostRole: string;
	let repPersonId: string;
	const seededIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		repOrgName = `RepOrg${uid}`;
		repPostRole = `RepPost${uid}`;

		const org = await createTestOrganization(
			page,
			repOrgName,
			ORGANIZATION_CLASSIFICATIONS.HOUSE_OF_REPRESENTATIVE,
		);
		repOrgId = org.id;

		const post = await createTestPost(page, repPostRole);
		repPostId = post.id;

		await linkPostToOrganization(page, repPostId, repOrgId);

		await createTestPerson(page, {
			firstname: 'สส',
			lastname: `ทดสอบ${uid}`,
		});
		repPersonId = page.url().split('/people/')[1];
	});

	test.afterEach(async ({ page }) => {
		for (const id of seededIds) {
			await deleteTestMembership(page, id);
		}
		seededIds.length = 0;
		await deleteTestOrganization(page, repOrgId);
		await deleteTestPost(page, repPostId);
	});

	test('district membership persisted via Save Changes', async ({ page }) => {
		await page.goto(`/people/${repPersonId}`);
		await waitForMembershipTable(page);

		await openAddMembershipModal(page);

		await fillClassification(
			page,
			ORGANIZATION_CLASSIFICATIONS.HOUSE_OF_REPRESENTATIVE,
		);
		await fillOrganizationName(page, repOrgName);
		await fillPost(page, repPostRole);

		await page.waitForTimeout(300);

		await expect(
			page.locator('.membership-modal').getByText('Label'),
		).toBeVisible();

		await page
			.locator(
				'.membership-modal label.bx--radio-button__label:has-text("แบ่งเขต")',
			)
			.click();
		await page.waitForTimeout(300);

		await expect(
			page.locator('.membership-modal').getByLabel('Province'),
		).toBeVisible();
		await expect(
			page.locator('.membership-modal').getByLabel('District Number'),
		).toBeVisible();

		await page
			.locator('.membership-modal')
			.getByLabel('Province')
			.fill('เชียงใหม่');
		await page
			.locator('.membership-modal')
			.getByLabel('District Number')
			.fill('3');

		await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const input = (globalThis as any).document.querySelector(
				'.membership-modal .membership-datepicker input',
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(input as any)._flatpickr.setDate('2024-01-01', true);
		});
		await page.waitForTimeout(300);

		await saveMembershipModal(page);
		await savePageChanges(page);

		const response = await page.request.post('/graphql', {
			headers: { 'Content-Type': 'application/json' },
			data: {
				query: `{
					people(where: { id: { eq: "${repPersonId}" } }) {
						memberships { id province district_number label }
					}
				}`,
			},
		});
		expect(response.ok()).toBeTruthy();
		const data = await response.json();
		const memberships = data.data?.people?.[0]?.memberships ?? [];
		for (const m of memberships) {
			seededIds.push(m.id);
		}

		expect(memberships).toHaveLength(1);
		expect(memberships[0].province).toBe('เชียงใหม่');
		expect(memberships[0].district_number).toBe(3);
		expect(memberships[0].label).toBe('แบ่งเขต');
	});

	test('partylist membership persisted via Save Changes', async ({ page }) => {
		await page.goto(`/people/${repPersonId}`);
		await waitForMembershipTable(page);

		await openAddMembershipModal(page);

		await fillClassification(
			page,
			ORGANIZATION_CLASSIFICATIONS.HOUSE_OF_REPRESENTATIVE,
		);
		await fillOrganizationName(page, repOrgName);
		await fillPost(page, repPostRole);

		await page.waitForTimeout(300);

		await page
			.locator(
				'.membership-modal label.bx--radio-button__label:has-text("บัญชีรายชื่อ")',
			)
			.click();
		await page.waitForTimeout(300);

		await expect(
			page.locator('.membership-modal').getByLabel('List Number'),
		).toBeVisible();

		await page.locator('.membership-modal').getByLabel('List Number').fill('5');

		await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const input = (globalThis as any).document.querySelector(
				'.membership-modal .membership-datepicker input',
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(input as any)._flatpickr.setDate('2024-01-01', true);
		});
		await page.waitForTimeout(300);

		await saveMembershipModal(page);
		await savePageChanges(page);

		const response = await page.request.post('/graphql', {
			headers: { 'Content-Type': 'application/json' },
			data: {
				query: `{
					people(where: { id: { eq: "${repPersonId}" } }) {
						memberships { id list_number label }
					}
				}`,
			},
		});
		expect(response.ok()).toBeTruthy();
		const data = await response.json();
		const memberships = data.data?.people?.[0]?.memberships ?? [];
		for (const m of memberships) {
			seededIds.push(m.id);
		}

		expect(memberships).toHaveLength(1);
		expect(memberships[0].list_number).toBe(5);
		expect(memberships[0].label).toBe('บัญชีรายชื่อ');
	});
});

test.describe('Membership - Cancel Modal', () => {
	let orgId: string;
	let orgName: string;
	let postId: string;
	let postRole: string;
	let personId: string;
	const seededMembershipIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		orgName = `CancelOrg${uid}`;
		postRole = `CancelPost${uid}`;

		const org = await createTestOrganization(
			page,
			orgName,
			ORGANIZATION_CLASSIFICATIONS.POLITICAL_PARTY,
		);
		orgId = org.id;

		const post = await createTestPost(page, postRole);
		postId = post.id;

		await linkPostToOrganization(page, postId, orgId);

		await createTestPerson(page, {
			firstname: 'ยกเลิก',
			lastname: `ทดสอบ${uid}`,
		});
		personId = page.url().split('/people/')[1];
	});

	test.afterEach(async ({ page }) => {
		for (const id of seededMembershipIds) {
			await deleteTestMembership(page, id);
		}
		seededMembershipIds.length = 0;
		await deleteTestOrganization(page, orgId);
		await deleteTestPost(page, postId);
	});

	test('cancel add and edit membership discards changes', async ({ page }) => {
		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		await openAddMembershipModal(page);

		await fillClassification(
			page,
			ORGANIZATION_CLASSIFICATIONS.POLITICAL_PARTY,
		);
		await fillOrganizationName(page, orgName);
		await fillPost(page, postRole);

		await page.locator('.membership-modal .bx--btn--secondary').click();
		await page.waitForTimeout(300);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(0);

		const membership = await createTestMembership(page, personId, postId, {
			start_date: '2024-01-01',
			end_date: '2024-06-30',
		});
		seededMembershipIds.push(membership.id);

		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		const rowsAfter = getMembershipRows(page);
		await expect(rowsAfter).toHaveCount(1);

		await rowsAfter.first().getByRole('button', { name: 'แก้ไข' }).click();
		await page.locator('.membership-modal .bx--modal-container').waitFor({
			state: 'visible',
			timeout: 5000,
		});

		await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const inputs = (globalThis as any).document.querySelectorAll(
				'.membership-modal .membership-datepicker input',
			);
			const endInput = inputs[inputs.length - 1];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(endInput as any)._flatpickr.setDate('2099-12-31', true);
		});
		await page.waitForTimeout(300);

		await page.locator('.membership-modal .bx--btn--secondary').click();
		await page.waitForTimeout(300);

		await expect(rowsAfter.first()).toContainText('2567');
	});
});
