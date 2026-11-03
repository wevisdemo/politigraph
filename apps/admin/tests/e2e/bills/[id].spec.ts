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
