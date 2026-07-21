<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
	buildCenterNodeQuery,
	mainNodeTypes,
	normalizeAliasedFields,
	pruneToMainLeaves,
} from '../../utils/explore';
import { fetchGraphql } from '../../utils/graphql';
import { useTranslations, type Language } from '../../utils/i18n';
import {
	getObjectLabel,
	type GraphqlDataResponse,
	type GraphqlObject,
} from '../../utils/schema';
import QueryGraph from '../query-graph.vue';
import SearchOverlay from './search-overlay.vue';

const NODE_TYPE_PARAM = 'type';
const NODE_ID_PARAM = 'id';

const CENTER_NODE_COLOR = '#f59e0b';
const MAIN_NODE_COLOR = '#4466cc';
const SUB_NODE_COLOR = '#8899dd';
const EDGE_COLOR = '#dddddd';

const props = defineProps<{
	lang: Language;
}>();

const t = useTranslations(props.lang);

const centerNode = ref<GraphqlObject | null>(null);
const hasExpanded = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const centeringLabel = ref('');

const graphData = computed<GraphqlDataResponse | null>(() =>
	centerNode.value ? { nodes: [centerNode.value] } : null,
);

type NodeReference = Pick<GraphqlObject, '__typename' | 'id'> &
	Partial<GraphqlObject>;

function getNodeFromUrl(): NodeReference | null {
	const params = new URLSearchParams(window.location.search);
	const __typename = params.get(NODE_TYPE_PARAM);
	const id = params.get(NODE_ID_PARAM);

	return __typename && id ? { __typename, id } : null;
}

function pushNodeToUrl({ __typename, id }: GraphqlObject) {
	const url = new URL(window.location.href);
	url.searchParams.set(NODE_TYPE_PARAM, __typename);
	url.searchParams.set(NODE_ID_PARAM, id);
	window.history.pushState(null, '', url);
}

async function exploreNode(
	node: NodeReference,
	{ fromGraph = false, syncUrl = true } = {},
) {
	if (isLoading.value || node.id === centerNode.value?.id) return;

	if (fromGraph) hasExpanded.value = true;

	isLoading.value = true;
	errorMessage.value = '';
	centeringLabel.value = getObjectLabel(node as GraphqlObject, props.lang);

	try {
		const { data } = await fetchGraphql(buildCenterNodeQuery(node.__typename), {
			id: node.id,
		});
		const [rawNode] = Object.values(normalizeAliasedFields(data)).flat();

		if (!rawNode) {
			throw new Error(t.exploreNodeNotFound(centeringLabel.value || node.id));
		}

		centerNode.value = pruneToMainLeaves(rawNode);
		centeringLabel.value = getObjectLabel(centerNode.value, props.lang);

		if (syncUrl) pushNodeToUrl(centerNode.value);
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : `${error}`;
	} finally {
		isLoading.value = false;
	}
}

function resetToInitialState() {
	centerNode.value = null;
	centeringLabel.value = '';
	errorMessage.value = '';
	hasExpanded.value = false;
}

function clearNode() {
	resetToInitialState();

	if (!getNodeFromUrl()) return;

	const url = new URL(window.location.href);
	url.searchParams.delete(NODE_TYPE_PARAM);
	url.searchParams.delete(NODE_ID_PARAM);
	window.history.pushState(null, '', url);
}

function syncFromUrl() {
	const node = getNodeFromUrl();

	if (node) {
		exploreNode(node, { syncUrl: false });
	} else {
		resetToInitialState();
	}
}

onMounted(() => {
	syncFromUrl();
	window.addEventListener('popstate', syncFromUrl);
});

onUnmounted(() => window.removeEventListener('popstate', syncFromUrl));
</script>

<template>
	<div class="relative h-[calc(100vh-var(--sl-nav-height))] w-full">
		<QueryGraph
			v-if="centerNode && graphData"
			:data="graphData"
			immersive
			:labelLang="lang"
			:getNodeSizeScale="
				({ __typename }) => (mainNodeTypes.has(__typename) ? 0.8 : 0.4)
			"
			:getNodeColor="
				(node) =>
					node.id === centerNode?.id
						? CENTER_NODE_COLOR
						: mainNodeTypes.has(node.__typename)
							? MAIN_NODE_COLOR
							: SUB_NODE_COLOR
			"
			:edgeColor="EDGE_COLOR"
			@node-activate="(node) => exploreNode(node, { fromGraph: true })"
		>
			<template v-slot:overlay>
				<SearchOverlay
					anchored
					:lang="lang"
					:centerLabel="centeringLabel"
					:loading="isLoading"
					:errorMessage="errorMessage"
					@select="exploreNode"
					@clear="clearNode"
				>
					<p
						v-if="!hasExpanded"
						class="mt-1 rounded-sm border border-gray-200 bg-white/80 px-2 py-1 text-center text-xs italic leading-none text-gray-400"
					>
						{{ t.exploreInteractHint }}
					</p>
				</SearchOverlay>
			</template>
		</QueryGraph>
		<div v-else>
			<SearchOverlay
				:lang="lang"
				:centerLabel="centeringLabel"
				:loading="isLoading"
				:errorMessage="errorMessage"
				@select="exploreNode"
				@clear="clearNode"
			/>
		</div>
	</div>
</template>
