import { test } from '@playwright/test';
import { login } from '../fixtures';
import {
	createVoteEventWithVotes,
	deleteVoteEvent,
	saveChanges,
} from './helpers';

test.describe('Vote Event Detail', () => {
	const seededVoteEventIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test.afterEach(async ({ page }) => {
		for (const id of seededVoteEventIds) {
			await deleteVoteEvent(page, id);
		}
		seededVoteEventIds.length = 0;
	});

	test('edit vote event details', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Edit Details ${uniqueId}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}`);
		await page.waitForTimeout(3000);

		const titleInput = page.getByLabel('Title');
		await titleInput.clear();
		await titleInput.fill(`Updated Title ${uniqueId}`);

		const nicknameInput = page.getByLabel('Nickname');
		await nicknameInput.clear();
		await nicknameInput.fill('Test Nickname');

		const descriptionInput = page.getByLabel('Description');
		await descriptionInput.clear();
		await descriptionInput.fill('Test description text');

		await saveChanges(page, 'บันทึก');
	});
});
