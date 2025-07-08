<script setup lang="tsx">
import dagre from 'dagre';
import {
	defineConfigs,
	type Edges,
	type Layouts,
	type Nodes,
} from 'v-network-graph';
import 'v-network-graph/lib/style.css';

const { data } = await useFetch('/schema.json');

const configs = defineConfigs({
	view: {
		autoPanAndZoomOnLoad: 'fit-content',
		fitContentMargin: '20px',
		scalingObjects: true,
	},
	node: {
		normal: {
			type: 'rect',
			width: 100,
			height: 30,
			color: (node) => ('fields' in node ? '#4466cc' : '#f3f4f6'),
			strokeColor: '#4466cc',
			strokeWidth: 1,
			strokeDasharray: (node) => ('types' in node ? 4 : 0),
		},
		hover: {
			color: (node) => ('fields' in node ? '#4466cc' : '#f3f4f6'),
		},
		label: {
			direction: 'center',
			color: (node) => ('fields' in node ? '#fff' : '#4466cc'),
		},
	},
	edge: {
		selectable: false,
		normal: {
			width: 1,
			dasharray: 1,
		},
		hover: {
			width: 1,
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

const graph = computed(() => {
	if (!data.value) return {};

	const nodes: Nodes = {};
	const edges: Edges = {};

	const g = new dagre.graphlib.Graph();

	g.setGraph({
		rankdir: 'LR',
		acyclicer: 'greedy',
		ranker: 'longest-path',
	})
		.setDefaultNodeLabel(() => ({}))
		.setDefaultEdgeLabel(() => ({}));

	function addNode<N extends { name: string }>(node: N) {
		nodes[node.name] = node;
		g.setNode(node.name, {
			width: configs.node.normal.width,
			height: configs.node.normal.height,
		});
	}

	function addEdge(source: string, target: string, label?: string) {
		edges[`${source}->${target}`] = { source, target, label };
		g.setEdge(source, target);
	}

	data.value.nodes.forEach((node) => {
		addNode(node);
		node.fields
			.filter((f) => f.relationship?.direction === 'OUT')
			.forEach(({ type, relationship }) =>
				addEdge(node.name, type.name, relationship?.type),
			);
		node.interfaces.forEach((name) => addEdge(node.name, name, 'extends'));
	});

	data.value.interfaces.forEach(addNode);

	data.value.unions.forEach((node) => {
		addNode(node);
		node.types.forEach((type) => addEdge(type, node.name, 'is'));
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
</script>

<template>
	<div class="flex-1 min-h-128 bg-gray-100 rounded-lg border-gray-200! border!">
		<ClientOnly>
			<v-network-graph
				:configs
				:nodes="graph.nodes"
				:edges="graph.edges"
				:layouts="graph.layouts"
				#edge-label="{ edge, ...slotProps }"
			>
				<v-edge-label
					:text="edge.label"
					align="center"
					vertical-align="above"
					font-size="10"
					v-bind="slotProps"
				/>
			</v-network-graph>
		</ClientOnly>
	</div>
</template>
