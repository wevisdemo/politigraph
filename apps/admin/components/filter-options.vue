<script setup lang="ts">
defineProps<{
	type: 'radio' | 'multi-select';
	label: string;
	name: string;
	options: { label: string; value: string }[];
}>();

const model = defineModel<string | string[]>();
</script>

<template>
	<cv-radio-group :legendText="label" vertical>
		<template v-if="type === 'radio'">
			<cv-radio-button
				v-for="opt in options"
				:key="opt.value"
				v-model="model"
				:name="name"
				:label="opt.label"
				:value="opt.value"
			/>
		</template>

		<template v-else-if="type === 'multi-select'">
			<cv-checkbox
				v-for="opt in options"
				:key="opt.value"
				:label="opt.label"
				:checked="Array.isArray(model) ? model.includes(opt.value) : false"
				@change="
					(checked: boolean) => {
						if (!Array.isArray(model)) return;
						model = checked
							? [...model, opt.value]
							: model.filter((value) => value !== opt.value);
					}
				"
			/>
		</template>
	</cv-radio-group>
</template>
