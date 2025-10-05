<script lang="ts" setup>
import { PeopleDetail, PeopleMemberDetail } from '#components';
import { enumOrganizationType } from '~/.genql';
import { graphqlClient } from '~/utils/graphql/client';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

useHead({
	title: 'People | Politigraph Admin',
});

const { data: peopleData } = await useAsyncData(
	'people-detail',
	async () => {
		const { id } = route.params;
		const { people } = await graphqlClient.query({
			people: {
				__args: {
					where: { id_EQ: route.params.id as string },
				},
				id: true,
				name: true,
				prefix: true,
				firstname: true,
				middlename: true,
				lastname: true,
				gender: true,
				birth_date: true,
				educations: true,
				image: true,
				links: {
					url: true,
					note: true,
				},
				memberships: {
					start_date: true,
					end_date: true,
					posts: {
						role: true,
						organizations: {
							name: true,
							classification: true,
						},
					},
				},
			},
		});
		console.log(people[0]);
		return people[0];
	},
	{ server: false },
);

const partyMemberships = computed({
	get: () =>
		peopleData.value?.memberships?.filter(
			(m) =>
				m.posts?.[0]?.organizations?.[0]?.classification ===
				enumOrganizationType.POLITICAL_PARTY,
		) ?? [],
	set: (val) => {
		if (peopleData.value) {
			peopleData.value.memberships = val;
		}
	},
});

const housesMemberships = computed({
	get: () =>
		peopleData.value?.memberships?.filter(
			(m) =>
				m.posts?.[0]?.organizations?.[0]?.classification ===
					enumOrganizationType.HOUSE_OF_SENATE ||
				m.posts?.[0]?.organizations?.[0]?.classification ===
					enumOrganizationType.HOUSE_OF_REPRESENTATIVE,
		) ?? [],
	set: (val) => {
		if (peopleData.value) {
			peopleData.value.memberships = val;
		}
	},
});

const cabinetMemberships = computed({
	get: () =>
		peopleData.value?.memberships?.filter(
			(m) =>
				m.posts?.[0]?.organizations?.[0]?.classification ===
				enumOrganizationType.CABINET,
		) ?? [],
	set: (val) => {
		if (peopleData.value) {
			peopleData.value.memberships = val;
		}
	},
});
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/people">People</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>{{ peopleData?.name }}</cv-breadcrumb-item>
	</cv-breadcrumb>
	<h1 class="mt-4 mb-8 font-normal">{{ peopleData?.name }}</h1>
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<PeopleDetail v-model="peopleData" />
		<div v-if="peopleData" class="flex flex-col gap-6">
			<PeopleMemberDetail
				v-if="partyMemberships.length > 0"
				classification="Party"
				v-model:memberships="partyMemberships"
			/>
			<PeopleMemberDetail
				v-if="housesMemberships.length > 0"
				classification="Houses"
				v-model:memberships="housesMemberships"
			/>
			<PeopleMemberDetail
				v-if="cabinetMemberships.length > 0"
				classification="Cabinet"
				v-model:memberships="cabinetMemberships"
			/>
		</div>
	</div>
</template>
