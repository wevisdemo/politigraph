import { expect, test, type APIRequestContext } from '@playwright/test';

const PROBE_MUTATION = `mutation { deletePeople(where: { id: { eq: "api-key-probe" } }) { nodesDeleted } }`;

async function probeWithApiKey(api: APIRequestContext, key: string) {
	const response = await api.post('/graphql', {
		headers: { 'Content-Type': 'application/json', 'x-api-key': key },
		data: { query: PROBE_MUTATION },
	});
	return response.json();
}

test.describe('API Keys', () => {
	test('created key authorizes GraphQL mutations until it is deleted', async ({
		page,
		playwright,
		baseURL,
	}) => {
		const api = await playwright.request.newContext({ baseURL });

		await page.goto('/api-keys');
		await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();

		const keyName = `Test Key ${test.info().workerIndex}-${Date.now()}`;
		await page.getByPlaceholder('Key name').fill(keyName);
		await page.click('button:has-text("Create")');

		const successModal = page.locator('.bx--modal.is-visible');
		await expect(successModal).toBeVisible({ timeout: 10000 });
		const key = (await successModal.locator('code').innerText()).trim();
		await successModal.getByRole('button', { name: 'Close' }).click();

		expect(await probeWithApiKey(api, key)).toEqual({
			data: { deletePeople: { nodesDeleted: 0 } },
		});

		const createdCell = page.getByRole('cell', { name: keyName }).first();
		await expect(createdCell).toBeVisible({ timeout: 10000 });

		await createdCell
			.locator('xpath=ancestor::tr')
			.getByRole('button', { name: 'Delete' })
			.click();

		await expect(createdCell).not.toBeVisible();

		const afterDelete = await probeWithApiKey(api, key);
		expect(afterDelete.data?.deletePeople).toBeFalsy();
		expect(afterDelete.errors).toBeDefined();

		await api.dispose();
	});
});
