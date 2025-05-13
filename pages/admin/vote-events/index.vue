<script setup lang="ts">
//@ts-ignore
import { DocumentPdf16, NotebookReference16 } from '@carbon/icons-vue';
import { graphqlClient } from '~/utils/graphql/client';
import dayjs from 'dayjs';
import { ref } from 'vue';

definePageMeta({
	layout: 'admin-layout',
});

const paginationData = ref({
	page: 1,
	pageSize: 10,
});

const { data: totalCount } = await useAsyncData(
	'voteEventsConnection',
	async () => {
		const { voteEventsConnection } = await graphqlClient.query({
			voteEventsConnection: {
				aggregate: {
					count: {
						nodes: true,
					},
				},
			},
		});
		return voteEventsConnection.aggregate.count.nodes;
	},
	{ server: false },
);

const numberOfPage = computed(() =>
	totalCount.value
		? Math.ceil(totalCount.value / paginationData.value.pageSize)
		: 1,
);

const { data: voteEventList } = await useAsyncData(
	'voteEvents',
	async () => {
		const { voteEvents } = await graphqlClient.query({
			voteEvents: {
				__args: {
					sort: [{ start_date: 'DESC' }],
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
		return voteEvents;
	},
	{
		watch: [paginationData.value],
		server: false,
	},
);

const handlePageChange = (page: number) => {
	paginationData.value.page = page;
};

const handlePageSizeChange = (pageSize: number) => {
	paginationData.value.pageSize = pageSize;
};
</script>

<template>
	<div class="!p-10 h-dvh !bg-[#F4F4F4] !pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item>Vote Events</cv-breadcrumb-item>
		</cv-breadcrumb>

		<h1 class="!font-normal !mb-12 !mt-4">Vote Events</h1>
		<div>
			<cv-data-table title="Vote Events" helperText="การลงมติทั้งหมด">
				<template #headings>
					<cv-data-table-heading
						id="sb-title"
						heading="Title"
						order="ascending"
						class="w-3xl"
					/>
					<cv-data-table-heading id="sb-votingdate" heading="Voting Date" />
					<cv-data-table-heading id="sb-createdat" heading="Created At" />
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
						v-for="row in voteEventList"
					>
						<cv-data-table-cell
							><a
								:href="`./vote-events/${row.id}`"
								class="!text-black hover:underline text-ellipsis"
								>{{ row.title }}</a
							></cv-data-table-cell
						>
						<cv-data-table-cell>{{ row.start_date }}</cv-data-table-cell>
						<cv-data-table-cell>{{
							dayjs(row.created_at).format('YYYY-MM-DD')
						}}</cv-data-table-cell>
						<cv-data-table-cell>{{
							row.organizations
								.map((o) => `${o.abbreviation} ชุดที่ ${o.term}`)
								.join(', ')
						}}</cv-data-table-cell>
						<cv-data-table-cell>{{ row.result }}</cv-data-table-cell>
						<cv-data-table-cell>
							<div class="flex flex-row gap-1">
								<a v-for="({ url, note }, i) in row.links" :key="i" :href="url">
									<cv-icon-button
										kind="ghost"
										:icon="
											url.includes('.pdf') ? DocumentPdf16 : NotebookReference16
										"
										size="sm"
										:label="note"
									></cv-icon-button>
								</a>
							</div>
						</cv-data-table-cell>
						<cv-data-table-cell
							:class="{
								'!text-[#DA1E28]': row.publish_status == 'ERROR',
							}"
							>{{ row.publish_status }}</cv-data-table-cell
						>
					</cv-data-table-row>
				</template>
			</cv-data-table>
			<template v-if="totalCount">
				<ui-pagination
					:page="paginationData.page"
					:page-size="paginationData.pageSize"
					:total-count="totalCount ?? 0"
					:number-of-page="numberOfPage"
					@on-page-change="handlePageChange"
					@on-page-size-change="handlePageSizeChange"
				/>
			</template>
		</div>
	</div>
</template>
