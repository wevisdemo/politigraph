<script setup lang="ts">
//@ts-ignore
import { DocumentView16, Save16 } from '@carbon/icons-vue';
import type { Vote } from '~/.genql';
import { graphqlClient } from '~/utils/graphql/client';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

const isShowNotificationError = ref(false);
const isShowNotification = ref(false);
const titleNotification = ref({
	title: '',
	subtitle: '',
});
const rowChange = ref(0);
const originalVotesMap = ref<Record<string, Partial<Vote>>>({});

const editedRows = ref<Set<string>>(new Set());
const editedCells = ref<Set<string>>(new Set());
const toDeleteIds = ref<Set<string>>(new Set());

const activeEditingCell = ref<{
	rowId: number | null;
	columnId: number | null;
}>({ rowId: null, columnId: null });

const { data: voteEvent, refresh } = useAsyncData(
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
				links: {
					__args: {
						where: {
							note_EQ: 'ใบประมวลผลการลงมติ',
						},
					},
					url: true,
				},
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
		originalVotesMap.value = {};
		voteEvents[0]?.votes?.forEach((vote) => {
			const { voters, ...rest } = vote;
			originalVotesMap.value[vote.id] = { ...rest };
		});

		const votes = voteEvents[0].votes.sort((a, b) => {
			return Number(a.vote_order) - Number(b.vote_order);
		});

		const voteEvent = voteEvents[0];
		voteEvent.votes = votes;
		return voteEvent;
	},
	{ server: false },
);

const { data: peopleOptions } = await useAsyncData(
	'peopleConnection',
	async () => {
		const result = await graphqlClient.query({
			people: {
				__args: {
					sort: [{ id: 'ASC' }],
				},
				id: true,
				firstname: true,
				lastname: true,
			},
		});

		return result.people.map((person) => ({
			value: person.id,
			name: `${person.firstname} ${person.lastname}`,
			label: `${person.firstname} ${person.lastname}`,
		}));
	},
	{ server: false },
);

const isSaving = ref(false);

async function onSaveChanges() {
	if (isSaving.value) return;
	isSaving.value = true;

	try {
		const allVotes = voteEvent.value?.votes ?? [];
		const existingIds = new Set(Object.keys(originalVotesMap.value));

		const rowsToPatch = allVotes.filter(
			(vote) => editedRows.value.has(vote.id) || !existingIds.has(vote.id),
		);

		if (!rowsToPatch.length && !toDeleteIds.value.size) return;

		if (rowsToPatch.length) {
			const mutationPromises = rowsToPatch.map((vote) => {
				const voterId = vote.voter_name;

				if (voterId && existingIds.has(vote.id)) {
					// Update
					return graphqlClient.mutation({
						updateVotes: {
							__args: {
								where: {
									id_EQ: vote.id,
								},
								update: {
									vote_order_SET: vote.vote_order,
									badge_number_SET: vote.badge_number,
									voter_name_SET: vote.voter_name,
									voter_party_SET: vote.voter_party,
									option_SET: vote.option,
									voters: [
										{
											disconnect: [
												{
													where: {
														node: {
															id_IN: vote.voters.map((v) => v.id),
														},
													},
												},
											],
											connect: [
												{
													where: {
														node: {
															id_EQ: voterId,
														},
													},
												},
											],
										},
									],
								},
							},
							votes: {
								id: true,
							},
						},
					});
				} else {
					// Create
					return graphqlClient.mutation({
						createVotes: {
							__args: {
								input: [
									{
										vote_order: vote.vote_order,
										badge_number: vote.badge_number,
										voter_name: vote.voter_name,
										voter_party: vote.voter_party,
										option: vote.option,
										voters: {
											connect: [
												{
													where: {
														node: {
															id_EQ: voterId,
														},
													},
												},
											],
										},
										vote_events: {
											connect: [
												{
													where: {
														node: {
															id_EQ: voteEvent.value?.id,
														},
													},
												},
											],
										},
									},
								],
							},
							votes: {
								id: true,
							},
						},
					});
				}
			});

			await Promise.all(mutationPromises);
		}

		if (toDeleteIds.value.size) {
			try {
				await graphqlClient.mutation({
					deleteVotes: {
						__args: {
							where: { id_IN: [...toDeleteIds.value] },
						},
						nodesDeleted: true,
					},
				});
			} catch (error) {
				console.error('Delete failed', error);
			}
		}

		rowChange.value = rowsToPatch.length + toDeleteIds.value.size;
		titleNotification.value.title = 'Changes Saved';
		titleNotification.value.subtitle = `Changes to ${rowChange.value} rows have been saved.`;

		// reset state
		editedRows.value.clear();
		editedCells.value.clear();
		toDeleteIds.value.clear();
		activeEditingCell.value = { columnId: null, rowId: null };
		await refresh();

		isShowNotification.value = true;
		setTimeout(() => {
			isShowNotification.value = false;
		}, 5000);
	} catch (error) {
		console.error('Error saving changes:', error);
	} finally {
		isSaving.value = false;
	}
}

function showRowDeleteNotification(count: number) {
	titleNotification.value.title = 'Row Deleted';
	titleNotification.value.subtitle = `${count} vote record has been removed from the table.`;
	isShowNotification.value = true;
	setTimeout(() => {
		isShowNotification.value = false;
	}, 3000);
}
</script>

<template>
	<div class="!p-10 min-h-dvh !bg-[#F4F4F4] !pt-[90px] relative">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item class="text-[#0F62FE]"
				><a href="/admin/vote-events">Vote Events</a></cv-breadcrumb-item
			>
			<cv-breadcrumb-item class="text-[#0F62FE]"
				><a
					:href="`/admin/vote-events/${voteEvent?.id}`"
					class="max-w-sm text-ellipsis whitespace-nowrap overflow-hidden"
					>{{ voteEvent?.title }}</a
				></cv-breadcrumb-item
			>
			<cv-breadcrumb-item>Votes</cv-breadcrumb-item>
		</cv-breadcrumb>

		<cv-toast-notification
			v-if="isShowNotification"
			kind="success"
			:title="titleNotification.title"
			:subTitle="titleNotification.subtitle"
			@close="isShowNotification = false"
			class="z-50 fixed right-[4px] top-[60px]"
		/>

		<cv-skeleton-text
			v-if="!voteEvent"
			class="!my-6"
			heading
			:line-count="2"
		></cv-skeleton-text>
		<div
			v-else
			class="flex flex-col lg:flex-row gap-4 items-start !mb-12 !mt-4"
		>
			<h2 class="!font-normal flex-1">Votes - {{ voteEvent?.title }}</h2>
			<div class="flex gap-2 self-end">
				<a
					:href="voteEvent?.links[0]?.url"
					target="_blank"
					rel="noopener noreferrer"
				>
					<cv-button :icon="DocumentView16" kind="tertiary">
						View Original
					</cv-button>
				</a>
				<cv-button :icon="Save16" @click="onSaveChanges" :disabled="isSaving">
					Save Changes
				</cv-button>
			</div>
		</div>

		<cv-inline-notification
			v-if="route.params.id && isShowNotificationError"
			lowContrast
			kind="error"
			title="Error: Data Validation Failed"
			@close="isShowNotificationError = false"
		/>

		<VotesTable
			:voteEvent
			:originalVotesMap
			:peopleOptions
			v-model:activeEditingCell="activeEditingCell"
			v-model:editedCells="editedCells"
			v-model:editedRows="editedRows"
			v-model:toDeleteIds="toDeleteIds"
			@deleted="showRowDeleteNotification"
		/>
	</div>
</template>
