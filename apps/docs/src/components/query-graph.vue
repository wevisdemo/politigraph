<script setup lang="ts">
import {
	forceCenter,
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	type Simulation,
	type SimulationLinkDatum,
	type SimulationNodeDatum,
} from 'd3-force';
import Graph from 'graphology';
import type Sigma from 'sigma';
import type {
	NodeHoverDrawingFunction,
	NodeLabelDrawingFunction,
} from 'sigma/rendering';
import {
	computed,
	createApp,
	h,
	onBeforeUnmount,
	onMounted,
	ref,
	watch,
} from 'vue';
import { nodeIconMap } from '../constants/schema';
import {
	objects,
	type GraphqlDataResponse,
	type GraphqlObject,
} from '../utils/schema';
import BaseView from './graph/base-view.vue';
import Legend from './graph/legend.vue';

interface SimNode extends SimulationNodeDatum {
	id: string;
}

const MAX_GRAPH_LABEL_LENGTH = 20;
const NODE_RADIUS = 14;
const NODE_COLOR = '#4466cc';
const EDGE_COLOR = '#bbb';
const LABEL_GAP = 4;
const LABEL_PADDING = 4;

function getLabelCenterY(data: { y: number; size: number }, labelSize: number) {
	return data.y + data.size + LABEL_GAP + labelSize / 2;
}

const drawNodeLabel: NodeLabelDrawingFunction = (context, data, settings) => {
	if (!data.label) return;

	context.fillStyle = settings.labelColor.color ?? '#000';
	context.font = `${settings.labelWeight} ${settings.labelSize}px ${settings.labelFont}`;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(
		data.label,
		data.x,
		getLabelCenterY(data, settings.labelSize),
	);
	context.textAlign = 'left';
	context.textBaseline = 'alphabetic';
};

const drawNodeHover: NodeHoverDrawingFunction = (context, data, settings) => {
	if (typeof data.label !== 'string') return;

	const { labelSize } = settings;
	context.font = `${settings.labelWeight} ${labelSize}px ${settings.labelFont}`;

	const boxWidth = context.measureText(data.label).width + LABEL_PADDING * 2;
	const boxHeight = labelSize + LABEL_PADDING * 2;

	context.fillStyle = '#fff';
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 0;
	context.shadowBlur = 8;
	context.shadowColor = '#000';
	context.beginPath();
	context.roundRect(
		data.x - boxWidth / 2,
		getLabelCenterY(data, labelSize) - boxHeight / 2,
		boxWidth,
		boxHeight,
		LABEL_PADDING,
	);
	context.fill();
	context.shadowBlur = 0;

	drawNodeLabel(context, data, settings);
};

const props = defineProps<{
	data: GraphqlDataResponse;
}>();

const typenameSchemaMap = new Map(
	objects.map((obj) => [
		obj.name,
		{
			...obj,
			description: obj.description?.split('อ้างอิงจาก').at(0)?.trim(),
		},
	]),
);

const graph = computed(() => {
	const nodes: Record<string, GraphqlObject> = {};
	const edges: Record<string, { source: string; target: string }> = {};
	const layouts: Record<string, { x: number; y: number }> = {};

	const initialNodes = Object.values(props.data).find(
		(value) => typeof value !== 'string',
	);

	if (!initialNodes) {
		return { nodes, edges, layouts };
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
		layouts[node.id] = { x: r * Math.cos(theta), y: r * Math.sin(theta) };

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

const container = ref<HTMLDivElement>();
const selectedNodes = ref<string[]>([]);

const graphology = new Graph();
let sigma: Sigma | undefined;
let simulation: Simulation<SimNode, SimulationLinkDatum<SimNode>> | undefined;

const iconDataUris = new Map<string, string>();

function getIconDataUri(typename: string) {
	const cached = iconDataUris.get(typename);
	if (cached) return cached;

	const icon = nodeIconMap.get(typename);
	if (!icon) return undefined;

	const host = document.createElement('div');
	const app = createApp({ render: () => h(icon) });
	app.mount(host);
	const svg = host.querySelector('svg');
	const uri = svg
		? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`
		: undefined;
	app.unmount();

	if (uri) iconDataUris.set(typename, uri);
	return uri;
}

function truncateLabel(label: string) {
	return label.length > MAX_GRAPH_LABEL_LENGTH
		? `${label.slice(0, MAX_GRAPH_LABEL_LENGTH).trim()}...`
		: label;
}

function rebuildGraph() {
	simulation?.stop();
	graphology.clear();

	const { nodes, edges, layouts } = graph.value;

	Object.values(nodes).forEach((node) => {
		const { x = 0, y = 0 } = layouts[node.id] ?? {};

		graphology.addNode(node.id, {
			x,
			y,
			size: NODE_RADIUS,
			color: NODE_COLOR,
			pictogramColor: '#ffffff',
			image: getIconDataUri(node.__typename),
			label: truncateLabel(getObjectLabel(node)),
		});
	});

	Object.entries(edges).forEach(([id, { source, target }]) => {
		graphology.addEdgeWithKey(id, source, target, {
			size: 1,
			color: EDGE_COLOR,
		});
	});

	const simNodes = graphology.mapNodes<SimNode>((id, { x, y }) => ({
		id,
		x,
		y,
	}));

	simulation = forceSimulation(simNodes)
		.force(
			'edge',
			forceLink<SimNode, SimulationLinkDatum<SimNode>>(
				Object.values(edges).map((edge) => ({ ...edge })),
			)
				.id((d) => d.id)
				.distance(50),
		)
		.force('charge', forceManyBody())
		.force('collide', forceCollide(10).strength(0.2))
		.force('center', forceCenter().strength(0.5))
		.velocityDecay(0.6)
		.alphaDecay(0.015)
		.on('tick', () => {
			simNodes.forEach(({ id, x = 0, y = 0 }) => {
				graphology.setNodeAttribute(id, 'x', x);
				graphology.setNodeAttribute(id, 'y', y);
			});
		});
}

onMounted(async () => {
	if (!container.value) return;

	rebuildGraph();

	const [
		{ default: SigmaConstructor },
		{ createNodeImageProgram },
		{ createNodeCompoundProgram, EdgeArrowProgram, NodeCircleProgram },
	] = await Promise.all([
		import('sigma'),
		import('@sigma/node-image'),
		import('sigma/rendering'),
	]);

	const NodePictogramProgram = createNodeImageProgram({
		padding: 0.25,
		size: { mode: 'force', value: 64 },
		drawingMode: 'color',
		colorAttribute: 'pictogramColor',
	});

	sigma = new SigmaConstructor(graphology, container.value, {
		defaultNodeType: 'pictogram',
		nodeProgramClasses: {
			pictogram: createNodeCompoundProgram([
				NodeCircleProgram,
				NodePictogramProgram,
			]),
		},
		defaultEdgeType: 'arrow',
		edgeProgramClasses: {
			arrow: EdgeArrowProgram,
		},
		defaultDrawNodeLabel: drawNodeLabel,
		defaultDrawNodeHover: drawNodeHover,
		labelSize: 10,
		labelFont: 'IBM Plex Sans Thai Looped, sans-serif',
		labelColor: { color: '#333333' },
		labelDensity: 4,
		labelGridCellSize: 50,
		nodeReducer: (id, data) =>
			selectedNodes.value.includes(id) ? { ...data, highlighted: true } : data,
	});

	let draggedNode: SimNode | undefined;
	let didDrag = false;

	sigma.on('clickNode', ({ node }) => {
		if (didDrag) {
			didDrag = false;
			return;
		}
		selectedNodes.value = [node];
	});

	sigma.on('clickStage', () => {
		if (didDrag) {
			didDrag = false;
			return;
		}
		selectedNodes.value = [];
	});

	sigma.on('downNode', ({ node, event }) => {
		if (!sigma || !simulation) return;

		didDrag = false;
		draggedNode = simulation.nodes().find(({ id }) => id === node);
		if (!draggedNode) return;

		const { x, y } = sigma.viewportToGraph(event);
		draggedNode.fx = x;
		draggedNode.fy = y;
		simulation.alphaTarget(0.3).restart();

		if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox());
	});

	const mouseCaptor = sigma.getMouseCaptor();

	mouseCaptor.on('mousemovebody', (event) => {
		if (!sigma || !draggedNode) return;

		didDrag = true;
		const { x, y } = sigma.viewportToGraph(event);
		draggedNode.x = x;
		draggedNode.y = y;
		draggedNode.fx = x;
		draggedNode.fy = y;
		graphology.setNodeAttribute(draggedNode.id, 'x', x);
		graphology.setNodeAttribute(draggedNode.id, 'y', y);

		event.preventSigmaDefault();
		event.original.preventDefault();
		event.original.stopPropagation();
	});

	mouseCaptor.on('mouseup', () => {
		if (!draggedNode) return;

		draggedNode.fx = null;
		draggedNode.fy = null;
		draggedNode = undefined;
		simulation?.alphaTarget(0);
	});
});

onBeforeUnmount(() => {
	simulation?.stop();
	sigma?.kill();
});

watch(graph, rebuildGraph);

watch(selectedNodes, () => {
	sigma?.refresh({ skipIndexation: true });
});

function fitGraph() {
	if (!sigma) return;

	sigma.resize();
	sigma.setCustomBBox(null);
	sigma.getCamera().animatedReset();
}

const selectedNode = computed(() => {
	if (!selectedNodes.value.length) return null;

	const node = graph.value.nodes[selectedNodes.value[0]];

	return {
		schema: typenameSchemaMap.get(node.__typename)!,
		fields: Object.entries(node).filter(([key]) => key !== '__typename'),
	};
});

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
		<BaseView :fit="fitGraph">
			<div ref="container" class="not-content min-h-0 w-full flex-1"></div>
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
							<template
								v-else-if="
									typeof value === 'string' || typeof value === 'number'
								"
							>
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
