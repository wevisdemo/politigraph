<script setup lang="ts" generic="T extends { value: string; label: string }">
const model = defineModel<string[]>({ default: () => [] });
const keyword = ref('');

defineProps<{
	title: string;
	options: T[] | null | undefined;
}>();

const onSelect = (selectedId: string, options: T[] | null | undefined) => {
	if (!options?.some((o) => o.value === selectedId)) return;
	model.value = [...model.value, selectedId];
	keyword.value = '';
};

const onRemove = (id: string) => {
	model.value = model.value.filter((v) => v !== id);
};

const getLabel = (id: string, options: T[] | null | undefined) =>
	options?.find((o) => o.value === id)?.label ?? id;
</script>

<template>
	<div class="flex flex-col gap-3">
		<cv-combo-box
			v-model="keyword"
			:title="title"
			:options="options"
			item-value-key="value"
			item-text-key="label"
			auto-filter
			auto-highlight
			@update:model-value="(id: string) => onSelect(id, options)"
		/>

		<div class="flex flex-wrap gap-2">
			<cv-tag
				v-for="id in model"
				:key="id"
				:label="getLabel(id, options)"
				filter
				@remove="onRemove(id)"
			/>
		</div>
	</div>
</template>
