import { expect, type Page } from '@playwright/test';

export const ORGANIZATION_CLASSIFICATIONS = {
	HOUSE_OF_REPRESENTATIVE: 'HOUSE_OF_REPRESENTATIVE',
	HOUSE_OF_SENATE: 'HOUSE_OF_SENATE',
	CABINET: 'CABINET',
	POLITICAL_PARTY: 'POLITICAL_PARTY',
} as const;

const CLASSIFICATION_LABELS: Record<string, string> = {
	HOUSE_OF_REPRESENTATIVE: 'สส.',
	HOUSE_OF_SENATE: 'สว.',
	CABINET: 'ครม.',
	POLITICAL_PARTY: 'พรรคการเมือง',
};

export const MEMBERSHIP_MODAL = '.membership-modal:not(.post-membership-modal)';

const TABLE_ROWS =
	'.bx--data-table tbody tr:not([data-testid="empty-state"]), .bx--table tbody tr:not([data-testid="empty-state"])';

export const genId = (workerIndex: number) => `${workerIndex}-${Date.now()}`;

export async function saveChanges(
	page: Page,
	{ button = 'Save Changes', toast = 'เรียบร้อย' } = {},
) {
	const mutation = page.waitForResponse(
		(response) =>
			response.url().includes('/graphql') &&
			!!response.request().postData()?.includes('mutation'),
	);
	await page.getByRole('button', { name: button }).click();
	await mutation;
	await expect(
		page.locator('[role="alert"].bx--toast-notification'),
	).toContainText(toast);
}

export async function waitForMembershipTable(page: Page) {
	await expect(page.locator('h4:has-text("Membership")')).toBeVisible({
		timeout: 10000,
	});
}

export function getMembershipRows(page: Page) {
	return page
		.locator('h4:has-text("Membership")')
		.locator('..')
		.locator('..')
		.locator(TABLE_ROWS);
}

export async function openAddMembershipModal(page: Page) {
	await waitForMembershipTable(page);
	await page
		.locator('h4:has-text("Membership")')
		.locator('..')
		.locator('..')
		.getByRole('button', { name: 'Add' })
		.click();
	await expect(
		page.locator(`${MEMBERSHIP_MODAL} .bx--modal-container`),
	).toBeVisible();
}

export async function openEditMembershipModal(page: Page, rowIndex = 0) {
	await getMembershipRows(page)
		.nth(rowIndex)
		.getByRole('button', { name: 'แก้ไข' })
		.click();
	await expect(
		page.locator(`${MEMBERSHIP_MODAL} .bx--modal-container`),
	).toBeVisible();
}

async function pickComboBoxOption(
	page: Page,
	index: number,
	query: string | null,
	label: string,
) {
	const field = page.locator(`${MEMBERSHIP_MODAL} .bx--combo-box`).nth(index);
	const input = field.locator('input[role="combobox"]');
	await input.click();
	if (query === null) {
		await input.press('ArrowDown');
	} else {
		await input.fill(query);
	}
	await field.locator(`.bx--list-box__menu-item:has-text("${label}")`).click();
}

export function fillClassification(page: Page, value: string) {
	return pickComboBoxOption(
		page,
		0,
		null,
		CLASSIFICATION_LABELS[value] ?? value,
	);
}

export function fillOrganizationName(page: Page, name: string) {
	return pickComboBoxOption(page, 1, name, name);
}

export function fillPost(page: Page, role: string) {
	return pickComboBoxOption(page, 2, role, role);
}

export async function setMembershipDate(
	page: Page,
	date: string,
	{ modal = MEMBERSHIP_MODAL, field = 'first' as 'first' | 'last' } = {},
) {
	await page.evaluate(
		([selector, value, position]) => {
			const inputs = document.querySelectorAll<
				HTMLInputElement & {
					_flatpickr: { setDate(date: string, trigger: boolean): void };
				}
			>(`${selector} .membership-datepicker input`);
			inputs[position === 'first' ? 0 : inputs.length - 1]._flatpickr.setDate(
				value,
				true,
			);
		},
		[modal, date, field] as const,
	);
}

export async function saveMembershipModal(page: Page) {
	const primaryBtn = page.locator(`${MEMBERSHIP_MODAL} .bx--btn--primary`);
	await expect(primaryBtn).toBeEnabled();
	await primaryBtn.click();
	await expect(
		page.locator(`${MEMBERSHIP_MODAL} .bx--modal-container`),
	).toBeHidden();
}

export async function cancelMembershipModal(page: Page) {
	await page.locator(`${MEMBERSHIP_MODAL} .bx--btn--secondary`).click();
	await expect(
		page.locator(`${MEMBERSHIP_MODAL} .bx--modal-container`),
	).toBeHidden();
}

export async function confirmDeleteModal(page: Page, modalClass: string) {
	await expect(
		page.locator(`.${modalClass} .bx--modal-container`),
	).toBeVisible();
	await page
		.locator(
			`.${modalClass} .bx--btn--danger, .${modalClass} .bx--btn--primary`,
		)
		.click();
}
