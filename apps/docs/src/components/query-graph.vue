<script setup lang="ts">
import {
	defineConfigs,
	VNetworkGraph,
	type Edges,
	type Layouts,
	type VNetworkGraphInstance,
} from 'v-network-graph';
import 'v-network-graph/lib/style.css';
import {
	ForceLayout,
	type ForceEdgeDatum,
	type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout';
import { computed, onMounted, ref } from 'vue';
import { nodeIconMap } from '../constants/schema';
import {
	objects,
	type GraphqlDataResponse,
	type GraphqlObject,
} from '../utils/schema';
import BaseView from './graph/base-view.vue';
import Legend from './graph/legend.vue';

interface Edge {
	id: string;
	source: string;
	target: string;
	label?: string;
}

const MAX_GRAPH_LABEL_LENGTH = 20;

const props = defineProps<{
	data: GraphqlDataResponse;
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
							.distance(50),
					)
					.force('charge', d3.forceManyBody())
					.force('collide', d3.forceCollide(10).strength(0.2))
					.force('center', d3.forceCenter().strength(0.5))
					.alphaMin(0.8),
		}),
	},
	node: {
		selectable: true,
		normal: {
			radius: 14,
		},
		label: {
			fontSize: 10,
			text: (obj) => {
				const label = getObjectLabel(obj);
				return label.length > MAX_GRAPH_LABEL_LENGTH
					? `${label.slice(0, MAX_GRAPH_LABEL_LENGTH).trim()}...`
					: label;
			},
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
		marker: {
			source: {
				type: 'none',
			},
			target: {
				type: 'arrow',
			},
		},
	},
});

onMounted(() => {
	setTimeout(() => {
		graphElement.value?.fitToContents();
	}, 100);
});

const graph = computed(() => {
	const nodes: Record<string, GraphqlObject> = {};
	const edges: Edges = {};
	const layouts: Layouts = { nodes: {} };

	const initialNodes = Object.values(props.data).find(
		(value) => typeof value !== 'string',
	);

	if (!initialNodes) {
		return { nodes, edges };
	}

	function collectGraphItems(
		node: GraphqlObject,
		siblingIndex: number,
		siblingCount: number,
		r = 1,
		minTheta = 0,
		maxTheta = 2 * Math.PI,
	) {
		const coneSize = (maxTheta - minTheta) / siblingCount;
		const theta = minTheta + coneSize * siblingIndex;

		nodes[node.id] = node;
		layouts.nodes[node.id] = { x: r * Math.cos(theta), y: r * Math.sin(theta) };

		Object.values(node).forEach((value) => {
			if (Array.isArray(value)) {
				value
					.sort((a, z) => a.id.localeCompare(z.id))
					.forEach((child, i) => {
						edges[`${node.id}->${child.id}`] = {
							source: node.id,
							target: child.id,
						};

						if (!nodes[child.id]) {
							collectGraphItems(
								child,
								i,
								value.length,
								r + 50,
								theta - coneSize / 2,
								theta + coneSize / 2,
							);
						}
					});
			}
		});
	}

	initialNodes.forEach((node, i) =>
		collectGraphItems(node, i, initialNodes.length),
	);
	selectedNodes.value = [initialNodes[0].id];

	return { nodes, edges, layouts };
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
			objects.map((obj) => [
				obj.name,
				{
					...obj,
					description: obj.description?.split('อ้างอิงจาก').at(0)?.trim(),
				},
			]),
		),
);

function getObjectLabel(obj: GraphqlObject) {
	return (obj.name_en ||
		obj.name ||
		obj.label ||
		obj.nickname ||
		obj.title ||
		obj.note ||
		obj.option_en ||
		obj.option ||
		(obj.start_date
			? `${getShortDateString(obj.start_date)} - ${getShortDateString(obj.end_date)}`
			: '')) as string;
}

function getShortDateString(date: unknown) {
	return typeof date === 'string'
		? new Date(date).toLocaleDateString('TH-th', { dateStyle: 'short' })
		: 'now';
}
</script>

<template>
	<div class="relative">
		<BaseView :graphElement>
			<VNetworkGraph
				ref="graphElement"
				:configs
				:nodes="graph.nodes"
				:edges="graph.edges"
				:layouts="graph.layouts"
				v-model:selected-nodes="selectedNodes"
			>
				<template #override-node="{ nodeId, scale, config, ...slotProps }">
					<circle
						:r="config.radius * scale"
						:fill="config.color"
						v-bind="slotProps"
					/>
					<component
						:is="nodeIconMap.get(graph.nodes[nodeId].__typename)"
						class="fill-white"
						:style="{
							transform: `translate(${-8 * scale}px, ${-8 * scale}px) scale(${scale})`,
						}"
					></component>
				</template>
			</VNetworkGraph>
			<template v-slot:legend>
				<Legend
					v-for="obj in typenameSchemaMap
						.values()
						.filter((obj) =>
							Object.values(graph.nodes).some((n) => n.__typename === obj.name),
						)"
					:term="obj.name"
					:definition="obj.description"
					circle
				/>
			</template>
			<template v-slot:sidebar>
				<template v-if="selectedNode">
					<span
						class="m-0 place-self-start rounded-full bg-blue-700 px-2 text-sm font-bold text-white"
						>{{ selectedNode.schema.name }}</span
					>
					<p class="text-xs text-gray-400">
						{{ selectedNode.schema.description }}
					</p>
					<ul class="mt-0 flex list-none flex-col p-0 text-sm">
						<li
							v-for="[key, value] in selectedNode.fields"
							:key="key"
							class="mt-0 break-all border-t border-gray-700 pb-1 pt-2 leading-normal"
						>
							<!-- selectedNode.schema.fields.find((field) => field.name === key)
							?.description -->
							<span class="font-bold text-white">{{ key }}:</span>
							{{ ' ' }}
							<span v-if="value === null" class="italic text-gray-400"
								>null</span
							>
							<template v-else-if="typeof value === 'string'">
								{{ value }}
							</template>
							<ul v-else class="mt-1 flex list-none flex-col p-0">
								<li v-for="node in value" class="ml-6 mt-0 list-disc">
									<span
										class="cursor-pointer text-left text-blue-400"
										@click="selectedNodes = [node.id]"
									>
										{{ getObjectLabel(node) }}
									</span>
								</li>
							</ul>
						</li>
					</ul>
					<p class="mt-auto text-xs italic leading-tight text-gray-400">
						*Only showing nodes, properties, and relationships from the query
						<a href="/docs/schema" class="text-blue-400">see full schema</a>
					</p>
				</template>
				<p v-else class="m-auto text-center text-sm italic text-gray-400">
					Select any node to see the description and properties
				</p>
			</template>
		</BaseView>
	</div>
</template>
