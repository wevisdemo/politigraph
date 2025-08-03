<script setup lang="ts">
const props = defineProps<{
	type: 'radio' | 'multi-select';
	label: string;
	options: { label: string; value: string }[];
	modelValue: string | string[];
}>();

const emit = defineEmits(['update:modelValue']);

const model = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val),
});
</script>

<template>
	<div class="py-4">
		<label class="block pb-3 text-[#525252]">{{ label }}</label>

		<!-- Radio options -->
		<div v-if="type === 'radio'" class="flex flex-col gap-2">
			<label
				v-for="opt in options"
				:key="opt.value"
				class="flex items-center gap-1 hover:cursor-pointer"
			>
				<input
					type="radio"
					:value="opt.value"
					v-model="model"
					class="accent-black hover:cursor-pointer"
				/>
				{{ opt.label }}
			</label>
		</div>

		<!-- Multi-select -->
		<div v-else-if="type === 'multi-select'" class="flex flex-col gap-2">
			<label
				v-for="opt in options"
				:key="opt.value"
				class="block hover:cursor-pointer"
			>
				<input
					type="checkbox"
					:value="opt.value"
					v-model="model"
					class="accent-black hover:cursor-pointer"
				/>
				{{ opt.label }}
			</label>
		</div>
	</div>
</template>
