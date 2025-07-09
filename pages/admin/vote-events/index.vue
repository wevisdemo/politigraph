<script setup lang="ts">
//@ts-ignore
import { DocumentPdf16, NotebookReference16 } from '@carbon/icons-vue';
import { graphqlClient } from '~/utils/graphql/client';
import dayjs from 'dayjs';
import { ref } from 'vue';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Vote Events | Politigraph Admin',
});

const paginationData = ref({
	page: 1,
	pageSize: 50,
});

const { data } = await useAsyncData(
	'voteEvents',
	async () => {
		const { voteEvents, voteEventsConnection } = await graphqlClient.query({
			voteEvents: {
				__args: {
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
		watch: [paginationData.value],
		server: false,
	},
);

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

const router = useRouter();
</script>

<template>
	<div class="p-10 bg-[#F4F4F4] pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item>Vote Events</cv-breadcrumb-item>
		</cv-breadcrumb>
		<h1 class="font-normal mb-8 mt-4">Vote Events</h1>
		<cv-data-table-skeleton
			v-if="!data"
			title="Vote Events"
			helperText="การลงมติทั้งหมด"
		></cv-data-table-skeleton>
		<div v-else>
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
						@click="() => router.push(`./vote-events/${row.id}`)"
						class="cursor-pointer"
					>
						<cv-data-table-cell>{{ row.title }}</cv-data-table-cell>
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
								'text-[#DA1E28]': row.publish_status === 'ERROR',
								'text-[#158236]': row.publish_status === 'PUBLISHED',
							}"
							>{{ row.publish_status }}</cv-data-table-cell
						>
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
</template>
