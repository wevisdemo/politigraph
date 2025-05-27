<script setup lang="ts">
import {
	Add16,
	DocumentView16,
	Download16,
	Save16,
	WarningFilled16,
	//@ts-ignore
} from '@carbon/icons-vue';
import type { Vote } from '~/.genql';
import { graphqlClient } from '~/utils/graphql/client';
import { csvFormat } from 'd3-dsv';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const searchQuery = ref('');

const onSearch = (event: string) => {
	searchQuery.value = event;
};

const isShowNotificationError = ref(false);
const isShowNotification = ref(false);
const titleNotification = ref({
	title: '',
	subtitle: '',
});
const rowChange = ref(0);
const originalVotesMap = ref<Record<string, Partial<Vote>>>({});

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
			value: `${person.firstname} ${person.lastname}`,
			label: `${person.firstname} ${person.lastname}`,
		}));
	},
	{ server: false },
);

const getVoterOptions = (id: string, available: boolean) => {
	const original = originalVotesMap.value[id];
	const currentName = original?.voter_name;
	if (currentName && !available) {
		return [
			{ value: currentName, label: currentName },
			...(peopleOptions.value ?? []),
		];
	}
	return peopleOptions.value;
};

const optionOptions = [
	'เห็นด้วย',
	'ไม่เห็นด้วย',
	'งดออกเสียง',
	'ไม่ลงคะแนน',
	'ลา / ขาดลงมติ',
];

const filteredVotes = computed(() => {
	if (!voteEvent.value?.votes || !Array.isArray(voteEvent.value.votes)) {
		return [];
	}

	return voteEvent.value.votes.filter((vote) => {
		const query = searchQuery.value.toLowerCase();
		return (
			vote.voter_name?.toLowerCase().includes(query) ||
			vote.voter_party?.toLowerCase().includes(query) ||
			vote.badge_number?.toString().includes(query)
		);
	});
});

const editedRows = ref<Set<string>>(new Set());
const editedCells = ref<Set<string>>(new Set());

const isRowEdited = (id: string) => {
	return editedRows.value.has(id);
};

const isNewRow = (id: string) => {
	return !originalVotesMap.value[id];
};

const isCellEdited = (rowId: string, cellId: string) => {
	return editedCells.value.has(`${rowId}-${cellId}`);
};

const getRowClass = (row: Vote): string => {
	if (isNewRow(row.id)) {
		return '';
	}
	if (isRowEdited(row.id)) {
		return '[&>td]:bg-[#FCF4D6]!';
	}
	if (row.voters.length == 0) {
		return '[&>td]:bg-[#FFF1F1]!';
	}
	return '';
};

const activeEditingCell = ref<{
	rowId: number | null;
	columnId: number | null;
}>({ rowId: null, columnId: null });

const startEditing = (rowId: number | null, columnId: number | null) => {
	activeEditingCell.value = { rowId, columnId };
};

const isActiveEditing = computed(() => {
	return (rowId: number, columnId: number) => {
		return (
			activeEditingCell.value.rowId === rowId &&
			activeEditingCell.value.columnId === columnId
		);
	};
});

type EditableVoteFields =
	| 'vote_order'
	| 'badge_number'
	| 'voter_name'
	| 'voter_party'
	| 'option';

const markAsEdited = (rowId: string, cellKey: EditableVoteFields) => {
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

const onOptionChange = (row: Vote, cellId: EditableVoteFields) => {
	nextTick(() => markAsEdited(row.id, cellId));
};

const isSaving = ref(false);

const onSaveChanges = async () => {
	if (isSaving.value) return;
	isSaving.value = true;

	try {
		const allVotes = voteEvent.value?.votes ?? [];
		const existingIds = new Set(Object.keys(originalVotesMap.value));

		const rowsToPatch = allVotes.filter(
			(vote) => editedRows.value.has(vote.id) || !existingIds.has(vote.id),
		);

		console.log(rowsToPatch, toDeleteIds.value);

		if (!rowsToPatch.length && !toDeleteIds.value.size) return;

		if (rowsToPatch.length) {
			const mutationPromises = rowsToPatch.map((vote) => {
				const voterId = vote.voter_name?.replaceAll(/\s+/g, '-');

				if (existingIds.has(vote.id)) {
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
			await Promise.all(
				Array.from(toDeleteIds.value).map((id) => onDelete(id)),
			);
		}

		rowChange.value = rowsToPatch.length + toDeleteIds.value.size;
		titleNotification.value.title = 'Changes Saved';
		titleNotification.value.subtitle = `Changes to ${rowChange.value} rows have been saved.`;

		// reset state
		editedRows.value.clear();
		editedCells.value.clear();
		toDeleteIds.value.clear();
		startEditing(null, null);
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
};

const addNewRow = () => {
	const newRow: Pick<
		Vote,
		| 'id'
		| 'vote_order'
		| 'badge_number'
		| 'voter_name'
		| 'voter_party'
		| 'option'
		| 'voters'
	> = {
		id: crypto.randomUUID(),
		vote_order: '',
		badge_number: '',
		voter_name: '',
		voter_party: '',
		option: '',
		voters: [],
	};
	if (voteEvent.value && voteEvent.value.votes) {
		voteEvent.value.votes = [...voteEvent.value.votes, newRow];
		nextTick(() => {
			const lastRowEl = document.querySelector('[data-last-row]');
			lastRowEl?.scrollIntoView({ behavior: 'smooth' });
		});
	}
};

const selectedRows = ref<string[]>([]);
const onSelectRow = (ids: string[]) => {
	selectedRows.value = ids;
};
const toDeleteIds = ref<Set<string>>(new Set());

const onDelete = async (id: string) => {
	try {
		await graphqlClient.mutation({
			deleteVotes: {
				__args: {
					where: { id_EQ: id },
				},
				nodesDeleted: true,
			},
		});
	} catch (error) {
		console.error('Delete failed', error);
	}
};

const deleteSelected = async () => {
	if (!voteEvent.value) return;
	selectedRows.value.forEach((id) => toDeleteIds.value.add(id));

	const votesFilter =
		voteEvent.value?.votes.filter((vote) => !toDeleteIds.value.has(vote.id)) ||
		[];
	voteEvent.value.votes = votesFilter;

	selectedRows.value = [];

	const rowDelete = toDeleteIds.value.size;
	titleNotification.value.title = 'Row Deleted';
	titleNotification.value.subtitle = `${rowDelete} vote record has been removed from the table.`;
	isShowNotification.value = true;
	setTimeout(() => {
		isShowNotification.value = false;
	}, 3000);
};

const downloadCSV = () => {
	const votesData = Object.values(originalVotesMap.value).sort(
		(a, b) => Number(a.vote_order) - Number(b.vote_order),
	);

	const headers = [
		{ key: 'vote_order', label: 'ลำดับ' },
		{ key: 'badge_number', label: 'เลขที่บัตร' },
		{ key: 'voter_name', label: 'ชื่อ-สกุล' },
		{ key: 'voter_party', label: 'พรรค' },
		{ key: 'option', label: 'ผลลงคะแนน' },
	];

	const csvData = votesData.map((row) => {
		const obj: Record<string, string> = {};
		headers.forEach(({ key, label }) => {
			obj[label] = row[key as keyof Vote] ?? '';
		});
		return obj;
	});

	const csv = csvFormat(
		csvData,
		headers.map((h) => h.label),
	);
	const BOM = '\uFEFF';
	const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', `${voteEvent.value?.title}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};
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

		<div class="bg-white">
			<cv-data-table-skeleton
				v-if="!voteEvent"
				title="Votes"
				helperText="การลงมติรายบุคคล"
			></cv-data-table-skeleton>
			<cv-data-table
				v-else
				title="Votes"
				helperText="การลงมติรายบุคคล"
				:rows="filteredVotes"
				v-model:selectedRows="selectedRows"
				@update:rows-selected="onSelectRow"
				useBatchActions
				class="w-full table-fixed"
				@search="onSearch"
			>
				<template #actions>
					<cv-button
						:icon="Download16"
						kind="ghost"
						hasIconOnly
						class="!text-black"
						@click="downloadCSV"
					/>
					<cv-button :icon="Add16" kind="secondary" @click="addNewRow">
						Add Vote
					</cv-button>
				</template>
				<template #batch-actions>
					<cv-button kind="danger--ghost" @click="deleteSelected">
						Delete
					</cv-button>
				</template>
				<template #headings>
					<cv-data-table-heading id="sb-number" heading="ลำดับที่" />
					<cv-data-table-heading id="sb-badge-number" heading="เลขที่บัตร" />
					<cv-data-table-heading id="sb-politician" heading="ชื่อ-สกุล" />
					<cv-data-table-heading id="sb-party" heading="ชื่อสังกัด" />
					<cv-data-table-heading id="sb-vote" heading="ผลการลงคะแนน" />
				</template>
				<template #data class="table">
					<cv-data-table-row
						v-for="(row, i) in filteredVotes"
						:key="row.id"
						:value="row.id"
						:data-last-row="i === filteredVotes.length - 1 ? true : null"
						:class="getRowClass(row as Vote)"
					>
						<cv-data-table-cell
							:key="row.id + '-' + 'vote_order'"
							@click="startEditing(i, 0)"
						>
							<cv-text-input
								placeholder="Enter Order No."
								v-model="row.vote_order"
								type="text"
								style="background: transparent; border: none"
								@change="markAsEdited(row.id, 'vote_order')"
							/>
						</cv-data-table-cell>
						<cv-data-table-cell
							:key="row.id + '-' + 'badge_number'"
							@click="startEditing(i, 1)"
						>
							<cv-text-input
								placeholder="Enter ID No."
								v-model="row.badge_number"
								type="text"
								style="background: transparent; border: none"
								@change="markAsEdited(row.id, 'badge_number')"
							/>
						</cv-data-table-cell>
						<cv-data-table-cell
							:key="row.id + '-' + 'voter_name'"
							@click="startEditing(i, 2)"
							:class="[
								{
									'!text-[#DA1E28]':
										row.voters.length === 0 &&
										!isCellEdited(row.id, 'voter_name') &&
										!isNewRow(row.id),
								},
							]"
						>
							<div v-if="isActiveEditing(i, 2)">
								<cv-combo-box
									:label="
										row.voter_name && row.voter_name?.length > 0
											? row.voter_name
											: 'Select voter name'
									"
									v-model="row.voter_name"
									:options="getVoterOptions(row.id, row.voters.length > 0)"
									item-value-key="value"
									item-text-key="label"
									autoFilter
									autoHighlight
									@change="onOptionChange(row as Vote, 'voter_name')"
									:direction="i >= filteredVotes.length - 5 ? 'top' : ''"
								/>
							</div>
							<div v-else class="flex items-center gap-2 !pl-[16px]">
								<p v-if="row.voter_name && row.voter_name?.length > 0">
									{{ row.voter_name }}
								</p>
								<p v-else class="text-[#707070]">Select voter name</p>
								<cv-tooltip
									v-if="
										row.voters.length === 0 &&
										!isCellEdited(row.id, 'voter_name') &&
										!isNewRow(row.id)
									"
									:direction="i === filteredVotes.length - 1 ? 'top' : 'bottom'"
									tip="Invalid name. Select a voter from the list."
								>
									<WarningFilled16 class="inline-block" style="fill: #da1e28" />
								</cv-tooltip>
								<cv-tooltip
									v-if="isCellEdited(row.id, 'voter_name')"
									:direction="i === filteredVotes.length - 1 ? 'top' : 'bottom'"
									tip="Unsaved change"
								>
									<WarningFilled16 class="inline-block" style="fill: #ff8300" />
								</cv-tooltip>
							</div>
						</cv-data-table-cell>
						<cv-data-table-cell
							:key="row.id + '-' + 'voter_party'"
							@click="startEditing(i, 3)"
						>
							<cv-text-input
								placeholder="Enter Party"
								v-model="row.voter_party"
								type="text"
								style="background: transparent; border: none"
								@change="markAsEdited(row.id, 'voter_party')"
							/>
						</cv-data-table-cell>
						<cv-data-table-cell
							:key="row.id + '-' + 'option'"
							@click="startEditing(i, 4)"
						>
							<div v-if="isActiveEditing(i, 4)">
								<cv-dropdown
									v-model="row.option"
									@change="onOptionChange(row as Vote, 'option')"
									:up="i >= filteredVotes.length - 5 ? true : false"
									light
								>
									<cv-dropdown-item
										:key="`${item}`"
										v-for="item in optionOptions"
										:value="`${item}`"
									>
										{{ item }}
									</cv-dropdown-item>
								</cv-dropdown>
							</div>
							<div v-else class="flex items-center gap-2 !pl-[16px]">
								<p v-if="row.option && row.option.length > 0">
									{{ row.option }}
								</p>
								<p v-else class="text-[#707070]">Chose...</p>
								<cv-tooltip
									v-if="isCellEdited(row.id, 'option')"
									:direction="i === filteredVotes.length - 1 ? 'top' : 'bottom'"
									tip="Unsaved change"
								>
									<WarningFilled16 class="inline-block" style="fill: #ff8300" />
								</cv-tooltip>
							</div>
						</cv-data-table-cell>
					</cv-data-table-row>
				</template>
			</cv-data-table>
		</div>
	</div>
</template>

<style scoped>
::v-deep(.bx--table-toolbar) {
	background-color: white !important;
}

table tr th {
	@apply !pl-[32px] w-1/5;
}
</style>
