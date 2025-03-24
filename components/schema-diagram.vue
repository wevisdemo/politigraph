<script lang="ts" setup>
import elkLayouts from '@mermaid-js/layout-elk';
import mermaid from 'mermaid';

const container = ref<HTMLDivElement>();

onMounted(async () => {
	mermaid.registerLayoutLoaders(elkLayouts);

	mermaid.initialize({
		startOnLoad: false,
		flowchart: {
			defaultRenderer: 'elk',
		},
		elk: {
			nodePlacementStrategy: 'NETWORK_SIMPLEX',
		},
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
