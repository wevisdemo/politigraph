<script setup lang="tsx">
//@ts-ignore
import { Maximize16, Minimize16 } from '@carbon/icons-vue';
import dagre from 'dagre';
import {
	defineConfigs,
	type Layouts,
	type VNetworkGraphInstance,
} from 'v-network-graph';
import 'v-network-graph/lib/style.css';
import type { SchemaNode } from '~/server/routes/schema.json';

interface Edge {
	id: string;
	source: string;
	target: string;
	isAbstracted?: boolean;
	label?: string;
}

const GraphicColor = {
	Foreground: '#4466cc',
	Disabled: '#aaccff',
	Background: '#f3f4f6',
};

const { data } = await useFetch('/schema.json');

const configs = defineConfigs<SchemaNode, Edge>({
	view: {
		autoPanAndZoomOnLoad: 'fit-content',
		fitContentMargin: '5%',
		scalingObjects: true,
	},
	node: {
		selectable: true,
		normal: {
			type: 'rect',
			width: 100,
			height: 30,
			color: (node) =>
				'interfaces' in node
					? getForegroundColor(node)
					: GraphicColor.Background,
			strokeColor: getForegroundColor,
			strokeWidth: 1,
			strokeDasharray: (node) => ('types' in node ? 4 : 0),
		},
		hover: {
			color: (node) =>
				'interfaces' in node
					? getForegroundColor(node)
					: GraphicColor.Background,
		},
		label: {
			direction: 'center',
			color: (node) =>
				'interfaces' in node
					? GraphicColor.Background
					: getForegroundColor(node),
		},
		zOrder: {
			enabled: true,
			zIndex: (node) => (isGraphicActive(node) ? 1 : 0),
		},
	},
	edge: {
		normal: {
			width: 1,
			dasharray: (edge) => (edge.isAbstracted ? 2 : 0),
			color: getForegroundColor,
		},
		hover: {
			width: 1,
			color: getForegroundColor,
		},
		marker: {
			source: {
				type: 'none',
			},
			target: {
				type: 'arrow',
			},
		},
		label: {
			color: getForegroundColor,
		},
		zOrder: {
			enabled: true,
			zIndex: (edge) => (isGraphicActive(edge) ? 1 : 0),
		},
	},
});

const graph = computed(() => {
	const nodes: Record<string, SchemaNode> = {};
	const edges: Record<string, Edge> = {};

	if (!data.value) return { nodes, edges };

	const g = new dagre.graphlib.Graph();

	g.setGraph({
		rankdir: 'TD',
		acyclicer: 'greedy',
	})
		.setDefaultNodeLabel(() => ({}))
		.setDefaultEdgeLabel(() => ({}));

	function addNode(node: SchemaNode) {
		nodes[node.name] = node;
		g.setNode(node.name, {
			width: configs.node?.normal?.width,
			height: configs.node?.normal?.height,
		});
	}

	function addEdge(
		source: string,
		target: string,
		label?: string,
		isAbstracted = false,
	) {
		const id = `${source}->${target}`;
		edges[id] = { id, source, target, label, isAbstracted };
		g.setEdge(source, target);
	}

	data.value.objects.forEach((node) => {
		addNode(node);
		node.fields
			.filter((f) => f.relationship?.direction === 'IN')
			.forEach(({ type, relationship }) =>
				addEdge(type.name, node.name, relationship?.type),
			);
		node.interfaces.forEach((name) =>
			addEdge(node.name, name, 'extends', true),
		);
	});

	data.value.interfaces.forEach(addNode);

	data.value.unions.forEach((node) => {
		addNode(node);
		node.types.forEach((type) => addEdge(type, node.name, 'is', true));
	});

	dagre.layout(g);

	const layouts: Layouts = {
		nodes: Object.fromEntries(
			g.nodes().map((id) => {
				const { x, y } = g.node(id);
				return [id, { x, y }];
			}),
		),
	};

	return { nodes, edges, layouts };
});

const graphElement = ref<VNetworkGraphInstance>();
const isMaximized = ref(false);
const selectedNodes = ref<string[]>([]);

const selectedNode = computed<SchemaNode | null>(() =>
	selectedNodes.value.length ? graph.value.nodes[selectedNodes.value[0]] : null,
);

const activeEdges = computed(() =>
	Object.values(graph.value.edges).filter(
		(edge) =>
			edge.source === selectedNode.value?.name ||
			edge.target === selectedNode.value?.name,
	),
);

function toggleMaximize() {
	isMaximized.value = !isMaximized.value;

	graphElement.value?.fitToContents();
	graphElement.value?.panToCenter();
}

function getForegroundColor(item: SchemaNode | Edge) {
	return isGraphicActive(item)
		? GraphicColor.Foreground
		: GraphicColor.Disabled;
}

function isGraphicActive(item: SchemaNode | Edge) {
	return (
		!activeEdges.value.length ||
		('name' in item
			? activeEdges.value.some(
					(edge) => edge.source === item.name || edge.target === item.name,
				)
			: activeEdges.value.some((edge) => edge.id === item.id))
	);
}
</script>

<template>
	<div
		class="flex flex-row justify-end bg-gray-100"
		:class="
			isMaximized
				? 'fixed inset-0'
				: 'relative h-128 rounded-lg border border-gray-200'
		"
	>
		<ClientOnly>
			<v-network-graph
				ref="graphElement"
				:configs
				:nodes="graph.nodes"
				:edges="graph.edges"
				:layouts="graph.layouts"
				v-model:selected-nodes="selectedNodes"
				#edge-label="{ edge, ...slotProps }"
			>
				<v-edge-label
					:text="edge.label"
					align="center"
					vertical-align="above"
					font-size="10"
					class="relative"
					v-bind="slotProps"
				/>
			</v-network-graph>
		</ClientOnly>
		<cv-icon-button
			class="absolute top-0 left-0"
			size="small"
			kind="ghost"
			tipAlignment="start"
			:label="isMaximized ? 'Minimize' : 'Maximize'"
			:icon="isMaximized ? Minimize16 : Maximize16"
			@click="toggleMaximize"
		/>
		<div
			class="absolute bottom-2 left-2 flex flex-col gap-1 text-xs text-gray-700"
		>
			<GraphLegend
				term="Object"
				definition="A type of the actual node in the dataset"
				:borderColor="GraphicColor.Foreground"
				:backgroundColor="GraphicColor.Foreground"
			/>
			<GraphLegend
				term="Interface"
				definition="An abstracted type used as a blueprint for other object types"
				:borderColor="GraphicColor.Foreground"
			/>
			<GraphLegend
				term="Union"
				definition="A set of possible types"
				:borderColor="GraphicColor.Foreground"
				dashed
			/>
		</div>
		<div
			class="flex flex-col gap-4 overflow-y-scroll bg-gray-800 text-white"
			:class="isMaximized ? 'w-128 p-6' : 'w-84 rounded-r-lg p-3'"
		>
			<template v-if="selectedNode">
				<div class="flex flex-row items-center gap-1">
					<cv-tag
						small
						:label="
							'interfaces' in selectedNode
								? 'Object'
								: 'types' in selectedNode
									? 'Union'
									: 'Interface'
						"
						class="m-0"
					/>
					<span
						v-if="
							'interfaces' in selectedNode && selectedNode.interfaces.length
						"
						class="text-sm text-gray-400 italic"
					>
						extends
						<button
							v-for="type in selectedNode.interfaces"
							:key="type"
							class="cursor-pointer text-blue-400"
							@click="selectedNodes = [type]"
						>
							{{ type }}
						</button>
					</span>
				</div>
				<div>
					<h3>{{ selectedNode.name }}</h3>
					<p class="text-sm">
						<template
							v-for="chunk in selectedNode.description?.split(' ')"
							:key="chunk"
						>
							<a
								v-if="chunk.startsWith('http')"
								:href="chunk"
								target="_blank"
								rel="noopener noreferrer"
								class="text-blue-400"
								>{{ chunk }}</a
							>
							<template v-else>{{ chunk }}</template>
							{{ ' ' }}
						</template>
					</p>
				</div>
				<ul
					v-if="'types' in selectedNode"
					class="ml-3 flex list-disc flex-col gap-2"
				>
					<li v-for="type in selectedNode.types" :key="type">
						<button
							class="cursor-pointer text-blue-400"
							@click="selectedNodes = [type]"
						>
							{{ type }}
						</button>
					</li>
				</ul>
				<ul v-if="'fields' in selectedNode" class="flex flex-col">
					<li
						v-for="{ name, description, type } in selectedNode.fields"
						:key="name"
						class="border-t border-gray-700 py-2 leading-normal"
					>
						<span class="font-bold">{{ name }}</span
						>:
						<button
							v-if="graph.nodes[type.name]"
							class="cursor-pointer text-blue-400"
							@click="selectedNodes = [type.name]"
						>
							{{ type.name }}</button
						><template v-else>{{ type.name }}</template
						>{{ type.hasMany ? '[]' : '' }}{{ type.isRequired ? '!' : '' }}
						<br />
						<span class="text-sm text-gray-400">{{ description }}</span>
						<ul
							v-if="data?.enums.find((e) => e.name === type.name)"
							class="ml-4 list-disc"
						>
							<li
								v-for="{ name, description } in data.enums.find(e => e.name === type.name)!.values"
								:key="name"
							>
								{{ name }}
								<span class="text-gray-400">: {{ description }}</span>
							</li>
						</ul>
					</li>
				</ul>
			</template>
			<p v-else class="m-auto text-center text-sm text-gray-400 italic">
				Select any entity to see more details
			</p>
		</div>
	</div>
</template>
