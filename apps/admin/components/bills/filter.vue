<script setup lang="ts">
const props = defineProps<{
	statusOptions: { label: string; value: string }[];
	creatorTypeOptions: { label: string; value: string }[];
	organizationOption: { label: string; value: string }[];
}>();

const filters = defineModel<{
	organization: string;
	status: string;
	creatorType: string[];
}>('filters', { required: true });

const resetFilter = () => {
	filters.value.organization = 'ALL';
	filters.value.status = 'ALL';
	filters.value.creatorType = [...props.creatorTypeOptions.map((c) => c.value)];
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
			v-model="filters.organization"
			label="Propose in Representative Term"
			type="radio"
			name="bills-organization-filter"
			:options="props.organizationOption"
		/>

		<FilterOptions
			v-model="filters.status"
			label="Status"
			type="radio"
			name="bills-status-filter"
			:options="props.statusOptions"
		/>

		<FilterOptions
			v-model="filters.creatorType"
			label="Creator Type"
			type="multi-select"
			name="bills-creator-type-filter"
			:options="props.creatorTypeOptions"
		/>
	</div>
</template>
