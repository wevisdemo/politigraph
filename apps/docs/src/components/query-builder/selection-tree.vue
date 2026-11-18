<script setup lang="ts">
import { computed } from 'vue';
import { nodeIconMap } from '../../constants/schema';
import type { Language } from '../../utils/i18n';
import {
	createSelection,
	FRAGMENT_PREFIX,
	type Selection,
} from '../../utils/query-builder/query';
import type {
	BuilderField,
	BuilderSchema,
} from '../../utils/query-builder/schema';
import SelectionOptions from './selection-options.vue';

const props = defineProps<{
	schema: BuilderSchema;
	typename: string;
	selection: Selection;
	lang: Language;
}>();

const items = computed(() => {
	const type = props.schema.types[props.typename];

	return [
		...type.fields.map((field) => ({ key: field.name, field })),
		...type.possibleTypes.map((name) => ({
			key: `${FRAGMENT_PREFIX}${name}`,
			field: {
				name,
				description: props.schema.types[name].description,
				type: name,
				isList: false,
				isNode: true,
				hasLimit: false,
			} satisfies BuilderField,
		})),
	];
});

function toggle(key: string, field: BuilderField) {
	if (props.selection.fields[key]) {
		delete props.selection.fields[key];
	} else {
		props.selection.fields[key] = createSelection(field);
	}
}
</script>

<template>
	<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
		<li v-for="{ key, field } in items" :key="key" class="m-0">
			<label
				class="flex cursor-pointer flex-row items-center gap-1.5 text-sm"
				:title="field.description"
			>
				<input
					type="checkbox"
					:checked="key === 'id' || !!selection.fields[key]"
					:disabled="key === 'id'"
					@change="toggle(key, field)"
				/>
				<component
					:is="nodeIconMap.get(field.type)"
					v-if="nodeIconMap.has(field.type)"
					class="shrink-0"
				/>
				<span
					:class="{
						'font-bold': field.isNode,
						italic: key.startsWith(FRAGMENT_PREFIX),
					}"
					>{{ key }}</span
				>
				<span class="text-xs text-gray-400"
					>{{ field.isList ? `[${field.type}]` : field.type }}
				</span>
			</label>
			<div
				v-if="field.isNode && selection.fields[key]"
				class="ml-1.5 mt-1 flex flex-col gap-1 border-l border-gray-300 pl-3 dark:border-gray-700"
			>
				<SelectionOptions
					:schema="schema"
					:field="field"
					:selection="selection.fields[key]"
					:lang="lang"
				/>
				<SelectionTree
					:schema="schema"
					:typename="field.type"
					:selection="selection.fields[key]"
					:lang="lang"
				/>
			</div>
		</li>
	</ul>
</template>
