<script lang="ts" setup>
import mermaid from 'mermaid';

const container = ref<HTMLDivElement>();

onMounted(async () => {
	mermaid.initialize({
		startOnLoad: false,
	});

	const mermaidString = await $fetch('/schema-mermaid');

	if (container.value) {
		container.value.innerHTML = (
			await mermaid.render('politigraph-schema', mermaidString, container.value)
		).svg;
	}
});
</script>

<template>
	<div ref="container" class="w-full"></div>
</template>
