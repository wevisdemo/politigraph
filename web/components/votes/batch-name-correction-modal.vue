<script setup lang="ts">
import type { Vote } from '@politigraph/graphql/genql';
import { closest } from 'fastest-levenshtein';

const props = defineProps<{
	visible: boolean;
	votes: Pick<Vote, 'id' | 'vote_order' | 'badge_number' | 'voter_name'>[];
	peopleOptions: {
		value: string;
		name: string;
	}[];
}>();

defineEmits<{
	(e: 'cancel'): void;
	(e: 'submit', values: { voteId: string; voterId: string }[]): void;
}>();

const peopleNames = computed(() => props.peopleOptions.map((p) => p.name));
const dataTable = computed(() =>
	props.votes
		.filter((vote) => vote.voter_name !== null)
		.map((vote) => ({
			...vote,
			suggestedName: closest(vote.voter_name!, peopleNames.value),
		})),
);

const selectedIds = ref<string[]>([]);

watchEffect(() => {
	if (props.visible) {
		selectAll();
	}
});

function selectAll() {
	selectedIds.value = props.votes.map((vote) => vote.id);
}

function getSubmitPayload() {
	return dataTable.value
		.filter((v) => selectedIds.value.includes(v.id))
		.map((v) => ({
			voteId: v.id,
			voterId: props.peopleOptions.find((p) => p.name === v.suggestedName)!
				.value,
		}));
}
</script>

<template>
	<cv-modal
		:visible
		size="lg"
		autoHideOff
		:primaryButtonDisabled="selectedIds.length === 0"
		@primary-click="$emit('submit', getSubmitPayload())"
		@secondary-click="$emit('cancel')"
		@modal-hide-request="$emit('cancel')"
	>
		<template v-slot:title>Review Suggested Name Corrections</template>
		<template v-slot:content>
			<p class="mb-4">
				We found {{ dataTable.length }} potential matches for the unrecognized
				names. Please review the suggestions and uncheck any that are incorrect.
			</p>
			<cv-data-table>
				<template #headings>
					<cv-data-table-heading>
						<cv-checkbox
							label="Select all"
							hide-label
							:checked="selectedIds.length === votes.length"
							@change="
								(value: boolean) => {
									if (value) {
										selectAll();
									} else {
										selectedIds = [];
									}
								}
							"
						/>
					</cv-data-table-heading>
					<cv-data-table-heading heading="ลำดับที่" />
					<cv-data-table-heading heading="เลขที่บัตร" />
					<cv-data-table-heading heading="Unrecognized Name" />
					<cv-data-table-heading heading="Suggested Correction" />
				</template>
				<template #data>
					<cv-data-table-row
						v-for="row in dataTable"
						:key="row.id"
						:value="row.id"
						:class="
							selectedIds.includes(row.id)
								? '[&>td]:bg-[#e8e8e8]'
								: '[&>td]:bg-[#fff]'
						"
					>
						<cv-data-table-cell
							><cv-checkbox
								:label="row.suggestedName"
								hide-label
								:checked="selectedIds.includes(row.id)"
								@change="
									(value: boolean) => {
										selectedIds = value
											? [...selectedIds, row.id]
											: selectedIds.filter((id) => id !== row.id);
									}
								"
						/></cv-data-table-cell>
						<cv-data-table-cell>{{ row.vote_order }}</cv-data-table-cell>
						<cv-data-table-cell>{{ row.badge_number }}</cv-data-table-cell>
						<cv-data-table-cell class="text-[#DA1E28]">{{
							row.voter_name
						}}</cv-data-table-cell>
						<cv-data-table-cell>{{ row.suggestedName }}</cv-data-table-cell>
					</cv-data-table-row>
				</template>
			</cv-data-table>
		</template>
		<template v-slot:secondary-button>Cancel</template>
		<template v-slot:primary-button
			>Replace {{ selectedIds.length }} selections</template
		>
	</cv-modal>
</template>
