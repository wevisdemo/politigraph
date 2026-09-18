import { expect, test } from '@playwright/test';
import {
	createTestMembership,
	createTestOrganization,
	createTestPerson,
	createTestPost,
	deleteTestMembership,
	deleteTestOrganization,
	deleteTestPerson,
	deleteTestPost,
	gql,
	linkPostToOrganization,
} from '../shared/graphql-helpers';
import {
	cancelMembershipModal,
	confirmDeleteModal,
	fillClassification,
	fillOrganizationName,
	fillPost,
	genId,
	getMembershipRows,
	MEMBERSHIP_MODAL,
	openAddMembershipModal,
	openEditMembershipModal,
	ORGANIZATION_CLASSIFICATIONS,
	saveChanges,
	saveMembershipModal,
	setMembershipDate,
	waitForMembershipTable,
} from '../shared/ui-helpers';

async function fetchMemberships(page: Parameters<typeof gql>[0], id: string) {
	const { people } = await gql(
		page,
		`query ($id: ID!) {
			people(where: { id: { eq: $id } }) {
				memberships { id province district_number list_number label }
			}
		}`,
		{ id },
	);
	return people[0].memberships as {
		id: string;
		province: string | null;
		district_number: number | null;
		list_number: number | null;
		label: string | null;
	}[];
}

function describeMembership(
	name: string,
	classification: string,
	body: (ctx: {
		ids: () => {
			orgId: string;
			orgName: string;
			postId: string;
			postRole: string;
			personId: string;
		};
		seededMembershipIds: string[];
	}) => void,
) {
	test.describe(name, () => {
		let orgId: string;
		let orgName: string;
		let postId: string;
		let postRole: string;
		let personId: string;
		const seededMembershipIds: string[] = [];

		test.beforeEach(async ({ page }) => {
			const uid = genId(test.info().workerIndex);
			orgName = `TestOrg${uid}`;
			postRole = `TestPost${uid}`;

			const org = await createTestOrganization(page, orgName, classification);
			orgId = org.id;

			const post = await createTestPost(page, postRole);
			postId = post.id;

			await linkPostToOrganization(page, postId, orgId);

			const person = await createTestPerson(page, {
				firstname: 'สมาชิก',
				lastname: `ทดสอบ${uid}`,
			});
			personId = person.id;
		});

		test.afterEach(async ({ page }) => {
			for (const id of seededMembershipIds) {
				await deleteTestMembership(page, id);
			}
			seededMembershipIds.length = 0;
			await deleteTestPerson(page, personId);
			await deleteTestOrganization(page, orgId);
			await deleteTestPost(page, postId);
		});

		body({
			ids: () => ({ orgId, orgName, postId, postRole, personId }),
			seededMembershipIds,
		});
	});
}

describeMembership(
	'Membership CRUD',
	ORGANIZATION_CLASSIFICATIONS.POLITICAL_PARTY,
	({ ids, seededMembershipIds }) => {
		test('add membership locally then persist via Save Changes', async ({
			page,
		}) => {
			const { orgName, postRole, personId } = ids();
			await page.goto(`/people/${personId}`);
			await openAddMembershipModal(page);

			await fillClassification(
				page,
				ORGANIZATION_CLASSIFICATIONS.POLITICAL_PARTY,
			);
			await fillOrganizationName(page, orgName);
			await fillPost(page, postRole);
			await setMembershipDate(page, '2024-01-15');
			await saveMembershipModal(page);

			const rows = getMembershipRows(page);
			await expect(rows).toHaveCount(1);
			await expect(rows.first()).toHaveClass(/FFF8E1/);
			await expect(rows.first()).toContainText(orgName);
			await expect(rows.first()).toContainText(postRole);

			await saveChanges(page);

			const memberships = await fetchMemberships(page, personId);
			seededMembershipIds.push(...memberships.map((m) => m.id));
			expect(memberships).toHaveLength(1);

			await page.goto(`/people/${personId}`);
			await waitForMembershipTable(page);

			const persistedRows = getMembershipRows(page);
			await expect(persistedRows).toHaveCount(1);
			await expect(persistedRows.first()).toContainText(orgName);
			await expect(persistedRows.first()).not.toHaveClass(/FFF8E1/);
		});

		test('edit membership then persist via Save Changes', async ({ page }) => {
			const { personId, postId } = ids();
			const membership = await createTestMembership(
				page,
				personId,
				postId,
				'Person',
				{ start_date: '2024-01-01', end_date: '2024-06-30' },
			);
			seededMembershipIds.push(membership.id);

			await page.goto(`/people/${personId}`);
			await waitForMembershipTable(page);
			await expect(getMembershipRows(page)).toHaveCount(1);

			await openEditMembershipModal(page);
			await expect(
				page.locator(`${MEMBERSHIP_MODAL} .bx--modal-header__heading`),
			).toContainText(/edit/i);

			await setMembershipDate(page, '2025-12-31', { field: 'last' });
			await saveMembershipModal(page);
			await saveChanges(page);

			await page.goto(`/people/${personId}`);
			await waitForMembershipTable(page);

			const refreshedRows = getMembershipRows(page);
			await expect(refreshedRows).toHaveCount(1);
			await expect(refreshedRows.first()).toContainText('2568');
		});

		test('delete membership then persist via Save Changes', async ({
			page,
		}) => {
			const { personId, postId } = ids();
			const membership = await createTestMembership(
				page,
				personId,
				postId,
				'Person',
			);
			seededMembershipIds.push(membership.id);

			await page.goto(`/people/${personId}`);
			await waitForMembershipTable(page);

			const rows = getMembershipRows(page);
			await expect(rows).toHaveCount(1);

			await rows.first().getByRole('button', { name: 'ลบ' }).click();
			await confirmDeleteModal(page, 'delete-membership-modal');
			await expect(
				rows.first().locator('p.line-through').first(),
			).toBeVisible();

			await saveChanges(page);

			await page.goto(`/people/${personId}`);
			await waitForMembershipTable(page);
			await expect(getMembershipRows(page)).toHaveCount(0);
		});

		test('cancel add and edit membership discards changes', async ({
			page,
		}) => {
			const { orgName, postRole, personId, postId } = ids();
			await page.goto(`/people/${personId}`);
			await openAddMembershipModal(page);

			await fillClassification(
				page,
				ORGANIZATION_CLASSIFICATIONS.POLITICAL_PARTY,
			);
			await fillOrganizationName(page, orgName);
			await fillPost(page, postRole);
			await cancelMembershipModal(page);
			await expect(getMembershipRows(page)).toHaveCount(0);

			const membership = await createTestMembership(
				page,
				personId,
				postId,
				'Person',
				{ start_date: '2024-01-01', end_date: '2024-06-30' },
			);
			seededMembershipIds.push(membership.id);

			await page.goto(`/people/${personId}`);
			await waitForMembershipTable(page);

			const rowsAfter = getMembershipRows(page);
			await expect(rowsAfter).toHaveCount(1);

			await openEditMembershipModal(page);
			await setMembershipDate(page, '2099-12-31', { field: 'last' });
			await cancelMembershipModal(page);

			await expect(rowsAfter.first()).toContainText('2567');
		});
	},
);

describeMembership(
	'Membership - House of Representative Fields',
	ORGANIZATION_CLASSIFICATIONS.HOUSE_OF_REPRESENTATIVE,
	({ ids, seededMembershipIds }) => {
		test('district membership persisted via Save Changes', async ({ page }) => {
			const { orgName, postRole, personId } = ids();
			await page.goto(`/people/${personId}`);
			await openAddMembershipModal(page);

			await fillClassification(
				page,
				ORGANIZATION_CLASSIFICATIONS.HOUSE_OF_REPRESENTATIVE,
			);
			await fillOrganizationName(page, orgName);
			await fillPost(page, postRole);

			const modal = page.locator(MEMBERSHIP_MODAL);
			await expect(modal.getByText('Label')).toBeVisible();
			await modal
				.locator('label.bx--radio-button__label:has-text("แบ่งเขต")')
				.click();

			await modal.getByLabel('Province').fill('เชียงใหม่');
			await modal.getByLabel('District Number').fill('3');
			await setMembershipDate(page, '2024-01-01');

			await saveMembershipModal(page);
			await saveChanges(page);

			const memberships = await fetchMemberships(page, personId);
			seededMembershipIds.push(...memberships.map((m) => m.id));

			expect(memberships).toHaveLength(1);
			expect(memberships[0].province).toBe('เชียงใหม่');
			expect(memberships[0].district_number).toBe(3);
			expect(memberships[0].label).toBe('แบ่งเขต');
		});

		test('partylist membership persisted via Save Changes', async ({
			page,
		}) => {
			const { orgName, postRole, personId } = ids();
			await page.goto(`/people/${personId}`);
			await openAddMembershipModal(page);

			await fillClassification(
				page,
				ORGANIZATION_CLASSIFICATIONS.HOUSE_OF_REPRESENTATIVE,
			);
			await fillOrganizationName(page, orgName);
			await fillPost(page, postRole);

			const modal = page.locator(MEMBERSHIP_MODAL);
			await modal
				.locator('label.bx--radio-button__label:has-text("บัญชีรายชื่อ")')
				.click();
			await modal.getByLabel('List Number').fill('5');
			await setMembershipDate(page, '2024-01-01');

			await saveMembershipModal(page);
			await saveChanges(page);

			const memberships = await fetchMemberships(page, personId);
			seededMembershipIds.push(...memberships.map((m) => m.id));

			expect(memberships).toHaveLength(1);
			expect(memberships[0].list_number).toBe(5);
			expect(memberships[0].label).toBe('บัญชีรายชื่อ');
		});
	},
);
