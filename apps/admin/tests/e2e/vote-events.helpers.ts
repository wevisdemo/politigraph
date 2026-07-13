import { expect, type Page } from '@playwright/test';

// Constants
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

export const DATES = {
	start_date: '2024-01-01',
	end_date: '2024-01-01',
} as const;

export const TIMEOUTS = {
	TABLE: 10000,
	SAVE: 3000,
	TOAST: 5000,
} as const;

// GraphQL helpers
export async function createVoteEventWithVotes(
	page: Page,
	title: string,
	votes: VoteInput[] = [DEFAULT_VOTE],
	publishStatus: 'PUBLISHED' | 'UNPUBLISHED' = 'UNPUBLISHED',
) {
	const votesInput = votes
		.map(
			(v) => `{
		node: {
			vote_order: "${v.vote_order}"
			badge_number: "${v.badge_number}"
			voter_name_raw: "${v.voter_name_raw}"
			voter_party: "${v.voter_party}"
			option: "${v.option}"
		}
	}`,
		)
		.join('\n');

	const response = await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation CreateVoteEvent($title: String!) {
					createVoteEvents(
						input: [{
							title: $title
							start_date: "${DATES.start_date}"
							end_date: "${DATES.end_date}"
							publish_status: ${publishStatus}
							votes: {
								create: [${votesInput}]
							}
						}]
					) {
						voteEvents {
							id
							title
							publish_status
							votes {
								id
								vote_order
								badge_number
								voter_name_raw
								voter_party
								option
							}
						}
					}
				}
			`,
			variables: { title },
		},
	});

	expect(response.ok()).toBeTruthy();
	const data = await response.json();
	expect(data.errors, JSON.stringify(data.errors)).toBeUndefined();
	expect(data.data?.createVoteEvents?.voteEvents).toHaveLength(1);

	const voteEvent = data.data.createVoteEvents.voteEvents[0];
	return {
		voteEventId: voteEvent.id as string,
		title: voteEvent.title as string,
		publishStatus: voteEvent.publish_status as string,
		votes: voteEvent.votes as Array<{
			id: string;
			vote_order: string;
			badge_number: string;
			voter_name_raw: string;
			voter_party: string;
			option: string;
		}>,
	};
}

export async function deleteVoteEvent(page: Page, voteEventId: string) {
	await page.request.post('/graphql', {
		headers: { 'Content-Type': 'application/json' },
		data: {
			query: `
				mutation DeleteVoteEvent($id: ID!) {
					deleteVoteEvents(where: { id: { eq: $id } }) {
						nodesDeleted
					}
				}
			`,
			variables: { id: voteEventId },
		},
	});
}

// Page helpers
export async function waitForTable(page: Page) {
	await page.waitForSelector('table, [role="table"]', {
		timeout: TIMEOUTS.TABLE,
	});
}

export async function saveChanges(page: Page, toastText = 'Changes Saved') {
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForTimeout(TIMEOUTS.SAVE);
	await expect(
		page.locator('[role="alert"].bx--toast-notification'),
	).toContainText(toastText);
	await page.waitForTimeout(TIMEOUTS.SAVE);
}

export function getVoteRow(page: Page, voteId: string) {
	return page.locator(`tr[data-value="${voteId}"]`).first();
}

export async function editTextInput(
	page: Page,
	rowLocator: ReturnType<typeof getVoteRow>,
	inputIndex: number,
	value: string,
) {
	const input = rowLocator.locator('input[type="text"]').nth(inputIndex);
	await input.click();
	await input.fill(value);
	await page.keyboard.press('Tab');
	await page.waitForTimeout(300);
}

export async function editDropdown(
	page: Page,
	rowLocator: ReturnType<typeof getVoteRow>,
	cellIndex: number,
	value: string,
) {
	const cell = rowLocator.locator('td').nth(cellIndex);
	await cell.click();
	await page.waitForTimeout(500);

	const dropdownTrigger = cell.locator('.bx--list-box__field');
	await dropdownTrigger.waitFor({ state: 'visible', timeout: 5000 });
	await dropdownTrigger.click();
	await page.waitForTimeout(500);

	const dropdownItem = cell.locator(
		`[data-value="${value}"] a.bx--dropdown-link`,
	);
	await dropdownItem.evaluate((el) => el.click());
	await page.waitForTimeout(500);
}
