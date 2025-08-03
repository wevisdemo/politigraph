<script setup lang="ts">
import type { PublishStatus, VoteEventType } from '~/.genql';

const props = defineProps<{
	filters: {
		assembly: string;
		status: string;
		classification: string[];
	};
	statusOptions: { label: string; value: string }[];
	classificationOption: { label: string; value: string }[];
	assembliesOption: { label: string; value: string }[];
}>();

const emit = defineEmits<{
	(e: 'update:filters', value: typeof props.filters): void;
}>();

watch(
	props.filters,
	(newVal) => {
		emit('update:filters', newVal);
	},
	{ deep: true },
);

const resetFilter = () => {
	props.filters.assembly = 'ALL';
	props.filters.status = 'ALL';
	props.filters.classification = [];
};
</script>

<template>
	<div class="flex flex-col">
		<div class="pb-4">
			<button @click="resetFilter" class="text-[#0F62FE] hover:cursor-pointer">
				Reset Filters
			</button>
		</div>
		<VoteEventFilterControl
			v-model="filters.assembly"
			label="Assembly"
			type="radio"
			:options="props.assembliesOption"
		/>

		<VoteEventFilterControl
			v-model="filters.status"
			label="Status"
			type="radio"
			:options="props.statusOptions"
		/>

		<VoteEventFilterControl
			v-model="filters.classification"
			label="Classification"
			type="multi-select"
			:options="props.classificationOption"
		/>
	</div>
</template>
