<script setup lang="ts">
// @ts-expect-error carbon icons vue has incomplete type exports
import { ArrowLeft16, Download16, Play16 } from '@carbon/icons-vue';
import { computed, onBeforeUnmount, reactive, ref, shallowRef } from 'vue';
import { nodeIconMap } from '../../constants/schema';
import { GRAPHQL_ENDPOINT } from '../../constants/site';
import { fetchGraphql } from '../../utils/graphql';
import { useTranslations, type Language } from '../../utils/i18n';
import { parseQuery } from '../../utils/query-builder/parse';
import {
	buildQuery,
	createNodeSelection,
	hasIdField,
	toStructureNode,
	type Selection,
} from '../../utils/query-builder/query';
import type {
	BuilderField,
	BuilderSchema,
} from '../../utils/query-builder/schema';
import {
	NODE_PARAM,
	QUERY_PARAM,
	toQueryParam,
} from '../../utils/query-builder/url';
import type { GraphqlDataResponse, GraphqlObject } from '../../utils/schema';
import QueryGraph from '../query-graph.vue';
import Spinner from '../spinner.vue';
import CodeBlock from './code-block.vue';
import SelectionOptions from './selection-options.vue';
import SelectionTree from './selection-tree.vue';

const props = defineProps<{ schema: BuilderSchema; lang: Language }>();

const t = useTranslations(props.lang);

function readQueryParam() {
	const source = new URLSearchParams(location.search).get(QUERY_PARAM);

	if (!source) return {};

	try {
		return parseQuery(props.schema, source);
	} catch (e) {
		return {
			error: `${t.builderInvalidQuery}: ${e instanceof Error ? e.message : e}`,
		};
	}
}

const initial = readQueryParam();

const startingTypes = ['Bill', 'VoteEvent', 'Organization', 'Person'];
const startingRoots = startingTypes.flatMap((startingType) =>
	props.schema.roots.filter(({ type }) => type === startingType),
);

const rootName = ref(initial.root?.name);
const root = computed(() =>
	props.schema.roots.find(({ name }) => name === rootName.value),
);

const selection = shallowRef<Selection | undefined>(
	initial.selection ? reactive(initial.selection) : undefined,
);
const response = shallowRef<{ data: GraphqlDataResponse }>();
const error = ref<string | undefined>(initial.error);
const isLoading = ref(false);

function pickRoot(field?: BuilderField) {
	rootName.value = field?.name;
	selection.value = field
		? reactive(createNodeSelection(props.schema, field))
		: undefined;
	response.value = undefined;
	error.value = undefined;
}

const nodeParam = new URLSearchParams(location.search).get(NODE_PARAM);
const nodeRoot = startingRoots.find(({ type }) => type === nodeParam);
if (nodeRoot && !initial.selection && !initial.error) pickRoot(nodeRoot);

const query = computed(() =>
	root.value && selection.value
		? buildQuery(props.schema, root.value, selection.value)
		: '',
);

const tabs = ['query', 'response'] as const;
const tab = ref<(typeof tabs)[number]>('query');
const tabLabels = { query: t.builderQuery, response: t.builderResponse };

const views = ['code', 'graph'] as const;
const view = reactive<Record<(typeof tabs)[number], (typeof views)[number]>>({
	query: 'code',
	response: 'code',
});
const viewLabels = {
	query: { graph: t.builderGraph, code: 'GraphQL' },
	response: { graph: t.builderGraph, code: 'JSON' },
};

const structureData = computed<GraphqlDataResponse>(() => ({
	structure:
		root.value && selection.value
			? [toStructureNode(props.schema, root.value.type, selection.value)]
			: [],
}));

const getStructureFields = ({ __typename, id, ...fields }: GraphqlObject) =>
	Object.entries(
		hasIdField(props.schema, __typename) ? { id: 'ID', ...fields } : fields,
	);

async function run() {
	isLoading.value = true;
	error.value = undefined;

	try {
		response.value = await fetchGraphql(query.value);
		tab.value = 'response';
	} catch (e) {
		response.value = undefined;
		error.value = e instanceof Error ? e.message : String(e);
	} finally {
		isLoading.value = false;
	}
}

const copyQuery = () => navigator.clipboard.writeText(query.value);
const copyLink = () =>
	navigator.clipboard.writeText(
		`${location.origin}${location.pathname}${toQueryParam(query.value)}`,
	);
const responseJson = computed(() => JSON.stringify(response.value, null, 2));

const wideMedia = matchMedia('(min-width: 96rem)');
const isWide = ref(wideMedia.matches);
const updateIsWide = (event: MediaQueryListEvent) => {
	isWide.value = event.matches;
};
wideMedia.addEventListener('change', updateIsWide);
onBeforeUnmount(() => wideMedia.removeEventListener('change', updateIsWide));

const buttonClass =
	'flex cursor-pointer flex-row items-center gap-1 rounded px-2 py-1 text-sm';
const grayButtonClass =
	'bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700';
</script>

<template>
	<div
		class="not-content mt-0! flex h-[calc(100vh-var(--sl-nav-height))] w-full flex-col md:flex-row"
	>
		<aside
			class="flex max-h-[50vh] flex-col gap-3 overflow-y-auto border-gray-300 p-4 md:max-h-none md:w-80 md:border-r dark:border-gray-700"
		>
			<template v-if="!root || !selection">
				<h2 class="m-0 text-sm font-bold">{{ t.builderRoot }}</h2>
				<p class="m-0 text-xs text-gray-400">{{ t.builderRootHint }}</p>
				<button
					v-for="field in startingRoots"
					:key="field.name"
					class="flex cursor-pointer flex-row items-center gap-3 rounded border border-gray-300 bg-transparent p-3 text-left hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
					@click="pickRoot(field)"
				>
					<component
						:is="nodeIconMap.get(field.type)"
						v-if="nodeIconMap.has(field.type)"
						class="size-8 shrink-0"
					/>
					<span class="flex min-w-0 flex-col gap-1">
						<span class="text-base font-bold">{{ field.name }}</span>
						<span class="text-xs text-gray-500 dark:text-gray-400">
							{{ schema.types[field.type].description?.split('\n')[0] }}
						</span>
					</span>
				</button>
			</template>
			<template v-else>
				<div class="flex flex-row items-center gap-2">
					<button
						:aria-label="t.builderBack"
						:title="t.builderBack"
						:class="[buttonClass, grayButtonClass]"
						@click="pickRoot()"
					>
						<ArrowLeft16 />
					</button>
					<component
						:is="nodeIconMap.get(root.type)"
						v-if="nodeIconMap.has(root.type)"
						class="shrink-0"
					/>
					<h2 class="m-0 text-base font-bold">{{ root.name }}</h2>
				</div>
				<p class="m-0 text-xs text-gray-400">
					{{ schema.types[root.type].description?.split('\n')[0] }}
				</p>
				<SelectionOptions
					:schema="schema"
					:field="root"
					:selection="selection"
					:lang="lang"
				/>
				<SelectionTree
					:schema="schema"
					:typename="root.type"
					:selection="selection"
					:lang="lang"
				/>
			</template>
			<p class="m-0 mt-auto pt-4 text-xs italic leading-tight text-gray-400">
				{{ t.builderLimitation }}
				<a
					:href="GRAPHQL_ENDPOINT"
					target="_blank"
					class="text-blue-700 dark:text-blue-400"
					>GraphQL Playground</a
				>
			</p>
		</aside>

		<p
			v-if="!root || !selection"
			class="m-0 flex flex-1 items-center justify-center p-4 text-center text-sm italic text-gray-400"
		>
			{{ t.builderPickHint }}
		</p>
		<section v-else class="flex min-h-0 min-w-0 flex-1 flex-col">
			<div
				role="tablist"
				class="border-(--sl-color-gray-5) flex flex-row items-end border-b-2 px-2"
			>
				<button
					v-for="name in tabs"
					:key="name"
					role="tab"
					:aria-selected="tab === name"
					class="-mb-0.5 cursor-pointer border-b-2 bg-transparent px-5 py-1.5"
					:class="
						tab === name
							? 'border-(--sl-color-text-accent) text-(--sl-color-white) font-semibold'
							: 'border-(--sl-color-gray-5) text-(--sl-color-gray-3) hover:text-(--sl-color-white)'
					"
					@click="tab = name"
				>
					{{ tabLabels[name] }}
				</button>
				<button
					:class="[
						buttonClass,
						'my-1 ml-auto self-center bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50',
					]"
					:disabled="isLoading"
					@click="run"
				>
					<Play16 />{{ t.builderRun }}
				</button>
			</div>

			<p
				v-if="error"
				class="m-0 whitespace-pre-wrap bg-red-100 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
			>
				{{ error }}
			</p>

			<div class="relative flex min-h-0 flex-1 flex-row">
				<div
					v-if="isLoading"
					class="absolute inset-0 z-20 flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50"
				>
					<Spinner />
				</div>

				<p
					v-if="tab === 'response' && !response"
					class="m-0 flex-1 p-4 text-center text-sm italic text-gray-400"
				>
					{{ t.builderRunHint }}
				</p>
				<template v-else>
					<div
						v-if="!isWide"
						class="absolute left-2 top-2 z-10 flex flex-row overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
					>
						<button
							v-for="name in views"
							:key="name"
							:class="[
								buttonClass,
								'rounded-none',
								view[tab] === name
									? 'bg-gray-200 font-bold dark:bg-gray-800'
									: 'bg-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
							]"
							@click="view[tab] = name"
						>
							{{ viewLabels[tab][name] }}
						</button>
					</div>

					<div
						v-if="isWide || view[tab] === 'code'"
						class="min-w-0 overflow-auto"
						:class="
							isWide
								? 'w-md shrink-0 border-r border-gray-300 dark:border-gray-700'
								: 'flex-1'
						"
					>
						<template v-if="tab === 'query'">
							<div class="flex flex-row items-center justify-end gap-2 p-2">
								<span class="text-sm">{{ t.builderCopy }}</span>
								<button
									:class="[buttonClass, grayButtonClass]"
									@click="copyLink"
								>
									{{ t.builderLink }}
								</button>
								<button
									:class="[buttonClass, grayButtonClass]"
									@click="copyQuery"
								>
									{{ t.builderCode }}
								</button>
							</div>
							<CodeBlock :code="query" lang="graphql" />
						</template>
						<template v-else>
							<div class="flex flex-row justify-end gap-2 p-2">
								<a
									:href="`data:application/json;charset=utf-8,${encodeURIComponent(responseJson)}`"
									:download="`${root.name}.json`"
									:class="[
										buttonClass,
										grayButtonClass,
										'text-inherit no-underline',
									]"
								>
									<Download16 />{{ t.builderDownload }}
								</a>
							</div>
							<CodeBlock :code="responseJson" lang="json" />
						</template>
					</div>

					<div
						v-if="isWide || view[tab] === 'graph'"
						class="relative min-w-0 flex-1"
					>
						<QueryGraph
							v-if="tab === 'query'"
							:data="structureData"
							:getNodeLabel="({ __typename }) => __typename"
							:getNodeFields="getStructureFields"
							plainNodeColor
							:labelLang="lang"
							immersive
							hideSidebarOnMobile
						/>
						<QueryGraph
							v-else-if="response?.data[root.name]?.length"
							:data="{ [root.name]: response.data[root.name] }"
							:labelLang="lang"
							immersive
							hideSidebarOnMobile
						/>
						<p v-else class="m-0 p-4 text-center text-sm italic text-gray-400">
							{{ t.builderNoResult }}
						</p>
					</div>
				</template>
			</div>
		</section>
	</div>
</template>
