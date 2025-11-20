<script setup lang="ts">
import { ADMIN_NAVIGATIONS } from '~/constants/navigation';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Politigraph Admin',
});
</script>

<template>
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 p-3">
		<h1 class="font-normal">Datasets</h1>
		<div class="flex flex-row flex-wrap gap-2">
			<div v-for="{ label, path, icon } in ADMIN_NAVIGATIONS" :key="label">
				<cv-tile kind="clickable" class="bg-white hover:bg-neutral-200">
					<a :href="`/admin/${path}`">
						<component :is="icon"></component>
						<p class="mt-2">{{ label }}</p>
					</a>
				</cv-tile>
			</div>
		</div>
	</div>
</template>
