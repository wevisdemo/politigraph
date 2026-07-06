<script setup lang="ts">
const props = defineProps<{
	statusOptions: { label: string; value: string }[];
	membershipOptions: { label: string; value: string }[];
}>();

const filters = defineModel<{
	status: string;
	membership: string;
}>('filters', { required: true });

const resetFilter = () => {
	filters.value.status = 'ALL';
	filters.value.membership = 'ALL';
};
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="pb-4">
			<button class="text-[#0F62FE] hover:cursor-pointer" @click="resetFilter">
				Reset Filters
			</button>
		</div>
		<FilterOptions
			v-model="filters.membership"
			label="Membership"
			type="radio"
			name="people-membership-filter"
			:options="props.membershipOptions"
		/>
		<FilterOptions
			v-model="filters.status"
			label="Status"
			type="radio"
			name="people-status-filter"
			:options="props.statusOptions"
		/>
	</div>
</template>
