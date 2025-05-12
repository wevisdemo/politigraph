<script setup lang="ts">
//@ts-ignore
import Add from '@carbon/icons-vue/es/add/16';
//@ts-ignore
import DocumentView from '@carbon/icons-vue/es/document--view/16';
//@ts-ignore
import Download from '@carbon/icons-vue/es/download/16';
//@ts-ignore
import Save from '@carbon/icons-vue/es/save/16';
//@ts-ignore
import WarningFilled16 from '@carbon/icons-vue/es/warning--filled/16';
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
		// console.log(voteEvents[0]);
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

const peopleOptions = ref<{ value: string; label: string }[]>([]);

const getVoterOptions = (id: string, available: boolean) => {
	const original = originalVotesMap.value[id];
	const currentName = original.voter_name;
	if (currentName && !available) {
		return [{ value: currentName, label: currentName }, ...peopleOptions.value];
	}
	return peopleOptions.value;
};

const { data: people } = useAsyncData(
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

		const peopleData = result.people ?? [];

		if (peopleData.length > 0) {
			peopleOptions.value = peopleData.map((person) => ({
				value: `${person.firstname} ${person.lastname}`,
				label: `${person.firstname} ${person.lastname}`,
			}));
		}

		return peopleData;
	},
	{ server: false },
);

const optionOptions = [
	{ value: 'เห็นด้วย', label: 'เห็นด้วย' },
	{ value: 'ไม่เห็นด้วย', label: 'ไม่เห็นด้วย' },
	{ value: 'งดออกเสียง', label: 'งดออกเสียง' },
	{ value: 'ไม่ลงคะแนน', label: 'ไม่ลงคะแนน' },
	{ value: 'ลา / ขาดลงมติ', label: 'ลา / ขาดลงมติ' },
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
		return '!bg-[#FCF4D6]';
	}
	if (row.voters.length == 0) {
		return '!bg-[#FFF1F1]';
	}
	return '';
};

const getCellClass = (row: Vote, columnId: number): string => {
	return editedCells.value.has(`${row.id}-${columnId}`) ? 'highlight-cell' : '';
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
			] as EditableVoteFields[]
		).some((key) => current[key] !== original[key]);

		if (!isStillEdited) {
			editedRows.value.delete(rowId);
		}
	}
};

const onOptionChange = (row: Vote, cellId: EditableVoteFields) => {
	nextTick(() => {
		// console.log('mask as edited', row.id, cellId);
		markAsEdited(row.id, cellId);
	});
};

const onSaveChanges = async () => {
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
		await Promise.all(Array.from(toDeleteIds.value).map((id) => onDelete(id)));
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
};

const goToOriginal = () => {
	const url = voteEvent.value?.links[0]?.url;
	window.open(url, '_blank');
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
		// console.log(voteEvent);
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
	const votesData = Object.values(originalVotesMap.value).sort((a, b) => {
		return Number(a.vote_order) - Number(b.vote_order);
	});

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
	link.setAttribute('download', 'votes.csv');
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};
</script>

<template>
	<div class="!p-10 min-h-dvh !bg-[#F4F4F4] !pt-[90px] relative">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item class="text-[#0F62FE]">All Data</cv-breadcrumb-item>
			<cv-breadcrumb-item class="text-[#0F62FE]">Voting</cv-breadcrumb-item>
			<cv-breadcrumb-item class="text-[#0F62FE]">{{
				voteEvent?.title
			}}</cv-breadcrumb-item>

			<cv-breadcrumb-item>Votes</cv-breadcrumb-item>
		</cv-breadcrumb>

		<cv-toast-notification
			v-if="isShowNotification"
			kind="success"
			:title="`${titleNotification.title}`"
			:subTitle="`${titleNotification.subtitle}`"
			@close="isShowNotification = false"
			class="z-50 fixed right-[4px] top-[60px]"
		/>

		<div class="flex flex-row gap-4 justify-between !mb-12 !mt-4">
			<div class="flex items-center">
				<h3 class="!font-normal">Votes - {{ voteEvent?.title }}</h3>
			</div>
			<div class="flex gap-2 h-fit item-start">
				<cv-button :icon="DocumentView" kind="tertiary" @click="goToOriginal">
					View Original
				</cv-button>
				<cv-button :icon="Save" @click="onSaveChanges">
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

		<div class="bg-white !p-4 flex flex-col">
			<div class="!p-[16px]">
				<h4>Votes</h4>
			</div>
		</div>

		<div class="bg-white">
			<cv-data-table
				:rows="filteredVotes"
				v-model:selectedRows="selectedRows"
				@update:rows-selected="onSelectRow"
				useBatchActions
				class="w-full table-fixed"
				@search="onSearch"
			>
				<template #actions>
					<cv-button
						:icon="Download"
						kind="ghost"
						hasIconOnly
						class="!text-black"
						@click="downloadCSV"
					/>
					<cv-button :icon="Add" kind="secondary" @click="addNewRow">
						Add Vote
					</cv-button>
				</template>
				<template #batch-actions>
					<cv-button kind="danger--ghost" @click="deleteSelected">
						Delete
					</cv-button>
				</template>
				<template #headings>
					<cv-data-table-heading
						id="sb-number"
						heading="ลำดับที่"
						sortable
						class="!pl-[16px] w-1/5"
					/>
					<cv-data-table-heading
						id="sb-badge-number"
						heading="เลขที่บัตร"
						sortable
						class="!pl-[16px] w-1/5"
					/>
					<cv-data-table-heading
						id="sb-politician"
						heading="ชื่อ-สกุล"
						sortable
						class="!pl-[16px] w-1/5"
					/>
					<cv-data-table-heading
						id="sb-party"
						heading="ชื่อสังกัด"
						sortable
						class="!pl-[16px] w-1/5"
					/>
					<cv-data-table-heading
						id="sb-vote"
						heading="ผลการลงคะแนน"
						sortable
						class="!pl-[16px] w-1/5"
					/>
				</template>
				<template #data class="table">
					<cv-data-table-row
						v-for="(row, i) in filteredVotes"
						:key="row.id"
						:value="row.id"
						:data-last-row="i === filteredVotes.length - 1 ? true : null"
						@class="getRowClass(row as Vote)"
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
								placeholder="Enter ID	 No."
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
										!isRowEdited(row.id) &&
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
										!isRowEdited(row.id) &&
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
								<cv-combo-box
									:label="
										row.option && row.option.length > 0
											? row.option
											: 'Chose...'
									"
									v-model="row.option"
									:options="optionOptions"
									item-value-key="value"
									item-text-key="label"
									v-show="isActiveEditing(i, 4)"
									autoFilter
									autoHighlight
									@change="onOptionChange(row as Vote, 'option')"
								/>
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
</style>
