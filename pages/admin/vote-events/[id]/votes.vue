<script setup lang="ts">
//@ts-ignore
import { DocumentView16, Save16 } from '@carbon/icons-vue';
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

const errors = computed(() =>
	voteEvent.value ? validateVotes(voteEvent.value) : [],
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
			(voteEvent.value.publish_status === 'ERROR' && !errors.value.length) ||
			(voteEvent.value.publish_status === 'UNPUBLISHED' && errors.value.length)
		) {
			await graphqlClient.mutation({
				updateVoteEvents: {
					__args: {
						where: {
							id_EQ: voteEvent.value.id,
						},
						update: {
							publish_status_SET:
								voteEvent.value.publish_status === 'PUBLISHED'
									? 'PUBLISHED'
									: errors.value.length > 0
										? 'ERROR'
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
					v-if="voteEvent?.links.length"
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

		<VotesErrorNotifications
			:errors
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

		<div class="flex flex-col-reverse md:flex-row gap-4 items-start relative">
			<VotesTable
				class="flex-1"
				:voteEvent
				:originalVotesMap
				:peopleOptions
				:errors
				:editedCells
				:editedRows
				v-model:activeEditingCell="activeEditingCell"
				v-model:toDeleteIds="toDeleteIds"
				@edited="(rowCellId) => markVoteAsEdited(...rowCellId)"
				@deleted="showRowDeleteNotification"
			/>
			<VotesSummary class="max-w-xs sticky top-16" :voteEvent />
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
