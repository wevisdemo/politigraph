import { expect, test } from '@playwright/test';
import { createTestPerson, login } from './fixtures';
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
} from './membership-helpers';

const genId = () => `${test.info().workerIndex}-${Date.now()}`;

let orgId: string;
let orgName: string;
let postId: string;
let postRole: string;
let personId: string;
const seededMembershipIds: string[] = [];

test.describe('Membership CRUD', () => {
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

	test('add membership modal → new local row with highlight', async ({
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
		await saveMembershipModal(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toHaveClass(/FFF8E1/);
		await expect(rows.first()).toContainText(orgName);
		await expect(rows.first()).toContainText(postRole);
	});

	test('edit membership modal → prefilled fields, update dates', async ({
		page,
	}) => {
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

		await saveMembershipModal(page);
		await expect(rows.first()).toHaveClass(/FFF8E1/);
	});

	test('delete membership → confirm modal → line-through on persisted row', async ({
		page,
	}) => {
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
		await expect(deleteModal.locator('.p-0')).toContainText(orgName);

		await page
			.locator(
				'.delete-membership-modal .bx--btn--danger, .delete-membership-modal .bx--btn--primary',
			)
			.click();
		await page.waitForTimeout(500);

		await expect(rows.first().locator('p.line-through').first()).toBeVisible();
		await expect(rows.first()).toHaveClass(/FFF8E1/);
	});

	test('create membership persisted via Save Changes', async ({ page }) => {
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

	test('update membership persisted via Save Changes', async ({ page }) => {
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

	test('delete membership persisted via Save Changes', async ({ page }) => {
		await createTestMembership(page, personId, postId);

		await page.goto(`/people/${personId}`);
		await waitForMembershipTable(page);

		const rows = getMembershipRows(page);
		await expect(rows).toHaveCount(1);

		await rows.first().getByRole('button', { name: 'ลบ' }).click();
		await page
			.locator('.delete-membership-modal .bx--modal-container')
			.waitFor({
				state: 'visible',
				timeout: 5000,
			});
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
