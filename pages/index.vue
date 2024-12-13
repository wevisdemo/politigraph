<script setup>
const { data } = await useAsyncData(() =>
	graphqlClient.query({
		organizations: {
			__scalar: true,
			parents: {
				name: true,
			},
			children: {
				name: true,
			},
		},
	}),
);
</script>

<template>
	<h1>Politigraph</h1>
	<pre>{{ data }}</pre>
</template>
