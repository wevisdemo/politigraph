<script lang="ts" setup>
// @ts-ignore
import { DataVis_116 } from '@carbon/icons-vue';
</script>

<template>
	<div
		class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-100"
	>
		<DataVis_116 class="size-18" />

		<h1 class="font-medium">[Politigraph]</h1>
		<p class="text-center">
			A (WIP) civic-initiated open API for Thai political data <br />
			Developed and maintained by
			<a href="https://wevis.info" target="_blank">WeVis</a>
		</p>

		<div class="flex flex-col gap-2 md:flex-row">
			<a href="/docs">
				<cv-button class="w-full">View Documentations</cv-button>
			</a>
			<a href="/graphql">
				<cv-button kind="tertiary" class="w-full"
					>Open GraphQL Playground</cv-button
				>
			</a>
			<a href="/admin">
				<cv-button kind="ghost" class="w-full">Login to Admin Panel</cv-button>
			</a>
		</div>
	</div>
</template>
