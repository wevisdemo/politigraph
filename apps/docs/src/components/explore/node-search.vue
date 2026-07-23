<script setup lang="ts">
import { ref, watch } from 'vue';
import { nodeIconMap } from '../../constants/schema';
import { buildSearchQuery, searchableTypes } from '../../utils/explore';
import { fetchGraphql } from '../../utils/graphql';
import { getObjectLabel, type GraphqlObject } from '../../utils/schema';

const SEARCH_DEBOUNCE_DELAY = 300;

interface ResultGroup {
	typename: string;
	nodes: GraphqlObject[];
}

const emit = defineEmits<{
	select: [node: GraphqlObject];
}>();

const keyword = ref('');
const groups = ref<ResultGroup[]>([]);
const isLoading = ref(false);
const isDropdownOpen = ref(false);
const errorMessage = ref('');

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let latestRequestId = 0;
let skipNextSearch = false;

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

		groups.value = Object.values(data)
			.map((nodes, index) => ({
				typename: searchableTypes[index].name,
				nodes,
			}))
			.filter((group) => group.nodes.length > 0);
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
	keyword.value = getObjectLabel(node, 'th');
	isDropdownOpen.value = false;
	emit('select', node);
}
</script>

<template>
	<div class="relative">
		<input
			v-model="keyword"
			type="text"
			role="combobox"
			:aria-expanded="isDropdownOpen"
			placeholder="พิมพ์คำค้นหา เช่น ชื่อบุคคล องค์กร หรือกฎหมาย"
			class="w-full rounded-full border border-gray-300 bg-white px-5 py-3 text-sm shadow-lg outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
			@focus="isDropdownOpen = groups.length > 0"
			@blur="isDropdownOpen = false"
		/>
		<div
			v-if="isLoading"
			class="absolute right-5 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200"
		></div>
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
						<span class="flex-1">{{ getObjectLabel(node, 'th') }}</span>
					</button>
				</li>
			</ul>
			<p
				v-if="!groups.length && !isLoading"
				class="m-0 px-3 py-2 text-sm italic text-gray-400"
			>
				ไม่พบข้อมูลที่ตรงกับคำค้นหา
			</p>
		</div>
		<p v-if="errorMessage" class="mt-2 text-sm text-red-500">
			{{ errorMessage }}
		</p>
	</div>
</template>
