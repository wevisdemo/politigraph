<script setup lang="ts">
import { TrashCan16, WarningFilled16 } from '@carbon/icons-vue';
import type { Vote } from '@politigraph/graphql/genql';
import type { PeopleOption } from '~/composables/use-people-options';
import { standardVoteOptions } from '~/constants/votes';

type EditableVoteFields =
	'vote_order' | 'badge_number' | 'voter_party' | 'option';

const props = defineProps<{
	row: Pick<
		Vote,
		| 'id'
		| 'vote_order'
		| 'voter_name_raw'
		| 'voter_party'
		| 'option'
		| 'badge_number'
	>;
	index: number;
	total: number;
	activeColumn: number | null;
	rowClass: string;
	isNew: boolean;
	isVoterCellEdited: boolean;
	isOptionCellEdited: boolean;
	selectedVoterId: string;
	voterLabel: string;
	voterOptions?: PeopleOption[];
}>();

const emit = defineEmits<{
	(e: 'startEditing', rowId: string, columnId: number): void;
	(e: 'edited', rowColumnId: [string, EditableVoteFields]): void;
	(e: 'voterSelected', rowVoterId: [string, string]): void;
	(e: 'deleted', id: string): void;
}>();

const isLast = computed(() => props.index === props.total - 1);
const tooltipDirection = computed(() => (isLast.value ? 'top' : 'bottom'));
const isVoterInvalid = computed(
	() => !props.selectedVoterId && !props.isVoterCellEdited && !props.isNew,
);
</script>

<template>
	<cv-data-table-row
		:value="row.id"
		:data-last-row="isLast ? true : null"
		:class="rowClass"
		class="scroll-m-24"
	>
		<cv-data-table-cell @click="emit('startEditing', row.id, 0)">
			<cv-text-input
				v-model="row.vote_order"
				placeholder="Enter Order No."
				type="text"
				style="background: transparent; border: none"
				@change="emit('edited', [row.id, 'vote_order'])"
			/>
		</cv-data-table-cell>
		<cv-data-table-cell @click="emit('startEditing', row.id, 1)">
			<cv-text-input
				v-model="row.badge_number"
				placeholder="Enter ID No."
				type="text"
				style="background: transparent; border: none"
				@change="emit('edited', [row.id, 'badge_number'])"
			/>
		</cv-data-table-cell>
		<cv-data-table-cell
			:class="{ 'text-[#DA1E28]': isVoterInvalid }"
			@click="emit('startEditing', row.id, 2)"
		>
			<div v-if="activeColumn === 2">
				<cv-combo-box
					:model-value="selectedVoterId"
					:label="row.voter_name_raw || 'Select voter name'"
					:options="voterOptions ?? []"
					item-value-key="value"
					item-text-key="label"
					auto-filter
					auto-highlight
					@change="
						(voterId: string) => emit('voterSelected', [row.id, voterId])
					"
				/>
			</div>
			<div v-else class="flex items-center gap-2 pl-4">
				<p :class="{ 'text-[#707070]': !row.voter_name_raw }">
					{{ voterLabel || row.voter_name_raw || 'Select voter name' }}
				</p>
				<cv-tooltip
					v-if="isVoterInvalid"
					:direction="tooltipDirection"
					tip="Invalid name. Select a voter from the list."
				>
					<WarningFilled16 class="inline-block" style="fill: #da1e28" />
				</cv-tooltip>
				<cv-tooltip
					v-if="isVoterCellEdited"
					:direction="tooltipDirection"
					tip="Unsaved change"
				>
					<WarningFilled16 class="inline-block" style="fill: #ff8300" />
				</cv-tooltip>
			</div>
		</cv-data-table-cell>
		<cv-data-table-cell @click="emit('startEditing', row.id, 3)">
			<cv-text-input
				v-model="row.voter_party"
				placeholder="Enter Party"
				type="text"
				style="background: transparent; border: none"
				@change="emit('edited', [row.id, 'voter_party'])"
			/>
		</cv-data-table-cell>
		<cv-data-table-cell @click="emit('startEditing', row.id, 4)">
			<div v-if="activeColumn === 4">
				<cv-dropdown
					v-model="row.option"
					:up="index >= total - 5"
					light
					@change="nextTick(() => emit('edited', [row.id, 'option']))"
				>
					<cv-dropdown-item
						v-for="item in standardVoteOptions"
						:key="`${item}`"
						:value="`${item}`"
					>
						{{ item }}
					</cv-dropdown-item>
				</cv-dropdown>
			</div>
			<div v-else class="flex items-center pl-4">
				<div v-if="row.option" class="flex flex-row items-center gap-2">
					<p>{{ row.option }}</p>
					<cv-tooltip
						v-if="!standardVoteOptions.includes(row.option)"
						:direction="tooltipDirection"
						alignment="end"
						tip="Unexpected value"
					>
						<WarningFilled16 class="inline-block" style="fill: #da1e28" />
					</cv-tooltip>
				</div>
				<p v-else class="text-[#707070]">Chose...</p>
				<cv-tooltip
					v-if="isOptionCellEdited"
					:direction="tooltipDirection"
					tip="Unsaved change"
				>
					<WarningFilled16 class="inline-block" style="fill: #ff8300" />
				</cv-tooltip>
			</div>
		</cv-data-table-cell>
		<cv-data-table-cell align="right">
			<cv-icon-button
				label="ลบ"
				kind="ghost"
				:icon="TrashCan16"
				class="p-0"
				@click="emit('deleted', row.id)"
			/>
		</cv-data-table-cell>
	</cv-data-table-row>
</template>
