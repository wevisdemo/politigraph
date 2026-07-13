import { expect, test } from '@playwright/test';
import { createTestPerson, login } from './fixtures';

test.describe('Vote Events & Votes', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('list vote events', async ({ page }) => {
		await page.goto('/vote-events');

		await expect(page.locator('h1:has-text("Vote Events")')).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});

	test('update voter name', async ({ page }) => {
		const uniqueId = Date.now();
		const personFirstname = 'ทดสอบ';
		const personLastname = `นามสกุล${uniqueId}`;
		const personFullName = `${personFirstname} ${personLastname}`;

		await createTestPerson(page, {
			firstname: personFirstname,
			lastname: personLastname,
		});

		const voteEventTitle = `Test Vote Event ${uniqueId}`;
		const invalidVoterName = 'ชื่อผิด นามสกุลผิด';

		const createVoteEventResponse = await page.request.post('/graphql', {
			headers: { 'Content-Type': 'application/json' },
			data: {
				query: `
					mutation CreateVoteEvent($title: String!) {
						createVoteEvents(
							input: [{
								title: $title
								start_date: "2024-01-01"
								end_date: "2024-01-01"
								publish_status: UNPUBLISHED
								votes: {
									create: [{
										node: {
											vote_order: "1"
											badge_number: "001"
											voter_name_raw: "ชื่อผิด นามสกุลผิด"
											voter_party: "พรรคทดสอบ"
											option: "เห็นด้วย"
										}
									}]
								}
							}]
						) {
							voteEvents {
								id
								title
								votes {
									id
									voter_name_raw
								}
							}
						}
					}
				`,
				variables: { title: voteEventTitle },
			},
		});

		const responseBody = await createVoteEventResponse.text();
		console.log(
			'Create vote event response:',
			createVoteEventResponse.status(),
			responseBody,
		);
		expect(createVoteEventResponse.ok()).toBeTruthy();
		const createData = JSON.parse(responseBody);
		expect(createData.data?.createVoteEvents?.voteEvents).toHaveLength(1);

		const voteEventId = createData.data.createVoteEvents.voteEvents[0].id;
		const voteId = createData.data.createVoteEvents.voteEvents[0].votes[0].id;

		await page.goto(`/vote-events/${voteEventId}/votes`);
		await page.waitForSelector('table, [role="table"]', {
			timeout: 10000,
		});

		const voteRow = page.locator(`tr[data-value="${voteId}"]`).first();

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

		await page.locator('h1, h2, h3').first().click();
		await page.waitForTimeout(300);

		const updatedCell = voteRow
			.locator('td')
			.filter({ hasText: personFullName });
		await expect(updatedCell).toBeVisible();

		await page.click('button:has-text("Save")');
		await page.waitForTimeout(3000);

		await expect(
			page.locator('[role="alert"].bx--toast-notification'),
		).toContainText('Changes Saved');

		await page.waitForTimeout(3000);

		const refreshedRow = page.locator(`tr[data-value="${voteId}"]`).last();
		await expect(
			refreshedRow.locator('td').filter({ hasText: personFullName }),
		).toBeVisible();
	});
});
