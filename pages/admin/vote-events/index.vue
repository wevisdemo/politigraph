<script setup lang="ts">
//@ts-ignore
import { DocumentPdf16, NotebookReference16 } from '@carbon/icons-vue';
import { enumPublishStatus, enumVoteEventType } from '~/.genql';
import PublishStatusLabel from '~/components/ui/PublishStatusLabel.vue';
import { graphqlClient } from '~/utils/graphql/client';
import dayjs from 'dayjs';
import { ref } from 'vue';
import type { LocationQueryValue } from 'vue-router';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Vote Events | Politigraph Admin',
});

const router = useRouter();
const route = useRoute();

const paginationData = ref({
	page: Number(route.query.page ?? 1),
	pageSize: Number(route.query.pageSize ?? 50),
});

const statusOption = Object.values(enumPublishStatus);
const classificationOption = [...Object.values(enumVoteEventType), '__NULL__'];
const voteEventType: Record<string, string> = {
	MP_1: 'สส. วาระที่ 1',
	MP_2: 'สส. วาระที่ 2',
	MP_3: 'สส. วาระที่ 3',
	SENATE_1: 'สว. วาระที่ 1',
	SENATE_2: 'สว. วาระที่ 2',
	SENATE_3: 'สว. วาระที่ 3',
	__NULL__: 'ไม่ระบุ',
};

const getStringQueryParam = (
	val: LocationQueryValue | LocationQueryValue[] | undefined,
	fallback: string = '',
): string => {
	if (Array.isArray(val)) return val[0] ?? fallback;
	return val ?? fallback;
};

const getArrayQueryParam = (
	val: LocationQueryValue | LocationQueryValue[] | undefined,
): string[] => {
	if (!val) return [];

	if (Array.isArray(val)) {
		if (val.includes('ALL')) {
			return [...classificationOption];
		}
		return val.filter(Boolean) as string[];
	}

	if (val === 'ALL') {
		return [...classificationOption];
	}

	return [val];
};

const filters = ref({
	assembly: getStringQueryParam(route.query.assembly, 'ALL'),
	status: getStringQueryParam(route.query.status, 'ALL'),
	classification: getArrayQueryParam(route.query.classification),
});

const { data } = await useAsyncData(
	'voteEvents',
	async () => {
		const where: Record<string, any> = {};

		if (filters.value.assembly !== 'ALL') {
			const assemblyIds = filters.value.assembly.split('|');
			where.AND = [
				{ organizations_ALL: { id_IN: assemblyIds } },
				{ organizationsAggregate: { count_EQ: assemblyIds.length } },
			];
		}

		if (filters.value.status !== 'ALL') {
			where.publish_status_EQ = filters.value.status;
		}

		const selectedClassifications = filters.value.classification || [];
		const includeNull = selectedClassifications.includes('__NULL__');
		const normalClassifications = selectedClassifications.filter(
			(c) => c !== '__NULL__',
		);

		if (includeNull && normalClassifications.length > 0) {
			where.OR = [
				{ classification_IN: normalClassifications },
				{ classification_EQ: null },
			];
		} else if (includeNull) {
			where.classification_EQ = null;
		} else if (normalClassifications.length > 0) {
			where.classification_IN = normalClassifications;
		} else {
			return {
				voteEvents: [],
				totalCount: 0,
			};
		}

		const { voteEvents, voteEventsConnection } = await graphqlClient.query({
			voteEvents: {
				__args: {
					where,
					sort: [{ start_date: 'DESC' }, { created_at: 'DESC' }],
					limit: paginationData.value.pageSize,
					offset:
						(paginationData.value.page - 1) * paginationData.value.pageSize,
				},
				id: true,
				title: true,
				start_date: true,
				created_at: true,
				result: true,
				publish_status: true,
				classification: true,
				organizations: {
					id: true,
					abbreviation: true,
					term: true,
				},
				links: {
					__args: {
						sort: [{ note: 'ASC' }],
					},
					note: true,
					url: true,
				},
			},
			voteEventsConnection: {
				aggregate: {
					count: {
						nodes: true,
					},
				},
			},
		});

		return {
			voteEvents,
			totalCount: voteEventsConnection.aggregate.count.nodes,
		};
	},
	{
		watch: [paginationData.value, filters.value],
		server: false,
	},
);

const { data: organizations } = await useAsyncData(
	'OrganizationList',
	async () => {
		const result = await graphqlClient.query({
			organizations: {
				__args: {
					where: {
						classification_IN: ['HOUSE_OF_REPRESENTATIVE', 'HOUSE_OF_SENATE'],
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

const isOverlapping = (
	orgA: { founding_date: string | null; dissolution_date: string },
	orgB: { founding_date: string | null; dissolution_date: string },
) => {
	const startA = orgA.founding_date ? new Date(orgA.founding_date) : Date.now();
	const endA = orgA.dissolution_date
		? new Date(orgA.dissolution_date)
		: new Date();
	const startB = orgB.founding_date ? new Date(orgB.founding_date) : Date.now();
	const endB = orgB.dissolution_date
		? new Date(orgB.dissolution_date)
		: new Date();
	return startA <= endB && startB <= endA;
};

const organizationsOption = () => {
	const reps =
		organizations.value?.filter(
			(o) => o.classification === 'HOUSE_OF_REPRESENTATIVE',
		) || [];
	const sens =
		organizations.value?.filter(
			(o) => o.classification === 'HOUSE_OF_SENATE',
		) || [];

	const singleOptions =
		organizations.value?.map((o) => ({
			label: `${o.abbreviation ?? ''} ชุดที่ ${o.term ?? '-'}`,
			value: o.id,
			term: o.term ?? 0,
		})) || [];

	const overlappingOptions = reps.flatMap((rep) =>
		sens
			.filter((sen) => isOverlapping(rep, sen))
			.map((sen) => ({
				label: `${rep.abbreviation ?? ''} ชุดที่ ${rep.term ?? '-'}, ${
					sen.abbreviation ?? ''
				} ชุดที่ ${sen.term ?? '-'}`,
				value: `${rep.id}|${sen.id}`,
				term: Math.max(rep.term ?? 0, sen.term ?? 0),
			})),
	);

	singleOptions.sort((a, b) => b.term - a.term);
	overlappingOptions.sort((a, b) => b.term - a.term);

	const allOptions = [...singleOptions, ...overlappingOptions];
	return allOptions;
};

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

onMounted(() => {
	if (!route.query.classification) {
		filters.value.classification = [...classificationOption];
		router.replace({
			query: {
				...route.query,
				classification: 'ALL',
			},
		});
	}
});

watch(
	[filters, paginationData],
	() => {
		router.replace({
			query: {
				...route.query,
				assembly:
					filters.value.assembly !== 'ALL' ? filters.value.assembly : undefined,
				status:
					filters.value.status !== 'ALL' ? filters.value.status : undefined,
				classification:
					filters.value.classification.length === classificationOption.length
						? 'ALL'
						: filters.value.classification.length > 0
							? filters.value.classification
							: undefined,
				page:
					paginationData.value.page !== 1
						? paginationData.value.page
						: undefined,
				pageSize:
					paginationData.value.pageSize !== 50
						? paginationData.value.pageSize
						: undefined,
			},
		});
	},
	{ deep: true },
);
</script>

<template>
	<div class="relative bg-[#F4F4F4] p-10 pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item>Vote Events</cv-breadcrumb-item>
		</cv-breadcrumb>
		<h1 class="mt-4 mb-8 font-normal">Vote Events</h1>
		<cv-data-table-skeleton
			v-if="!data"
			title="Vote Events"
			helperText="การลงมติทั้งหมด"
		></cv-data-table-skeleton>
		<div v-else class="relative">
			<div class="flex flex-col items-start gap-12 md:flex-row">
				<VoteEventFilter
					class="sticky top-16 w-xs"
					v-model:filters="filters"
					:assemblies-option="[
						{ label: 'All assemblies', value: 'ALL' },
						...(organizationsOption() ?? []).map((o) => ({
							label: o.label,
							value: o.value,
						})),
					]"
					:status-options="[
						{ label: 'All statuses', value: 'ALL' },
						...statusOption.map((status) => ({
							label: status,
							value: status,
						})),
					]"
					:classification-option="[
						...classificationOption.map((c) => ({
							label: voteEventType[c],
							value: c,
						})),
					]"
				></VoteEventFilter>
				<div class="w-full">
					<cv-data-table title="Vote Events" helperText="การลงมติทั้งหมด">
						<template #headings>
							<cv-data-table-heading
								id="sb-title"
								heading="Title"
								order="ascending"
								class="w-2xl"
							/>
							<cv-data-table-heading
								id="sb-votingdate"
								heading="Voting Date"
								class="text-center"
							/>
							<cv-data-table-heading
								id="sb-createdat"
								heading="Created At"
								class="text-center"
							/>
							<cv-data-table-heading id="sb-assembly" heading="Assemblies" />
							<cv-data-table-heading id="sb-result" heading="Result" />
							<cv-data-table-heading id="sb-link" heading="Links" />
							<cv-data-table-heading id="sb-status" heading="Status" />
						</template>
						<template #data>
							<cv-data-table-row
								:id="row.id"
								:key="row.id"
								:value="row.id"
								v-for="row in data.voteEvents"
								class="cursor-pointer"
							>
								<cv-data-table-cell>
									<a
										:href="`./vote-events/${row.id}`"
										class="w-full text-inherit hover:underline"
										>{{ row.title }}</a
									>
								</cv-data-table-cell>
								<cv-data-table-cell class="text-nowrap">{{
									row.start_date
								}}</cv-data-table-cell>
								<cv-data-table-cell class="text-nowrap">{{
									dayjs(row.created_at).format('YYYY-MM-DD')
								}}</cv-data-table-cell>
								<cv-data-table-cell>
									<div class="flex flex-col justify-evenly">
										<span v-for="org in row.organizations"
											>{{ org.abbreviation }} ชุดที่ {{ org.term }}</span
										>
									</div>
								</cv-data-table-cell>
								<cv-data-table-cell>{{ row.result }}</cv-data-table-cell>
								<cv-data-table-cell>
									<div class="flex flex-row gap-1">
										<a
											v-for="({ url, note }, i) in row.links"
											:key="i"
											:href="url"
											target="_blank"
											@click.stop
										>
											<cv-icon-button
												kind="ghost"
												:icon="
													url.includes('.pdf')
														? DocumentPdf16
														: NotebookReference16
												"
												size="sm"
												:label="note"
											></cv-icon-button>
										</a>
									</div>
								</cv-data-table-cell>
								<cv-data-table-cell>
									<PublishStatusLabel :status="row.publish_status" />
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
	</div>
</template>
