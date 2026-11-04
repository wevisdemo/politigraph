import { expect, test } from '@playwright/test';
import { gql } from '../shared/graphql-helpers';
import { genId, saveChanges } from '../shared/ui-helpers';
import { createVoteEventWithVotes, deleteVoteEvent } from './helpers';

test.describe('Vote Event Detail', () => {
	const seededVoteEventIds: string[] = [];

	test.afterEach(async ({ page }) => {
		for (const id of seededVoteEventIds) {
			await deleteVoteEvent(page, id);
		}
		seededVoteEventIds.length = 0;
	});

	test('edit vote event details', async ({ page }) => {
		const uniqueId = genId(test.info().workerIndex);
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Edit Details ${uniqueId}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}`);
		const titleInput = page.getByLabel('Title');
		await expect(titleInput).toHaveValue(/Test Edit Details/);
		await titleInput.fill(`Updated Title ${uniqueId}`);
		await page.getByLabel('Nickname').fill('Test Nickname');
		await page.getByLabel('Description').fill('Test description text');
		await page.getByLabel('Classification').selectOption('MP_2');
		await page.evaluate(() =>
			[
				...document.querySelectorAll<
					HTMLInputElement & {
						_flatpickr?: { setDate(date: string, trigger: boolean): void };
					}
				>('input'),
			]
				.find((input) => input._flatpickr)!
				._flatpickr!.setDate('2024-02-02', true),
		);

		await saveChanges(page, { button: 'Save', toast: 'บันทึก' });

		await page.reload();
		await expect(page.getByLabel('Classification')).toHaveValue('MP_2');
		const { voteEvents } = await gql(
			page,
			`query ($id: ID!) { voteEvents(where: { id: { eq: $id } }) { start_date end_date } }`,
			{ id: voteEventId },
		);
		expect(voteEvents).toEqual([
			{ start_date: '2024-02-02', end_date: '2024-02-02' },
		]);
	});
});
