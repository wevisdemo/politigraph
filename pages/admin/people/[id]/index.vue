<script lang="ts" setup>
// @ts-ignore
import { Save16, ViewOff16 } from '@carbon/icons-vue';
import { PeopleDetail, PeopleMemberDetail } from '#components';
import { enumOrganizationType, type Membership } from '~/.genql';
import type { MemberShipProp } from '~/components/people/member-detail.vue';
import { graphqlClient } from '~/utils/graphql/client';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

useHead({
	title: 'People | Politigraph Admin',
});

const originalMemberships = ref<Partial<Membership>[] | null>(null);
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
					id: true,
					start_date: true,
					end_date: true,
					posts: {
						id: true,
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
		originalMemberships.value = JSON.parse(
			JSON.stringify(people[0].memberships),
		);
		return people[0];
	},
	{ server: false },
);

const partyMemberships = ref<MemberShipProp[]>([]);
const housesMemberships = ref<MemberShipProp[]>([]);
const cabinetMemberships = ref<MemberShipProp[]>([]);

watch(
	() => peopleData.value?.memberships,
	(newVal) => {
		if (!newVal) return;

		partyMemberships.value = newVal.filter(
			(m) =>
				m.posts?.[0]?.organizations?.[0]?.classification ===
				enumOrganizationType.POLITICAL_PARTY,
		);

		housesMemberships.value = newVal.filter(
			(m) =>
				m.posts?.[0]?.organizations?.[0]?.classification ===
					enumOrganizationType.HOUSE_OF_SENATE ||
				m.posts?.[0]?.organizations?.[0]?.classification ===
					enumOrganizationType.HOUSE_OF_REPRESENTATIVE,
		);

		cabinetMemberships.value = newVal.filter(
			(m) =>
				m.posts?.[0]?.organizations?.[0]?.classification ===
				enumOrganizationType.CABINET,
		);
	},
	{ immediate: true },
);

const getChangedMemberships = (current: MemberShipProp[]) => {
	return current.filter((m) => {
		const orig = originalMemberships.value?.find((o) => o.id === m.id);
		if (!orig) return true;

		return (
			m.start_date !== orig.start_date ||
			m.end_date !== orig.end_date ||
			m.posts?.[0]?.id !== orig.posts?.[0]?.id ||
			m.posts?.[0]?.organizations?.[0]?.id !==
				orig.posts?.[0]?.organizations?.[0]?.id
		);
	});
};

const changedPartyMemberships = ref<MemberShipProp[]>([]);
const changedHousesMemberships = ref<MemberShipProp[]>([]);
const changedCabinetMemberships = ref<MemberShipProp[]>([]);

watch(
	[partyMemberships, housesMemberships, cabinetMemberships],
	() => {
		changedPartyMemberships.value = getChangedMemberships(
			partyMemberships.value ?? [],
		);
		changedHousesMemberships.value = getChangedMemberships(
			housesMemberships.value ?? [],
		);
		changedCabinetMemberships.value = getChangedMemberships(
			cabinetMemberships.value ?? [],
		);
	},
	{
		deep: true,
	},
);

const saveChanges = async () => {
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

		const changedMemberships = [
			...changedPartyMemberships.value,
			...changedHousesMemberships.value,
			...changedCabinetMemberships.value,
		];

		const newMemberships = changedMemberships.filter((m) => !m.id);
		const updatedMemberships = changedMemberships.filter((m) => !!m.id);

		console.log({ newMemberships });

		const updatePromises = updatedMemberships.map(async (membership) => {
			const newPostId = membership.posts[0]?.id;
			if (!newPostId)
				throw new Error('Post ID is required for membership update.');
			const oldPostId = originalMemberships.value?.find(
				(s) => s.id === membership.id,
			)?.posts?.[0]?.id;

			return graphqlClient.mutation({
				updateMemberships: {
					__args: {
						where: { id_EQ: membership.id },
						update: {
							start_date_SET: membership.start_date,
							end_date_SET: membership.end_date,
							posts: [
								{
									disconnect: oldPostId
										? [
												{
													where: { node: { id_EQ: oldPostId } },
												},
											]
										: [],
									connect: [
										{
											where: { node: { id_EQ: newPostId } },
										},
									],
								},
							],
						},
					},
					memberships: { id: true },
				},
			});
		});

		await Promise.all([...updatePromises]);
		await refreshPeopleDetail();
		openSuccessToastNotification();
	} catch (error) {
		console.error('Failed to save changes:', error);
		openFailureToastNotification();
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

const isShowFailureNotification = ref(false);
const openFailureToastNotification = () => {
	isShowFailureNotification.value = false;
	isShowFailureNotification.value = true;

	setTimeout(() => {
		isShowFailureNotification.value = false;
	}, 5000);
};

const { data: organizationsOptions } = await useAsyncData(
	'organizations-with-posts',
	async () => {
		const { organizations } = await graphqlClient.query({
			organizations: {
				id: true,
				name: true,
				classification: true,
				posts: {
					id: true,
					role: true,
				},
			},
		});
		const organizationsOptions = organizations.map((org) => ({
			label: org.name,
			value: org.id,
			classification: org.classification,
			posts:
				org.posts?.map((p) => ({
					label: p.role,
					value: p.id,
				})) ?? [],
		}));

		console.log(organizationsOptions);
		return organizationsOptions;
	},
	{ server: false },
);

const selectedOrganization = ref<string | null>(null);
const postOptions = ref<{ label: string; value: string }[]>([]);

watch(selectedOrganization, (orgId) => {
	if (!orgId) {
		postOptions.value = [];
		return;
	}
	const org = organizationsOptions.value?.find((o) => o.value === orgId);
	postOptions.value = org?.posts || [];
});

const getOrganizationOptions = (classification: string) => {
	const org = organizationsOptions.value?.filter(
		(o) => o.classification === classification,
	);
	return (
		org?.map((o) => ({
			label: o.label,
			value: o.value,
			classification: o.classification,
			posts: o.posts,
		})) || []
	);
};
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

	<cv-toast-notification
		v-if="isShowFailureNotification"
		title="เกิดข้อผิดพลาดในการบันทึกข้อมูล"
		kind="warning"
		@close="isShowFailureNotification = false"
		subTitle="กรุณาลองใหม่อีกครั้ง"
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
					getOrganizationOptions(enumOrganizationType.POLITICAL_PARTY)
				"
				v-model:memberships="partyMemberships"
				:editedMembershipsId="new Set(changedPartyMemberships.map((m) => m.id))"
				@savechanges="saveChanges"
			/>
			<PeopleMemberDetail
				title="Houses"
				:classification="enumOrganizationType.HOUSE_OF_REPRESENTATIVE"
				:organizationsOptions="
					getOrganizationOptions(
						enumOrganizationType.HOUSE_OF_REPRESENTATIVE,
					).concat(getOrganizationOptions(enumOrganizationType.HOUSE_OF_SENATE))
				"
				v-model:memberships="housesMemberships"
				:editedMembershipsId="
					new Set(changedHousesMemberships.map((m) => m.id))
				"
				@savechanges="saveChanges"
			/>
			<PeopleMemberDetail
				title="Cabinet"
				:classification="enumOrganizationType.CABINET"
				:organizationsOptions="
					getOrganizationOptions(enumOrganizationType.CABINET)
				"
				v-model:memberships="cabinetMemberships"
				:editedMembershipsId="
					new Set(changedCabinetMemberships.map((m) => m.id))
				"
				@savechanges="saveChanges"
			/>
		</div>
	</div>
</template>
