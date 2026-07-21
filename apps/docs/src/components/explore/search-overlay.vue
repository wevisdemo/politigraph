<script setup lang="ts">
import { useTranslations, type Language } from '../../utils/i18n';
import type { GraphqlObject } from '../../utils/schema';
import NodeSearch from './node-search.vue';

const props = defineProps<{
	lang: Language;
	anchored?: boolean;
	loading?: boolean;
	centerLabel?: string;
	errorMessage?: string;
}>();

const t = useTranslations(props.lang);

defineEmits<{
	select: [node: GraphqlObject];
	clear: [];
}>();
</script>

<template>
	<div
		class="pointer-events-none absolute inset-x-0 z-30 m-0 flex flex-col gap-2 p-4 transition-all duration-500"
		:class="
			anchored ? 'top-0 items-center' : 'top-1/2 -translate-y-1/2 items-center'
		"
	>
		<template v-if="!anchored && !loading">
			<h1 class="">{{ t.exploreTitle }}</h1>
			<p class="text-center text-sm text-gray-400">
				{{ t.exploreHint }}
			</p>
		</template>

		<NodeSearch
			class="pointer-events-auto w-full max-w-lg"
			:lang="lang"
			:centerLabel="centerLabel"
			:loading="loading"
			@select="$emit('select', $event)"
			@clear="$emit('clear')"
		/>
		<slot />
		<p
			v-if="errorMessage"
			class="pointer-events-auto rounded bg-red-500 px-3 py-1 text-sm text-white shadow"
		>
			{{ errorMessage }}
		</p>
	</div>
</template>
