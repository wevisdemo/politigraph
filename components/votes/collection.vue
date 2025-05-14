<script setup lang="ts">
//@ts-ignore
import { Edit16 } from '@carbon/icons-vue';
import { UiPagination } from '#components';
import { graphqlClient } from '~/utils/graphql/client';

const props = defineProps<{
	voteEventId?: string;
}>();

const paginationData = ref({
	page: 1,
	pageSize: 10,
});

const { data } = await useAsyncData(
	'votes',
	async () => {
		if (!props.voteEventId) return null;

		const { votesConnection, votes } = await graphqlClient.query({
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
		return {
			totalCount: votesConnection.aggregate.count.nodes,
			votes,
		};
	},
	{ server: false, watch: [props] },
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
	<cv-data-table-skeleton
		v-if="!data?.votes"
		class="bg-white"
		title="Votes"
		helperText="การลงมติรายคน"
	></cv-data-table-skeleton>
	<template v-else>
		<cv-data-table class="bg-white" title="Votes" helperText="การลงมติรายคน">
			<template #actions>
				<cv-button
					kind="ghost"
					:icon="Edit16"
					@click="() => router.push(`/admin/vote-events/${voteEventId}/votes`)"
					>Edit</cv-button
				>
			</template>
			<template #headings>
				<cv-data-table-heading id="sb-title" heading="#" />
				<cv-data-table-heading id="sb-politician" heading="Politician" />
				<cv-data-table-heading id="sb-party" heading="Party" />
				<cv-data-table-heading id="sb-vote" heading="Vote" />
			</template>
			<div>voter_name ถ้าไม่ match voters ให้ใส่ชื้อสีแดง</div>
			<template #data>
				<cv-data-table-row
					v-for="(row, i) in data.votes"
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
			:total-count="data.totalCount ?? 0"
			:number-of-page="numberOfPage"
			@on-page-change="handlePageChange"
			@on-page-size-change="handlePageSizeChange"
		/>
	</template>
</template>
