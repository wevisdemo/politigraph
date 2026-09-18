import { expect, type Locator, type Page } from '@playwright/test';
import { gql } from '../shared/graphql-helpers';

export const VOTE_OPTIONS = {
	AGREE: 'เห็นด้วย',
	DISAGREE: 'ไม่เห็นด้วย',
	ABSTAIN: 'งดออกเสียง',
	NO_VOTE: 'ไม่ลงคะแนนเสียง',
	LEAVE: 'ลา / ขาดลงมติ',
} as const;

export interface VoteInput {
	vote_order: string;
	badge_number: string;
	voter_name_raw: string;
	voter_party: string;
	option: string;
}

export const DEFAULT_VOTE: VoteInput = {
	vote_order: '1',
	badge_number: '001',
	voter_name_raw: 'ทดสอบ ชื่อ',
	voter_party: 'พรรคทดสอบ',
	option: VOTE_OPTIONS.AGREE,
};

export async function createVoteEventWithVotes(
	page: Page,
	title: string,
	votes: VoteInput[] = [DEFAULT_VOTE],
) {
	const { createVoteEvents } = await gql(
		page,
		`mutation CreateVoteEvent($title: String!, $votes: [VoteEventVotesCreateFieldInput!]!) {
			createVoteEvents(
				input: [{
					title: $title
					start_date: "2024-01-01"
					end_date: "2024-01-01"
					publish_status: UNPUBLISHED
					votes: { create: $votes }
				}]
			) {
				voteEvents { id votes { id } }
			}
		}`,
		{ title, votes: votes.map((node) => ({ node })) },
	);

	const voteEvent = createVoteEvents.voteEvents[0];
	return {
		voteEventId: voteEvent.id as string,
		votes: voteEvent.votes as { id: string }[],
	};
}

export async function fetchVoteCount(page: Page, voteEventId: string) {
	const { voteEvents } = await gql(
		page,
		`query VoteEventVotes($id: ID!) {
			voteEvents(where: { id: { eq: $id } }) { votes { id } }
		}`,
		{ id: voteEventId },
	);
	return voteEvents[0].votes.length as number;
}

export async function fetchVote(page: Page, voteId: string) {
	const { votes } = await gql(
		page,
		`query Vote($id: ID!) {
			votes(where: { id: { eq: $id } }) {
				voter_name_raw
				option
				voters { name }
			}
		}`,
		{ id: voteId },
	);
	return votes[0] as {
		voter_name_raw: string;
		option: string;
		voters: { name: string }[];
	};
}

export async function deleteVoteEvent(page: Page, voteEventId: string) {
	await gql(
		page,
		`mutation DeleteVoteEvent($id: ID!) {
			deleteVoteEvents(where: { id: { eq: $id } }) { nodesDeleted }
		}`,
		{ id: voteEventId },
	);
}

export async function waitForTable(page: Page) {
	await expect(page.locator('table, [role="table"]').first()).toBeVisible({
		timeout: 10000,
	});
}

export function getVoteRow(page: Page, voteId: string) {
	return page.locator(`tr[data-value="${voteId}"]`).first();
}

export async function editTextInput(
	page: Page,
	row: Locator,
	inputIndex: number,
	value: string,
) {
	const input = row.locator('input[type="text"]').nth(inputIndex);
	await input.click();
	await input.fill(value);
	await page.keyboard.press('Tab');
}

export async function editDropdown(
	row: Locator,
	cellIndex: number,
	value: string,
) {
	const cell = row.locator('td').nth(cellIndex);
	await cell.click();
	await cell.locator('.bx--list-box__field').click();
	await cell
		.locator(`[data-value="${value}"] a.bx--dropdown-link`)
		.evaluate((el) => (el as HTMLElement).click());
	await expect(cell).toContainText(value);
}
