<script setup lang="ts">
import { useGraphqlClient } from '~/utils/graphql/client';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'People | Politigraph Admin',
});

const paginationData = ref({
	page: 1,
	pageSize: 50,
});

const numberOfPage = computed(() =>
	data.value?.totalCount
		? Math.ceil(data.value.totalCount / paginationData.value.pageSize)
		: 1,
);

const handlePageChange = (page: number) => {
	paginationData.value.page = page;
};

const handlePageSizeChange = (pageSize: number) => {
	paginationData.value.pageSize = pageSize;
};

const searchQuery = ref('');
const debouncedSearch = useDebounce(searchQuery, 1000);
const graphqlClient = useGraphqlClient();

watch(debouncedSearch, () => {
	paginationData.value.page = 1;
});

const handleSearchChange = (query: string) => {
	searchQuery.value = query;
};

const { data } = await useAsyncData(
	'people',
	async () => {
		const where: Record<string, any> = {};

		if (debouncedSearch.value) {
			where.OR = [
				{ firstname_CONTAINS: debouncedSearch.value },
				{ lastname_CONTAINS: debouncedSearch.value },
			];
		}

		const { people, peopleConnection } = await graphqlClient.query({
			people: {
				__args: {
					where,
					limit: paginationData.value.pageSize,
					offset:
						(paginationData.value.page - 1) * paginationData.value.pageSize,
				},
				id: true,
				name: true,
				created_at: true,
				updated_at: true,
				publish_status: true,
				memberships: {
					__args: {
						where: { end_date_EQ: null },
					},
					id: true,
					posts: {
						id: true,
						label: true,
					},
				},
			},
			peopleConnection: {
				__args: { where },
				aggregate: {
					count: {
						nodes: true,
					},
				},
			},
		});
		return {
			people,
			totalCount: peopleConnection.aggregate.count.nodes,
		};
	},
	{
		watch: [paginationData.value, debouncedSearch],
		server: false,
	},
);
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>People</cv-breadcrumb-item>
	</cv-breadcrumb>
	<h1 class="mb-8 mt-4 font-normal">People</h1>
	<cv-data-table-skeleton
		v-if="!data"
		title="People"
		helperText="ข้อมูลบุคคลทางการเมืองทั้งหมด"
	></cv-data-table-skeleton>
	<div v-else>
		<PeopleTable
			:people="data.people"
			:total-count="data.totalCount"
			:page="paginationData.page"
			:page-size="paginationData.pageSize"
			:number-of-page="numberOfPage"
			@page-change="handlePageChange"
			@page-size-change="handlePageSizeChange"
			@search="handleSearchChange"
		/>
	</div>
</template>
