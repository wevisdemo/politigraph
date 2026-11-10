<script setup lang="ts">
import type {
	OrganizationMember_votesUpdateFieldInput,
	PersonVotesUpdateFieldInput,
	Vote,
} from '@politigraph/graphql/genql';
import { AFFILIATION_CELL_KEY, VOTER_CELL_KEY } from '~/constants/votes';
import {
	getEffectiveAffiliationId,
	getEffectiveVoterId,
	groupVoteLinkChanges,
	matchCreatedVotes,
	runWithRetries,
	validateVotes,
} from '~/utils/votes';

definePageMeta({
	layout: 'admin-layout',
});

type EditableVoteFields = 'vote_order' | 'badge_number' | 'option';

// A nested create slows down with its size: 600 votes take ~45s in one operation, ~1.3s in chunks of 50
const CREATE_VOTES_CHUNK_SIZE = 50;

const route = useRoute();
const graphqlClient = useGraphqlClient();

const isShowBatchNameCorrectionModal = ref(false);
const isShowNotificationError = ref(false);
const successToast = useToastNotification();
const { isSaving, guardSave } = useSaveGuard(successToast);
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
const selectedVoterIds = ref<Record<string, string>>({});
const selectedAffiliationIds = ref<Record<string, string>>({});

const votesWithSelectedVoters = computed(
	() =>
		voteEvent.value?.votes.map((vote) => {
			const voterId = getEffectiveVoterId(vote, selectedVoterIds.value);
			const affiliationId = getEffectiveAffiliationId(
				vote,
				selectedAffiliationIds.value,
			);
			return {
				...vote,
				voter: voterId ? { id: voterId } : null,
				voter_affiliation: affiliationId ? { id: affiliationId } : null,
			};
		}) ?? [],
);

const voteValidationResult = computed(
	() =>
		voteEvent.value &&
		validateVotes({ ...voteEvent.value, votes: votesWithSelectedVoters.value }),
);

const activeEditingCell = ref<{
	rowId: string | null;
	columnId: number | null;
}>({ rowId: null, columnId: null });

const { data: voteEvent, refresh } = useAsyncData(
	`vote-event-votes-${route.params.id}`,
	async () => {
		const {
			voteEvents: [voteEvent],
		} = await graphqlClient.query({
			voteEvents: {
				__args: {
					limit: 1,
					where: {
						id: { eq: route.params.id as string },
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
							note: { eq: 'ใบประมวลผลการลงมติ' },
						},
					},
					url: true,
				},
				votes: {
					id: true,
					vote_order: true,
					voter_name_raw: true,
					voter_affiliation_raw: true,
					option: true,
					badge_number: true,
					voter: {
						id: true,
					},
					voter_affiliation: {
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
		selectedVoterIds.value = {};
		selectedAffiliationIds.value = {};

		voteEvent.votes.sort((a, b) => Number(a.vote_order) - Number(b.vote_order));

		voteEvent.votes?.forEach((vote) => {
			const { voter: _, voter_affiliation: __, ...rest } = vote;
			originalVotesMap.value[vote.id] = { ...rest };
		});

		return voteEvent;
	},
	{ server: false },
);

useHead({
	title: computed(
		() =>
			`Votes - ${voteEvent.value?.title || 'Vote Event'} | Politigraph Admin`,
	),
});

const { data: peopleOptions } = await usePeopleOptions();
const { data: affiliationOptions } = await useAffiliationOptions();

const getLinkedVoterId = (voteId: string) =>
	voteEvent.value?.votes.find((v) => v.id === voteId)?.voter?.id ?? '';
const getLinkedAffiliationId = (voteId: string) =>
	voteEvent.value?.votes.find((v) => v.id === voteId)?.voter_affiliation?.id ??
	'';

const setCellEdited = (rowId: string, cellKey: string, isEdited: boolean) => {
	const cellId = `${rowId}-${cellKey}`;

	if (isEdited) {
		editedCells.value.add(cellId);
	} else {
		editedCells.value.delete(cellId);
	}

	if ([...editedCells.value].some((id) => id.startsWith(`${rowId}-`))) {
		editedRows.value.add(rowId);
	} else {
		editedRows.value.delete(rowId);
	}
};

const markVoteAsEdited = (rowId: string, cellKey: EditableVoteFields) => {
	const current = voteEvent.value?.votes.find((v) => v.id === rowId);
	const original = originalVotesMap.value[rowId];

	if (!current || !original) return;

	setCellEdited(rowId, cellKey, current[cellKey] !== original[cellKey]);
};

const selectVoter = (rowId: string, voterId: string) => {
	selectedVoterIds.value[rowId] = voterId;

	setCellEdited(rowId, VOTER_CELL_KEY, voterId !== getLinkedVoterId(rowId));
};

const selectAffiliation = (rowId: string, affiliationId: string) => {
	selectedAffiliationIds.value[rowId] = affiliationId;

	setCellEdited(
		rowId,
		AFFILIATION_CELL_KEY,
		affiliationId !== getLinkedAffiliationId(rowId),
	);
};

const updatePersonVotes =
	(personId: string, votes: PersonVotesUpdateFieldInput) => () =>
		graphqlClient.mutation({
			updatePeople: {
				__args: {
					where: { id: { eq: personId } },
					update: { votes: [votes] },
				},
				__typename: true,
			},
		});

const updateOrganizationVotes =
	(
		organizationId: string,
		member_votes: OrganizationMember_votesUpdateFieldInput,
	) =>
	() =>
		graphqlClient.mutation({
			updateOrganizations: {
				__args: {
					where: { id: { eq: organizationId } },
					update: { member_votes: [member_votes] },
				},
				__typename: true,
			},
		});

/**
 * Links votes to their voter and affiliation from the person and organization side,
 * since a vote's single relationships can't be connected from the vote.
 * Connects skip votes already linked to that node, so a retry never duplicates a link,
 * and disconnects run only after every connect succeeded.
 */
async function linkVotes(
	changes: {
		voteId: string;
		voter: { from: string; to: string };
		affiliation: { from: string; to: string };
	}[],
) {
	const voterLinks = groupVoteLinkChanges(
		changes.map(({ voteId, voter }) => ({ voteId, ...voter })),
	);
	const affiliationLinks = groupVoteLinkChanges(
		changes.map(({ voteId, affiliation }) => ({ voteId, ...affiliation })),
	);

	await runWithRetries([
		...[...voterLinks.connect].map(([personId, voteIds]) =>
			updatePersonVotes(personId, {
				connect: [
					{
						where: {
							node: {
								id: { in: voteIds },
								NOT: { voter: { id: { eq: personId } } },
							},
						},
					},
				],
			}),
		),
		...[...affiliationLinks.connect].map(([organizationId, voteIds]) =>
			updateOrganizationVotes(organizationId, {
				connect: [
					{
						where: {
							node: {
								id: { in: voteIds },
								NOT: { voter_affiliation: { id: { eq: organizationId } } },
							},
						},
					},
				],
			}),
		),
	]);

	await runWithRetries([
		...[...voterLinks.disconnect].map(([personId, voteIds]) =>
			updatePersonVotes(personId, {
				disconnect: [{ where: { node: { id: { in: voteIds } } } }],
			}),
		),
		...[...affiliationLinks.disconnect].map(([organizationId, voteIds]) =>
			updateOrganizationVotes(organizationId, {
				disconnect: [{ where: { node: { id: { in: voteIds } } } }],
			}),
		),
	]);
}

async function onSaveChanges() {
	if (!voteEvent.value) return;

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
		(vote) =>
			!toDeleteIds.value.has(vote.id) &&
			(editedRows.value.has(vote.id) || !existingIds.has(vote.id)),
	);

	const idsToDelete = [...toDeleteIds.value].filter((id) =>
		existingIds.has(id),
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
						id: { eq: voteEvent.value.id },
					},
					update: {
						publish_status: {
							set: voteValidationResult.value?.errors.length
								? 'ERROR'
								: voteEvent.value.publish_status === 'PUBLISHED'
									? 'PUBLISHED'
									: 'UNPUBLISHED',
						},
						...Object.fromEntries(
							summaryCountKeyChanges.map((key) => [
								key,
								{ set: voteEvent.value![key] },
							]),
						),
					},
				},
				__scalar: true,
			},
		});
	}

	await Promise.all(
		rowsToPatch
			.filter((vote) => existingIds.has(vote.id))
			.map((vote) =>
				graphqlClient.mutation({
					updateVotes: {
						__args: {
							where: {
								id: { eq: vote.id },
							},
							update: {
								vote_order: { set: vote.vote_order },
								badge_number: { set: vote.badge_number },
								voter_name_raw: { set: vote.voter_name_raw },
								option: { set: vote.option },
							},
						},
						votes: {
							id: true,
						},
					},
				}),
			),
	);

	const newVotes = rowsToPatch
		.filter((vote) => !existingIds.has(vote.id))
		.map((vote) => ({
			id: vote.id,
			vote_order: vote.vote_order,
			badge_number: vote.badge_number,
			voter_name_raw:
				vote.voter_name_raw ||
				peopleOptions.value?.find(
					(p) => p.value === getEffectiveVoterId(vote, selectedVoterIds.value),
				)?.name ||
				'',
			voter_affiliation_raw:
				vote.voter_affiliation_raw ||
				affiliationOptions.value?.find(
					(a) =>
						a.value ===
						getEffectiveAffiliationId(vote, selectedAffiliationIds.value),
				)?.label ||
				'',
			option: vote.option,
		}));

	const voteEventId = voteEvent.value.id;

	const createVotes = async () => {
		if (!newVotes.length) return new Map<string, string>();

		// Wait for every chunk before failing, so the reload after a failure includes all created votes
		const failedChunk = (
			await Promise.allSettled(
				Array.from(
					{ length: Math.ceil(newVotes.length / CREATE_VOTES_CHUNK_SIZE) },
					(_, i) =>
						graphqlClient.mutation({
							updateVoteEvents: {
								__args: {
									where: { id: { eq: voteEventId } },
									update: {
										votes: [
											{
												create: newVotes
													.slice(
														i * CREATE_VOTES_CHUNK_SIZE,
														(i + 1) * CREATE_VOTES_CHUNK_SIZE,
													)
													.map(({ id: _, ...node }) => ({ node })),
											},
										],
									},
								},
								__typename: true,
							},
						}),
				),
			)
		).find((result) => result.status === 'rejected');

		if (failedChunk) throw failedChunk.reason;

		const { voteEvents } = await graphqlClient.query({
			voteEvents: {
				__args: { where: { id: { eq: voteEventId } } },
				votes: {
					__args: { where: { NOT: { id: { in: [...existingIds] } } } },
					id: true,
					vote_order: true,
					badge_number: true,
					voter_name_raw: true,
					voter_affiliation_raw: true,
					option: true,
				},
			},
		});

		return matchCreatedVotes(newVotes, voteEvents[0]!.votes);
	};

	const resetState = async () => {
		editedRows.value.clear();
		editedCells.value.clear();
		toDeleteIds.value.clear();
		activeEditingCell.value = { columnId: null, rowId: null };
		await refresh();
	};

	// After votes were created, reload so they become existing rows and a re-save can't create them twice,
	// then restore the unsaved selections and deletions so the re-save finishes their links
	const reloadKeepingChanges = async (createdVoteIds: Map<string, string>) => {
		const selections = [
			[{ ...selectedVoterIds.value }, selectVoter],
			[{ ...selectedAffiliationIds.value }, selectAffiliation],
		] as const;
		const pendingDeleteIds = [...toDeleteIds.value];

		await resetState();

		const savedIds = new Set(voteEvent.value?.votes.map(({ id }) => id));
		selections.forEach(([selected, select]) =>
			Object.entries(selected)
				.map(([id, nodeId]) => [createdVoteIds.get(id) ?? id, nodeId] as const)
				.filter(([id]) => savedIds.has(id))
				.forEach(([id, nodeId]) => select(id, nodeId)),
		);
		pendingDeleteIds
			.filter((id) => savedIds.has(id))
			.forEach((id) => toDeleteIds.value.add(id));
	};

	const createdVoteIds = await createVotes().catch(async (error) => {
		if (newVotes.length) await reloadKeepingChanges(new Map());
		throw error;
	});

	try {
		await linkVotes(
			rowsToPatch.map((vote) => ({
				voteId: createdVoteIds.get(vote.id) ?? vote.id,
				voter: {
					from: getLinkedVoterId(vote.id),
					to: getEffectiveVoterId(vote, selectedVoterIds.value),
				},
				affiliation: {
					from: getLinkedAffiliationId(vote.id),
					to: getEffectiveAffiliationId(vote, selectedAffiliationIds.value),
				},
			})),
		);

		if (idsToDelete.length) {
			await graphqlClient.mutation({
				deleteVotes: {
					__args: {
						where: { id: { in: idsToDelete } },
					},
					nodesDeleted: true,
				},
			});
		}
	} catch (error) {
		if (newVotes.length) await reloadKeepingChanges(createdVoteIds);
		throw error;
	}

	const rowChange = rowsToPatch.length + toDeleteIds.value.size;

	await resetState();

	successToast.show({
		kind: 'success',
		title: 'Changes Saved',
		subTitle: rowChange ? `Changes to ${rowChange} rows have been saved.` : '',
	});
}

async function togglePublishStatus() {
	const { updateVoteEvents } = await graphqlClient.mutation({
		updateVoteEvents: {
			__args: {
				where: {
					id: { eq: route.params.id as string },
				},
				update: {
					publish_status: {
						set:
							voteEvent.value?.publish_status !== 'PUBLISHED'
								? 'PUBLISHED'
								: 'UNPUBLISHED',
					},
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
	successToast.show({
		kind: 'success',
		title: `${count} row(s) will be deleted`,
		subTitle: `Don't save changes if you want to undo this.`,
	});
}

function scrollToRow(id: string) {
	document
		.querySelector(`[data-value="${id}"]`)
		?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<template>
	<div class="relative">
		<cv-breadcrumb no-trailing-slash>
			<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
			<cv-breadcrumb-item>
				<a href="/admin/vote-events">Vote Events</a>
			</cv-breadcrumb-item>
			<cv-breadcrumb-item>
				<a
					:href="`/admin/vote-events/${voteEvent?.id}`"
					class="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap"
					>{{ voteEvent?.title }}</a
				>
			</cv-breadcrumb-item>
			<cv-breadcrumb-item>Votes</cv-breadcrumb-item>
		</cv-breadcrumb>

		<FeedbackToast
			:notification="successToast.notification"
			@close="successToast.hide"
		/>

		<UiEntityHeader
			:title="voteEvent ? `Votes - ${voteEvent.title}` : undefined"
			:publish-status="voteEvent?.publish_status"
			:original-document-url="voteEvent?.links[0]?.url"
			:is-publishing-disabled="!!voteValidationResult?.errors.length"
			:is-save-disabled="isSaving"
			@toggle-publish-status="togglePublishStatus"
			@save="guardSave(onSaveChanges)"
		/>

		<VotesErrorNotifications
			v-if="voteValidationResult"
			:errors="voteValidationResult.errors"
			:warnings="voteValidationResult.warnings"
			:get-action-label="
				(type) =>
					type === 'COUNT_MISMATCHED'
						? undefined
						: type === 'INVALID_VOTER_NAME'
							? 'Review names'
							: 'Go to the first issue'
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
				v-model:active-editing-cell="activeEditingCell"
				v-model:to-delete-ids="toDeleteIds"
				class="flex-1"
				:vote-event
				:original-votes-map
				:people-options
				:affiliation-options
				:errors="voteValidationResult?.errors ?? []"
				:edited-cells
				:edited-rows
				:selected-voter-ids
				:selected-affiliation-ids
				@edited="(arg) => markVoteAsEdited(...arg)"
				@voter-selected="(arg) => selectVoter(...arg)"
				@affiliation-selected="(arg) => selectAffiliation(...arg)"
				@deleted="showRowDeleteNotification"
			/>
			<VotesSummary class="sticky top-16 max-w-xs" :vote-event />
		</div>
	</div>

	<VotesBatchNameCorrectionModal
		v-if="voteEvent && peopleOptions"
		:visible="isShowBatchNameCorrectionModal"
		:votes="votesWithSelectedVoters.filter((v) => !v.voter)"
		:people-options
		@submit="
			(values) => {
				values.forEach(({ voteId, voterId }) => selectVoter(voteId, voterId));
				isShowBatchNameCorrectionModal = false;
			}
		"
		@cancel="isShowBatchNameCorrectionModal = false"
	/>
</template>
