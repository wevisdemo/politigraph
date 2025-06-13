<script setup lang="ts">
//@ts-ignore
import { Add16, Download16, WarningFilled16 } from '@carbon/icons-vue';
import type { Person, Vote, VoteEvent } from '~/.genql';
import { standardVoteOptions } from '~/constants/votes';
import type { VoteError } from '~/utils/votes/validator';
import { csvFormat } from 'd3-dsv';
import { closest } from 'fastest-levenshtein';

type VoteEventProp = Pick<VoteEvent, 'id' | 'title' | 'publish_status'> & {
	votes: (Pick<
		Vote,
		| 'id'
		| 'vote_order'
		| 'voter_name'
		| 'voter_party'
		| 'option'
		| 'badge_number'
	> & {
		voters: Pick<Person, 'id'>[];
	})[];
};

const props = defineProps<{
	voteEvent: VoteEventProp | null;
	originalVotesMap: Record<string, Partial<Vote>>;
	peopleOptions:
		| {
				value: string;
				name: string;
				label: string;
		  }[]
		| null;
	errors: VoteError[];
}>();

const activeEditingCell = defineModel<{
	rowId: number | null;
	columnId: number | null;
}>('activeEditingCell', { required: true });
const editedRows = defineModel<Set<string>>('editedRows', { required: true });
const editedCells = defineModel<Set<string>>('editedCells', { required: true });
const toDeleteIds = defineModel<Set<string>>('toDeleteIds', { required: true });

const event = defineEmits<{
	(e: 'deleted', count: number): void;
}>();

const searchQuery = ref('');

const onSearch = (event: string) => {
	searchQuery.value = event;
};

const getVoterOptions = (id: string, available: boolean) => {
	if (!props.peopleOptions) return [];

	const original = props.originalVotesMap[id]?.voter_name;

	if (original && !available) {
		const closestName = closest(
			original,
			props.peopleOptions.map((p) => p.label),
		);
		const suggestion = props.peopleOptions.find(
			(p) => p.label === closestName,
		)!;

		return [
			{ value: '', name: original, label: `${original}--(Original)` },
			{ ...suggestion, label: `${suggestion.label}--(Suggestion)` },
			...props.peopleOptions.filter((p) => p.value !== suggestion.value),
		];
	}

	return props.peopleOptions;
};

const filteredVotes = computed(() => {
	if (!props.voteEvent?.votes || !Array.isArray(props.voteEvent.votes)) {
		return [];
	}

	return props.voteEvent.votes.filter((vote) => {
		const query = searchQuery.value.toLowerCase();
		return (
			vote.voter_name?.toLowerCase().includes(query) ||
			vote.voter_party?.toLowerCase().includes(query) ||
			vote.badge_number?.toString().includes(query)
		);
	});
});

const isNewRow = (id: string) => !props.originalVotesMap[id];

const isCellEdited = (rowId: string, cellId: string) => {
	return editedCells.value.has(`${rowId}-${cellId}`);
};

const getRowClass = (row: Vote): string => {
	if (isNewRow(row.id)) {
		return '';
	}
	if (editedRows.value.has(row.id)) {
		return '[&>td]:bg-[#FCF4D6]!';
	}
	if (props.errors.some((e) => e.id === row.id)) {
		return '[&>td]:bg-[#FFF1F1]!';
	}
	return '';
};

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
	const current = props.voteEvent?.votes.find((v) => v.id === rowId);
	const original = props.originalVotesMap[rowId];

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
	if (props.voteEvent && props.voteEvent.votes) {
		props.voteEvent.votes = [...props.voteEvent.votes, newRow];
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

const deleteSelected = async () => {
	if (!props.voteEvent) return;
	selectedRows.value.forEach((id) => toDeleteIds.value.add(id));

	const votesFilter =
		props.voteEvent?.votes.filter((vote) => !toDeleteIds.value.has(vote.id)) ||
		[];
	props.voteEvent.votes = votesFilter;

	selectedRows.value = [];

	event('deleted', toDeleteIds.value.size);
};

const downloadCSV = () => {
	const votesData = Object.values(props.originalVotesMap).sort(
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
	link.setAttribute('download', `${props.voteEvent?.title}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};
</script>

<template>
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
				<cv-data-table-heading heading="ลำดับที่" />
				<cv-data-table-heading heading="เลขที่บัตร" />
				<cv-data-table-heading heading="ชื่อ-สกุล" class="min-w-[30%]" />
				<cv-data-table-heading heading="ชื่อสังกัด" />
				<cv-data-table-heading heading="ผลการลงคะแนน" />
			</template>
			<template #data class="table">
				<cv-data-table-row
					v-for="(row, i) in filteredVotes"
					:key="row.id"
					:value="row.id"
					:data-last-row="i === filteredVotes.length - 1 ? true : null"
					:class="getRowClass(row as Vote)"
					class="scroll-m-12"
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
								:label="row.voter_name ?? 'Select voter name'"
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
							<p
								:class="{
									'text-[#707070]': !row.voter_name,
								}"
							>
								{{
									peopleOptions?.find((p) => p.value === row.voter_name)
										?.name ||
									row.voter_name ||
									'Select voter name'
								}}
							</p>
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
									v-for="item in standardVoteOptions"
									:value="`${item}`"
								>
									{{ item }}
								</cv-dropdown-item>
							</cv-dropdown>
						</div>
						<div v-else class="flex items-center !pl-[16px]">
							<div v-if="row.option" class="flex flex-row gap-2 items-center">
								<p>{{ row.option }}</p>
								<cv-tooltip
									v-if="!standardVoteOptions.includes(row.option)"
									:direction="i === filteredVotes.length - 1 ? 'top' : 'bottom'"
									alignment="end"
									tip="Unexpected value"
								>
									<WarningFilled16 class="inline-block" style="fill: #da1e28" />
								</cv-tooltip>
							</div>
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
</template>

<style scoped>
::v-deep(.bx--table-toolbar) {
	background-color: white !important;
}

table tr th {
	@apply !pl-[32px];
}
</style>
