import { expect, test } from '@playwright/test';
import {
	createTestPerson,
	deleteTestPerson,
} from '../../shared/graphql-helpers';
import { genId, saveChanges } from '../../shared/ui-helpers';
import {
	createVoteEventWithVotes,
	DEFAULT_VOTE,
	deleteVoteEvent,
	editDropdown,
	editTextInput,
	fetchVote,
	fetchVoteCount,
	getVoteRow,
	VOTE_OPTIONS,
	waitForTable,
} from '../helpers';

const saveVotes = (page: Parameters<typeof saveChanges>[0]) =>
	saveChanges(page, { button: 'Save', toast: 'Changes Saved' });

test.describe('Votes Management', () => {
	const seededVoteEventIds: string[] = [];
	const seededPersonIds: string[] = [];

	test.afterEach(async ({ page }) => {
		for (const id of seededVoteEventIds) {
			await deleteVoteEvent(page, id);
		}
		for (const id of seededPersonIds) {
			await deleteTestPerson(page, id);
		}
		seededVoteEventIds.length = 0;
		seededPersonIds.length = 0;
	});

	test('update all vote fields and persist', async ({ page }) => {
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Edit All Fields ${genId(test.info().workerIndex)}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const voteRow = getVoteRow(page, votes[0].id);
		await editTextInput(page, voteRow, 0, '5');
		await editTextInput(page, voteRow, 1, '999');
		await editTextInput(page, voteRow, 2, 'พรรคใหม่');
		await editDropdown(voteRow, 4, VOTE_OPTIONS.DISAGREE);

		await saveVotes(page);

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
		await expect(refreshedRow.locator('td').nth(4)).toContainText(
			VOTE_OPTIONS.DISAGREE,
		);
	});

	test('add multiple new vote rows', async ({ page }) => {
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Add Vote ${genId(test.info().workerIndex)}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await page.getByLabel('Number of votes to add').fill('2');
		await page.getByRole('button', { name: 'Add 2 Votes' }).click();

		const rows = page.locator('tr[data-value]:has(input[type="text"])');
		await expect(rows).toHaveCount(3);

		for (const [i, order] of ['2', '3'].entries()) {
			const newRow = rows.nth(i + 1);
			await editTextInput(page, newRow, 0, order);
			await editTextInput(page, newRow, 1, `00${order}`);
			await editTextInput(page, newRow, 2, 'พรรคใหม่');
		}

		await saveVotes(page);
		expect(await fetchVoteCount(page, voteEventId)).toBe(3);
	});

	test('delete vote row', async ({ page }) => {
		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Delete Vote ${genId(test.info().workerIndex)}`,
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
		await firstRow.getByRole('button', { name: 'ลบ' }).click();
		await expect(firstRow).toBeHidden();

		await saveVotes(page);
		expect(await fetchVoteCount(page, voteEventId)).toBe(1);
	});

	test('discard a new row deleted before saving', async ({ page }) => {
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Test Discard New Vote ${genId(test.info().workerIndex)}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await page.getByRole('button', { name: 'Add 1 Vote' }).click();

		const newRow = page
			.locator('tr[data-value]:has(input[type="text"])')
			.last();
		await editTextInput(page, newRow, 0, '2');
		await newRow.getByRole('button', { name: 'ลบ' }).click();
		await expect(page.locator('table').first().locator('tbody tr')).toHaveCount(
			1,
		);

		await saveVotes(page);
		expect(await fetchVoteCount(page, voteEventId)).toBe(1);
	});

	test('update voter name', async ({ page }) => {
		const uniqueId = genId(test.info().workerIndex);
		const personFirstname = 'ทดสอบ';
		const personLastname = `นามสกุล${uniqueId}`;
		const personFullName = `${personFirstname} ${personLastname}`;
		const invalidVoterName = 'ชื่อผิด นามสกุลผิด';

		const person = await createTestPerson(page, {
			firstname: personFirstname,
			lastname: personLastname,
		});
		seededPersonIds.push(person.id);

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

		await voteRow.locator('input[role="combobox"]').fill(personFirstname);
		await page
			.locator(`.bx--list-box__menu-item:has-text("${personFullName}")`)
			.click();
		await page.keyboard.press('Tab');

		await expect(
			voteRow.locator('td').filter({ hasText: personFullName }),
		).toBeVisible();

		await saveVotes(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		await expect(
			refreshedRow.locator('td').filter({ hasText: personFullName }),
		).toBeVisible();

		const voterNames = (vote: { voters: { name: string }[] }) =>
			vote.voters.map((v) => v.name.replace(/\s+/g, ' '));

		const linkedVote = await fetchVote(page, votes[0].id);
		expect(voterNames(linkedVote)).toEqual([personFullName]);
		expect(linkedVote.voter_name_raw).toBe(invalidVoterName);

		await editDropdown(refreshedRow, 4, VOTE_OPTIONS.DISAGREE);
		await saveVotes(page);

		const voteAfterOptionEdit = await fetchVote(page, votes[0].id);
		expect(voteAfterOptionEdit.option).toBe(VOTE_OPTIONS.DISAGREE);
		expect(voterNames(voteAfterOptionEdit)).toEqual([personFullName]);
		expect(voteAfterOptionEdit.voter_name_raw).toBe(invalidVoterName);
	});

	test('show validation errors for invalid votes', async ({ page }) => {
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Validation Test ${genId(test.info().workerIndex)}`,
			[DEFAULT_VOTE, { ...DEFAULT_VOTE, vote_order: '2', badge_number: '002' }],
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await expect(page.getByText('Duplicate Votes')).toBeVisible();
		await expect(page.getByText('Unrecognized Voter Names')).toBeVisible();
	});

	test('edit summary counts', async ({ page }) => {
		const { voteEventId } = await createVoteEventWithVotes(
			page,
			`Summary Test ${genId(test.info().workerIndex)}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		await expect(
			page.getByRole('heading', { name: 'Vote Summary' }),
		).toBeVisible();

		const firstSummaryInput = page
			.locator('div:has(> h4:text("Vote Summary")) input[type="number"]')
			.first();
		await firstSummaryInput.fill('5');
		await saveVotes(page);

		await page.reload();
		await waitForTable(page);
		await expect(firstSummaryInput).toHaveValue('5');
	});

	test('open batch name correction modal', async ({ page }) => {
		const uniqueId = genId(test.info().workerIndex);

		const person = await createTestPerson(page, {
			firstname: 'ทดสอบ',
			lastname: `นามสกุล${uniqueId}`,
		});
		seededPersonIds.push(person.id);

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
