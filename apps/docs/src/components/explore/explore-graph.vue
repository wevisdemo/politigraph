<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	buildCenterNodeQuery,
	buildRelationshipQuery,
	getRelationshipFields,
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
const relationshipNodes = ref<Record<string, GraphqlObject[]>>({});
const activeRelationship = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const relationshipFields = computed(() =>
	centerNode.value ? getRelationshipFields(centerNode.value.__typename) : [],
);

const graphData = computed<GraphqlDataResponse | null>(() => {
	if (!centerNode.value) return null;

	const nodes = relationshipNodes.value[activeRelationship.value];

	return {
		nodes: [
			{
				...centerNode.value,
				...(nodes ? { [activeRelationship.value]: nodes } : {}),
			},
		],
	};
});

const truncatedNodeCount = computed(() => {
	const totalCount = relationshipCounts.value[activeRelationship.value] ?? 0;
	return totalCount > RELATIONSHIP_NODES_LIMIT ? totalCount : 0;
});

async function exploreNode(node: GraphqlObject) {
	if (isLoading.value || node.id === centerNode.value?.id) return;

	isLoading.value = true;
	errorMessage.value = '';

	try {
		const { data } = await fetchGraphql(buildCenterNodeQuery(node.__typename), {
			id: node.id,
		});
		const [rawNode] = Object.values(data).flat();

		if (!rawNode) {
			throw new Error(`ไม่พบข้อมูลของ "${getObjectLabel(node, 'th')}"`);
		}

		const { node: parsedNode, relationshipCounts: counts } =
			parseCenterNode(rawNode);

		centerNode.value = parsedNode;
		relationshipCounts.value = counts;
		relationshipNodes.value = {};
		activeRelationship.value = '';

		const firstNonEmpty = Object.entries(counts).find(
			([, count]) => count > 0,
		)?.[0];

		if (firstNonEmpty) {
			activeRelationship.value = firstNonEmpty;
			await fetchRelationshipNodes(firstNonEmpty);
		}
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : `${error}`;
	} finally {
		isLoading.value = false;
	}
}

async function toggleRelationship(fieldName: string) {
	if (isLoading.value || !centerNode.value) return;

	activeRelationship.value = fieldName;

	if (
		relationshipNodes.value[fieldName] ||
		!relationshipCounts.value[fieldName]
	) {
		return;
	}

	isLoading.value = true;
	errorMessage.value = '';

	try {
		await fetchRelationshipNodes(fieldName);
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : `${error}`;
	} finally {
		isLoading.value = false;
	}
}

async function fetchRelationshipNodes(fieldName: string) {
	const { data } = await fetchGraphql(
		buildRelationshipQuery(centerNode.value!.__typename, fieldName),
		{ id: centerNode.value!.id },
	);
	const [rawNode] = Object.values(normalizeAliasedFields(data)).flat();
	const nodes = rawNode?.[fieldName];

	relationshipNodes.value = {
		...relationshipNodes.value,
		[fieldName]: Array.isArray(nodes) ? nodes : [],
	};
}
</script>

<template>
	<div class="flex flex-col gap-4">
		<NodeSearch @select="exploreNode" />
		<p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
		<template v-if="centerNode && graphData">
			<div class="flex flex-row flex-wrap items-center gap-2">
				<span class="text-sm text-gray-400">ความสัมพันธ์:</span>
				<button
					v-for="{ name, description } in relationshipFields"
					:key="name"
					:title="description"
					:disabled="!relationshipCounts[name] || isLoading"
					class="cursor-pointer rounded-full border px-3 py-0.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
					:class="
						name === activeRelationship
							? 'border-blue-700 bg-blue-700 text-white'
							: 'border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
					"
					@click="toggleRelationship(name)"
				>
					{{ name }} ({{ relationshipCounts[name] ?? 0 }})
				</button>
			</div>
			<p v-if="truncatedNodeCount" class="text-xs italic text-gray-400">
				แสดง {{ RELATIONSHIP_NODES_LIMIT }} รายการแรก จากทั้งหมด
				{{ truncatedNodeCount }} รายการ
			</p>
			<div class="relative">
				<QueryGraph
					:data="graphData"
					fillHeight
					labelLang="th"
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
