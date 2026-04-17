<script setup lang="ts">
import { enumOrganizationType } from '@politigraph/graphql/genql';
import { organizationTypeLabel } from '~/constants/organization';
import { formatDate } from '~/utils/date';
import { getStringQueryParam } from '~/utils/query';
import { ref } from 'vue';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Organizations | Politigraph Admin',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

const organizationTypeLabelWithAll: Record<string, string> = {
	ALL: 'ทั้งหมด',
	...organizationTypeLabel,
};

const classificationOptions = ['ALL', ...Object.values(enumOrganizationType)];

const filters = ref({
	classification: getStringQueryParam(route.query.classification, 'ALL'),
});

const { debouncedSearch, handleSearchChange } = useDebouncedSearch({
	onDebouncedChange: () => {
		paginationData.value.page = 1;
	},
});

const {
	offset,
	numberOfPage,
	paginationData,
	handlePageChange,
	handlePageSizeChange,
} = usePaginationQuery({
	getExtraQuery: () => ({
		classification:
			filters.value.classification !== 'ALL'
				? filters.value.classification
				: undefined,
	}),
	totalCount: () => data.value?.totalCount,
	watch: [filters],
});

watch(filters, () => {
	paginationData.value.page = 1;
});

const { data } = await useLazyAsyncData(
	'organizations',
	async () => {
		const where: Record<string, any> = {};

		if (debouncedSearch.value) {
			where.name = {
				contains: debouncedSearch.value,
			};
		}

		if (filters.value.classification !== 'ALL') {
			where.classification = {
				eq: filters.value.classification,
			};
		}

		const { organizations, organizationsConnection } =
			await graphqlClient.query({
				organizations: {
					__args: {
						where,
						sort: [{ name: 'ASC' }, { created_at: 'DESC' }],
						limit: paginationData.value.pageSize,
						offset: offset.value,
					},
					id: true,
					name: true,
					image: true,
					color: true,
					classification: true,
					founding_date: true,
					dissolution_date: true,
				},
				organizationsConnection: {
					aggregate: {
						count: {
							nodes: true,
						},
					},
				},
			});

		return {
			organizations,
			totalCount: organizationsConnection.aggregate.count.nodes,
		};
	},
	{
		watch: [paginationData.value, filters.value, debouncedSearch],
	},
);
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>Organizations</cv-breadcrumb-item>
	</cv-breadcrumb>
	<h1 class="mb-8 mt-4 font-normal">Organizations</h1>
	<cv-data-table-skeleton
		v-if="!data"
		title="Organizations"
		helperText="ข้อมูลองค์กรทั้งหมด"
	></cv-data-table-skeleton>
	<div v-else class="relative">
		<div class="flex flex-col items-start gap-12 md:flex-row">
			<div class="w-xs sticky top-16 flex flex-col">
				<cv-radio-group legendText="Classification" vertical>
					<cv-radio-button
						v-for="classification in classificationOptions"
						:key="classification"
						v-model="filters.classification"
						name="organization-classification"
						:label="
							organizationTypeLabelWithAll[classification as string] ??
							classification
						"
						:value="classification"
					/>
				</cv-radio-group>
			</div>
			<div class="w-full">
				<cv-data-table
					title="Organizations"
					helperText="ข้อมูลองค์กรทั้งหมด"
					@search="handleSearchChange"
				>
					<template #headings>
						<cv-data-table-heading id="sb-name" heading="Name" class="w-md" />
						<cv-data-table-heading id="sb-image" heading="Image" />
						<cv-data-table-heading id="sb-color" heading="Color" />
						<cv-data-table-heading
							id="sb-classification"
							heading="Classification"
						/>
						<cv-data-table-heading
							id="sb-founding-date"
							heading="Founding Date"
						/>
						<cv-data-table-heading
							id="sb-dissolution-date"
							heading="Dissolution Date"
						/>
					</template>
					<template #data>
						<cv-data-table-row
							v-for="row in data.organizations"
							:id="row.id"
							:key="row.id"
							:value="row.id"
						>
							<cv-data-table-cell>
								<a
									:href="`/admin/organizations/${row.id}`"
									class="w-full text-inherit hover:underline"
									>{{ row.name }}</a
								>
							</cv-data-table-cell>
							<cv-data-table-cell>
								<div
									v-if="row.image"
									class="flex size-8 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-[#F4F4F4]"
								>
									<img
										:src="row.image"
										class="size-8 rounded-full object-cover"
									/>
								</div>
							</cv-data-table-cell>
							<cv-data-table-cell>
								<div
									v-if="row.color"
									class="size-8 rounded-full border border-gray-300"
									:style="{ backgroundColor: row.color }"
								/>
							</cv-data-table-cell>
							<cv-data-table-cell>
								{{
									organizationTypeLabel[row.classification] ??
									row.classification
								}}
							</cv-data-table-cell>
							<cv-data-table-cell class="text-nowrap">
								{{ formatDate(row.founding_date) ?? '-' }}
							</cv-data-table-cell>
							<cv-data-table-cell class="text-nowrap">
								{{ formatDate(row.dissolution_date) ?? '-' }}
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
