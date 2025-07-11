<script setup lang="ts">
import {
	defineConfigs,
	type Edge,
	type Edges,
	type VNetworkGraphInstance,
} from 'v-network-graph';
import {
	ForceLayout,
	type ForceEdgeDatum,
	type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout';

interface GraphqlObject {
	id: string;
	[key: string]: string | GraphqlObject[];
}

const props = defineProps<{
	query: string;
	variables: Record<string, unknown>;
}>();

const configs = defineConfigs<GraphqlObject>({
	view: {
		layoutHandler: new ForceLayout({
			positionFixedByDrag: false,
			positionFixedByClickWithAltKey: true,
			createSimulation: (d3, nodes, edges) =>
				d3
					.forceSimulation(nodes)
					.force(
						'edge',
						d3
							.forceLink<ForceNodeDatum, ForceEdgeDatum>(edges)
							.id((d: Edge) => d.id)
							.distance(100),
					)
					.force('charge', d3.forceManyBody())
					.force('collide', d3.forceCollide(50).strength(0.2))
					.force('center', d3.forceCenter().strength(0.05))
					.alphaMin(0.001),
		}),
	},
	node: {
		selectable: true,
	},
});

const { data: response, status } = await useFetch<{
	data: Record<string, GraphqlObject[]>;
}>('/graphql', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		query: props.query,
		variables: props.variables,
	}),
	server: false,
	lazy: true,
});

const graph = computed(() => {
	const nodes: Record<string, GraphqlObject> = {};
	const edges: Edges = {};

	if (!response.value) {
		return { nodes, edges };
	}

	function collectGraphItems(node: GraphqlObject) {
		nodes[node.id] = node;

		Object.values(node).forEach((value) => {
			if (Array.isArray(value)) {
				value.forEach((child) => {
					edges[`${node.id}-${child.id}`] = {
						source: node.id,
						target: child.id,
					};
					collectGraphItems(child);
				});
			}
		});
	}

	Object.values(response.value.data)[0].forEach(collectGraphItems);

	return { nodes, edges };
});

const graphElement = ref<VNetworkGraphInstance>();
</script>

<template>
	<div class="relative">
		<GraphBaseView :graphElement>
			<v-network-graph
				ref="graphElement"
				:configs
				:nodes="graph.nodes"
				:edges="graph.edges"
			/>
			<template v-slot:sidebar>WIP</template>
		</GraphBaseView>
		<div
			v-if="status !== 'success'"
			class="absolute inset-0 flex items-center justify-center bg-white/50"
		>
			<cv-loading active />
		</div>
	</div>
</template>
