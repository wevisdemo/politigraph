<script setup lang="ts">
import { enumPublishStatus } from '@politigraph/graphql/genql';
import { getStringQueryParam } from '~/utils/query';
import { ref } from 'vue';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'People | Politigraph Admin',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

const statusOption = [
	enumPublishStatus.PUBLISHED,
	enumPublishStatus.UNPUBLISHED,
];

const filters = ref({
	status: getStringQueryParam(route.query.status, 'ALL'),
	membership: getStringQueryParam(route.query.membership, 'ALL'),
});

const {
	offset,
	numberOfPage,
	paginationData,
	handlePageChange,
	handlePageSizeChange,
} = usePaginationQuery({
	getExtraQuery: () => ({
		status: filters.value.status !== 'ALL' ? filters.value.status : undefined,
		membership:
			filters.value.membership !== 'ALL' ? filters.value.membership : undefined,
	}),
	totalCount: () => data.value?.totalCount,
	watch: [filters],
});

const { debouncedSearch, handleSearchChange } = useDebouncedSearch({
	onDebouncedChange: () => {
		paginationData.value.page = 1;
	},
});

const partyMembershipCondition = {
	end_date: { eq: null },
	posts: {
		some: {
			organizations: {
				some: { classification: { eq: 'POLITICAL_PARTY' as const } },
			},
		},
	},
};

const { data } = await useLazyAsyncData(
	'people',
	async () => {
		const where: Record<string, unknown> = {};
		const andClauses: Record<string, unknown>[] = [];

		if (debouncedSearch.value) {
			andClauses.push({
				OR: [
					{ firstname: { contains: debouncedSearch.value } },
					{ lastname: { contains: debouncedSearch.value } },
				],
			});
		}

		if (filters.value.status !== 'ALL') {
			andClauses.push({
				publish_status: { eq: filters.value.status },
			});
		}

		if (filters.value.membership === 'PARTY_CONFLICT') {
			andClauses.push({
				memberships: { some: partyMembershipCondition },
			});
			andClauses.push({
				NOT: {
					memberships: { single: partyMembershipCondition },
				},
			});
		}

		if (filters.value.membership === 'NO_PARTY_REPRESENTATIVE') {
			andClauses.push({
				memberships: {
					some: {
						end_date: { eq: null },
						posts: {
							some: {
								organizations: {
									some: {
										classification: {
											eq: 'HOUSE_OF_REPRESENTATIVE' as const,
										},
									},
								},
							},
						},
					},
				},
			});
			andClauses.push({
				memberships: { none: partyMembershipCondition },
			});
		}

		if (andClauses.length > 0) {
			where.AND = andClauses;
		}

		const { people, peopleConnection } = await graphqlClient.query({
			people: {
				__args: {
					where: andClauses.length > 0 ? where : undefined,
					limit: paginationData.value.pageSize,
					offset: offset.value,
				},
				id: true,
				name: true,
				created_at: true,
				updated_at: true,
				publish_status: true,
				memberships: {
					__args: {
						where: { end_date: { eq: null } },
					},
					id: true,
					posts: {
						id: true,
						label: true,
					},
				},
			},
			peopleConnection: {
				__args: {
					where: andClauses.length > 0 ? where : undefined,
				},
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
		watch: [paginationData.value, filters.value, debouncedSearch],
	},
);

const membershipOptions = [
	{ label: 'ทั้งหมด', value: 'ALL' },
	{
		label: 'ปัจจุบันสังกัดมากกว่า 1 พรรค (ข้อมูลผิด)',
		value: 'PARTY_CONFLICT',
	},
	{
		label: 'เป็นสส.อยู่แต่ไม่ได้สังกัดพรรค (ข้อมูลขาด)',
		value: 'NO_PARTY_REPRESENTATIVE',
	},
];
</script>

<template>
	<cv-breadcrumb no-trailing-slash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>People</cv-breadcrumb-item>
	</cv-breadcrumb>
	<h1 class="mb-8 mt-4 font-normal">People</h1>
	<cv-data-table-skeleton
		v-if="!data"
		title="People"
		helper-text="ข้อมูลบุคคลทางการเมืองทั้งหมด"
	/>
	<div v-else class="relative">
		<div class="flex flex-col items-start gap-12 md:flex-row">
			<PeopleFilter
				v-model:filters="filters"
				class="w-xs sticky top-16"
				:membership-options
				:status-options="[
					{ label: 'ทั้งหมด', value: 'ALL' },
					...statusOption.map((status) => ({
						label: status,
						value: status,
					})),
				]"
			/>
			<div class="w-full">
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
		</div>
	</div>
</template>
