<script setup lang="ts">
// @ts-expect-error no declaration
import { Close16, Search16 } from '@carbon/icons-vue';
import { ref, watch } from 'vue';
import { nodeIconMap } from '../../constants/schema';
import { buildSearchQuery, queryFieldTypenameMap } from '../../utils/explore';
import { fetchGraphql } from '../../utils/graphql';
import { useTranslations, type Language } from '../../utils/i18n';
import { getObjectLabel, type GraphqlObject } from '../../utils/schema';
import Spinner from '../spinner.vue';

const SEARCH_DEBOUNCE_DELAY = 300;

interface ResultGroup {
	typename: string;
	nodes: GraphqlObject[];
}

const props = defineProps<{
	lang: Language;
	centerLabel?: string;
	loading?: boolean;
}>();

const t = useTranslations(props.lang);

const emit = defineEmits<{
	select: [node: GraphqlObject];
	clear: [];
}>();

const keyword = ref(props.centerLabel ?? '');
const groups = ref<ResultGroup[]>([]);
const isLoading = ref(false);
const isDropdownOpen = ref(false);
const errorMessage = ref('');

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let latestRequestId = 0;
let skipNextSearch = false;

watch(
	() => props.centerLabel,
	(label) => {
		if (!label || label === keyword.value) return;
		skipNextSearch = true;
		keyword.value = label;
		isDropdownOpen.value = false;
	},
);

watch(keyword, () => {
	if (skipNextSearch) {
		skipNextSearch = false;
		return;
	}

	clearTimeout(debounceTimer);
	errorMessage.value = '';

	if (!keyword.value.trim()) {
		groups.value = [];
		isDropdownOpen.value = false;
		return;
	}

	debounceTimer = setTimeout(search, SEARCH_DEBOUNCE_DELAY);
});

async function search() {
	const requestId = ++latestRequestId;

	isLoading.value = true;

	try {
		const { data } = await fetchGraphql(buildSearchQuery(), {
			keyword: keyword.value.trim(),
		});

		if (requestId !== latestRequestId) return;

		groups.value = Object.entries(data).flatMap(([field, nodes]) => {
			const typename = queryFieldTypenameMap.get(field);
			return typename && nodes.length > 0 ? [{ typename, nodes }] : [];
		});
		isDropdownOpen.value = true;
	} catch (error) {
		if (requestId !== latestRequestId) return;

		errorMessage.value = error instanceof Error ? error.message : `${error}`;
	} finally {
		if (requestId === latestRequestId) {
			isLoading.value = false;
		}
	}
}

function selectNode(node: GraphqlObject) {
	skipNextSearch = true;
	keyword.value = getObjectLabel(node, props.lang);
	isDropdownOpen.value = false;
	emit('select', node);
}

function clearSearch() {
	clearTimeout(debounceTimer);
	skipNextSearch = true;
	keyword.value = '';
	groups.value = [];
	isDropdownOpen.value = false;
	errorMessage.value = '';
	emit('clear');
}
</script>

<template>
	<div class="relative">
		<Search16
			class="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
		/>
		<input
			v-model="keyword"
			type="text"
			role="combobox"
			:aria-expanded="isDropdownOpen"
			:placeholder="t.searchPlaceholder"
			class="w-full rounded-full border border-gray-300 bg-white py-3 pl-12 pr-11 text-sm shadow-lg outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
			@focus="isDropdownOpen = groups.length > 0"
			@blur="isDropdownOpen = false"
		/>
		<Spinner
			v-if="isLoading || props.loading"
			class="absolute right-5 top-1/2 -translate-y-1/2"
		/>
		<button
			v-else-if="keyword"
			type="button"
			aria-label="Clear"
			title="Clear"
			class="absolute right-4 top-1/2 m-0 -translate-y-1/2 cursor-pointer rounded-full bg-transparent p-1 leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
			@mousedown.prevent="clearSearch()"
		>
			<Close16 />
		</button>
		<div
			v-if="isDropdownOpen"
			class="absolute z-10 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-gray-300 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
		>
			<ul
				v-for="group in groups"
				:key="group.typename"
				class="m-0 list-none p-0"
			>
				<li
					class="mt-0 px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-gray-400"
				>
					{{ group.typename }}
				</li>
				<li v-for="node in group.nodes" :key="node.id" class="mt-0">
					<button
						class="m-0 flex w-full cursor-pointer flex-row items-center gap-2 rounded-lg bg-transparent px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
						@mousedown.prevent="selectNode(node)"
					>
						<component
							:is="nodeIconMap.get(node.__typename)"
							class="shrink-0"
						/>
						<span class="flex-1">{{ getObjectLabel(node, lang) }}</span>
					</button>
				</li>
			</ul>
			<p
				v-if="!groups.length && !isLoading"
				class="m-0 px-3 py-2 text-sm italic text-gray-400"
			>
				{{ t.searchNoResults }}
			</p>
		</div>
		<p v-if="errorMessage" class="mt-2 text-sm text-red-500">
			{{ errorMessage }}
		</p>
	</div>
</template>
