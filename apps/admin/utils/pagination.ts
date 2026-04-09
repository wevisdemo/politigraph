import { getNumberQueryParam } from '~/utils/query';
import { computed, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { LocationQuery, LocationQueryRaw } from 'vue-router';

type PaginationData = {
	page: number;
	pageSize: number;
};

type PaginationOptions = {
	defaultPage?: number;
	defaultPageSize?: number;
	getExtraQuery?: () => LocationQueryRaw;
	totalCount?: MaybeRefOrGetter<number | null | undefined>;
	watch?: unknown[];
};

/**
 * Reads pagination state from the current route query.
 *
 * @param query - The current route query object.
 * @param defaultPage - Fallback page number when the query is missing.
 * @param defaultPageSize - Fallback page size when the query is missing.
 * @returns The normalized pagination state.
 */
const getPaginationDataFromQuery = (
	query: LocationQuery,
	defaultPage: number,
	defaultPageSize: number,
): PaginationData => ({
	page: getNumberQueryParam(query.page, defaultPage),
	pageSize: getNumberQueryParam(query.pageSize, defaultPageSize),
});

/**
 * Serializes pagination state into query parameters.
 *
 * Defaults are omitted so the URL stays clean.
 *
 * @param paginationData - The current pagination state.
 * @param defaultPage - Default page number used for comparison.
 * @param defaultPageSize - Default page size used for comparison.
 * @returns Query parameters for the non-default pagination values.
 */
const getPaginationQuery = (
	paginationData: PaginationData,
	defaultPage: number,
	defaultPageSize: number,
) => ({
	page: paginationData.page !== defaultPage ? paginationData.page : undefined,
	pageSize:
		paginationData.pageSize !== defaultPageSize
			? paginationData.pageSize
			: undefined,
});

/**
 * Keeps pagination state in sync with the route query string.
 *
 * @param options - Pagination defaults and optional query/watch settings.
 * @returns Pagination state plus handlers for page and page-size changes.
 */
export const usePaginationQuery = (options: PaginationOptions = {}) => {
	const route = useRoute();
	const router = useRouter();
	const defaultPage = options.defaultPage ?? 1;
	const defaultPageSize = options.defaultPageSize ?? 50;
	const paginationData = ref(
		getPaginationDataFromQuery(route.query, defaultPage, defaultPageSize),
	);
	const offset = computed(
		() => (paginationData.value.page - 1) * paginationData.value.pageSize,
	);
	const numberOfPage = computed(() => {
		const totalCount = toValue(options.totalCount) ?? 0;

		return totalCount > 0
			? Math.ceil(totalCount / paginationData.value.pageSize)
			: 1;
	});

	/**
	 * Updates the current page.
	 *
	 * @param page - The new page number.
	 */
	const handlePageChange = (page: number) => {
		paginationData.value.page = page;
	};

	/**
	 * Updates the current page size.
	 *
	 * @param pageSize - The new page size.
	 */
	const handlePageSizeChange = (pageSize: number) => {
		paginationData.value.pageSize = pageSize;
	};

	watch(
		[paginationData, ...(options.watch ?? [])],
		() => {
			router.replace({
				query: {
					...route.query,
					...(options.getExtraQuery?.() ?? {}),
					...getPaginationQuery(
						paginationData.value,
						defaultPage,
						defaultPageSize,
					),
				},
			});
		},
		{ deep: true },
	);

	return {
		offset,
		numberOfPage,
		paginationData,
		handlePageChange,
		handlePageSizeChange,
	};
};
