<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	buildCenterNodeQuery,
	normalizeAliasedFields,
	parseCenterNode,
	RELATIONSHIP_NODES_LIMIT,
} from '../../utils/explore';
import { fetchGraphql } from '../../utils/graphql';
import {
	getObjectLabel,
	type GraphqlDataResponse,
	type GraphqlObject,
} from '../../utils/schema';
import QueryGraph from '../query-graph.vue';
import NodeSearch from './node-search.vue';

const centerNode = ref<GraphqlObject | null>(null);
const relationshipCounts = ref<Record<string, number>>({});
const isLoading = ref(false);
const errorMessage = ref('');

const graphData = computed<GraphqlDataResponse | null>(() =>
	centerNode.value ? { nodes: [centerNode.value] } : null,
);

const truncatedRelationships = computed(() =>
	Object.entries(relationshipCounts.value)
		.filter(([, count]) => count > RELATIONSHIP_NODES_LIMIT)
		.map(([name, count]) => `${name} (${count})`),
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

		const { node: parsedNode, relationshipCounts: counts } =
			parseCenterNode(rawNode);

		centerNode.value = parsedNode;
		relationshipCounts.value = counts;
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : `${error}`;
	} finally {
		isLoading.value = false;
	}
}
</script>

<template>
	<div class="flex flex-col gap-4">
		<NodeSearch @select="exploreNode" />
		<p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
		<template v-if="centerNode && graphData">
			<p
				v-if="truncatedRelationships.length"
				class="text-xs italic text-gray-400"
			>
				แสดงเฉพาะ {{ RELATIONSHIP_NODES_LIMIT }} รายการแรกของความสัมพันธ์
				{{ truncatedRelationships.join(', ') }}
			</p>
			<div class="relative">
				<QueryGraph
					:data="graphData"
					fillHeight
					labelLang="th"
					:sizeScale="0.6"
					@node-select="exploreNode"
				/>
				<div
					v-if="isLoading"
					class="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50"
				>
					<div
						class="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200"
					></div>
				</div>
			</div>
		</template>
		<div
			v-else-if="isLoading"
			class="flex flex-row items-center gap-2 text-sm italic text-gray-400"
		>
			<div
				class="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200"
			></div>
			กำลังโหลดข้อมูล...
		</div>
		<p v-else class="text-sm italic text-gray-400">
			ค้นหาและเลือกโหนดที่ต้องการ เพื่อสำรวจข้อมูลโดยรอบในรูปแบบกราฟ
		</p>
	</div>
</template>
