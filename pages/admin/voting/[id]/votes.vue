<script setup lang="ts">
import Add from '@carbon/icons-vue/es/add/16';
import DocumentView from '@carbon/icons-vue/es/document--view/16';
import Download from '@carbon/icons-vue/es/download/16';
import Save from '@carbon/icons-vue/es/save/16';
import TrashCan from '@carbon/icons-vue/es/trash-can/16';
import WarningFilled16 from '@carbon/icons-vue/es/warning--filled/16';
import type { Vote } from '~/.genql';
import { graphqlClient } from '~/utils/graphql/client';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

const searchQuery = ref('');

const onSearch = (event: string) => {
	searchQuery.value = event;
};

const isShowNotificationError = ref(false);

const { data: voteEvent } = useAsyncData(
	'voteEventsConnection',
	async () => {
		const { voteEvents } = await graphqlClient.query({
			voteEvents: {
				__args: {
					limit: 1,
					where: {
						id_EQ: route.params.id as string,
					},
				},
				id: true,
				title: true,
				publish_status: true,
				votes: {
					id: true,
					vote_order: true,
					voter_name: true,
					voter_party: true,
					option: true,
					badge_number: true,
					voters: {
						id: true,
					},
				},
			},
		});
		isShowNotificationError.value = voteEvents[0].publish_status === 'ERROR';
		console.log(voteEvents[0]);
		return voteEvents[0];
	},
	{ server: false },
);

const filteredVotes = computed(() => {
	if (!voteEvent.value?.votes) return [];

	return voteEvent.value.votes
		.filter((vote) => {
			const query = searchQuery.value.toLowerCase();
			return (
				vote.voter_name?.toLowerCase().includes(query) ||
				vote.voter_party?.toLowerCase().includes(query) ||
				vote.badge_number?.toString().includes(query)
			);
		})
		.sort((a, b) => {
			return Number(a.vote_order) - Number(b.vote_order);
		});
});

const selectedRows = ref([]);

const getRowClass = (row: Vote): string => {
	if (row.voters.length == 0) {
		return '!bg-[#FFF1F1]';
	}
	return '';
};
</script>

<template>
	<div class="!p-10 min-h-dvh !bg-[#F4F4F4] !pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item class="text-[#0F62FE]">All Data</cv-breadcrumb-item>
			<cv-breadcrumb-item class="text-[#0F62FE]">Voting</cv-breadcrumb-item>
			<cv-breadcrumb-item class="text-[#0F62FE]">{{
				voteEvent?.title
			}}</cv-breadcrumb-item>

			<cv-breadcrumb-item>Votes</cv-breadcrumb-item>
		</cv-breadcrumb>

		<div class="flex flex-row gap-4 justify-between !mb-12 !mt-4">
			<div class="flex items-center">
				<h3 class="!font-normal">Votes - {{ voteEvent?.title }}</h3>
			</div>
			<div class="flex gap-2 h-fit item-start">
				<cv-button :icon="DocumentView" kind="tertiary">
					View Original
				</cv-button>
				<cv-button :icon="Save"> Save Changes </cv-button>
			</div>
		</div>

		<cv-inline-notification
			v-if="route.params.id && isShowNotificationError"
			lowContrast
			kind="error"
			title="Error: Data Validation Failed"
			@close="isShowNotificationError = false"
		>
		</cv-inline-notification>

		<div class="bg-white !p-4 flex flex-col">
			<div class="!p-[16px]">
				<h4>Votes</h4>
			</div>
		</div>

		<div>
			<div class="bg-white flex items-center justify-end">
				<cv-search
					v-model="searchQuery"
					label="Search"
					placeholder="ค้นหาด้วย ชื่อ-นามสกุล ชื่อสังกัด เลขที่บัตร"
					@input="onSearch"
					light="true"
				/>
				<cv-button
					:icon="Download"
					kind="ghost"
					hasIconOnly
					class="!text-black"
				/>
				<cv-button
					:icon="TrashCan"
					kind="ghost"
					hasIconOnly
					:disabled="selectedRows.length === 0"
					class="!text-black disabled:!text-gray-400"
					@click=""
				/>
				<cv-button :icon="Add" kind="secondary"> Add Vote </cv-button>
			</div>

			<div>
				<cv-data-table v-model:rows-selected="selectedRows" :selection="true">
					<template #headings>
						<cv-data-table-heading selection />
						<cv-data-table-heading id="sb-number" heading="ลำดับที่" sortable />
						<cv-data-table-heading
							id="sb-badge-number"
							heading="เลขที่บัตร"
							sortable
						/>
						<cv-data-table-heading
							id="sb-politician"
							heading="ชื่อ-สกุล"
							sortable
						/>
						<cv-data-table-heading
							id="sb-party"
							heading="ชื่อสังกัด"
							sortable
						/>
						<cv-data-table-heading
							id="sb-vote"
							heading="ผลการลงคะแนน"
							sortable
						/>
					</template>
					<template #data>
						<cv-data-table-row
							v-for="(row, i) in filteredVotes"
							:id="row.id"
							:key="row.id"
							:value="row.id"
						>
							<cv-data-table-cell selection :class="getRowClass(row as Vote)" />
							<cv-data-table-cell :class="getRowClass(row as Vote)">
								{{ row.vote_order }}
							</cv-data-table-cell>
							<cv-data-table-cell :class="getRowClass(row as Vote)">
								{{ row.badge_number }}
							</cv-data-table-cell>
							<cv-data-table-cell
								:class="[
									getRowClass(row as Vote),
									{ '!text-[#DA1E28]': row.voters.length === 0 },
								]"
							>
								<div class="flex items-center gap-2">
									{{ row.voter_name }}
									<cv-tooltip
										v-if="row.voters.length === 0"
										:direction="
											i === filteredVotes.length - 1 ? 'top' : 'bottom'
										"
										tip="Invalid name. Select a voter from the list."
									>
										<WarningFilled16
											class="inline-block"
											style="fill: #da1e28"
										/>
									</cv-tooltip>
								</div>
							</cv-data-table-cell>
							<cv-data-table-cell :class="getRowClass(row as Vote)">
								{{ row.voter_party }}
							</cv-data-table-cell>
							<cv-data-table-cell :class="getRowClass(row as Vote)">
								{{ row.option }}
							</cv-data-table-cell>
						</cv-data-table-row>
					</template>
				</cv-data-table>
			</div>
		</div>
	</div>
</template>
