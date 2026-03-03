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
	<div class="flex flex-col">
		<div class="pb-4">
			<button @click="resetFilter" class="text-[#0F62FE] hover:cursor-pointer">
				Reset Filters
			</button>
		</div>
		<BillsFilterControl
			v-model="filters.organization"
			label="Propose in Representative Term"
			type="radio"
			:options="props.organizationOption"
		/>

		<BillsFilterControl
			v-model="filters.status"
			label="Status"
			type="radio"
			:options="props.statusOptions"
		/>

		<BillsFilterControl
			v-model="filters.creatorType"
			label="Creator Type"
			type="multi-select"
			:options="props.creatorTypeOptions"
		/>
	</div>
</template>
