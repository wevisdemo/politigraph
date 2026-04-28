<script setup lang="ts">
import {
	enumBillCreatorType,
	enumBillStatus,
	type BillCreatorType,
	type BillStatus,
	type BillWhere,
} from '@politigraph/graphql/genql';
import { formatDate } from '~/utils/date';
import { getArrayQueryParam, getStringQueryParam } from '~/utils/query';
import { ref } from 'vue';

const allOption = { label: 'ทั้งหมด', value: 'ALL' };

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

const eventCompletenessType: Record<string, string> = {
	DONE: 'ครบถ้วน',
	NEED_ACTIONS: 'ต้องแก้ไข',
};

const filters = ref({
	organization: getStringQueryParam(route.query.organization, 'ALL'),
	status: getStringQueryParam(route.query.status, 'ALL'),
	creatorType: getStringQueryParam(route.query.creatorType, 'ALL'),
	eventCompleteness: getStringQueryParam(route.query.eventCompleteness, 'ALL'),
});

const {
	offset,
	numberOfPage,
	paginationData,
	handlePageChange,
	handlePageSizeChange,
} = usePaginationQuery({
	getExtraQuery: () => ({
		organization:
			filters.value.organization !== 'ALL'
				? filters.value.organization
				: undefined,
		status: filters.value.status !== 'ALL' ? filters.value.status : undefined,
		creatorType:
			filters.value.creatorType !== 'ALL'
				? filters.value.creatorType
				: undefined,
		eventCompleteness:
			filters.value.eventCompleteness !== 'ALL'
				? filters.value.eventCompleteness
				: undefined,
	}),
	totalCount: () => data.value?.totalCount,
	watch: [filters],
});

const { data } = await useLazyAsyncData(
	'bills',
	async () => {
		const where = {
			AND: [] as BillWhere[],
		};

		if (debouncedSearch.value) {
			where.AND.push({
				OR: [
					{ title: { contains: debouncedSearch.value } },
					{ nickname: { contains: debouncedSearch.value } },
				],
			});
		}

		if (filters.value.organization !== 'ALL') {
			if (filters.value.organization === 'อื่นๆ') {
				where.AND.push({
					organizationsConnection: {
						aggregate: { count: { nodes: { eq: 0 } } },
					},
				});
			} else {
				where.AND.push({
					organizations: { some: { id: { eq: filters.value.organization } } },
				});
			}
		}

		if (filters.value.status !== 'ALL') {
			where.AND.push({ status: { eq: filters.value.status as BillStatus } });
		}

		if (filters.value.creatorType !== 'ALL') {
			where.AND.push({
				creator_type: { eq: filters.value.creatorType as BillCreatorType },
			});
		}

		const selectedCompleteness = filters.value.eventCompleteness;

		if (selectedCompleteness !== 'ALL') {
			const needActionsEvent: BillWhere = {
				OR: [
					{
						events: {
							some: { BillMergeEvent: { main_bill_id: { eq: null } } },
						},
					},
					{
						events: {
							some: {
								BillVoteEvent: {
									vote_eventsConnection: {
										aggregate: {
											count: {
												nodes: {
													eq: 0,
												},
											},
										},
									},
								},
							},
						},
					},
				],
			};

			if (selectedCompleteness === 'NEED_ACTIONS') {
				where.AND.push(needActionsEvent);
			} else if (selectedCompleteness === 'DONE') {
				where.AND.push({ NOT: needActionsEvent });
			}
		}

		const { bills, billsConnection } = await graphqlClient.query({
			bills: {
				__args: {
					where,
					sort: [{ updated_at: 'DESC' }, { created_at: 'DESC' }],
					limit: paginationData.value.pageSize,
					offset: offset.value,
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

const organizationsOption = computed(
	() =>
		organizations.value
			?.map((o) => ({
				label: `${o.abbreviation ?? ''} ชุดที่ ${o.term ?? '-'}`,
				value: o.id,
				term: o.term ?? 0,
			}))
			.sort((a, b) => b.term - a.term) || [],
);

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
					allOption,
					...organizationsOption.map((o) => ({
						label: o.label,
						value: o.value,
					})),
				]"
				:statusOptions="[
					allOption,
					...statusOption.map((s) => ({
						label: billType[s],
						value: s,
					})),
				]"
				:creatorTypeOptions="[
					allOption,
					...creatorTypeOption.map((c) => ({
						label: creatorType[c],
						value: c,
					})),
				]"
				:eventCompletenessOptions="[
					allOption,
					...Object.entries(eventCompletenessType).map(([value, label]) => ({
						value,
						label,
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
						<cv-data-table-heading id="sb-events-completeness">
							<div class="flex flex-row items-center gap-1">
								Events
								<cv-tooltip alignment="end" direction="bottom">
									<template #content>
										<div class="-ml-2 flex flex-col py-1">
											Events with complete data (complete/total).
											<ul class="ml-4 list-disc">
												<li>
													A bill merge event is incomplete if no main bill is
													specified
												</li>
												<li>
													A bill vote event is incomplete if no vote event is
												</li>
												<li>
													Other types of events are always considered complete
												</li>
											</ul>
										</div>
									</template>
								</cv-tooltip>
							</div>
						</cv-data-table-heading>
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
