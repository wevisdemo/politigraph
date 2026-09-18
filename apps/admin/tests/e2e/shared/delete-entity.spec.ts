import { expect, test, type Locator, type Page } from '@playwright/test';
import { gql } from './graphql-helpers';

async function countExisting(page: Page, field: string, ids: string[]) {
	const data = await gql(
		page,
		`query ($ids: [ID!]!) { ${field}(where: { id: { in: $ids } }) { id } }`,
		{ ids },
	);
	return data[field].length as number;
}

async function deleteViaModal(
	page: Page,
	detailPath: string,
	expectedSummary: string[],
) {
	await page.goto(detailPath);
	await page.getByTestId('delete-entity-button').click();

	const modal = page.locator('.delete-entity-modal.is-visible');
	await expectSummary(modal, expectedSummary);
	await modal.getByRole('button', { name: 'Delete', exact: true }).click();
}

async function expectSummary(modal: Locator, items: string[]) {
	for (const item of items) {
		await expect(modal.getByText(item, { exact: true })).toBeVisible({
			timeout: 15000,
		});
	}
}

const LINK = '{ create: [{ node: { url: "https://example.com" } }] }';
const suffix = () => Date.now().toString();

test.describe('Delete entity', () => {
	test('person deletes own memberships, links and names but keeps votes', async ({
		page,
	}) => {
		const { createPeople } = await gql(
			page,
			`mutation ($name: String!) {
				createPeople(input: [{
					prefix: "นาย", firstname: $name, lastname: "ลบ", publish_status: UNPUBLISHED
					links: ${LINK}
					other_names: { AlternatePersonName: { create: [{ node: { firstname: "อื่น", lastname: "ชื่อ" } }] } }
					memberships: { create: [{ node: {
						start_date: "2020-01-01"
						links: ${LINK}
						posts: { create: [{ node: { role: "ทดสอบ" } }] }
					} }] }
					votes: { create: [{ node: {
						option: "เห็นด้วย"
						vote_events: { create: [{ node: {
							title: $name, start_date: "2024-01-01", end_date: "2024-01-01", publish_status: UNPUBLISHED
						} }] }
					} }] }
				}]) {
					people {
						id
						links { id }
						other_names { ... on AlternatePersonName { id } }
						memberships { id links { id } posts { id } }
						votes { id vote_events { id } }
					}
				}
			}`,
			{ name: `ลบ${suffix()}` },
		);
		const [person] = createPeople.people;
		const [membership] = person.memberships;
		const [vote] = person.votes;

		await page.goto(`/people/${person.id}`);
		await page.waitForLoadState('networkidle');
		await page.route('**/graphql', async (route) => {
			if (route.request().postData()?.includes('votesConnection')) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			await route.continue();
		});
		await page.getByTestId('delete-entity-button').click();
		const modal = page.locator('.delete-entity-modal.is-visible');
		await expect(modal).toContainText('Checking related nodes...');
		await expect(
			modal.getByRole('button', { name: 'Delete', exact: true }),
		).toBeDisabled();

		await expectSummary(modal, [
			'1 Memberships',
			'1 Membership links',
			'1 Other names',
			'1 Votes (will become unmatched voters)',
		]);
		await modal.getByRole('button', { name: 'Delete', exact: true }).click();
		await page.waitForURL(/\/people$/);

		expect(await countExisting(page, 'people', [person.id])).toBe(0);
		expect(await countExisting(page, 'memberships', [membership.id])).toBe(0);
		expect(
			await countExisting(page, 'links', [
				person.links[0].id,
				membership.links[0].id,
			]),
		).toBe(0);
		expect(
			await countExisting(page, 'alternatePersonNames', [
				person.other_names[0].id,
			]),
		).toBe(0);
		expect(await countExisting(page, 'votes', [vote.id])).toBe(1);
		expect(await countExisting(page, 'posts', [membership.posts[0].id])).toBe(
			1,
		);

		await gql(
			page,
			`mutation ($voteEventId: ID!, $postId: ID!) {
				deleteVoteEvents(where: { id: { eq: $voteEventId } }, delete: { votes: [{}] }) { nodesDeleted }
				deletePosts(where: { id: { eq: $postId } }) { nodesDeleted }
			}`,
			{
				voteEventId: vote.vote_events[0].id,
				postId: membership.posts[0].id,
			},
		);
	});

	test('organization deletes posts, memberships, links and names but keeps members and children', async ({
		page,
	}) => {
		const { createOrganizations } = await gql(
			page,
			`mutation ($id: ID!, $childId: ID!, $name: String!) {
				createOrganizations(input: [{
					id: $id, name: $name, classification: PARLIAMENT
					links: ${LINK}
					other_names: { create: [{ node: { name: "ชื่ออื่น" } }] }
					children: { create: [{ node: { id: $childId, name: "ลูก", classification: PARLIAMENT } }] }
					posts: { create: [{ node: {
						role: "ทดสอบ"
						memberships: { create: [{ node: {
							start_date: "2020-01-01"
							links: ${LINK}
							members: { Person: { create: [{ node: {
								prefix: "นาย", firstname: "สมาชิก", lastname: "ทดสอบ", publish_status: UNPUBLISHED
							} }] } }
						} }] }
					} }] }
					memberships: { create: [{ node: {
						start_date: "2020-01-01"
						posts: { create: [{ node: { role: "พรรคร่วม" } }] }
					} }] }
				}]) {
					organizations {
						id
						links { id }
						other_names { id }
						children { id }
						posts { id memberships { id links { id } members { ... on Person { id } } } }
						memberships { id posts { id } }
					}
				}
			}`,
			{
				id: crypto.randomUUID(),
				childId: crypto.randomUUID(),
				name: `ลบ${suffix()}`,
			},
		);
		const [organization] = createOrganizations.organizations;
		const [post] = organization.posts;
		const [postMembership] = post.memberships;
		const [ownMembership] = organization.memberships;

		await deleteViaModal(page, `/organizations/${organization.id}`, [
			'1 Posts',
			'2 Memberships',
			'1 Membership links',
			'1 Child organizations',
		]);
		await page.waitForURL(/\/organizations$/);

		expect(await countExisting(page, 'organizations', [organization.id])).toBe(
			0,
		);
		expect(await countExisting(page, 'posts', [post.id])).toBe(0);
		expect(
			await countExisting(page, 'memberships', [
				postMembership.id,
				ownMembership.id,
			]),
		).toBe(0);
		expect(
			await countExisting(page, 'links', [
				organization.links[0].id,
				postMembership.links[0].id,
			]),
		).toBe(0);
		expect(
			await countExisting(page, 'alternateNames', [
				organization.other_names[0].id,
			]),
		).toBe(0);
		expect(
			await countExisting(page, 'people', [postMembership.members[0].id]),
		).toBe(1);
		expect(
			await countExisting(page, 'organizations', [organization.children[0].id]),
		).toBe(1);

		await gql(
			page,
			`mutation ($personId: ID!, $childId: ID!, $postId: ID!) {
				deletePeople(where: { id: { eq: $personId } }) { nodesDeleted }
				deleteOrganizations(where: { id: { eq: $childId } }) { nodesDeleted }
				deletePosts(where: { id: { eq: $postId } }) { nodesDeleted }
			}`,
			{
				personId: postMembership.members[0].id,
				childId: organization.children[0].id,
				postId: ownMembership.posts[0].id,
			},
		);
	});

	test('bill deletes own events and links but keeps events shared with other bills', async ({
		page,
	}) => {
		const billFields = (title: string) =>
			`title: "${title}", lis_id: ${Math.floor(Math.random() * 1e9)}, creator_type: POLITICIAN, classification: NORMAL_BILL, status: IN_PROGRESS`;
		const title = `ลบ${suffix()}`;

		const { createBills } = await gql(
			page,
			`mutation {
				createBills(input: [{
					${billFields(title)}
					links: ${LINK}
					events: {
						BillRejectEvent: { create: [{ node: {
							reject_reason: "ทดสอบ", publish_status: UNPUBLISHED, links: ${LINK}
						} }] }
						BillMergeEvent: { create: [{ node: {
							total_merged_bills: 2, publish_status: UNPUBLISHED
							bills: { create: [{ node: { ${billFields(`${title}-อื่น`)} } }] }
						} }] }
					}
				}]) {
					bills {
						id
						links { id }
						events {
							... on BillRejectEvent { id links { id } }
							... on BillMergeEvent { id bills { id } }
						}
					}
				}
			}`,
		);
		const [bill] = createBills.bills;
		const rejectEvent = bill.events.find(
			(e: { links?: unknown }) => e.links,
		) as { id: string; links: { id: string }[] };
		const mergeEvent = bill.events.find(
			(e: { bills?: unknown }) => e.bills,
		) as { id: string; bills: { id: string }[] };
		const otherBillId = mergeEvent.bills.find((b) => b.id !== bill.id)!.id;

		await gql(
			page,
			`mutation ($eventId: ID!, $billId: String!) {
				updateBillMergeEvents(
					where: { id: { eq: $eventId } }
					update: { main_bill_id: { set: $billId } }
				) { billMergeEvents { id } }
			}`,
			{ eventId: mergeEvent.id, billId: bill.id },
		);

		await deleteViaModal(page, `/bills/${bill.id}`, [
			'1 Bill events',
			'1 Bill event links',
			'1 Bill events shared with other bills',
			'1 Merge events with this as main bill (main bill will be cleared)',
		]);
		await page.waitForURL(/\/bills$/);

		expect(await countExisting(page, 'bills', [bill.id])).toBe(0);
		expect(
			await countExisting(page, 'billRejectEvents', [rejectEvent.id]),
		).toBe(0);
		expect(
			await countExisting(page, 'links', [
				bill.links[0].id,
				rejectEvent.links[0].id,
			]),
		).toBe(0);
		const { billMergeEvents } = await gql(
			page,
			`query ($id: ID!) { billMergeEvents(where: { id: { eq: $id } }) { main_bill_id } }`,
			{ id: mergeEvent.id },
		);
		expect(billMergeEvents).toEqual([{ main_bill_id: null }]);
		expect(await countExisting(page, 'bills', [otherBillId])).toBe(1);

		await gql(
			page,
			`mutation ($billId: ID!, $eventId: ID!) {
				deleteBills(where: { id: { eq: $billId } }) { nodesDeleted }
				deleteBillMergeEvents(where: { id: { eq: $eventId } }) { nodesDeleted }
			}`,
			{ billId: otherBillId, eventId: mergeEvent.id },
		);
	});

	test('vote event deletes votes and links but keeps bill vote events', async ({
		page,
	}) => {
		const { createVoteEvents } = await gql(
			page,
			`mutation ($title: String!) {
				createVoteEvents(input: [{
					title: $title, start_date: "2024-01-01", end_date: "2024-01-01", publish_status: UNPUBLISHED
					links: ${LINK}
					votes: { create: [{ node: { option: "เห็นด้วย" } }, { node: { option: "ไม่เห็นด้วย" } }] }
					bill_vote_events: { create: [{ node: { publish_status: UNPUBLISHED } }] }
				}]) {
					voteEvents { id links { id } votes { id } bill_vote_events { id } }
				}
			}`,
			{ title: `ลบ${suffix()}` },
		);
		const [voteEvent] = createVoteEvents.voteEvents;

		await deleteViaModal(page, `/vote-events/${voteEvent.id}`, [
			'2 Votes',
			'1 Links',
			'1 Bill vote events',
		]);
		await page.waitForURL(/\/vote-events$/);

		expect(await countExisting(page, 'voteEvents', [voteEvent.id])).toBe(0);
		expect(
			await countExisting(
				page,
				'votes',
				voteEvent.votes.map((v: { id: string }) => v.id),
			),
		).toBe(0);
		expect(await countExisting(page, 'links', [voteEvent.links[0].id])).toBe(0);
		expect(
			await countExisting(page, 'billVoteEvents', [
				voteEvent.bill_vote_events[0].id,
			]),
		).toBe(1);

		await gql(
			page,
			`mutation ($id: ID!) {
				deleteBillVoteEvents(where: { id: { eq: $id } }) { nodesDeleted }
			}`,
			{ id: voteEvent.bill_vote_events[0].id },
		);
	});
});
