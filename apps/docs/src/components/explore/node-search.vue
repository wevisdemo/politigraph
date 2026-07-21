<script setup lang="ts">
import { ref, watch } from 'vue';
import { nodeIconMap } from '../../constants/schema';
import { buildSearchQuery, searchableTypes } from '../../utils/explore';
import { fetchGraphql } from '../../utils/graphql';
import { getObjectLabel, type GraphqlObject } from '../../utils/schema';

const SEARCH_DEBOUNCE_DELAY = 300;

const emit = defineEmits<{
	select: [node: GraphqlObject];
}>();

const selectedTypeName = ref(searchableTypes[0].name);
const keyword = ref('');
const results = ref<GraphqlObject[]>([]);
const isLoading = ref(false);
const isDropdownOpen = ref(false);
const errorMessage = ref('');

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let latestRequestId = 0;
let skipNextSearch = false;

watch([keyword, selectedTypeName], () => {
	if (skipNextSearch) {
		skipNextSearch = false;
		return;
	}

	clearTimeout(debounceTimer);
	errorMessage.value = '';

	if (!keyword.value.trim()) {
		results.value = [];
		isDropdownOpen.value = false;
		return;
	}

	debounceTimer = setTimeout(search, SEARCH_DEBOUNCE_DELAY);
});

async function search() {
	const requestId = ++latestRequestId;
	const searchableType = searchableTypes.find(
		(type) => type.name === selectedTypeName.value,
	)!;

	isLoading.value = true;

	try {
		const { data } = await fetchGraphql(buildSearchQuery(searchableType), {
			keyword: keyword.value.trim(),
		});

		if (requestId !== latestRequestId) return;

		results.value = Object.values(data).flat();
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
	<div class="flex flex-col gap-2 sm:flex-row">
		<select
			v-model="selectedTypeName"
			class="rounded border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
			aria-label="Node type"
		>
			<option v-for="{ name } in searchableTypes" :key="name" :value="name">
				{{ name }}
			</option>
		</select>
		<div class="relative flex-1">
			<input
				v-model="keyword"
				type="text"
				role="combobox"
				:aria-expanded="isDropdownOpen"
				placeholder="พิมพ์คำค้นหา เช่น ชื่อบุคคล องค์กร หรือกฎหมาย"
				class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
				@focus="isDropdownOpen = results.length > 0"
				@blur="isDropdownOpen = false"
			/>
			<div
				v-if="isLoading"
				class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200"
			></div>
			<ul
				v-if="isDropdownOpen"
				class="absolute z-10 mt-1 flex max-h-80 w-full list-none flex-col overflow-y-auto rounded border border-gray-300 bg-white p-0 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			>
				<li v-for="node in results" :key="node.id" class="mt-0">
					<button
						class="m-0 flex w-full cursor-pointer flex-row items-center gap-2 bg-transparent px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
						@mousedown.prevent="selectNode(node)"
					>
						<component
							:is="nodeIconMap.get(node.__typename)"
							class="shrink-0"
						/>
						<span class="flex-1">{{ getObjectLabel(node, 'th') }}</span>
						<span
							class="rounded-full bg-blue-700 px-2 text-xs font-bold text-white"
							>{{ node.__typename }}</span
						>
					</button>
				</li>
				<li
					v-if="!results.length && !isLoading"
					class="mt-0 px-3 py-2 text-sm italic text-gray-400"
				>
					ไม่พบข้อมูลที่ตรงกับคำค้นหา
				</li>
			</ul>
		</div>
	</div>
	<p v-if="errorMessage" class="mt-2 text-sm text-red-500">
		{{ errorMessage }}
	</p>
</template>
