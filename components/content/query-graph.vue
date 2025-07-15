<script setup lang="ts">
import { schemeTableau10 } from 'd3-scale-chromatic';
import {
	defineConfigs,
	type Edges,
	type VNetworkGraphInstance,
} from 'v-network-graph';
import {
	ForceLayout,
	type ForceEdgeDatum,
	type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout';

interface GraphqlObject {
	__typename: string;
	id: string;
	[key: string]: string | GraphqlObject[];
}

interface Edge {
	id: string;
	source: string;
	target: string;
	label?: string;
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
		normal: {
			color: getObjectColor,
		},
		hover: {
			color: getObjectColor,
		},
		label: {
			text: (obj) => obj.id,
		},
	},
	edge: {
		normal: {
			width: 1,
			color: '#bbb',
		},
		hover: {
			width: 1,
			color: '#bbb',
		},
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
		// insert __typename field in every object
		query: props.query.replaceAll('{', '{ __typename'),
		variables: props.variables,
	}),
	server: false,
	lazy: true,
});

const { data: schema } = await useFetch('/schema.json');

const graph = computed(() => {
	const nodes: Record<string, GraphqlObject> = {};
	const edges: Edges = {};

	if (!response.value) {
		return { nodes, edges };
	}

	const initialNodes = Object.values(response.value.data).find(
		(value) => typeof value !== 'string',
	);

	if (!initialNodes) {
		return { nodes, edges };
	}

	function collectGraphItems(node: GraphqlObject) {
		if (nodes[node.id]) return;

		nodes[node.id] = node;

		Object.values(node).forEach((value) => {
			if (Array.isArray(value)) {
				value
					.sort((a, z) => a.id.localeCompare(z.id))
					.forEach((child) => {
						if (edges[`${child.id}->${node.id}`]) return;

						edges[`${node.id}->${child.id}`] = {
							source: node.id,
							target: child.id,
						};
						collectGraphItems(child);
					});
			}
		});
	}

	initialNodes.forEach(collectGraphItems);
	selectedNodes.value = [initialNodes[0].id];

	return { nodes, edges };
});

const graphElement = ref<VNetworkGraphInstance>();
const selectedNodes = ref<string[]>([]);

const selectedNode = computed(() => {
	if (!selectedNodes.value.length) return null;

	const node = graph.value.nodes[selectedNodes.value[0]];

	return {
		schema: typenameSchemaMap.value.get(node.__typename)!,
		fields: Object.entries(node).filter(([key]) => key !== '__typename'),
	};
});

const typenameSchemaMap = computed(
	() =>
		new Map(
			schema.value?.objects.map((obj, i) => [
				obj.name,
				{
					...obj,
					description: obj.description?.split('อ้างอิงจาก').at(0)?.trim(),
					color: schemeTableau10[i],
				},
			]),
		),
);

function getObjectColor({ __typename }: GraphqlObject) {
	return typenameSchemaMap.value?.get(__typename)?.color ?? '#222';
}
</script>

<template>
	<div class="relative">
		<GraphBaseView :graphElement>
			<v-network-graph
				ref="graphElement"
				:configs
				:nodes="graph.nodes"
				:edges="graph.edges"
				v-model:selected-nodes="selectedNodes"
			/>
			<template v-slot:legend>
				<GraphLegend
					v-for="obj in typenameSchemaMap
						.values()
						.filter((obj) =>
							Object.values(graph.nodes).some((n) => n.__typename === obj.name),
						)"
					:term="obj.name"
					:definition="obj.description"
					:borderColor="obj.color"
					:backgroundColor="obj.color"
					circle
				/>
			</template>
			<template v-slot:sidebar>
				<template v-if="selectedNode">
					<cv-tag
						small
						:label="selectedNode.schema.name"
						class="m-0 place-self-start font-bold text-white"
						:style="{ backgroundColor: selectedNode.schema.color }"
					/>
					<p class="text-sm text-gray-400">
						{{ selectedNode.schema.description }}
					</p>
					<ul class="flex flex-col">
						<li
							v-for="[key, value] in selectedNode.fields"
							:key="key"
							class="border-t border-gray-700 py-2 leading-normal"
						>
							<cv-definition-tooltip
								alignment="start"
								:term="key"
								:definition="
									selectedNode.schema.fields.find((field) => field.name === key)
										?.description
								"
							>
								<template v-slot:term>
									<span class="font-bold text-white">{{ key }}:</span>
								</template>
							</cv-definition-tooltip>
							{{ ' ' }}
							<span v-if="value === null" class="text-gray-400 italic"
								>null</span
							>
							<template v-else-if="typeof value === 'string'">
								{{ value }}
							</template>
							<ul v-else>
								<li v-for="node in value" class="ml-4 list-disc">
									<button
										class="cursor-pointer text-blue-400"
										@click="selectedNodes = [node.id]"
									>
										{{ node.id }}
									</button>
								</li>
							</ul>
						</li>
					</ul>
					<p class="mt-auto text-xs leading-tight text-gray-400 italic">
						*Only interesting fields are shown. Full list can be found in the
						<a href="/docs/schema" class="text-blue-400">schema</a> page
					</p>
				</template>
				<p v-else class="m-auto text-center text-sm text-gray-400 italic">
					Select a data node to see more details
				</p>
			</template>
		</GraphBaseView>
		<div
			v-if="status !== 'success'"
			class="absolute inset-0 flex items-center justify-center bg-white/50"
		>
			<cv-loading active />
		</div>
	</div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

td {
	@apply border border-gray-600 px-2 py-1 leading-normal break-all;
}
</style>
