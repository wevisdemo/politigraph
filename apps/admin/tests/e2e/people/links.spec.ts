import { expect, test, type Page } from '@playwright/test';
import {
	createTestPerson,
	deleteTestLink,
	deleteTestPerson,
	gql,
} from '../shared/graphql-helpers';
import { addLink, genId, saveChanges } from '../shared/ui-helpers';

const uid = () => genId(test.info().workerIndex);

async function fetchLinks(page: Page, personId: string) {
	const { people } = await gql(
		page,
		`query ($id: ID!) {
			people(where: { id: { eq: $id } }) { links { id note url } }
		}`,
		{ id: personId },
	);
	return people[0].links as { id: string; note: string; url: string }[];
}

test.describe('Person links', () => {
	let personId: string | undefined;

	test.afterEach(async ({ page }) => {
		if (!personId) return;
		for (const link of await fetchLinks(page, personId)) {
			await deleteTestLink(page, link.id);
		}
		await deleteTestPerson(page, personId);
		personId = undefined;
	});

	test('add a link to an existing person', async ({ page }) => {
		personId = (
			await createTestPerson(page, {
				firstname: `LinkPerson${uid()}`,
				lastname: 'Test',
			})
		).id;
		const note = `Note ${uid()}`;
		const url = `https://example.com/${uid()}`;

		await page.goto(`/people/${personId}`);
		await expect(page.getByLabel('Firstname (Thai)*')).not.toHaveValue('');
		await addLink(page, note, url);
		await saveChanges(page);

		expect(await fetchLinks(page, personId)).toMatchObject([{ note, url }]);
	});

	test('create a person with a link', async ({ page }) => {
		const note = `Note ${uid()}`;
		const url = `https://example.com/${uid()}`;

		await page.goto('/people/new');
		await page.getByLabel('Prefix*').fill('นาย');
		await page.getByLabel('Firstname (Thai)*').fill(`NewLinkPerson${uid()}`);
		await page.getByLabel('Lastname (Thai)*').fill('Test');
		await addLink(page, note, url);
		await page.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL(/\/people\/(?!new$)[^/]+$/);
		personId = decodeURIComponent(page.url().split('/').pop()!);

		expect(await fetchLinks(page, personId)).toMatchObject([{ note, url }]);
	});
});
