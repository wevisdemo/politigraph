<script setup lang="ts">
import { Close16 } from '@carbon/icons-vue';

withDefaults(
	defineProps<{
		modelValue?: Date | string | null;
		label?: string;
		placeholder?: string;
		clearable?: boolean;
	}>(),
	{ modelValue: null, label: '', placeholder: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const handleInputChange = (event: Event) => {
	if (!(event.target as HTMLInputElement).value)
		emit('update:modelValue', null);
};
</script>

<template>
	<div class="relative">
		<cv-date-picker
			kind="single"
			:date-label="label"
			:placeholder="placeholder"
			:model-value="modelValue ?? ''"
			:cal-options="{ dateFormat: 'Y-m-d' }"
			@update:model-value="
				(value: string) => emit('update:modelValue', value || null)
			"
			@change="handleInputChange"
		/>
		<button
			v-if="clearable && modelValue"
			type="button"
			class="absolute bottom-3 right-10 flex size-4 cursor-pointer"
			@click="emit('update:modelValue', null)"
		>
			<Close16 />
		</button>
	</div>
</template>
