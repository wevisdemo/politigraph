<script setup lang="ts">
const props = defineProps<{
	statusOptions: { label: string; value: string }[];
	classificationOption: { label: string; value: string }[];
	assembliesOption: { label: string; value: string }[];
}>();

const filters = defineModel<{
	assembly: string;
	status: string;
	classification: string[];
}>('filters', { required: true });

const resetFilter = () => {
	filters.value.assembly = 'ALL';
	filters.value.status = 'ALL';
	filters.value.classification = [
		...props.classificationOption.map((c) => c.value),
	];
};
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="pb-4">
			<button @click="resetFilter" class="text-[#0F62FE] hover:cursor-pointer">
				Reset Filters
			</button>
		</div>
		<FilterOptions
			v-model="filters.assembly"
			label="Assembly"
			type="radio"
			name="vote-event-assembly-filter"
			:options="props.assembliesOption"
		/>

		<FilterOptions
			v-model="filters.status"
			label="Status"
			type="radio"
			name="vote-event-status-filter"
			:options="props.statusOptions"
		/>

		<FilterOptions
			v-model="filters.classification"
			label="Classification"
			type="multi-select"
			name="vote-event-classification-filter"
			:options="props.classificationOption"
		/>
	</div>
</template>
