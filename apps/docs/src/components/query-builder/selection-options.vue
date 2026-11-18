<script setup lang="ts">
// @ts-expect-error carbon icons vue has incomplete type exports
import { Add16, Close16 } from '@carbon/icons-vue';
import { computed } from 'vue';
import { useTranslations, type Language } from '../../utils/i18n';
import type { Selection } from '../../utils/query-builder/query';
import type {
	BuilderField,
	BuilderSchema,
} from '../../utils/query-builder/schema';

const props = defineProps<{
	schema: BuilderSchema;
	field: BuilderField;
	selection: Selection;
	lang: Language;
}>();

const t = useTranslations(props.lang);

const filters = computed(() =>
	props.field.where ? (props.schema.filters[props.field.where] ?? []) : [],
);
const sortFields = computed(() =>
	props.field.sort ? (props.schema.sorts[props.field.sort] ?? []) : [],
);

const getOps = (field: string) =>
	filters.value.find((filter) => filter.field === field)?.ops ?? [];

const rows = computed(() =>
	props.selection.filters.map((filter) => ({
		filter,
		op: getOps(filter.field).find(({ name }) => name === filter.op),
	})),
);

function addFilter() {
	const [first] = filters.value;
	props.selection.filters.push({
		field: first.field,
		op: first.ops[0].name,
		value: '',
	});
}

function changeFilterField(index: number, field: string) {
	props.selection.filters[index] = {
		field,
		op: getOps(field)[0].name,
		value: '',
	};
}

const sortField = computed({
	get: () => props.selection.sort?.field ?? '',
	set: (field: string) => {
		props.selection.sort = field
			? { field, direction: props.selection.sort?.direction ?? 'ASC' }
			: undefined;
	},
});

const inputClass =
	'min-w-0 rounded border border-gray-300 bg-white px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-900';
</script>

<template>
	<div
		v-if="filters.length || sortFields.length || field.hasLimit"
		class="flex flex-col gap-1 rounded bg-gray-200 p-2 text-xs dark:bg-gray-800"
	>
		<div
			v-for="({ filter, op }, index) in rows"
			:key="index"
			class="flex flex-row items-center gap-1"
		>
			<select
				:class="inputClass"
				:value="filter.field"
				@change="
					changeFilterField(index, ($event.target as HTMLSelectElement).value)
				"
			>
				<option v-for="{ field: name } in filters" :key="name" :value="name">
					{{ name }}
				</option>
			</select>
			<select v-model="filter.op" :class="inputClass">
				<option
					v-for="{ name } in getOps(filter.field)"
					:key="name"
					:value="name"
				>
					{{ name }}
				</option>
			</select>
			<select
				v-if="op && schema.enums[op.type] && !op.isList"
				v-model="filter.value"
				:class="[inputClass, 'flex-1']"
			>
				<option
					v-for="value in schema.enums[op.type]"
					:key="value"
					:value="value"
				>
					{{ value }}
				</option>
			</select>
			<select
				v-else-if="op?.type === 'Boolean'"
				v-model="filter.value"
				:class="[inputClass, 'flex-1']"
			>
				<option value="true">true</option>
				<option value="false">false</option>
			</select>
			<input
				v-else
				v-model="filter.value"
				:class="[inputClass, 'flex-1']"
				:placeholder="op?.isList ? t.builderListPlaceholder : op?.type"
			/>
			<button
				class="cursor-pointer bg-transparent text-gray-500 hover:text-black dark:hover:text-white"
				:aria-label="t.builderRemoveFilter"
				@click="selection.filters.splice(index, 1)"
			>
				<Close16 />
			</button>
		</div>
		<button
			v-if="filters.length"
			class="flex cursor-pointer flex-row items-center gap-0.5 self-start bg-transparent text-blue-700 dark:text-blue-400"
			@click="addFilter"
		>
			<Add16 />{{ t.builderAddFilter }}
		</button>
		<div class="flex flex-row items-center gap-2">
			<label
				v-if="sortFields.length"
				class="flex min-w-0 flex-1 flex-row items-center gap-1"
			>
				{{ t.builderSort }}
				<select v-model="sortField" :class="[inputClass, 'flex-1']">
					<option value="">-</option>
					<option v-for="name in sortFields" :key="name" :value="name">
						{{ name }}
					</option>
				</select>
				<select
					v-if="selection.sort"
					v-model="selection.sort.direction"
					:class="inputClass"
				>
					<option value="ASC">↑</option>
					<option value="DESC">↓</option>
				</select>
			</label>
			<label v-if="field.hasLimit" class="flex flex-row items-center gap-1">
				{{ t.builderLimit }}
				<input
					:value="selection.limit"
					type="number"
					min="1"
					:class="[inputClass, 'w-14']"
					@input="
						selection.limit =
							Number(($event.target as HTMLInputElement).value) || undefined
					"
				/>
			</label>
		</div>
	</div>
</template>
