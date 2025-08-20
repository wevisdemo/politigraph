<script setup lang="ts">
//@ts-ignore
import { Edit16 } from '@carbon/icons-vue';
import type { Person, Vote } from '~/.genql';

const props = defineProps<{
	voteEventId?: string;
	votes?: (Pick<
		Vote,
		| 'id'
		| 'vote_order'
		| 'voter_name'
		| 'voter_party'
		| 'option'
		| 'badge_number'
	> & {
		voters: Pick<Person, 'id' | 'name'>[];
	})[];
}>();

const paginationData = reactive({
	page: 1,
	pageSize: 10,
});

const numberOfPage = computed(() =>
	props.votes?.length
		? Math.ceil(props.votes.length / paginationData.pageSize)
		: 1,
);

const firstRowIndexOfPage = computed(
	() => (paginationData.page - 1) * paginationData.pageSize,
);

const handlePageChange = (page: number) => {
	paginationData.page = page;
};

const handlePageSizeChange = (pageSize: number) => {
	paginationData.pageSize = pageSize;
};
const router = useRouter();
</script>

<template>
	<cv-data-table-skeleton
		v-if="!votes"
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
					v-for="(row, i) in votes.slice(
						firstRowIndexOfPage,
						firstRowIndexOfPage + paginationData.pageSize,
					)"
					:id="row.id"
					:key="row.id"
					:value="row.id"
				>
					<cv-data-table-cell>{{
						firstRowIndexOfPage + i + 1
					}}</cv-data-table-cell>
					<cv-data-table-cell>{{
						row.voters.at(0)?.name || row.voter_name
					}}</cv-data-table-cell>
					<cv-data-table-cell>{{ row.voter_party }}</cv-data-table-cell>
					<cv-data-table-cell>{{ row.option }}</cv-data-table-cell>
				</cv-data-table-row>
			</template>
		</cv-data-table>
		<UiPagination
			:page="paginationData.page"
			:page-size="paginationData.pageSize"
			:total-count="votes.length"
			:number-of-page="numberOfPage"
			@on-page-change="handlePageChange"
			@on-page-size-change="handlePageSizeChange"
		/>
	</template>
</template>
