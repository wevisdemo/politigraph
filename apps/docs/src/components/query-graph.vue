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
	EdgeLabelDrawingFunction,
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
	getObjectLabel,
	typenameSchemaMap,
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

const drawEdgeLabel: EdgeLabelDrawingFunction = (
	context,
	edgeData,
	sourceData,
	targetData,
	settings,
) => {
	const label = edgeData.label;
	if (!label) return;

	const size = settings.edgeLabelSize;
	context.font = `${settings.edgeLabelWeight} ${size}px ${settings.edgeLabelFont}`;

	let sx = sourceData.x;
	let sy = sourceData.y;
	let tx = targetData.x;
	let ty = targetData.y;
	const dx = tx - sx;
	const dy = ty - sy;
	const d = Math.sqrt(dx * dx + dy * dy);
	if (d < sourceData.size + targetData.size) return;

	sx += (dx * sourceData.size) / d;
	sy += (dy * sourceData.size) / d;
	tx -= (dx * targetData.size) / d;
	ty -= (dy * targetData.size) / d;

	const angle = Math.atan2(ty - sy, tx - sx);
	const flipped = angle > Math.PI / 2 || angle < -Math.PI / 2;
	const textWidth = context.measureText(label).width;

	context.save();
	context.translate((sx + tx) / 2, (sy + ty) / 2);
	context.rotate(flipped ? angle + Math.PI : angle);
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.lineJoin = 'round';
	context.lineWidth = 4;
	context.strokeStyle = '#fff';
	context.strokeText(label, 0, -(edgeData.size / 2 + size / 2));
	context.fillStyle = settings.edgeLabelColor.color ?? NODE_COLOR;
	context.fillText(label, 0, -(edgeData.size / 2 + size / 2));
	context.restore();

	context.textAlign = 'left';
	context.textBaseline = 'alphabetic';
};

const props = defineProps<{
	data: GraphqlDataResponse;
	fillHeight?: boolean;
	labelLang?: 'en' | 'th';
	getNodeSizeScale?: (node: GraphqlObject) => number;
	getNodeColor?: (node: GraphqlObject) => string;
	edgeColor?: string;
	immersive?: boolean;
}>();

const emit = defineEmits<{
	nodeSelect: [node: GraphqlObject];
	nodeActivate: [node: GraphqlObject];
}>();

const graph = computed(() => {
	const nodes: Record<string, GraphqlObject> = {};
	const edges: Record<
		string,
		{ source: string; target: string; label: string }
	> = {};
	const layouts: Record<string, { x: number; y: number }> = {};

	const initialNodes = Object.values(props.data).find(
		(value) => typeof value !== 'string',
	);

	if (!initialNodes?.length) {
		return { nodes, edges, layouts, rootId: undefined };
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

		Object.entries(node).forEach(([relationName, value]) => {
			if (Array.isArray(value)) {
				value
					.sort((a, z) => a.id.localeCompare(z.id))
					.forEach((child, i) => {
						edges[`${node.id}->${child.id}`] = {
							source: node.id,
							target: child.id,
							label: relationName,
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

	return { nodes, edges, layouts, rootId: initialNodes[0].id };
});

const shortestPathIndex = computed(() => {
	const { edges, rootId } = graph.value;
	const distance = new Map<string, number>();
	const adjacency = new Map<string, { node: string; edge: string }[]>();

	Object.entries(edges).forEach(([edge, { source, target }]) => {
		adjacency.set(source, [
			...(adjacency.get(source) ?? []),
			{ node: target, edge },
		]);
		adjacency.set(target, [
			...(adjacency.get(target) ?? []),
			{ node: source, edge },
		]);
	});

	if (rootId) {
		const queue = [rootId];
		distance.set(rootId, 0);

		while (queue.length) {
			const current = queue.shift()!;

			adjacency.get(current)?.forEach(({ node }) => {
				if (!distance.has(node)) {
					distance.set(node, distance.get(current)! + 1);
					queue.push(node);
				}
			});
		}
	}

	return { distance, adjacency };
});

const hoveredPathNodes = new Set<string>();
const hoveredPathEdges = new Set<string>();

function setHoveredPath(nodeId?: string) {
	hoveredPathNodes.clear();
	hoveredPathEdges.clear();

	const { distance, adjacency } = shortestPathIndex.value;

	if (nodeId !== undefined && distance.has(nodeId)) {
		const queue = [nodeId];
		hoveredPathNodes.add(nodeId);

		while (queue.length) {
			const current = queue.shift()!;

			adjacency.get(current)?.forEach(({ node, edge }) => {
				if (distance.get(node) === distance.get(current)! - 1) {
					hoveredPathEdges.add(edge);

					if (!hoveredPathNodes.has(node)) {
						hoveredPathNodes.add(node);
						queue.push(node);
					}
				}
			});
		}
	}

	sigma?.refresh({ skipIndexation: true });
}

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
			size: NODE_RADIUS * (props.getNodeSizeScale?.(node) ?? 1),
			color: props.getNodeColor?.(node) ?? NODE_COLOR,
			pictogramColor: '#ffffff',
			image: getIconDataUri(node.__typename),
			label: truncateLabel(getObjectLabel(node, props.labelLang)),
		});
	});

	Object.entries(edges).forEach(([id, { source, target, label }]) => {
		graphology.addEdgeWithKey(id, source, target, {
			size: 1,
			color: props.edgeColor ?? EDGE_COLOR,
			relationLabel: label,
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
		zIndex: true,
		renderEdgeLabels: true,
		edgeLabelSize: 10,
		edgeLabelFont: 'IBM Plex Sans Thai Looped, sans-serif',
		edgeLabelColor: { color: NODE_COLOR },
		defaultDrawEdgeLabel: drawEdgeLabel,
		nodeReducer: (id, data) =>
			selectedNodes.value.includes(id) || hoveredPathNodes.has(id)
				? { ...data, highlighted: true }
				: data,
		edgeReducer: (id, data) => {
			if (!hoveredPathEdges.has(id)) return data;

			const { distance } = shortestPathIndex.value;
			const isForward =
				(distance.get(graphology.source(id)) ?? 0) <
				(distance.get(graphology.target(id)) ?? 0);

			return {
				...data,
				color: NODE_COLOR,
				size: 2,
				zIndex: 1,
				forceLabel: true,
				label: isForward ? data.relationLabel : undefined,
			};
		},
	});

	const canvases = sigma.getCanvases();
	canvases.nodes.after(canvases.edgeLabels);

	sigma.on('enterNode', ({ node }) => setHoveredPath(node));
	sigma.on('leaveNode', () => setHoveredPath());

	let draggedNode: SimNode | undefined;
	let didDrag = false;

	sigma.on('clickNode', ({ node }) => {
		if (didDrag) {
			didDrag = false;
			return;
		}
		if (selectedNodes.value[0] === node) {
			emit('nodeActivate', graph.value.nodes[node]);
		} else {
			selectedNodes.value = [node];
		}
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

watch(graph, () => {
	hoveredPathNodes.clear();
	rebuildGraph();
	fitGraph();
});

watch(selectedNodes, ([id]) => {
	sigma?.refresh({ skipIndexation: true });

	const node = id ? graph.value.nodes[id] : undefined;

	if (node) {
		emit('nodeSelect', node);
	}
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
</script>

<template>
	<div class="relative" :class="{ 'h-full': props.immersive }">
		<BaseView
			:fit="fitGraph"
			:fillHeight="props.fillHeight"
			:immersive="props.immersive"
		>
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
										{{ getObjectLabel(node, labelLang) }}
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
