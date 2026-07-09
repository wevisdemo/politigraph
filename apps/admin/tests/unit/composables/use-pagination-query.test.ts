import { beforeEach, describe, expect, test, vi } from 'vitest';
import { nextTick, ref } from 'vue';

const mockRoute = { query: {} as Record<string, string | string[]> };
const mockRouter = { replace: vi.fn() };

vi.mock('vue-router', () => ({
	useRoute: () => mockRoute,
	useRouter: () => mockRouter,
}));

const { usePaginationQuery } =
	await import('~/composables/use-pagination-query');

describe('usePaginationQuery', () => {
	beforeEach(() => {
		mockRoute.query = {};
		mockRouter.replace.mockClear();
	});

	test('uses default page and pageSize', () => {
		const { paginationData } = usePaginationQuery();

		expect(paginationData.value.page).toBe(1);
		expect(paginationData.value.pageSize).toBe(50);
	});

	test('reads page from route query', () => {
		mockRoute.query = { page: '3' };

		const { paginationData } = usePaginationQuery();

		expect(paginationData.value.page).toBe(3);
	});

	test('reads pageSize from route query', () => {
		mockRoute.query = { pageSize: '25' };

		const { paginationData } = usePaginationQuery();

		expect(paginationData.value.pageSize).toBe(25);
	});

	test('computes offset correctly', () => {
		mockRoute.query = { page: '3', pageSize: '20' };

		const { offset } = usePaginationQuery();

		expect(offset.value).toBe(40);
	});

	test('computes numberOfPage from totalCount', () => {
		const totalCount = ref(100);

		const { numberOfPage } = usePaginationQuery({
			totalCount,
			defaultPageSize: 25,
		});

		expect(numberOfPage.value).toBe(4);
	});

	test('defaults numberOfPage to 1 when totalCount is null', () => {
		const totalCount = ref(null);

		const { numberOfPage } = usePaginationQuery({ totalCount });

		expect(numberOfPage.value).toBe(1);
	});

	test('defaults numberOfPage to 1 when totalCount is 0', () => {
		const totalCount = ref(0);

		const { numberOfPage } = usePaginationQuery({ totalCount });

		expect(numberOfPage.value).toBe(1);
	});

	test('handlePageChange updates page', () => {
		const { paginationData, handlePageChange } = usePaginationQuery();

		handlePageChange(5);

		expect(paginationData.value.page).toBe(5);
	});

	test('handlePageSizeChange updates pageSize', () => {
		const { paginationData, handlePageSizeChange } = usePaginationQuery();

		handlePageSizeChange(25);

		expect(paginationData.value.pageSize).toBe(25);
	});

	test('calls router.replace when pagination changes', async () => {
		const { handlePageChange } = usePaginationQuery();

		handlePageChange(2);
		await nextTick();

		expect(mockRouter.replace).toHaveBeenCalledWith(
			expect.objectContaining({
				query: expect.objectContaining({ page: 2 }),
			}),
		);
	});

	test('omits default page value from query when changed to non-default', async () => {
		const { handlePageChange } = usePaginationQuery({
			defaultPage: 1,
			defaultPageSize: 50,
		});

		handlePageChange(2);
		await nextTick();

		handlePageChange(1);
		await nextTick();

		const lastCall =
			mockRouter.replace.mock.calls[mockRouter.replace.mock.calls.length - 1];
		expect(lastCall[0].query.page).toBeUndefined();
	});
});
