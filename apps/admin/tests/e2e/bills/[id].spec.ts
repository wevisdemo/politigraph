import { expect, test } from '@playwright/test';
import { gql } from '../shared/graphql-helpers';
import { saveChanges } from '../shared/ui-helpers';

const billFields = (title: string) =>
	`title: "${title}", lis_ids: [${Math.floor(Math.random() * 1e9)}], creator_type: POLITICIAN, classification: NORMAL_BILL, status: IN_PROGRESS`;

test('switching the main bill of a merge event moves the link to the picked bill', async ({
	page,
}) => {
	const title = `รวมร่าง${Date.now()}`;
	const { createBills } = await gql(
		page,
		`mutation {
			createBills(input: [{
				${billFields(title)}
				events: { BillMergeEvent: { create: [{ node: {
					total_merged_bills: 2, publish_status: UNPUBLISHED
					bills: { create: [{ node: { ${billFields(`${title}-อื่น`)} } }] }
				} }] } }
			}]) {
				bills { id events { ... on BillMergeEvent { id bills { id } } } }
			}
		}`,
	);
	const [bill] = createBills.bills;
	const [event] = bill.events as { id: string; bills: { id: string }[] }[];
	const otherBillId = event.bills.find((b) => b.id !== bill.id)!.id;

	await gql(
		page,
		`mutation ($billId: ID!, $eventId: ID!) {
			updateBills(
				where: { id: { eq: $billId } }
				update: { main_bill_merge_events: [{ connect: [{ where: { node: { id: { eq: $eventId } } } }] }] }
			) { bills { id } }
		}`,
		{ billId: bill.id, eventId: event.id },
	);

	await page.goto(`/bills/${bill.id}`);
	await page.locator('.bx--table-expand__button').first().click();
	await page
		.locator(`label[for="merge-bill-${event.id}-${otherBillId}"]`)
		.click();
	await saveChanges(page);

	const { billMergeEvents, bills } = await gql(
		page,
		`query ($eventId: ID!, $billId: ID!) {
			billMergeEvents(where: { id: { eq: $eventId } }) { main_bill { id } main_bill_id }
			bills(where: { id: { eq: $billId } }) { main_bill_merge_events { id } }
		}`,
		{ eventId: event.id, billId: bill.id },
	);
	expect(billMergeEvents).toEqual([
		{ main_bill: { id: otherBillId }, main_bill_id: otherBillId },
	]);
	expect(bills).toEqual([{ main_bill_merge_events: [] }]);

	await gql(
		page,
		`mutation ($billIds: [ID!]!, $eventId: ID!) {
			deleteBills(where: { id: { in: $billIds } }) { nodesDeleted }
			deleteBillMergeEvents(where: { id: { eq: $eventId } }) { nodesDeleted }
		}`,
		{ billIds: [bill.id, otherBillId], eventId: event.id },
	);
});

test('clearing the matched vote event of a bill vote event unlinks it', async ({
	page,
}) => {
	const title = `ล้างการลงมติ${Date.now()}`;
	const { createBills } = await gql(
		page,
		`mutation {
			createBills(input: [{
				${billFields(title)}
				events: { BillVoteEvent: { create: [{ node: {
					start_date: "2024-01-01", publish_status: UNPUBLISHED
					vote_event: { create: { node: {
						title: "${title}", start_date: "2024-01-01", end_date: "2024-01-01", publish_status: UNPUBLISHED
					} } }
				} }] } }
			}]) {
				bills { id events { ... on BillVoteEvent { id vote_event { id } } } }
			}
		}`,
	);
	const [bill] = createBills.bills;
	const [event] = bill.events as {
		id: string;
		vote_event: { id: string };
	}[];

	await page.goto(`/bills/${bill.id}`);
	await page.locator('.bx--table-expand__button').first().click();
	await page.getByRole('button', { name: 'Clear selection' }).click();
	await saveChanges(page);

	const { billVoteEvents } = await gql(
		page,
		`query ($id: ID!) { billVoteEvents(where: { id: { eq: $id } }) { vote_event { id } } }`,
		{ id: event.id },
	);
	expect(billVoteEvents).toEqual([{ vote_event: null }]);

	await gql(
		page,
		`mutation ($billId: ID!, $eventId: ID!, $voteEventId: ID!) {
			deleteBills(where: { id: { eq: $billId } }) { nodesDeleted }
			deleteBillVoteEvents(where: { id: { eq: $eventId } }) { nodesDeleted }
			deleteVoteEvents(where: { id: { eq: $voteEventId } }) { nodesDeleted }
		}`,
		{
			billId: bill.id,
			eventId: event.id,
			voteEventId: event.vote_event.id,
		},
	);
});

test('switching to a vote event already linked to another bill moves the link', async ({
	page,
}) => {
	const title = `ลงมติหลายร่าง${Date.now()}`;
	const voteEventFields = (voteEventTitle: string) =>
		`vote_event: { create: { node: {
			title: "${voteEventTitle}", start_date: "2024-01-01", end_date: "2024-01-01", publish_status: UNPUBLISHED
		} } }`;
	const { createBills } = await gql(
		page,
		`mutation {
			createBills(input: [
				{
					${billFields(`${title}-ก`)}
					events: { BillVoteEvent: { create: [{ node: {
						start_date: "2024-01-01", publish_status: UNPUBLISHED
						${voteEventFields(title)}
					} }] } }
				}
				{
					${billFields(`${title}-ข`)}
					events: { BillVoteEvent: { create: [{ node: {
						start_date: "2024-01-01", publish_status: UNPUBLISHED
						${voteEventFields(`${title}-เดิม`)}
					} }] } }
				}
			]) {
				bills { id events { ... on BillVoteEvent { id vote_event { id } } } }
			}
		}`,
	);
	const [linkedBill, otherBill] = createBills.bills;
	const [linkedEvent] = linkedBill.events as {
		id: string;
		vote_event: { id: string };
	}[];
	const [otherEvent] = otherBill.events as {
		id: string;
		vote_event: { id: string };
	}[];
	const voteEventId = linkedEvent.vote_event.id;
	const previousVoteEventId = otherEvent.vote_event.id;

	await page.goto(`/bills/${otherBill.id}`);
	await page.locator('.bx--table-expand__button').first().click();
	const option = page.locator(
		`label[for="vote-event-selection-${otherEvent.id}-${voteEventId}"]`,
	);
	await expect(
		option.getByRole('link', {
			name: 'ดูร่างกฏหมายที่เชื่อมกับการลงมตินี้ไปแล้ว',
		}),
	).toHaveAttribute('href', `/admin/bills/${linkedBill.id}`);
	await option.getByText(title).click();
	await saveChanges(page);

	const { voteEvents } = await gql(
		page,
		`query ($ids: [ID!]!) { voteEvents(where: { id: { in: $ids } }) { id bill_vote_events { id } } }`,
		{ ids: [voteEventId, previousVoteEventId] },
	);
	const linkedEventIds = (id: string) =>
		voteEvents
			.find((ve: { id: string }) => ve.id === id)
			.bill_vote_events.map((e: { id: string }) => e.id)
			.sort();
	expect(linkedEventIds(voteEventId)).toEqual(
		[linkedEvent.id, otherEvent.id].sort(),
	);
	expect(linkedEventIds(previousVoteEventId)).toEqual([]);

	await gql(
		page,
		`mutation ($billIds: [ID!]!, $eventIds: [ID!]!, $voteEventIds: [ID!]!) {
			deleteBills(where: { id: { in: $billIds } }) { nodesDeleted }
			deleteBillVoteEvents(where: { id: { in: $eventIds } }) { nodesDeleted }
			deleteVoteEvents(where: { id: { in: $voteEventIds } }) { nodesDeleted }
		}`,
		{
			billIds: [linkedBill.id, otherBill.id],
			eventIds: [linkedEvent.id, otherEvent.id],
			voteEventIds: [voteEventId, previousVoteEventId],
		},
	);
});

test('picking an event start date fills the end date, which can then be cleared as ongoing', async ({
	page,
}) => {
	const { createBills } = await gql(
		page,
		`mutation {
			createBills(input: [{
				${billFields(`ล้างวันที่${Date.now()}`)}
				events: { BillEnactEvent: { create: [{ node: { publish_status: UNPUBLISHED } }] } }
			}]) {
				bills { id events { ... on BillEnactEvent { id } } }
			}
		}`,
	);
	const [bill] = createBills.bills;
	const [event] = bill.events as { id: string }[];

	await page.goto(`/bills/${bill.id}`);
	await page.locator('.bx--table-expand__button').first().click();
	await page.getByLabel('Start Date').click();
	await page
		.locator(
			'.flatpickr-calendar.open .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)',
		)
		.first()
		.click();
	const startDate = await page.getByLabel('Start Date').inputValue();
	await expect(page.getByLabel('End Date')).toHaveValue(startDate);

	await page.getByLabel('End Date').click();
	await page.getByLabel('End Date').press('Delete');
	await expect(page.getByLabel('End Date')).toHaveValue('');
	await saveChanges(page);

	const { billEnactEvents } = await gql(
		page,
		`query ($id: ID!) { billEnactEvents(where: { id: { eq: $id } }) { start_date end_date } }`,
		{ id: event.id },
	);
	expect(billEnactEvents).toEqual([{ start_date: startDate, end_date: null }]);

	await gql(
		page,
		`mutation ($billId: ID!, $eventId: ID!) {
			deleteBills(where: { id: { eq: $billId } }) { nodesDeleted }
			deleteBillEnactEvents(where: { id: { eq: $eventId } }) { nodesDeleted }
		}`,
		{ billId: bill.id, eventId: event.id },
	);
});
