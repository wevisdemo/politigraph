<script setup lang="ts">
import { ADMIN_NAVIGATIONS } from '~/constants/navigation';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Politigraph Admin',
});

const graphqlClient = useGraphqlClient();

const countField = { aggregate: { count: { nodes: true } } } as const;

const { data: counts } = await useLazyAsyncData('dataset-counts', async () => {
	const {
		billsConnection,
		organizationsConnection,
		peopleConnection,
		voteEventsConnection,
	} = await graphqlClient.query({
		billsConnection: countField,
		organizationsConnection: countField,
		peopleConnection: countField,
		voteEventsConnection: countField,
	});

	return {
		bills: billsConnection.aggregate.count.nodes,
		organizations: organizationsConnection.aggregate.count.nodes,
		people: peopleConnection.aggregate.count.nodes,
		'vote-events': voteEventsConnection.aggregate.count.nodes,
	} as Record<string, number>;
});
</script>

<template>
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 p-3">
		<h1 class="font-normal">Datasets</h1>
		<div class="flex flex-row flex-wrap gap-2">
			<div v-for="{ label, path, icon } in ADMIN_NAVIGATIONS" :key="label">
				<cv-tile kind="clickable" class="bg-white hover:bg-neutral-200">
					<a :href="`/admin/${path}`">
						<component :is="icon" />
						<p class="mt-2">{{ label }}</p>
						<p class="text-sm text-neutral-500">
							{{ counts?.[path]?.toLocaleString('en-US') ?? '-' }}
						</p>
					</a>
				</cv-tile>
			</div>
		</div>
	</div>
</template>
