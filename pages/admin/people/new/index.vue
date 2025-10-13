<script lang="ts" setup>
import { PeopleDetail, PeopleMemberDetail } from '#components';
import type { PeopleDetailProps } from '~/components/people/detail.vue';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'New People | Politigraph Admin',
});

const peopleDetailData = ref<PeopleDetailProps>({
	id: '',
	name: '',
	prefix: '',
	firstname: '',
	middlename: '',
	lastname: '',
	gender: null,
	birth_date: null,
	educations: null,
	image: null,
	links: [],
});

const partyMemberships = ref([]);
const housesMemberships = ref([]);
const cabinetMemberships = ref([]);

const savePeople = async () => {
	console.log('Saving people data:', peopleDetailData.value);
};
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/people">People</a></cv-breadcrumb-item>
	</cv-breadcrumb>
	<div class="flex flex-wrap justify-between">
		<h1 class="mt-4 mb-8 font-normal">
			{{
				[
					peopleDetailData.firstname,
					peopleDetailData.middlename,
					peopleDetailData.lastname,
				]
					.filter(Boolean)
					.join(' ') || 'New People'
			}}
		</h1>
		<div class="flex flex-wrap items-start gap-4">
			<cv-button @click="savePeople" class="mt-4" kind="primary"
				>Save Changes</cv-button
			>
			<cv-button @click="savePeople" class="mt-4" kind="tertiary"
				>Unpublished</cv-button
			>
		</div>
	</div>
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<PeopleDetail v-model="peopleDetailData" />
		<div class="flex flex-col gap-6">
			<PeopleMemberDetail
				classification="Party"
				v-model:memberships="partyMemberships"
			/>
			<PeopleMemberDetail
				classification="Houses"
				v-model:memberships="housesMemberships"
			/>
			<PeopleMemberDetail
				classification="Cabinet"
				v-model:memberships="cabinetMemberships"
			/>
		</div>
	</div>
</template>
