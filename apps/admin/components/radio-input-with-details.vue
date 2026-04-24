<script setup lang="ts">
const props = defineProps<{
	name: string;
	modelValue: string;
	value: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();
</script>

<template>
	<div class="cds--radio-button-wrapper flex flex-row items-start gap-2 py-1">
		<input
			:id="`${name}-${value}`"
			class="cds--radio-button mt-0.5"
			type="radio"
			:name="name"
			:value="value"
			:checked="modelValue === value"
			:disabled="disabled"
			@change="emit('update:modelValue', value)"
		/>
		<label
			:for="disabled ? undefined : `${name}-${value}`"
			class="cds--radio-button__label"
			:class="{ 'opacity-50': disabled }"
		>
			<span class="cds--radio-button__appearance"></span>
			<span class="flex flex-col leading-snug">
				<slot />
			</span>
		</label>
	</div>
</template>
