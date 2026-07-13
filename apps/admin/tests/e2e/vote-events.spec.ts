import { expect, test } from '@playwright/test';
import { createTestPerson, login } from './fixtures';
import {
	createVoteEventWithVotes,
	DEFAULT_VOTE,
	editDropdown,
	editTextInput,
	getVoteRow,
	saveChanges,
	VOTE_OPTIONS,
	waitForTable,
} from './vote-events.helpers';

test.describe('Vote Events & Votes', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('list vote events', async ({ page }) => {
		await page.goto('/vote-events');

		await expect(page.locator('h1:has-text("Vote Events")')).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});

	test('update vote_order', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Vote Order ${uniqueId}`,
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const voteRow = getVoteRow(page, votes[0].id);
		await editTextInput(page, voteRow, 0, '5');

		await saveChanges(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		const refreshedInput = refreshedRow.locator('input[type="text"]').first();
		await expect(refreshedInput).toHaveValue('5');
	});

	test('update badge_number', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Badge Number ${uniqueId}`,
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const voteRow = getVoteRow(page, votes[0].id);
		await editTextInput(page, voteRow, 1, '999');

		await saveChanges(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		const refreshedInput = refreshedRow.locator('input[type="text"]').nth(1);
		await expect(refreshedInput).toHaveValue('999');
	});

	test('update voter_party', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Voter Party ${uniqueId}`,
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const voteRow = getVoteRow(page, votes[0].id);
		await editTextInput(page, voteRow, 2, 'พรรคใหม่');

		await saveChanges(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		const refreshedInput = refreshedRow.locator('input[type="text"]').nth(2);
		await expect(refreshedInput).toHaveValue('พรรคใหม่');
	});

	test('update option', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Option ${uniqueId}`,
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const voteRow = getVoteRow(page, votes[0].id);
		await editDropdown(page, voteRow, 5, VOTE_OPTIONS.DISAGREE);

		await saveChanges(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		const refreshedCell = refreshedRow.locator('td').nth(5);
		await expect(refreshedCell).toContainText(VOTE_OPTIONS.DISAGREE);
	});

	test('add new vote row', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Add Vote ${uniqueId}`,
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await page.getByRole('button', { name: 'Add Vote' }).click();
		await page.waitForTimeout(1000);

		const newRow = page
			.locator('tr[data-value]:has(input[type="text"])')
			.last();
		await editTextInput(page, newRow, 0, '2');
		await editTextInput(page, newRow, 1, '002');
		await editTextInput(page, newRow, 2, 'พรรคใหม่');

		await saveChanges(page);
	});

	test('delete vote row', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Delete Vote ${uniqueId}`,
			[
				{ ...DEFAULT_VOTE },
				{
					...DEFAULT_VOTE,
					vote_order: '2',
					badge_number: '002',
					voter_name_raw: 'ทดสอบ สอง',
				},
			],
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const firstRow = getVoteRow(page, votes[0].id);
		await firstRow.locator('label.bx--checkbox-label').click();
		await page.waitForTimeout(300);

		await page.getByRole('button', { name: 'Delete' }).click();
		await page.waitForTimeout(500);

		await saveChanges(page);
	});

	test('edit vote event details', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Edit Details ${uniqueId}`,
		);

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

	test('toggle publish status', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Publish ${uniqueId}`,
		);

		await page.goto(`/vote-events/${voteEventId}`);
		await page.waitForTimeout(3000);

		const publishButton = page
			.locator('button')
			.filter({ hasText: /Publish/ })
			.first();
		await expect(publishButton).toBeVisible();

		const buttonText = await publishButton.innerText();
		expect(buttonText).toMatch(/Publish/);
	});

	test('update voter name', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const personFirstname = 'ทดสอบ';
		const personLastname = `นามสกุล${uniqueId}`;
		const personFullName = `${personFirstname} ${personLastname}`;
		const invalidVoterName = 'ชื่อผิด นามสกุลผิด';

		await createTestPerson(page, {
			firstname: personFirstname,
			lastname: personLastname,
		});

		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Vote Event ${uniqueId}`,
			[{ ...DEFAULT_VOTE, voter_name_raw: invalidVoterName }],
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const voteRow = getVoteRow(page, votes[0].id);
		const nameCell = voteRow
			.locator('td')
			.filter({ hasText: invalidVoterName });
		await expect(nameCell).toBeVisible();

		await nameCell.click();
		await page.waitForTimeout(500);

		const comboBox = voteRow.locator('.bx--combo-box');
		await comboBox.waitFor({ state: 'visible', timeout: 5000 });

		const comboInput = voteRow.locator('input[role="combobox"]');
		await comboInput.fill(personFirstname);
		await page.waitForTimeout(500);

		const option = page.locator(
			`.bx--list-box__menu-item:has-text("${personFullName}")`,
		);
		await option.click();
		await page.waitForTimeout(500);

		await page.keyboard.press('Tab');
		await page.waitForTimeout(300);

		const updatedCell = voteRow
			.locator('td')
			.filter({ hasText: personFullName });
		await expect(updatedCell).toBeVisible();

		await saveChanges(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		await expect(
			refreshedRow.locator('td').filter({ hasText: personFullName }),
		).toBeVisible();
	});

	test('filter vote events by status', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;

		const { title: unpublishedTitle } = await createVoteEventWithVotes(
			page,
			`Filter Test ${uniqueId}`,
		);

		const { title: publishedTitle } = await createVoteEventWithVotes(
			page,
			`Filter Published ${uniqueId}`,
			[DEFAULT_VOTE],
			'UNPUBLISHED', // can't publish without valid data
		);

		await page.goto('/vote-events');
		await waitForTable(page);

		await expect(
			page.getByRole('link', { name: unpublishedTitle }),
		).toBeVisible();
		await expect(
			page.getByRole('link', { name: publishedTitle }),
		).toBeVisible();

		await page.locator('label:has-text("UNPUBLISHED")').first().click();
		await page.waitForResponse((r) => r.url().includes('/graphql'));

		await expect(
			page.getByRole('link', { name: unpublishedTitle }),
		).toBeVisible();
	});

	test('show validation errors for invalid votes', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;

		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Validation Test ${uniqueId}`,
			[DEFAULT_VOTE, { ...DEFAULT_VOTE, vote_order: '2', badge_number: '002' }],
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await expect(page.getByText('Duplicate Votes')).toBeVisible();
		await expect(page.getByText('Unrecognized Voter Names')).toBeVisible();
	});

	test('edit summary counts', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Summary Test ${uniqueId}`,
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await expect(
			page.getByRole('heading', { name: 'Vote Summary' }),
		).toBeVisible();

		const agreeInput = page.locator('input[type="number"]').first();
		await agreeInput.clear();
		await agreeInput.fill('5');

		await saveChanges(page);

		await page.reload();
		await waitForTable(page);
		await expect(page.locator('input[type="number"]').first()).toHaveValue('5');
	});

	test('open batch name correction modal', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const personFirstname = 'ทดสอบ';
		const personLastname = `นามสกุล${uniqueId}`;

		await createTestPerson(page, {
			firstname: personFirstname,
			lastname: personLastname,
		});

		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Batch Name Test ${uniqueId}`,
			[{ ...DEFAULT_VOTE, voter_name_raw: 'ชื่อผิด นามสกุลผิด' }],
		);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await page.getByRole('button', { name: 'Review names' }).click();

		const modal = page.locator('.bx--modal.is-visible');
		await expect(modal).toBeVisible();
		await expect(modal).toContainText('Review Suggested Name Corrections');

		await expect(modal.getByText('ชื่อผิด นามสกุลผิด')).toBeVisible();
		await expect(modal.getByRole('checkbox')).toHaveCount(2); // header + 1 vote row

		await modal.getByRole('button', { name: 'Cancel' }).click();
		await expect(modal).not.toBeVisible();
	});
});
