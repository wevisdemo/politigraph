import { expect, test } from '@playwright/test';
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

		await saveChanges(page, { button: 'Save', toast: 'บันทึก' });

		await page.reload();
		await expect(page.getByLabel('Classification')).toHaveValue('MP_2');
	});
});
