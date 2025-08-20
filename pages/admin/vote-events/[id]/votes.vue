<script setup lang="ts">
import type { Vote } from '~/.genql';
import { graphqlClient } from '~/utils/graphql/client';
import { validateVotes } from '~/utils/votes/validator';

definePageMeta({
	layout: 'admin-layout',
});

type EditableVoteFields =
	| 'vote_order'
	| 'badge_number'
	| 'voter_name'
	| 'voter_party'
	| 'option';

const route = useRoute();

const isSaving = ref(false);
const isShowBatchNameCorrectionModal = ref(false);
const isShowNotificationError = ref(false);
const isShowNotification = ref(false);
const titleNotification = ref({
	title: '',
	subtitle: '',
});
const originalVotesMap = ref<Record<string, Partial<Vote>>>({});
const originalCount = reactive<
	Record<
		'agree_count' | 'disagree_count' | 'novote_count' | 'abstain_count',
		number | null
	>
>({
	agree_count: null,
	disagree_count: null,
	novote_count: null,
	abstain_count: null,
});

const editedRows = ref<Set<string>>(new Set());
const editedCells = ref<Set<string>>(new Set());
const toDeleteIds = ref<Set<string>>(new Set());

const voteValidationResult = computed(
	() => voteEvent.value && validateVotes(voteEvent.value),
);

const activeEditingCell = ref<{
	rowId: number | null;
	columnId: number | null;
}>({ rowId: null, columnId: null });

const { data: voteEvent, refresh } = useAsyncData(
	'voteEventsConnection',
	async () => {
		const {
			voteEvents: [voteEvent],
		} = await graphqlClient.query({
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
				agree_count: true,
				disagree_count: true,
				novote_count: true,
				abstain_count: true,
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
		isShowNotificationError.value = voteEvent.publish_status === 'ERROR';

		originalCount.agree_count = voteEvent.agree_count;
		originalCount.disagree_count = voteEvent.disagree_count;
		originalCount.novote_count = voteEvent.novote_count;
		originalCount.abstain_count = voteEvent.abstain_count;
		originalVotesMap.value = {};

		voteEvent.votes.sort((a, b) => Number(a.vote_order) - Number(b.vote_order));

		voteEvent.votes?.forEach((vote) => {
			const { voters, ...rest } = vote;
			originalVotesMap.value[vote.id] = { ...rest };
		});

		return voteEvent;
	},
	{ server: false },
);

useHead({
	title: `Votes - ${voteEvent.value?.title || 'Vote Event'} | Politigraph Admin`,
});

const { data: peopleOptions } = await useAsyncData(
	'peopleConnection',
	async () => {
		const result = await graphqlClient.query({
			people: {
				__args: {
					sort: [{ id: 'ASC' }],
				},
				id: true,
				name: true,
			},
		});

		return result.people.map(({ id, name }) => ({
			value: id,
			name,
			label: name,
		}));
	},
	{ server: false },
);

const markVoteAsEdited = (rowId: string, cellKey: EditableVoteFields) => {
	const current = voteEvent.value?.votes.find((v) => v.id === rowId);
	const original = originalVotesMap.value[rowId];

	if (!current || !original) return;

	const currentValue = current[cellKey];
	const originalValue = original[cellKey];

	const cellId = `${rowId}-${cellKey}`;

	if (currentValue !== originalValue) {
		editedRows.value.add(rowId);
		editedCells.value.add(cellId);
	} else {
		editedCells.value.delete(cellId);

		const isStillEdited = (
			[
				'vote_order',
				'badge_number',
				'voter_name',
				'voter_party',
				'option',
			] as const
		).some((key) => current[key] !== original[key]);

		if (!isStillEdited) {
			editedRows.value.delete(rowId);
		}
	}
};

async function onSaveChanges() {
	if (isSaving.value || !voteEvent.value) return;
	isSaving.value = true;

	try {
		const summaryCountKeyChanges = Object.entries(originalCount)
			.filter(
				([key, value]) =>
					voteEvent.value &&
					key in voteEvent.value &&
					value !== voteEvent.value[key as keyof typeof originalCount],
			)
			.map(([key]) => key as keyof typeof originalCount);

		const allVotes = voteEvent.value?.votes ?? [];
		const existingIds = new Set(Object.keys(originalVotesMap.value));

		const rowsToPatch = allVotes.filter(
			(vote) => editedRows.value.has(vote.id) || !existingIds.has(vote.id),
		);

		if (
			summaryCountKeyChanges.length +
				rowsToPatch.length +
				toDeleteIds.value.size ===
			0
		)
			return;

		if (
			summaryCountKeyChanges.length ||
			(voteEvent.value.publish_status === 'ERROR' &&
				!voteValidationResult.value?.errors.length) ||
			(voteEvent.value.publish_status === 'UNPUBLISHED' &&
				voteValidationResult.value?.errors.length)
		) {
			await graphqlClient.mutation({
				updateVoteEvents: {
					__args: {
						where: {
							id_EQ: voteEvent.value.id,
						},
						update: {
							publish_status_SET: voteValidationResult.value?.errors.length
								? 'ERROR'
								: voteEvent.value.publish_status === 'PUBLISHED'
									? 'PUBLISHED'
									: 'UNPUBLISHED',
							...Object.fromEntries(
								summaryCountKeyChanges.map((key) => [
									`${key}_SET`,
									voteEvent.value![key],
								]),
							),
						},
					},
					__scalar: true,
				},
			});
		}

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

		const rowChange = rowsToPatch.length + toDeleteIds.value.size;
		titleNotification.value.title = 'Changes Saved';
		titleNotification.value.subtitle = rowChange
			? `Changes to ${rowChange} rows have been saved.`
			: '';

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

async function togglePublishStatus() {
	const { updateVoteEvents } = await graphqlClient.mutation({
		updateVoteEvents: {
			__args: {
				where: {
					id_EQ: route.params.id as string,
				},
				update: {
					publish_status:
						voteEvent.value?.publish_status !== 'PUBLISHED'
							? 'PUBLISHED'
							: 'UNPUBLISHED',
				},
			},
			voteEvents: {
				publish_status: true,
			},
		},
	});

	if (updateVoteEvents.voteEvents) {
		refresh();
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

function scrollToRow(id: string) {
	document
		.querySelector(`[data-value="${id}"]`)
		?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<template>
	<div class="relative min-h-dvh bg-[#F4F4F4] p-10 pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item class="text-[#0F62FE]"
				><a href="/admin/vote-events">Vote Events</a></cv-breadcrumb-item
			>
			<cv-breadcrumb-item class="text-[#0F62FE]"
				><a
					:href="`/admin/vote-events/${voteEvent?.id}`"
					class="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap"
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
			class="fixed top-[60px] right-[4px] z-50"
		/>

		<VoteEventHeader
			:title="voteEvent ? `Votes - ${voteEvent.title}` : undefined"
			:publish-status="voteEvent?.publish_status"
			:original-document-url="voteEvent?.links[0]?.url"
			:is-publishing-disabled="!!voteValidationResult?.errors.length"
			:is-save-disabled="isSaving"
			@toggle-publish-status="togglePublishStatus"
			@save="onSaveChanges"
		/>

		<VotesErrorNotifications
			v-if="voteValidationResult"
			:errors="voteValidationResult.errors"
			:warnings="voteValidationResult.warnings"
			:getActionLabel="
				(type, ids) =>
					type === 'COUNT_MISMATCHED'
						? undefined
						: type === 'INVALID_VOTER_NAME'
							? 'Review names'
							: `Go to the first issue at row ${(voteEvent?.votes.findIndex((v) => v.id === ids[0]) as number) + 1}`
			"
			@action="
				({ type, ids }) => {
					if (type === 'INVALID_VOTER_NAME') {
						isShowBatchNameCorrectionModal = true;
					} else if (ids.length > 0) {
						scrollToRow(ids[0]);
					}
				}
			"
		/>

		<div class="relative flex flex-col-reverse items-start gap-4 md:flex-row">
			<VotesTable
				class="flex-1"
				:voteEvent
				:originalVotesMap
				:peopleOptions
				:errors="voteValidationResult?.errors ?? []"
				:editedCells
				:editedRows
				v-model:activeEditingCell="activeEditingCell"
				v-model:toDeleteIds="toDeleteIds"
				@edited="(rowCellId) => markVoteAsEdited(...rowCellId)"
				@deleted="showRowDeleteNotification"
			/>
			<VotesSummary class="sticky top-16 max-w-xs" :voteEvent />
		</div>
	</div>

	<VotesBatchNameCorrectionModal
		v-if="voteEvent && peopleOptions"
		:visible="isShowBatchNameCorrectionModal"
		:votes="voteEvent.votes.filter((v) => v.voters.length === 0)"
		:peopleOptions
		@submit="
			(values) => {
				values.forEach(({ voteId, voterId }) => {
					const vote = voteEvent?.votes.find((v) => v.id === voteId);
					if (vote) {
						vote.voter_name = voterId;
						markVoteAsEdited(voteId, 'voter_name');
					}
				});
				isShowBatchNameCorrectionModal = false;
			}
		"
		@cancel="isShowBatchNameCorrectionModal = false"
	/>
</template>
