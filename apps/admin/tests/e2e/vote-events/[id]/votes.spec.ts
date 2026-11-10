import { expect, test } from '@playwright/test';
import {
	createTestOrganization,
	createTestPerson,
	deleteTestOrganization,
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
	fetchVoteLinks,
	getVoteRow,
	selectInCell,
	VOTE_OPTIONS,
	waitForTable,
} from '../helpers';

const saveVotes = (page: Parameters<typeof saveChanges>[0]) =>
	saveChanges(page, { toast: 'Changes Saved' });

test.describe('Votes Management', () => {
	const seededVoteEventIds: string[] = [];
	const seededPersonIds: string[] = [];
	const seededOrganizationIds: string[] = [];

	test.afterEach(async ({ page }) => {
		for (const id of seededVoteEventIds) {
			await deleteVoteEvent(page, id);
		}
		for (const id of seededPersonIds) {
			await deleteTestPerson(page, id);
		}
		for (const id of seededOrganizationIds) {
			await deleteTestOrganization(page, id);
		}
		seededVoteEventIds.length = 0;
		seededPersonIds.length = 0;
		seededOrganizationIds.length = 0;
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
		await editDropdown(voteRow, 4, VOTE_OPTIONS.DISAGREE);

		await saveVotes(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		await expect(
			refreshedRow.locator('input[type="text"]').first(),
		).toHaveValue('5');
		await expect(refreshedRow.locator('input[type="text"]').nth(1)).toHaveValue(
			'999',
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

		await page.getByLabel('Number of votes to add').fill('60');
		await page.getByRole('button', { name: 'Add 60 Votes' }).click();

		const rows = page.locator('tr[data-value]:has(input[type="text"])');
		await expect(rows).toHaveCount(61);

		for (const [i, order] of ['2', '3'].entries()) {
			const newRow = rows.nth(i + 1);
			await editTextInput(page, newRow, 0, order);
			await editTextInput(page, newRow, 1, `00${order}`);
		}

		await saveVotes(page);
		expect(await fetchVoteCount(page, voteEventId)).toBe(61);
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
		await voteRow.locator('td').first().click();

		await expect(
			voteRow.locator('td').filter({ hasText: personFullName }),
		).toBeVisible();

		await saveVotes(page);

		const refreshedRow = getVoteRow(page, votes[0].id);
		await expect(
			refreshedRow.locator('td').filter({ hasText: personFullName }),
		).toBeVisible();

		const voterName = (vote: { voter: { name: string } | null }) =>
			vote.voter?.name.replace(/\s+/g, ' ');

		const linkedVote = await fetchVote(page, votes[0].id);
		expect(voterName(linkedVote)).toBe(personFullName);
		expect(linkedVote.voter_name_raw).toBe(invalidVoterName);

		await editDropdown(refreshedRow, 4, VOTE_OPTIONS.DISAGREE);
		await saveVotes(page);

		const voteAfterOptionEdit = await fetchVote(page, votes[0].id);
		expect(voteAfterOptionEdit.option).toBe(VOTE_OPTIONS.DISAGREE);
		expect(voterName(voteAfterOptionEdit)).toBe(personFullName);
		expect(voteAfterOptionEdit.voter_name_raw).toBe(invalidVoterName);
	});

	test('link new votes to their voters and affiliations after failed and dropped responses, then switch them', async ({
		page,
	}) => {
		const uniqueId = genId(test.info().workerIndex);
		const [personA, personB] = await Promise.all(
			['ก', 'ข'].map((suffix) =>
				createTestPerson(page, {
					firstname: 'ทดสอบ',
					lastname: `${suffix}${uniqueId}`,
				}),
			),
		);
		seededPersonIds.push(personA!.id, personB!.id);
		const [partyA, partyB] = await Promise.all(
			['ก', 'ข'].map((suffix) =>
				createTestOrganization(
					page,
					`พรรค${suffix}${uniqueId}`,
					'POLITICAL_PARTY',
				),
			),
		);
		seededOrganizationIds.push(partyA!.id, partyB!.id);

		const { voteEventId, votes } = await createVoteEventWithVotes(
			page,
			`Test Link Votes ${uniqueId}`,
		);
		seededVoteEventIds.push(voteEventId);

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await waitForTable(page);

		const deletedRow = getVoteRow(page, votes[0]!.id);
		await deletedRow.getByRole('button', { name: 'ลบ' }).click();
		await page.getByLabel('Number of votes to add').fill('2');
		await page.getByRole('button', { name: 'Add 2 Votes' }).click();
		const rows = page.locator('tr[data-value]:has(input[type="text"])');
		for (const [i, voterLastname] of [
			`ก${uniqueId}`,
			`ข${uniqueId}`,
		].entries()) {
			const row = rows.nth(i);
			await editTextInput(page, row, 0, `${i + 2}`);
			await editTextInput(page, row, 1, `00${i + 2}`);
			await selectInCell(page, row, 2, voterLastname);
			await selectInCell(page, row, 3, partyA!.name);
		}

		let voterLinking: 'fail' | 'dropOneResponse' | 'pass' = 'fail';
		let failedRequestCount = 0;
		await page.route('**/graphql', async (route) => {
			if (
				voterLinking === 'pass' ||
				!route.request().postData()?.includes('updatePeople')
			) {
				return route.continue();
			}
			if (voterLinking === 'dropOneResponse') {
				voterLinking = 'pass';
				await route.fetch();
			}
			failedRequestCount++;
			return route.abort();
		});

		await saveChanges(page, { toast: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		expect(failedRequestCount).toBeGreaterThanOrEqual(3);
		await expect(rows).toHaveCount(2);
		await expect(deletedRow).toBeHidden();
		for (const [i, voterLastname] of [
			`ก${uniqueId}`,
			`ข${uniqueId}`,
		].entries()) {
			await expect(rows.nth(i).locator('td').nth(2)).toContainText(
				voterLastname,
			);
		}

		voterLinking = 'dropOneResponse';
		await saveVotes(page);
		expect(voterLinking).toBe('pass');

		const linksOf = async () =>
			Object.fromEntries(
				(await fetchVoteLinks(page, voteEventId)).map((vote) => [
					vote.vote_order,
					vote,
				]),
			);
		const created = await linksOf();
		expect(Object.keys(created).sort()).toEqual(['2', '3']);
		expect(created['2']).toMatchObject({
			voter: { id: personA!.id, votesConnection: { totalCount: 1 } },
			voter_affiliation: {
				id: partyA!.id,
				member_votesConnection: { totalCount: 2 },
			},
		});
		expect(created['3']).toMatchObject({
			voter: { id: personB!.id, votesConnection: { totalCount: 1 } },
			voter_affiliation: { id: partyA!.id },
		});

		await page.unroute('**/graphql');
		const secondRow = getVoteRow(page, created['2']!.id);
		const thirdRow = getVoteRow(page, created['3']!.id);
		await selectInCell(page, secondRow, 2, `ข${uniqueId}`);
		await selectInCell(page, thirdRow, 2, `ก${uniqueId}`);
		await selectInCell(page, secondRow, 3, partyB!.name);
		await page.getByRole('button', { name: 'Save Changes' }).click();

		await expect.poll(linksOf).toMatchObject({
			'2': {
				voter: { id: personB!.id, votesConnection: { totalCount: 1 } },
				voter_affiliation: {
					id: partyB!.id,
					member_votesConnection: { totalCount: 1 },
				},
			},
			'3': {
				voter: { id: personA!.id, votesConnection: { totalCount: 1 } },
				voter_affiliation: {
					id: partyA!.id,
					member_votesConnection: { totalCount: 1 },
				},
			},
		});
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
