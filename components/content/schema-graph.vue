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
import type { GraphEntity } from '~/server/routes/schema.json';

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

const configs = defineConfigs<GraphEntity, Edge>({
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
				'fields' in node ? getForegroundColor(node) : GraphicColor.Background,
			strokeColor: getForegroundColor,
			strokeWidth: 1,
			strokeDasharray: (node) => ('types' in node ? 4 : 0),
		},
		hover: {
			color: (node) =>
				'fields' in node ? getForegroundColor(node) : GraphicColor.Background,
		},
		label: {
			direction: 'center',
			color: (node) =>
				'fields' in node ? GraphicColor.Background : getForegroundColor(node),
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
	const nodes: Record<string, GraphEntity> = {};
	const edges: Record<string, Edge> = {};

	if (!data.value) return { nodes, edges };

	const g = new dagre.graphlib.Graph();

	g.setGraph({
		rankdir: 'TD',
		acyclicer: 'greedy',
	})
		.setDefaultNodeLabel(() => ({}))
		.setDefaultEdgeLabel(() => ({}));

	function addNode(node: GraphEntity) {
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

	data.value.nodes.forEach((node) => {
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

const activeEntity = computed<GraphEntity | null>(() =>
	selectedNodes.value.length ? graph.value.nodes[selectedNodes.value[0]] : null,
);

const activeEdges = computed(() =>
	Object.values(graph.value.edges).filter(
		(edge) =>
			edge.source === activeEntity.value?.name ||
			edge.target === activeEntity.value?.name,
	),
);

function toggleMaximize() {
	isMaximized.value = !isMaximized.value;

	graphElement.value?.fitToContents();
	graphElement.value?.panToCenter();
}

function getForegroundColor(item: GraphEntity | Edge) {
	return isGraphicActive(item)
		? GraphicColor.Foreground
		: GraphicColor.Disabled;
}

function isGraphicActive(item: GraphEntity | Edge) {
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
		class="bg-gray-100 flex flex-row justify-end"
		:class="
			isMaximized
				? 'fixed inset-0'
				: 'relative h-128 rounded-lg border-gray-200! border!'
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
			class="absolute! top-0 left-0"
			size="small"
			kind="ghost"
			tipAlignment="start"
			:label="isMaximized ? 'Minimize' : 'Maximize'"
			:icon="isMaximized ? Minimize16 : Maximize16"
			@click="toggleMaximize"
		/>
		<div
			class="absolute left-2 bottom-2 flex flex-col gap-1 text-xs! text-gray-700"
		>
			<div class="flex flex-row gap-1">
				<div
					class="size-4 border! rounded"
					:style="{
						'border-color': GraphicColor.Foreground,
						'background-color': GraphicColor.Foreground,
					}"
				></div>
				Node
			</div>
			<div class="flex flex-row gap-1">
				<div
					class="size-4 border! rounded"
					:style="{ 'border-color': GraphicColor.Foreground }"
				></div>
				Interface
			</div>
			<div class="flex flex-row gap-1">
				<div
					class="size-4 border! border-dashed rounded"
					:style="{ 'border-color': GraphicColor.Foreground }"
				></div>
				Union
			</div>
		</div>
		<div
			class="bg-gray-800 text-white overflow-y-scroll flex flex-col gap-4"
			:class="isMaximized ? 'w-128 p-6!' : 'rounded-r-lg w-84 p-3!'"
		>
			<template v-if="activeEntity">
				<div class="flex flex-row items-center gap-1">
					<cv-tag
						small
						:label="
							'fields' in activeEntity
								? 'Node'
								: 'types' in activeEntity
									? 'Union'
									: 'Interface'
						"
						class="m-0!"
					/>
					<span
						v-if="
							'interfaces' in activeEntity && activeEntity.interfaces.length
						"
						class="text-sm! italic! text-gray-400"
					>
						extends
						<button
							v-for="type in activeEntity.interfaces"
							:key="type"
							class="text-blue-400 cursor-pointer"
							@click="selectedNodes = [type]"
						>
							{{ type }}
						</button>
					</span>
				</div>
				<div>
					<h3>{{ activeEntity.name }}</h3>
					<p class="text-sm!">
						<template
							v-for="chunk in activeEntity.description?.split(' ')"
							:key="chunk"
						>
							<a
								v-if="chunk.startsWith('http')"
								:href="chunk"
								target="_blank"
								rel="noopener noreferrer"
								class="!text-blue-400"
								>{{ chunk }}</a
							>
							<template v-else>{{ chunk }}</template>
							{{ ' ' }}
						</template>
					</p>
				</div>
				<ul
					v-if="'types' in activeEntity"
					class="flex flex-col gap-2 list-disc! ml-3!"
				>
					<li v-for="type in activeEntity.types" :key="type">
						<button
							class="text-blue-400 cursor-pointer"
							@click="selectedNodes = [type]"
						>
							{{ type }}
						</button>
					</li>
				</ul>
				<ul v-if="'fields' in activeEntity" class="flex flex-col gap-2">
					<li
						v-for="{ name, description, type } in activeEntity.fields"
						:key="name"
						class="leading-relaxed!"
					>
						<span class="font-bold!">{{ name }}</span
						>:
						<button
							v-if="graph.nodes[type.name]"
							class="text-blue-400 cursor-pointer"
							@click="selectedNodes = [type.name]"
						>
							{{ type.name }}</button
						><template v-else>{{ type.name }}</template
						>{{ type.hasMany ? '[]' : '' }}{{ type.isRequired ? '!' : '' }}
						<br />
						<span class="text-sm! text-gray-400">{{ description }}</span>
					</li>
				</ul>
			</template>
			<p class="m-auto! italic! text-sm! text-gray-400 text-center" v-else>
				Select any entity to see more details
			</p>
		</div>
	</div>
</template>
