<script setup lang="ts">
import { UiPagination } from '#components';
import { graphqlClient } from '~/utils/graphql/client';

const props = defineProps({
	voteEventId: {
		type: String,
		required: true,
	},
});

const paginationData = ref({
	page: 1,
	pageSize: 10,
});

const { data: totalCount } = await useAsyncData(
	'votesConnection',
	async () => {
		const { votesConnection } = await graphqlClient.query({
			votesConnection: {
				__args: {
					where: {
						vote_events_ALL: {
							id_EQ: props.voteEventId as string,
						},
					},
				},
				aggregate: {
					count: {
						nodes: true,
					},
				},
			},
		});
		return votesConnection.aggregate.count.nodes;
	},
	{ server: false },
);

const { data: VoteList } = await useAsyncData(
	'VoteList',
	async () => {
		const { votes } = await graphqlClient.query({
			votes: {
				__args: {
					limit: paginationData.value.pageSize,
					offset:
						(paginationData.value.page - 1) * paginationData.value.pageSize,
					where: {
						vote_events_ALL: {
							id_EQ: props.voteEventId as string,
						},
					},
					sort: [
						{
							vote_order: 'ASC',
						},
					],
				},
				id: true,
				voter_name: true,
				voter_party: true,
				voters: {
					firstname: true,
					lastname: true,
				},
				badge_number: true,
				option: true,
			},
		});
		return votes;
	},
	{ watch: [paginationData.value], server: false },
);

const numberOfPage = computed(() =>
	totalCount.value
		? Math.ceil(totalCount.value / paginationData.value.pageSize)
		: 1,
);

const handlePageChange = (page: number) => {
	paginationData.value.page = page;
};

const handlePageSizeChange = (pageSize: number) => {
	paginationData.value.pageSize = pageSize;
};
</script>

<template>
	<cv-data-table title="Votes" helperText="">
		<template #headings>
			<cv-data-table-heading
				id="sb-title"
				heading="#"
				sortable
				order="ascending"
			/>
			<cv-data-table-heading id="sb-politician" heading="Politician" sortable />
			<cv-data-table-heading id="sb-party" heading="Party" sortable />
			<cv-data-table-heading id="sb-vote" heading="Vote" sortable />
		</template>
		<div>voter_name ถ้าไม่ match voters ให้ใส่ชื้อสีแดง</div>
		<template #data>
			<cv-data-table-row
				v-for="(row, i) in VoteList"
				:id="row.id"
				:key="row.id"
				:value="row.id"
			>
				<cv-data-table-cell>{{ i + 1 }}</cv-data-table-cell>
				<cv-data-table-cell>{{ row.voter_name }}</cv-data-table-cell>
				<cv-data-table-cell>{{ row.voter_party }}</cv-data-table-cell>
				<cv-data-table-cell>{{ row.option }}</cv-data-table-cell>
			</cv-data-table-row>
		</template>
	</cv-data-table>
	<UiPagination
		:page="paginationData.page"
		:page-size="paginationData.pageSize"
		:total-count="totalCount ?? 0"
		:number-of-page="numberOfPage"
		@on-page-change="handlePageChange"
		@on-page-size-change="handlePageSizeChange"
	/>
</template>
