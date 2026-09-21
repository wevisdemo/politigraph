<script setup lang="ts">
import { Download16, UserFollow16 } from '@carbon/icons-vue';
import type { Person, Vote, VoteEvent } from '@politigraph/graphql/genql';
import type { PeopleOption } from '~/composables/use-people-options';
import { standardVoteOptions, VOTER_CELL_KEY } from '~/constants/votes';
import { getEffectiveVoterId, type VoteIssue } from '~/utils/votes';
import { csvFormat } from 'd3-dsv';
import { closest } from 'fastest-levenshtein';

type EditableVoteFields =
	| 'vote_order'
	| 'badge_number'
	| 'voter_party'
	| 'option';

type SortKey = EditableVoteFields | 'voter_name_raw';

const SORTABLE_COLUMNS: {
	key: SortKey;
	heading: string;
	class?: string;
}[] = [
	{ key: 'vote_order', heading: 'ลำดับที่', class: 'w-36' },
	{ key: 'badge_number', heading: 'เลขที่บัตร', class: 'w-36' },
	{ key: 'voter_name_raw', heading: 'ชื่อ-สกุล' },
	{ key: 'voter_party', heading: 'ชื่อสังกัด', class: 'w-48' },
	{ key: 'option', heading: 'ผลการลงคะแนน', class: 'w-48' },
];

type VoteEventProp = Pick<VoteEvent, 'id' | 'title' | 'publish_status'> & {
	votes: (Pick<
		Vote,
		| 'id'
		| 'vote_order'
		| 'voter_name_raw'
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
	peopleOptions: PeopleOption[] | null;
	editedRows: Set<string>;
	editedCells: Set<string>;
	errors: VoteIssue[];
	selectedVoterIds: Record<string, string>;
}>();

const activeEditingCell = defineModel<{
	rowId: string | null;
	columnId: number | null;
}>('activeEditingCell', { required: true });
const toDeleteIds = defineModel<Set<string>>('toDeleteIds', { required: true });

const emit = defineEmits<{
	(e: 'deleted', count: number): void;
	(e: 'edited', rowColumnId: [string, EditableVoteFields]): void;
	(e: 'voterSelected', rowVoterId: [string, string]): void;
}>();

const getSelectedVoterId = (row: VoteEventProp['votes'][number]) =>
	getEffectiveVoterId(row, props.selectedVoterIds);

const searchQuery = ref('');

const onSearch = (event: string) => {
	searchQuery.value = event;
};

const peopleLabelById = computed(
	() => new Map(props.peopleOptions?.map((p) => [p.value, p.label])),
);
const peopleLabels = computed(
	() => props.peopleOptions?.map((p) => p.label) ?? [],
);
const errorIds = computed(() => new Set(props.errors.map((e) => e.id)));

const isNewRow = (id: string) => !props.originalVotesMap[id];

const filteredVotes = computed(() => {
	if (!props.voteEvent?.votes || !Array.isArray(props.voteEvent.votes)) {
		return [];
	}

	const query = searchQuery.value.toLowerCase();

	return props.voteEvent.votes.filter(
		(vote) =>
			!toDeleteIds.value.has(vote.id) &&
			(isNewRow(vote.id) ||
				vote.voter_name_raw?.toLowerCase().includes(query) ||
				vote.voter_party?.toLowerCase().includes(query) ||
				vote.badge_number?.toString().includes(query)),
	);
});

const activeRow = computed(() =>
	activeEditingCell.value.columnId === 2 &&
	activeEditingCell.value.rowId !== null
		? filteredVotes.value.find((v) => v.id === activeEditingCell.value.rowId)
		: undefined,
);

const getSortValue = (row: VoteEventProp['votes'][number], key: SortKey) => {
	if (key === 'voter_name_raw') {
		return peopleLabelById.value.get(getSelectedVoterId(row)) || row[key] || '';
	}

	if (key === 'option') {
		if (!row[key]) return '';

		const index = standardVoteOptions.indexOf(row[key]);
		return index === -1 ? standardVoteOptions.length : index;
	}

	return row[key] ?? '';
};

const sortState = ref<{ key: SortKey; order: 'ascending' | 'descending' }>({
	key: 'vote_order',
	order: 'ascending',
});
// Only ever written for the sorted column: changing it back to 'none' would
// make Carbon re-emit a sort event and steal the active heading marker
const columnOrders = ref<Partial<Record<SortKey, 'ascending' | 'descending'>>>({
	vote_order: 'ascending',
});
const rankById = ref(new Map<string, number>());

const applySort = () => {
	const { key, order } = sortState.value;
	const direction = order === 'ascending' ? 1 : -1;

	const sorted = (props.voteEvent?.votes ?? [])
		.filter((vote) => !isNewRow(vote.id))
		.sort((a, b) => {
			const left = getSortValue(a, key);
			const right = getSortValue(b, key);

			if (left === '' || right === '') {
				return left === right ? 0 : left === '' ? 1 : -1;
			}

			return (
				direction *
				(typeof left === 'number' && typeof right === 'number'
					? left - right
					: String(left).localeCompare(String(right), 'th', {
							numeric: true,
						}))
			);
		});

	rankById.value = new Map(sorted.map((vote, rank) => [vote.id, rank]));
};

const onSort = ({ index, order }: { index: number; order: string }) => {
	const column = SORTABLE_COLUMNS[index];
	if (!column) return;

	if (order === 'none' && column.key !== sortState.value.key) return;

	const nextOrder = order === 'descending' ? 'descending' : 'ascending';

	columnOrders.value[column.key] = nextOrder;
	sortState.value = { key: column.key, order: nextOrder };
	applySort();
};

watch(() => props.originalVotesMap, applySort);

const displayedVotes = computed(() => {
	const rank = rankById.value;

	return [...filteredVotes.value].sort(
		(a, b) =>
			(rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
			(rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
	);
});

const activeVoterOptions = computed(() => {
	const row = activeRow.value;
	if (!props.peopleOptions || !row) return [];

	const original = props.originalVotesMap[row.id]?.voter_name_raw;

	if (original && !getSelectedVoterId(row)) {
		const closestName = closest(original, peopleLabels.value);
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
});

const isCellEdited = (rowId: string, cellId: string) =>
	props.editedCells.has(`${rowId}-${cellId}`);

const getRowClass = (id: string): string => {
	if (isNewRow(id)) {
		return '';
	}
	if (props.editedRows.has(id)) {
		return '[&>td]:bg-[#FCF4D6]';
	}
	if (errorIds.value.has(id)) {
		return '[&>td]:bg-[#FFF1F1]';
	}
	return '';
};

const startEditing = (rowId: string, columnId: number) => {
	activeEditingCell.value = { rowId, columnId };
};

const onEdited = (arg: [string, EditableVoteFields]) => emit('edited', arg);
const onVoterSelected = (arg: [string, string]) => emit('voterSelected', arg);

const newRowCountInput = ref(1);
const newRowCount = computed(() =>
	Math.max(1, Math.trunc(newRowCountInput.value) || 1),
);

const addNewRows = () => {
	const newRows: VoteEventProp['votes'] = Array.from(
		{ length: newRowCount.value },
		() => ({
			id: crypto.randomUUID(),
			vote_order: '',
			badge_number: '',
			voter_name_raw: '',
			voter_party: '',
			option: '',
			voters: [],
		}),
	);
	if (props.voteEvent && props.voteEvent.votes) {
		props.voteEvent.votes = [...props.voteEvent.votes, ...newRows];
		nextTick(() => {
			const lastRowEl = document.querySelector('[data-last-row]');
			lastRowEl?.scrollIntoView({ behavior: 'smooth' });
		});
	}
};

const deleteRow = (id: string) => {
	toDeleteIds.value.add(id);
	emit('deleted', toDeleteIds.value.size);
};

const downloadCSV = () => {
	const votesData = Object.values(props.originalVotesMap).sort(
		(a, b) => Number(a.vote_order) - Number(b.vote_order),
	);

	const headers = [
		{ key: 'vote_order', label: 'ลำดับ' },
		{ key: 'badge_number', label: 'เลขที่บัตร' },
		{ key: 'voter_name_raw', label: 'ชื่อ-สกุล' },
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
	const BOM = '﻿';
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
			helper-text="การลงมติรายบุคคล"
		/>
		<cv-data-table
			v-else
			title="Votes"
			helper-text="การลงมติรายบุคคล"
			:rows="displayedVotes"
			class="w-full table-fixed"
			@search="onSearch"
			@sort="onSort"
		>
			<template #actions>
				<cv-icon-button
					:icon="Download16"
					kind="ghost"
					class="text-black"
					@click="downloadCSV"
				/>
				<div class="text-md self-center px-3">Add new vote</div>
				<div class="w-36">
					<cv-number-input
						v-model="newRowCountInput"
						:min="1"
						size="lg"
						aria-label="Number of votes to add"
					/>
				</div>
				<cv-icon-button
					:label="`Add ${newRowCount} ${newRowCount > 1 ? 'Votes' : 'Vote'}`"
					:icon="UserFollow16"
					kind="secondary"
					@click="addNewRows"
				/>
			</template>
			<template #headings>
				<cv-data-table-heading
					v-for="column in SORTABLE_COLUMNS"
					:key="column.key"
					:heading="column.heading"
					:class="column.class"
					:order="columnOrders[column.key] ?? 'none'"
					sortable
				/>
				<cv-data-table-heading heading="Actions" align="right" />
			</template>
			<template #data>
				<VotesTableRow
					v-for="(row, i) in displayedVotes"
					:key="row.id"
					:row
					:index="i"
					:total="displayedVotes.length"
					:active-column="
						activeEditingCell.rowId === row.id
							? activeEditingCell.columnId
							: null
					"
					:row-class="getRowClass(row.id)"
					:is-new="isNewRow(row.id)"
					:is-voter-cell-edited="isCellEdited(row.id, VOTER_CELL_KEY)"
					:is-option-cell-edited="isCellEdited(row.id, 'option')"
					:selected-voter-id="getSelectedVoterId(row)"
					:voter-label="peopleLabelById.get(getSelectedVoterId(row)) ?? ''"
					:voter-options="activeRow === row ? activeVoterOptions : undefined"
					@start-editing="startEditing"
					@edited="onEdited"
					@voter-selected="onVoterSelected"
					@deleted="deleteRow"
				/>
			</template>
		</cv-data-table>
	</div>
</template>

<style scoped>
@reference '~/assets/css/main.css';

::v-deep(.bx--table-toolbar) {
	@apply sticky top-12 z-10 bg-white;
}

table tr th {
	@apply pl-4;
}

::v-deep(.bx--data-table th:last-of-type) {
	@apply w-24;
}

::v-deep(.bx--number--lg.bx--number input[type='number']) {
	@apply pr-24;
}
</style>
