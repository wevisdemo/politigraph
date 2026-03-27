<script setup lang="ts">
import {
	enumBillCreatorType,
	enumBillStatus,
} from '@politigraph/graphql/genql';
import { formatDate } from '~/utils/date';
import { useGraphqlClient } from '~/utils/graphql/client';
import { usePaginationQuery } from '~/utils/pagination';
import { getArrayQueryParam, getStringQueryParam } from '~/utils/query';
import { ref } from 'vue';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Bills | Politigraph Admin',
});

type BillEvent = {
	__typename?: unknown;
	main_bill_id?: unknown;
	vote_eventsConnection?: {
		totalCount?: unknown;
	};
};

const router = useRouter();
const route = useRoute();
const graphqlClient = useGraphqlClient();

const searchQuery = ref('');
const debouncedSearch = useDebounce(searchQuery, 1000);

watch(debouncedSearch, () => {
	paginationData.value.page = 1;
});

const handleSearchChange = (query: string) => {
	searchQuery.value = query;
};

const statusOption = Object.values(enumBillStatus);
const creatorTypeOption = Object.values(enumBillCreatorType);
const billType: Record<string, string> = {
	IN_PROGRESS: 'กำลังดำเนินการ',
	MERGED: 'ถูกรวมร่าง',
	ENACTED: 'ออกเป็นกฎหมาย',
	REJECTED: 'ตกไป',
};

const creatorType: Record<string, string> = {
	POLITICIAN: 'สมาชิกรัฐสภา',
	ASSEMBLY: 'คณะรัฐมนตรี',
	PEOPLE: 'ประชาชน',
	UNKNOWN: 'อื่นๆ / ไม่พบข้อมูล',
};

const filters = ref({
	organization: getStringQueryParam(route.query.organization, 'ALL'),
	status: getStringQueryParam(route.query.status, 'ALL'),
	creatorType: getArrayQueryParam(route.query.creatorType, creatorTypeOption),
});

const { paginationData, handlePageChange, handlePageSizeChange } =
	usePaginationQuery({
		getExtraQuery: () => ({
			organization:
				filters.value.organization !== 'ALL'
					? filters.value.organization
					: undefined,
			status: filters.value.status !== 'ALL' ? filters.value.status : undefined,
			creatorType:
				filters.value.creatorType.length === creatorTypeOption.length
					? 'ALL'
					: filters.value.creatorType.length > 0
						? filters.value.creatorType
						: undefined,
		}),
		watch: [filters],
	});

const numberOfPage = computed(() =>
	data.value?.totalCount
		? Math.ceil(data.value.totalCount / paginationData.value.pageSize)
		: 1,
);

const { data } = await useLazyAsyncData(
	'bills',
	async () => {
		const where: Record<string, any> = {};

		if (debouncedSearch.value) {
			where.OR = [
				{ title: { contains: debouncedSearch.value } },
				{ nickname: { contains: debouncedSearch.value } },
			];
		}

		if (filters.value.organization !== 'ALL') {
			const organizationId = filters.value.organization;

			if (filters.value.organization === 'อื่นๆ') {
				where.organizationsConnection = {
					aggregate: { count: { nodes: { eq: 0 } } },
				};
			} else {
				where.organizations = { some: { id: { eq: organizationId } } };
			}
		}

		if (filters.value.status !== 'ALL') {
			where.status = { eq: filters.value.status };
		}

		const selectedClassifications = filters.value.creatorType || [];

		if (selectedClassifications.length > 0) {
			where.creator_type = { in: selectedClassifications };
		} else {
			return {
				bills: [],
				totalCount: 0,
			};
		}

		const { bills, billsConnection } = await graphqlClient.query({
			bills: {
				__args: {
					where,
					sort: [{ updated_at: 'DESC' }, { created_at: 'DESC' }],
					limit: paginationData.value.pageSize,
					offset:
						(paginationData.value.page - 1) * paginationData.value.pageSize,
				},
				id: true,
				nickname: true,
				status: true,
				title: true,
				creator_type: true,
				proposal_date: true,
				events: {
					__typename: true,

					on_BillMergeEvent: {
						main_bill_id: true,
					},

					on_BillVoteEvent: {
						vote_events: {
							votesConnection: {
								totalCount: true,
							},
						},
						vote_eventsConnection: {
							totalCount: true,
						},
					},
				},
			},
			billsConnection: {
				aggregate: {
					count: {
						nodes: true,
					},
				},
			},
		});

		return {
			bills: bills,
			totalCount: billsConnection.aggregate.count.nodes,
		};
	},
	{
		watch: [paginationData.value, filters.value, debouncedSearch],
	},
);

const { data: organizations } = await useAsyncData(
	'OrganizationList',
	async () => {
		const result = await graphqlClient.query({
			organizations: {
				__args: {
					where: {
						classification: {
							in: ['HOUSE_OF_REPRESENTATIVE'],
						},
					},
				},
				id: true,
				abbreviation: true,
				term: true,
				classification: true,
				founding_date: true,
				dissolution_date: true,
			},
		});

		const orgs = result.organizations ?? [];
		orgs.sort((a, b) => Number(b.term) - Number(a.term));
		return orgs;
	},
	{ server: false },
);

const organizationsOption = () => {
	const singleOptions =
		organizations.value
			?.map((o) => ({
				label: `${o.abbreviation ?? ''} ชุดที่ ${o.term ?? '-'}`,
				value: o.id,
				term: o.term ?? 0,
			}))
			.sort((a, b) => b.term - a.term) || [];

	return singleOptions;
};

const getEventCompleteness = (data: unknown[]) => {
	const total = data.length;

	const validCount = data.reduce<number>((count, item) => {
		if (typeof item !== 'object' || item === null) return count;

		const event = item as BillEvent;

		if (event.__typename === 'BillMergeEvent' && event.main_bill_id === null) {
			return count - 1;
		}

		if (
			event.__typename === 'BillVoteEvent' &&
			event.vote_eventsConnection?.totalCount === 0
		) {
			return count - 1;
		}

		return count;
	}, total);

	return { validCount, total };
};

const formatCompleteness = (data: unknown[]) => {
	const { validCount, total } = getEventCompleteness(data);
	return `${validCount}/${total}`;
};

const isComplete = (data: unknown[]) => {
	const { validCount, total } = getEventCompleteness(data);
	return validCount === total;
};

onMounted(() => {
	if (!route.query.creatorType) {
		filters.value.creatorType = [...creatorTypeOption];
		router.replace({
			query: {
				...route.query,
				creator_type: 'ALL',
			},
		});
	}
});
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>Bills</cv-breadcrumb-item>
	</cv-breadcrumb>
	<h1 class="mb-8 mt-4 font-normal">Bills</h1>
	<cv-data-table-skeleton
		v-if="!data"
		title="Bills"
		helperText="กฏหมายและร่างกฏหมาย"
	></cv-data-table-skeleton>
	<div v-else class="relative">
		<div class="flex flex-col items-start gap-12 md:flex-row">
			<BillsFilter
				class="w-xs sticky top-16"
				v-model:filters="filters"
				:organizationOption="[
					{ label: 'ทั้งหมด', value: 'ALL' },
					...(organizationsOption() ?? []).map((o) => ({
						label: o.label,
						value: o.value,
					})),
				]"
				:statusOptions="[
					{ label: 'ทั้งหมด', value: 'ALL' },
					...statusOption.map((s) => ({
						label: billType[s],
						value: s,
					})),
				]"
				:creatorTypeOptions="[
					...creatorTypeOption.map((c) => ({
						label: creatorType[c],
						value: c,
					})),
				]"
			></BillsFilter>
			<div class="w-full">
				<cv-data-table
					title="Bills"
					helperText="กฏหมายและร่างกฏหมาย"
					@search="handleSearchChange"
				>
					<template #headings>
						<cv-data-table-heading
							id="sb-title"
							heading="Nickname/Title"
							order="ascending"
							class="w-2xl"
						/>
						<cv-data-table-heading id="sb-status" heading="Status" />
						<cv-data-table-heading
							id="sb-creator-type"
							heading="Creator Type"
						/>
						<cv-data-table-heading
							id="sb-proposal-date"
							heading="Proposal Date"
						/>
						<cv-data-table-heading
							id="sb-events-completeness"
							heading="Events Completeness"
						/>
					</template>
					<template #data>
						<cv-data-table-row
							:id="row.id"
							:key="row.id"
							:value="row.id"
							v-for="row in data.bills"
							class="cursor-pointer"
						>
							<cv-data-table-cell>
								<a
									:href="`./bills/${row.id}`"
									class="w-full text-inherit hover:underline"
									>{{ row.nickname != null ? row.nickname : row.title }}</a
								>
							</cv-data-table-cell>
							<cv-data-table-cell class="text-nowrap">{{
								billType[row.status]
							}}</cv-data-table-cell>
							<cv-data-table-cell class="text-nowrap">{{
								creatorType[row.creator_type]
							}}</cv-data-table-cell>
							<cv-data-table-cell class="text-nowrap">{{
								formatDate(row.proposal_date)
							}}</cv-data-table-cell>
							<cv-data-table-cell class="text-nowrap">
								<p
									:class="{
										'text-sm text-green-500': isComplete(row.events),
										'text-sm text-red-500': !isComplete(row.events),
									}"
								>
									{{ formatCompleteness(row.events) }}
								</p>
							</cv-data-table-cell>
						</cv-data-table-row>
					</template>
				</cv-data-table>
				<ui-pagination
					:page="paginationData.page"
					:page-size="paginationData.pageSize"
					:total-count="data.totalCount ?? 0"
					:number-of-page="numberOfPage"
					@on-page-change="handlePageChange"
					@on-page-size-change="handlePageSizeChange"
				/>
			</div>
		</div>
	</div>
</template>

<style scoped>
::v-deep(.bx--table-toolbar) {
	background-color: white;
}
</style>
