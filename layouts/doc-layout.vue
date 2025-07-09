<script setup lang="ts">
const route = useRoute();

const { data } = await useAsyncData('docs-navigation', () =>
	queryCollectionNavigation('docs'),
);
</script>

<template>
	<div class="flex min-h-dvh flex-row">
		<div
			class="flex w-72 flex-col gap-4 border-r border-gray-300 bg-gray-100 p-6"
		>
			<a href="/">&lt; Back</a>
			<h1 class="text-2xl"><span class="font-bold">Politigraph</span> Docs</h1>
			<ul class="flex list-inside list-disc flex-col gap-3">
				<li v-for="{ path, title } in data?.[0].children" :key="path">
					<span v-if="path === route.path">{{ title }}</span>
					<a v-else :href="path">{{ title }}</a>
				</li>
			</ul>
		</div>
		<div class="flex flex-1 px-6 py-16">
			<div class="mx-auto w-full max-w-screen-md">
				<slot />
			</div>
		</div>
	</div>
</template>
