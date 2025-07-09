<script setup lang="ts">
definePageMeta({
	layout: 'doc-layout',
});

const route = useRoute();

const { data } = await useAsyncData(route.path, () =>
	queryCollection('docs').path(route.path).first(),
);

onMounted(() => {
	if (!data.value) {
		navigateTo({
			path: '/docs',
			replace: true,
		});
	}
});

useSeoMeta({
	title: `${data.value?.title} - Politigraph Docs`,
	description: data.value?.description,
});
</script>

<template>
	<ContentRenderer
		v-if="data"
		:value="data"
		class="flex h-full flex-col gap-6"
	/>
</template>
