<script setup lang="ts">
// @ts-expect-error carbon icons vue has incomplete type exports
import { Copy16, Download16, Play16 } from '@carbon/icons-vue';
import {
	computed,
	onBeforeUnmount,
	reactive,
	ref,
	shallowRef,
	watch,
} from 'vue';
import { nodeIconMap } from '../../constants/schema';
import { GRAPHQL_ENDPOINT } from '../../constants/site';
import { fetchGraphql } from '../../utils/graphql';
import { useTranslations, type Language } from '../../utils/i18n';
import {
	buildQuery,
	createSelection,
	hasIdField,
	toStructureNode,
	type Selection,
} from '../../utils/query-builder/query';
import type { BuilderSchema } from '../../utils/query-builder/schema';
import type { GraphqlDataResponse, GraphqlObject } from '../../utils/schema';
import QueryGraph from '../query-graph.vue';
import Spinner from '../spinner.vue';
import CodeBlock from './code-block.vue';
import SelectionOptions from './selection-options.vue';
import SelectionTree from './selection-tree.vue';

const props = defineProps<{ schema: BuilderSchema; lang: Language }>();

const t = useTranslations(props.lang);

const rootName = ref('people');
const root = computed(() =>
	props.schema.roots.find(({ name }) => name === rootName.value)!,
);

const createRootSelection = (): Selection =>
	reactive(createSelection(root.value));

const selection = shallowRef(createRootSelection());
const response = shallowRef<{ data: GraphqlDataResponse }>();
const error = ref<string>();
const isLoading = ref(false);

watch(rootName, () => {
	selection.value = createRootSelection();
	response.value = undefined;
	error.value = undefined;
});

const query = computed(() =>
	buildQuery(props.schema, root.value, selection.value),
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
	structure: [toStructureNode(props.schema, root.value.type, selection.value)],
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
</script>

<template>
	<div
		class="not-content mt-0! flex h-[calc(100vh-var(--sl-nav-height))] w-full flex-col md:flex-row"
	>
		<aside
			class="flex max-h-[50vh] flex-col gap-3 overflow-y-auto border-gray-300 p-4 md:max-h-none md:w-80 md:border-r dark:border-gray-700"
		>
			<label class="flex flex-col gap-1 text-sm font-bold">
				{{ t.builderRoot }}
				<div class="relative flex flex-col">
					<select
						v-model="rootName"
						class="rounded border border-gray-300 bg-white p-1 font-normal [appearance:base-select] dark:border-gray-600 dark:bg-gray-900 [&::picker(select)]:border-gray-300 [&::picker(select)]:bg-white [&::picker(select)]:[appearance:base-select] dark:[&::picker(select)]:border-gray-600 dark:[&::picker(select)]:bg-gray-900 [&::picker-icon]:hidden"
					>
						<option
							v-for="{ name, type } in schema.roots"
							:key="name"
							:value="name"
							class="flex flex-row items-center gap-2"
						>
							<component
								:is="nodeIconMap.get(type)"
								v-if="nodeIconMap.has(type)"
								class="shrink-0"
							/>
							{{ type }}
						</option>
					</select>
					<svg
						viewBox="0 0 16 16"
						aria-hidden="true"
						class="pointer-events-none absolute right-1.5 top-1/2 hidden size-3 -translate-y-1/2 supports-[appearance:base-select]:block"
					>
						<path
							d="M1 4.5l7 7 7-7"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
						/>
					</svg>
				</div>
			</label>
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

		<section class="flex min-h-0 min-w-0 flex-1 flex-col">
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
									: 'bg-transparent text-gray-500 dark:text-gray-400',
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
							<div class="flex flex-row justify-end gap-2 p-2">
								<button
									:class="[buttonClass, 'bg-gray-200 dark:bg-gray-800']"
									@click="copyQuery"
								>
									<Copy16 />{{ t.builderCopy }}
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
										'bg-gray-200 text-inherit no-underline dark:bg-gray-800',
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
							:labelLang="lang"
							immersive
						/>
						<QueryGraph
							v-else-if="response?.data[root.name]?.length"
							:data="{ [root.name]: response.data[root.name] }"
							:labelLang="lang"
							immersive
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
