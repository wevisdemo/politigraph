import { getNumberQueryParam } from '~/utils/query';
import { ref, watch } from 'vue';
import type { LocationQuery, LocationQueryRaw } from 'vue-router';

type PaginationData = {
	page: number;
	pageSize: number;
};

type PaginationOptions = {
	defaultPage?: number;
	defaultPageSize?: number;
	getExtraQuery?: () => LocationQueryRaw;
	watch?: unknown[];
};

const getPaginationDataFromQuery = (
	query: LocationQuery,
	defaultPage: number,
	defaultPageSize: number,
): PaginationData => ({
	page: getNumberQueryParam(query.page, defaultPage),
	pageSize: getNumberQueryParam(query.pageSize, defaultPageSize),
});

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

export const usePaginationQuery = (options: PaginationOptions = {}) => {
	const route = useRoute();
	const router = useRouter();
	const defaultPage = options.defaultPage ?? 1;
	const defaultPageSize = options.defaultPageSize ?? 50;
	const paginationData = ref(
		getPaginationDataFromQuery(route.query, defaultPage, defaultPageSize),
	);

	const handlePageChange = (page: number) => {
		paginationData.value.page = page;
	};

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
		paginationData,
		handlePageChange,
		handlePageSizeChange,
	};
};
