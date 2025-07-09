<script setup lang="ts">
const route = useRoute();

const { data } = await useAsyncData('docs-navigation', () =>
	queryCollectionNavigation('docs'),
);
</script>

<template>
	<div class="flex flex-row min-h-dvh">
		<div
			class="flex flex-col border-r border-gray-300 bg-gray-100 w-72 p-6 gap-4"
		>
			<a href="/">&lt; Back</a>
			<h1 class="text-2xl"><span class="font-bold">Politigraph</span> Docs</h1>
			<ul class="flex flex-col gap-3 list-disc list-inside">
				<li v-for="{ path, title } in data?.[0].children" :key="path">
					<span v-if="path === route.path">{{ title }}</span>
					<a v-else :href="path">{{ title }}</a>
				</li>
			</ul>
		</div>
		<div class="flex flex-1 px-6 py-16">
			<div class="w-full max-w-screen-md mx-auto">
				<slot />
			</div>
		</div>
	</div>
</template>
