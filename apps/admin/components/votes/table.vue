<script setup lang="ts">
// @ts-expect-error carbon icons vue type
import { Download16, UserFollow16 } from '@carbon/icons-vue';
import type { Person, Vote, VoteEvent } from '@politigraph/graphql/genql';
import type { PeopleOption } from '~/composables/use-people-options';
import { VOTER_CELL_KEY } from '~/constants/votes';
import { getEffectiveVoterId, type VoteIssue } from '~/utils/votes';
import { csvFormat } from 'd3-dsv';
import { closest } from 'fastest-levenshtein';

type EditableVoteFields =
	| 'vote_order'
	| 'badge_number'
	| 'voter_party'
	| 'option';

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
	rowId: number | null;
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
		? filteredVotes.value[activeEditingCell.value.rowId]
		: undefined,
);

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

const startEditing = (rowId: number, columnId: number) => {
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
			:rows="filteredVotes"
			class="w-full table-fixed"
			@search="onSearch"
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
				<cv-data-table-heading heading="ลำดับที่" />
				<cv-data-table-heading heading="เลขที่บัตร" />
				<cv-data-table-heading heading="ชื่อ-สกุล" class="min-w-[30%]" />
				<cv-data-table-heading heading="ชื่อสังกัด" />
				<cv-data-table-heading heading="ผลการลงคะแนน" />
				<cv-data-table-heading heading="Actions" align="right" />
			</template>
			<template #data>
				<VotesTableRow
					v-for="(row, i) in filteredVotes"
					:key="row.id"
					:row
					:index="i"
					:total="filteredVotes.length"
					:active-column="
						activeEditingCell.rowId === i ? activeEditingCell.columnId : null
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
::v-deep(.bx--table-toolbar) {
	position: sticky;
	top: 3rem;
	z-index: 10;
	background-color: white;
}

table tr th {
	@apply pl-[32px];
}

::v-deep(.bx--data-table th:last-of-type) {
	width: 6rem;
}

::v-deep(.bx--number--lg.bx--number input[type='number']) {
	padding-right: 6rem;
}
</style>
