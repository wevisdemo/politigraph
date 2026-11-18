<script lang="ts">
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const highlighter = createHighlighterCore({
	themes: [
		import('shiki/themes/night-owl.mjs'),
		import('shiki/themes/night-owl-light.mjs'),
	],
	langs: [import('shiki/langs/graphql.mjs'), import('shiki/langs/json.mjs')],
	engine: createJavaScriptRegexEngine(),
});
</script>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';

const props = defineProps<{ code: string; lang: 'graphql' | 'json' }>();

const html = ref('');

watchEffect(async () => {
	const { code, lang } = props;

	html.value = (await highlighter).codeToHtml(code, {
		lang,
		themes: { light: 'night-owl-light', dark: 'night-owl' },
	});
});
</script>

<template>
	<div
		class="[&_pre]:bg-transparent! dark:[&_span]:text-(--shiki-dark)! text-sm [&_pre]:m-0 [&_pre]:p-4"
		v-html="html"
	/>
</template>
