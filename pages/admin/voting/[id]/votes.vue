<script setup lang="ts">
//@ts-ignore
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
		return voteEvents[0];
	},
	{ server: false },
);

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

		<h3 class="!font-normal !mb-12 !mt-4">Votes - {{ voteEvent?.title }}</h3>

		<div class="bg-white !p-4 flex flex-col">
			<div class="!p-[16px]">
				<h4>Votes</h4>
			</div>
		</div>

		<div>
			<div class="bg-white flex items-center">
				<cv-search
					v-model="searchQuery"
					label="Search"
					placeholder="ค้นหาด้วย ชื่อ-นามสกุล ชื่อสังกัด เลขที่บัตร"
					@input="onSearch"
					light="true"
				/>
				<cv-button kind="secondary"> Add Vote </cv-button>
			</div>

			<div class="overflow-visible">
				<cv-data-table>
					<template #headings>
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
										direction="bottom"
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
