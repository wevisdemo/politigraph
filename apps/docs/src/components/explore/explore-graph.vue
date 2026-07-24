<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	buildCenterNodeQuery,
	mainNodeTypes,
	normalizeAliasedFields,
	pruneToMainLeaves,
} from '../../utils/explore';
import { fetchGraphql } from '../../utils/graphql';
import {
	getObjectLabel,
	type GraphqlDataResponse,
	type GraphqlObject,
} from '../../utils/schema';
import QueryGraph from '../query-graph.vue';
import NodeSearch from './node-search.vue';

const MAIN_NODE_COLOR = '#4466cc';
const SUB_NODE_COLOR = '#8899dd';
const EDGE_COLOR = '#dddddd';

const centerNode = ref<GraphqlObject | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const graphData = computed<GraphqlDataResponse | null>(() =>
	centerNode.value ? { nodes: [centerNode.value] } : null,
);

async function exploreNode(node: GraphqlObject) {
	if (isLoading.value || node.id === centerNode.value?.id) return;

	isLoading.value = true;
	errorMessage.value = '';

	try {
		const { data } = await fetchGraphql(buildCenterNodeQuery(node.__typename), {
			id: node.id,
		});
		const [rawNode] = Object.values(normalizeAliasedFields(data)).flat();

		if (!rawNode) {
			throw new Error(`ไม่พบข้อมูลของ "${getObjectLabel(node, 'th')}"`);
		}

		centerNode.value = pruneToMainLeaves(rawNode);
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : `${error}`;
	} finally {
		isLoading.value = false;
	}
}
</script>

<template>
	<div class="relative h-[calc(100vh-var(--sl-nav-height))] w-full">
		<QueryGraph
			v-if="centerNode && graphData"
			:data="graphData"
			immersive
			labelLang="th"
			:getNodeSizeScale="
				({ __typename }) => (mainNodeTypes.has(__typename) ? 0.8 : 0.4)
			"
			:getNodeColor="
				({ __typename }) =>
					mainNodeTypes.has(__typename) ? MAIN_NODE_COLOR : SUB_NODE_COLOR
			"
			:edgeColor="EDGE_COLOR"
			@node-select="exploreNode"
		/>
		<div
			v-else
			class="flex h-full items-center justify-center gap-2 bg-gray-100 px-6 text-center text-sm italic text-gray-400 dark:bg-gray-900"
		>
			<template v-if="isLoading">
				<div
					class="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200"
				></div>
				กำลังโหลดข้อมูล...
			</template>
		</div>

		<div
			class="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-2 p-4 transition-all duration-500"
			:class="centerNode ? 'top-0' : 'top-1/2 -translate-y-1/2'"
		>
			<p
				v-if="!centerNode && !isLoading"
				class="text-center text-sm italic text-gray-400"
			>
				ค้นหาและเลือกโหนดที่ต้องการ เพื่อสำรวจข้อมูลโดยรอบในรูปแบบกราฟ
			</p>
			<NodeSearch
				class="pointer-events-auto w-full max-w-md"
				@select="exploreNode"
			/>
			<p
				v-if="errorMessage"
				class="pointer-events-auto rounded bg-red-500 px-3 py-1 text-sm text-white shadow"
			>
				{{ errorMessage }}
			</p>
		</div>

		<div
			v-if="isLoading && centerNode"
			class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-black/50"
		>
			<div
				class="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200"
			></div>
		</div>
	</div>
</template>
