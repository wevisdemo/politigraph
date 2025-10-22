<script lang="ts" setup>
// @ts-ignore
import { Save16, ViewOff16 } from '@carbon/icons-vue';
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

const { data: peopleData, refresh: refreshPeopleDetail } = await useAsyncData(
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
				name_en: true,
				prefix: true,
				firstname: true,
				middlename: true,
				lastname: true,
				firstname_en: true,
				middlename_en: true,
				lastname_en: true,
				gender: true,
				birth_date: true,
				educations: true,
				previous_occupations: true,
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
							id: true,
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
			const others =
				peopleData.value.memberships?.filter(
					(m) =>
						m.posts?.[0]?.organizations?.[0]?.classification !==
						enumOrganizationType.POLITICAL_PARTY,
				) ?? [];

			peopleData.value.memberships = [...others, ...val];
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
			const others =
				peopleData.value.memberships?.filter(
					(m) =>
						m.posts?.[0]?.organizations?.[0]?.classification !==
							enumOrganizationType.HOUSE_OF_SENATE &&
						m.posts?.[0]?.organizations?.[0]?.classification !==
							enumOrganizationType.HOUSE_OF_REPRESENTATIVE,
				) ?? [];

			peopleData.value.memberships = [...others, ...val];
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
			const others =
				peopleData.value.memberships?.filter(
					(m) =>
						m.posts?.[0]?.organizations?.[0]?.classification !==
						enumOrganizationType.CABINET,
				) ?? [];

			peopleData.value.memberships = [...others, ...val];
		}
	},
});

const saveChanges = async () => {
	console.log(peopleData.value);
	console.log(partyMemberships);
	console.log(housesMemberships);
	console.log(cabinetMemberships);
	try {
		await graphqlClient.mutation({
			updatePeople: {
				__args: {
					where: {
						id_EQ: peopleData.value?.id as string,
					},
					update: {
						prefix_SET: peopleData.value?.prefix,
						firstname_SET: peopleData.value?.firstname,
						middlename_SET: peopleData.value?.middlename,
						lastname_SET: peopleData.value?.lastname,
						firstname_en_SET: peopleData.value?.firstname_en,
						middlename_en_SET: peopleData.value?.middlename_en,
						lastname_en_SET: peopleData.value?.lastname_en,
						gender_SET: peopleData.value?.gender,
						birth_date_SET: peopleData.value?.birth_date,
						educations_SET: peopleData.value?.educations,
						previous_occupations_SET: peopleData.value?.previous_occupations,
						image_SET: peopleData.value?.image,
					},
				},
				people: {
					id: true,
				},
			},
		});

		// await Promise.all(

		refreshPeopleDetail();
		openSuccessToastNotification();
	} catch (error) {
		console.error('Failed to save changes:', error);
		alert('Failed to save changes.');
	}
};

const isShowSuccessNotification = ref(false);
const openSuccessToastNotification = () => {
	isShowSuccessNotification.value = false;
	isShowSuccessNotification.value = true;

	setTimeout(() => {
		isShowSuccessNotification.value = false;
	}, 5000);
};

const { data: organizationsOptions } = await useAsyncData(
	'classification-options',
	async () => {
		const { organizations } = await graphqlClient.query({
			organizations: {
				id: true,
				name: true,
				classification: true,
			},
		});
		const organizationsOptions = organizations.map((org) => ({
			label: org.name,
			value: org.id,
			classification: org.classification,
		}));

		console.log(organizationsOptions);
		return organizationsOptions;
	},
	{ server: false },
);

const getOrganizationClassification = (classification: string) => {
	const org = organizationsOptions.value?.filter(
		(o) => o.classification === classification,
	);
	return org?.map((o) => ({ label: o.label, value: o.value })) || [];
};

const postOptions = [
	{ label: 'member', value: 'member' },
	{ label: 'leader', value: 'leader' },
	{ label: 'prime minister', value: 'prime_minister' },
	{ label: 'minister', value: 'minister' },
];
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/people">People</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>{{ peopleData?.name }}</cv-breadcrumb-item>
	</cv-breadcrumb>

	<cv-toast-notification
		v-if="isShowSuccessNotification"
		kind="success"
		title="ข้อมูลถูกบันทึกเรียบร้อย"
		@close="isShowSuccessNotification = false"
		class="fixed top-[60px] right-[4px] z-50"
	/>

	<div class="flex flex-wrap justify-between">
		<h1 class="mt-4 mb-8 font-normal">{{ peopleData?.name }}</h1>
		<div class="flex flex-wrap items-start gap-4">
			<cv-button @click="saveChanges" class="mt-4" kind="primary" :icon="Save16"
				>Save Changes</cv-button
			>
			<cv-button @click="" class="mt-4" kind="tertiary" :icon="ViewOff16"
				>Unpublished</cv-button
			>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<PeopleDetail v-model="peopleData" />
		<div v-if="peopleData" class="flex flex-col gap-6">
			<PeopleMemberDetail
				title="Party"
				:classification="enumOrganizationType.POLITICAL_PARTY"
				:organizationsOptions="
					getOrganizationClassification(enumOrganizationType.POLITICAL_PARTY)
				"
				:postOptions="postOptions"
				v-model:memberships="partyMemberships"
			/>
			<PeopleMemberDetail
				title="Houses"
				:classification="enumOrganizationType.HOUSE_OF_REPRESENTATIVE"
				:organizationsOptions="
					getOrganizationClassification(
						enumOrganizationType.HOUSE_OF_REPRESENTATIVE,
					).concat(
						getOrganizationClassification(enumOrganizationType.HOUSE_OF_SENATE),
					)
				"
				:postOptions="postOptions"
				v-model:memberships="housesMemberships"
			/>
			<PeopleMemberDetail
				title="Cabinet"
				:classification="enumOrganizationType.CABINET"
				:organizationsOptions="
					getOrganizationClassification(enumOrganizationType.CABINET)
				"
				:postOptions="postOptions"
				v-model:memberships="cabinetMemberships"
			/>
		</div>
	</div>
</template>
