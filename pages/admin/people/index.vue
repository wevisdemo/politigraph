<script setup lang="ts">
import { graphqlClient } from '~/utils/graphql/client';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Persons | Politigraph Admin',
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

const { data } = await useAsyncData(
	'persons',
	async () => {
		const { people, peopleConnection } = await graphqlClient.query({
			people: {
				__args: {
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
				aggregate: {
					count: {
						nodes: true,
					},
				},
			},
		});
		console.log(people);
		return {
			people,
			totalCount: peopleConnection.aggregate.count.nodes,
		};
	},
	{
		watch: [paginationData.value],
		server: false,
	},
);
</script>

<template>
	<div class="bg-[#F4F4F4] p-10 pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item>Persons</cv-breadcrumb-item>
		</cv-breadcrumb>
		<h1 class="mt-4 mb-8 font-normal">Persons</h1>
		<cv-data-table-skeleton
			v-if="!data"
			title="Persons"
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
			/>
		</div>
	</div>
</template>
