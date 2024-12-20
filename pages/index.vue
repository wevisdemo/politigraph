<script setup lang="ts">
import { signIn, signOut, useSession } from '~/utils/auth-client';

const email = ref('');
const password = ref('');

const session = useSession();

const graphql = await useAsyncData(
	() =>
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
	{ server: false },
);

async function login() {
	const { error } = await signIn.email({
		email: email.value,
		password: password.value,
	});

	if (error) {
		alert(error.message);
	}

	graphql.refresh();
}

async function logout() {
	const { error } = await signOut();

	if (error) {
		alert(error.message);
	}

	graphql.refresh();
}
</script>

<template>
	<h1>Politigraph</h1>
	<div v-if="!session.isPending">
		<form
			v-if="!session.data"
			@submit="
				(e) => {
					login();
					e.preventDefault();
				}
			"
		>
			<input type="email" placeholder="email" v-model="email" />
			<input type="password" placeholder="password" v-model="password" />
			<button type="submit">Sign In</button>
		</form>
		<div v-else>
			<p>Hi {{ session.data.user.name }}</p>
			<button @click="logout">Sign Out</button>
		</div>
	</div>

	<pre v-if="graphql.data">{{ graphql.data }}</pre>
	<pre v-if="graphql.error">{{ graphql.error }}</pre>
</template>
