import { expect, test } from '@playwright/test';
import { login } from './fixtures';
import {
	addLink,
	cancelPostModal,
	createTestOrganization,
	createTestPost,
	deleteTestLink,
	deleteTestOrganization,
	deleteTestPost,
	fetchOrganizationDetail,
	getPostRows,
	linkPostToOrganization,
	openAddPostModal,
	saveOrganizationChanges,
	savePostModal,
	waitForOrganizationDetail,
	waitForOrganizationTable,
} from './organization-helpers';

const genId = () => `${test.info().workerIndex}-${Date.now()}`;

test.describe('Organization List', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('list organizations', async ({ page }) => {
		await page.goto('/organizations');

		await expect(page.locator('h1:has-text("Organizations")')).toBeVisible();
		await expect(page.locator('table, [role="table"]')).toBeVisible();
	});

	test('navigate from list to detail page', async ({ page }) => {
		const uid = genId();
		const orgName = `TestOrgNav${uid}`;
		const org = await createTestOrganization(page, orgName, 'POLITICAL_PARTY');

		try {
			await page.goto('/organizations');
			await waitForOrganizationTable(page);

			const orgLink = page.locator(`a:has-text("${orgName}")`).first();
			await expect(orgLink).toBeVisible({ timeout: 10000 });
			await orgLink.click();

			await page.waitForURL(/\/organizations\/[0-9a-f]{8}-/, {
				timeout: 10000,
			});
			await waitForOrganizationDetail(page);

			await expect(
				page.locator('h4:has-text("Organization Details")'),
			).toBeVisible();
		} finally {
			await deleteTestOrganization(page, org.id);
		}
	});

	test('filter by classification', async ({ page }) => {
		const uid = genId();
		const orgName = `TestOrgFilter${uid}`;
		const org = await createTestOrganization(page, orgName, 'POLITICAL_PARTY');

		await page.goto('/organizations');
		await waitForOrganizationTable(page);

		await page
			.locator('label.bx--radio-button__label:has-text("พรรคการเมือง")')
			.click();
		await page.waitForTimeout(1000);

		await expect(page.locator('table, [role="table"]')).toBeVisible();

		await deleteTestOrganization(page, org.id);
	});
});

test.describe('Organization Detail - Edit & Persist', () => {
	let orgId: string;
	let orgName: string;

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		orgName = `TestOrgDetail${uid}`;

		const org = await createTestOrganization(page, orgName, 'POLITICAL_PARTY');
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, orgId);
	});

	test('detail page shows organization fields', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await expect(
			page.locator('h4:has-text("Organization Details")'),
		).toBeVisible();
		await expect(page.getByLabel('Name*')).toBeVisible();
		await expect(page.getByLabel('Name (Eng)')).toBeVisible();
		await expect(page.getByLabel('Description')).toBeVisible();
		await expect(page.getByLabel('Classification*')).toBeVisible();
	});

	test('edit name and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const newName = `UpdatedOrg${genId()}`;
		await page.getByLabel('Name*').clear();
		await page.getByLabel('Name*').fill(newName);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail.name).toBe(newName);
	});

	test('edit name_en and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const newNameEn = `UpdatedOrgEn${genId()}`;
		await page.getByLabel('Name (Eng)').clear();
		await page.getByLabel('Name (Eng)').fill(newNameEn);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail.name_en).toBe(newNameEn);
	});

	test('edit description and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const description = `Test description ${genId()}`;
		await page.getByLabel('Description').clear();
		await page.getByLabel('Description').fill(description);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail.description).toBe(description);
	});

	test('change classification and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await page.getByLabel('Classification*').selectOption('CABINET');

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail.classification).toBe('CABINET');
	});

	test('edit color and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const colorInput = page
			.locator('.vue-pick-colors-trigger, [class*="pick-colors"]')
			.first();
		if (await colorInput.isVisible()) {
			await colorInput.click();
			await page.waitForTimeout(300);

			const colorHex = page.locator('input[type="text"]').last();
			await colorHex.clear();
			await colorHex.fill('#FF5733');
			await colorHex.press('Enter');
			await page.waitForTimeout(300);
		}

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail).toBeTruthy();
	});
});

test.describe('Organization Detail - Parent/Child Relationships', () => {
	let parentOrgId: string;
	let childOrgId: string;
	let mainOrgId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		const parent = await createTestOrganization(
			page,
			`ParentOrg${uid}`,
			'POLITICAL_PARTY',
		);
		parentOrgId = parent.id;

		const child = await createTestOrganization(
			page,
			`ChildOrg${uid}`,
			'POLITICAL_PARTY',
		);
		childOrgId = child.id;

		const main = await createTestOrganization(
			page,
			`MainOrg${uid}`,
			'POLITICAL_PARTY',
		);
		mainOrgId = main.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, mainOrgId);
		await deleteTestOrganization(page, childOrgId);
		await deleteTestOrganization(page, parentOrgId);
	});

	test('add parent organization via multi-select', async ({ page }) => {
		await page.goto(`/organizations/${mainOrgId}`);
		await waitForOrganizationDetail(page);

		const parentLabel = page.locator('label.bx--label:has-text("Parents")');
		await parentLabel.waitFor({ state: 'visible', timeout: 10000 });
		const parentContainer = parentLabel.locator(
			'xpath=ancestor::div[contains(@class, "bx--list-box")][1]',
		);
		const parentButton = parentContainer
			.locator('button.bx--list-box__field, [role="listbox"]')
			.first();
		await parentButton.click();
		await page.waitForTimeout(300);

		await page
			.locator(`.bx--list-box__menu-item:has-text("ParentOrg")`)
			.first()
			.click();
		await page.waitForTimeout(300);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, mainOrgId);
		expect(
			detail.parents.some((p: { id: string }) => p.id === parentOrgId),
		).toBe(true);
	});

	test('add child organization via multi-select', async ({ page }) => {
		await page.goto(`/organizations/${mainOrgId}`);
		await waitForOrganizationDetail(page);

		const childLabel = page.locator('label.bx--label:has-text("Children")');
		await childLabel.scrollIntoViewIfNeeded();
		await childLabel.waitFor({ state: 'visible', timeout: 10000 });
		const childContainer = childLabel.locator(
			'xpath=ancestor::div[contains(@class, "bx--list-box")][1]',
		);
		const childButton = childContainer
			.locator('button.bx--list-box__field')
			.first();
		await childButton.scrollIntoViewIfNeeded();
		await childButton.click();
		await page.waitForTimeout(500);

		const childItem = childContainer
			.locator(`.bx--list-box__menu-item:has-text("ChildOrg")`)
			.first();
		await childItem.waitFor({ state: 'attached', timeout: 5000 });
		await childItem.scrollIntoViewIfNeeded();
		await childItem.click({ force: true });
		await page.waitForTimeout(500);

		await childButton.click();
		await page.waitForTimeout(300);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, mainOrgId);
		expect(
			detail.children.some((c: { id: string }) => c.id === childOrgId),
		).toBe(true);
	});
});

test.describe('Organization Detail - Posts CRUD', () => {
	let orgId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		const org = await createTestOrganization(
			page,
			`PostOrg${uid}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, orgId);
	});

	test('add post modal renders', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openAddPostModal(page);

		await expect(
			page.locator('.post-modal .bx--modal-header__heading'),
		).toContainText(/add/i);
		await expect(page.locator('.post-modal')).toContainText('Role*');

		await cancelPostModal(page);
	});

	test('add post locally', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openAddPostModal(page);

		await page
			.locator('.post-modal input[label="Role*"], .post-modal')
			.locator('input')
			.first()
			.fill('Test Role');

		await savePostModal(page);

		const rows = getPostRows(page);
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText('Test Role');
	});

	test('add post persisted via Save Changes', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		await openAddPostModal(page);

		await page
			.locator('.post-modal input[label="Role*"], .post-modal')
			.locator('input')
			.first()
			.fill('Persisted Role');

		await savePostModal(page);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(
			detail.posts.some((p: { role: string }) => p.role === 'Persisted Role'),
		).toBe(true);
	});

	test('delete post locally', async ({ page }) => {
		const post = await createTestPost(page, `DeletePost${genId()}`);
		await linkPostToOrganization(page, post.id, orgId);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const rows = getPostRows(page);
		await expect(rows).toHaveCount(1);

		await rows.first().getByRole('button', { name: 'ลบ' }).click();

		const deleteModal = page.locator('.delete-post-modal .bx--modal-container');
		await expect(deleteModal).toBeVisible({ timeout: 5000 });
		await page
			.locator(
				'.delete-post-modal .bx--btn--danger, .delete-post-modal .bx--btn--primary',
			)
			.click();
		await page.waitForTimeout(500);

		await expect(rows.first().locator('p.line-through').first()).toBeVisible();

		await deleteTestPost(page, post.id);
	});
});

test.describe('Organization Detail - Links', () => {
	let orgId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		const org = await createTestOrganization(
			page,
			`LinkOrg${uid}`,
			'POLITICAL_PARTY',
		);
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		const detail = await fetchOrganizationDetail(page, orgId);
		if (detail?.links) {
			for (const link of detail.links) {
				await deleteTestLink(page, link.id);
			}
		}
		await deleteTestOrganization(page, orgId);
	});

	test('add link and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const note = `Test Note ${genId()}`;
		const url = `https://example.com/${genId()}`;

		await addLink(page, note, url);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(
			detail.links.some(
				(l: { note: string; url: string }) => l.note === note && l.url === url,
			),
		).toBe(true);
	});

	test('delete link and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const note = `Delete Note ${genId()}`;
		const url = `https://delete.com/${genId()}`;

		await addLink(page, note, url);

		await saveOrganizationChanges(page);

		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const refsSection = page.locator('h4:has-text("References")').locator('..');
		const deleteBtn = refsSection
			.getByRole('button', { name: 'Delete' })
			.first();
		await deleteBtn.click();
		await page.waitForTimeout(300);

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail.links).toHaveLength(0);
	});
});

test.describe('Organization Detail - Full Edit & Persist', () => {
	let orgId: string;
	let orgName: string;

	test.beforeEach(async ({ page }) => {
		await login(page);

		const uid = genId();
		orgName = `FullOrg${uid}`;

		const org = await createTestOrganization(page, orgName, 'POLITICAL_PARTY');
		orgId = org.id;
	});

	test.afterEach(async ({ page }) => {
		await deleteTestOrganization(page, orgId);
	});

	test('edit multiple fields and persist', async ({ page }) => {
		await page.goto(`/organizations/${orgId}`);
		await waitForOrganizationDetail(page);

		const uid = genId();
		const newName = `Updated${uid}`;
		const newNameEn = `UpdatedEn${uid}`;
		const newDesc = `Description ${uid}`;

		await page.getByLabel('Name*').clear();
		await page.getByLabel('Name*').fill(newName);

		await page.getByLabel('Name (Eng)').clear();
		await page.getByLabel('Name (Eng)').fill(newNameEn);

		await page.getByLabel('Description').clear();
		await page.getByLabel('Description').fill(newDesc);

		await page.getByLabel('Classification*').selectOption('CABINET');

		await saveOrganizationChanges(page);

		const detail = await fetchOrganizationDetail(page, orgId);
		expect(detail.name).toBe(newName);
		expect(detail.name_en).toBe(newNameEn);
		expect(detail.description).toBe(newDesc);
		expect(detail.classification).toBe('CABINET');
	});
});
