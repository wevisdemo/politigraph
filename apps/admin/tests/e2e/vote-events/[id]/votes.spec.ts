import { expect, test } from '@playwright/test';
import { createTestPerson, login } from '../../fixtures';
import {
	createVoteEventWithVotes,
	DEFAULT_VOTE,
	deleteVoteEvent,
	editDropdown,
	editTextInput,
	getVoteRow,
	saveChanges,
	VOTE_OPTIONS,
	waitForTable,
} from '../helpers';

test.describe('Votes Management', () => {
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

	test('update all vote fields and persist', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Edit All Fields ${uniqueId}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const voteRow = getVoteRow(page, votes[0].id);
		await editTextInput(page, voteRow, 0, '5');
		await editTextInput(page, voteRow, 1, '999');
		await editTextInput(page, voteRow, 2, 'พรรคใหม่');
		await editDropdown(page, voteRow, 5, VOTE_OPTIONS.DISAGREE);

		await saveChanges(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		await expect(
			refreshedRow.locator('input[type="text"]').first(),
		).toHaveValue('5');
		await expect(refreshedRow.locator('input[type="text"]').nth(1)).toHaveValue(
			'999',
		);
		await expect(refreshedRow.locator('input[type="text"]').nth(2)).toHaveValue(
			'พรรคใหม่',
		);
		await expect(refreshedRow.locator('td').nth(5)).toContainText(
			VOTE_OPTIONS.DISAGREE,
		);
	});

	test('add new vote row', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Add Vote ${uniqueId}`,
		);
		seededVoteEventIds.push(voteEventId);

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
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const firstRow = getVoteRow(page, votes[0].id);
		await firstRow.locator('label.bx--checkbox-label').click();
		await page.waitForTimeout(300);

		await page.getByRole('button', { name: 'Delete' }).click();
		await page.waitForTimeout(500);

		await saveChanges(page);
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
		seededVoteEventIds.push(voteEventId);

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

	test('show validation errors for invalid votes', async ({ page }) => {
		const uniqueId = `${test.info().workerIndex}-${Date.now()}`;

		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Validation Test ${uniqueId}`,
			[DEFAULT_VOTE, { ...DEFAULT_VOTE, vote_order: '2', badge_number: '002' }],
		);
		seededVoteEventIds.push(voteEventId);

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
		seededVoteEventIds.push(voteEventId);

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
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await page.getByRole('button', { name: 'Review names' }).click();

		const modal = page.locator('.bx--modal.is-visible');
		await expect(modal).toBeVisible();
		await expect(modal).toContainText('Review Suggested Name Corrections');

		await expect(modal.getByText('ชื่อผิด นามสกุลผิด')).toBeVisible();
		await expect(modal.getByRole('checkbox')).toHaveCount(2);

		await modal.getByRole('button', { name: 'Cancel' }).click();
		await expect(modal).not.toBeVisible();
	});
});
