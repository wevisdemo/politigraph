<script setup lang="ts">
// @ts-ignore
import { Code16, DataVis_116, Launch16 } from '@carbon/icons-vue';
import { useFormattedGraphqlCode } from '~/utils/graphql/formatter';
import { schemeTableau10 } from 'd3-scale-chromatic';
import {
	defineConfigs,
	type Edges,
	type Layouts,
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

const MAX_GRAPH_LABEL_LENGTH = 30;

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
					.force('collide', d3.forceCollide(30).strength(0.2))
					.force('center', d3.forceCenter().strength(0.05))
					.alphaMin(0.001),
		}),
	},
	node: {
		selectable: true,
		normal: {
			color: getObjectColor,
			radius: 12,
		},
		hover: {
			color: getObjectColor,
		},
		label: {
			fontSize: 12,
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

const { data: response, status } = await useAsyncData<{
	data: Record<string, GraphqlObject[]>;
}>(
	`${props.query}-${props.variables}`,
	() =>
		$fetch('/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				// insert __typename field in every object that have an id
				query: props.query.replaceAll(' id ', ' __typename id '),
				variables: props.variables,
			}),
		}),
	{
		server: false,
		lazy: true,
	},
);

const { data: formattedCode } = await useFormattedGraphqlCode(
	props.query,
	props.variables,
	response,
);

const { data: schema } = await useFetch('/schema.json');

const graph = computed(() => {
	const nodes: Record<string, GraphqlObject> = {};
	const edges: Edges = {};
	const layouts: Layouts = { nodes: {} };

	if (!response.value) {
		return { nodes, edges };
	}

	const initialNodes = Object.values(response.value.data).find(
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
								r + 100,
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

const isGraphView = ref(true);
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
		<GraphBaseView :graphElement>
			<template v-slot:control>
				<cv-icon-button
					:key="isGraphView"
					size="small"
					:kind="isGraphView ? 'secondary' : 'ghost'"
					tipAlignment="start"
					label="Graph View"
					:icon="DataVis_116"
					@click="isGraphView = true"
				/>
				<cv-icon-button
					:key="isGraphView"
					size="small"
					:kind="isGraphView ? 'ghost' : 'secondary'"
					class="rounded-br"
					tipAlignment="start"
					label="Query View"
					:icon="Code16"
					@click="isGraphView = false"
				/>
			</template>
			<ClientOnly v-if="isGraphView">
				<v-network-graph
					ref="graphElement"
					:configs
					:nodes="graph.nodes"
					:edges="graph.edges"
					:layouts="graph.layouts"
					v-model:selected-nodes="selectedNodes"
				/>
			</ClientOnly>
			<div v-else class="flex flex-1 flex-col gap-1 overflow-scroll p-2 pt-10">
				<p class="mt-4 font-bold">GraphQL Query</p>
				<div v-html="formattedCode?.query"></div>
				<p class="mt-3 font-bold">GraphQL Variables</p>
				<div v-html="formattedCode?.variables"></div>
				<a
					href="/graphql"
					target="_blank"
					class="mt-3 flex flex-row items-center gap-1 self-center text-blue-600"
					>เปิด GraphQL Playground <Launch16
				/></a>
			</div>
			<template v-slot:legend v-if="isGraphView">
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
				<template v-if="!isGraphView">
					<p class="mt-2 font-bold">Response</p>
					<div v-html="formattedCode?.response"></div>
				</template>
				<template v-else-if="selectedNode">
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
					<p class="mt-auto text-xs leading-tight text-gray-400 italic">
						*Only showing nodes, properties, and relationships from the query
						<a href="/docs/schema" class="text-blue-400">see full schema</a>
					</p>
				</template>
				<p v-else class="m-auto text-center text-sm text-gray-400 italic">
					Select any node to see the description and properties
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

::v-deep(.shiki) {
	@apply w-auto overflow-scroll rounded px-2 py-1 font-mono text-sm;
}

::v-deep(.catppuccin-latte) {
	@apply border border-gray-300;
}

::v-deep(.catppuccin-mocha) {
	@apply border border-gray-700;
}

::v-deep(.v-ng-canvas) {
	@apply min-h-80;
}
</style>
