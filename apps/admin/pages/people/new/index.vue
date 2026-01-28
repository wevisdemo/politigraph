<script lang="ts" setup>
// @ts-ignore
import { Save16 } from '@carbon/icons-vue';
import {
	enumOrganizationType,
	enumPublishStatus,
} from '@politigraph/graphql/genql';
import { PeopleDetail, PeopleMemberDetail } from '#components';
import type { PeopleDetailProps } from '~/components/people/detail.vue';
import { useGraphqlClient } from '~/utils/graphql/client';

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
	firstname_en: '',
	middlename_en: '',
	lastname_en: '',
	gender: null,
	birth_date: null,
	educations: '',
	previous_occupations: '',
	image: '',
	links: [],
});

const partyMemberships = ref([]);
const housesMemberships = ref([]);
const cabinetMemberships = ref([]);

const router = useRouter();
const graphqlClient = useGraphqlClient();
const isShowSuccessNotification = ref(false);
const isShowFailureNotification = ref(false);
const failMessage = ref('');

const openSuccessToastNotification = () => {
	isShowSuccessNotification.value = false;
	isShowSuccessNotification.value = true;

	setTimeout(() => {
		isShowSuccessNotification.value = false;
	}, 5000);
};

const openFailureToastNotification = (message: string) => {
	failMessage.value = message;
	isShowFailureNotification.value = false;
	isShowFailureNotification.value = true;

	setTimeout(() => {
		isShowFailureNotification.value = false;
	}, 5000);
};

const savePeople = async () => {
	const mandatoryFields = [
		{ value: peopleDetailData.value.prefix, name: 'Title' },
		{ value: peopleDetailData.value.firstname, name: 'Firstname' },
		{ value: peopleDetailData.value.lastname, name: 'Lastname' },
	];

	const emptyFields = mandatoryFields.filter((f) => !f.value?.trim());

	if (emptyFields.length > 0) {
		openFailureToastNotification(
			`กรุณากรอก: ${emptyFields.map((f) => f.name).join(', ')}`,
		);
		return;
	}

	try {
		const createPeopleResult = await graphqlClient.mutation({
			createPeople: {
				__args: {
					input: [
						{
							prefix: peopleDetailData.value.prefix || '',
							firstname: peopleDetailData.value.firstname || '',
							middlename: peopleDetailData.value.middlename,
							lastname: peopleDetailData.value.lastname || '',
							firstname_en: peopleDetailData.value.firstname_en,
							middlename_en: peopleDetailData.value.middlename_en,
							lastname_en: peopleDetailData.value.lastname_en,
							gender: peopleDetailData.value.gender,
							birth_date: peopleDetailData.value.birth_date,
							educations: peopleDetailData.value.educations,
							previous_occupations: peopleDetailData.value.previous_occupations,
							image: peopleDetailData.value.image,
							publish_status: enumPublishStatus.UNPUBLISHED,
						},
					],
				},
				people: { id: true },
			},
		});

		const newPersonId = createPeopleResult.createPeople?.people?.[0]?.id;
		if (!newPersonId) throw new Error('Failed to create person');

		const createLinksPromises = (peopleDetailData.value.links || []).map((l) =>
			graphqlClient.mutation({
				createLinks: {
					__args: {
						input: [
							{
								note: l.note,
								url: l.url,
								owners: {
									Person: {
										connect: [{ where: { node: { id: { eq: newPersonId } } } }],
									},
								},
							},
						],
					},
					links: { id: true },
				},
			}),
		);

		await Promise.all(createLinksPromises);

		console.log('New person created successfully:', newPersonId);
		openSuccessToastNotification();
		router.push(`/admin/people/${newPersonId}`);
	} catch (error) {
		console.error('Failed to create new person:', error);
		openFailureToastNotification('กรุณาลองใหม่อีกครั้ง');
	}
};
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/people">People</a></cv-breadcrumb-item>
	</cv-breadcrumb>

	<cv-toast-notification
		v-if="isShowSuccessNotification"
		kind="success"
		title="ข้อมูลถูกบันทึกเรียบร้อย"
		@close="isShowSuccessNotification = false"
		class="fixed right-1 top-[60px] z-50"
	/>

	<cv-toast-notification
		v-if="isShowFailureNotification"
		title="เกิดข้อผิดพลาดในการบันทึกข้อมูล"
		kind="warning"
		@close="isShowFailureNotification = false"
		:subTitle="failMessage"
		class="fixed right-1 top-[60px] z-50"
	/>

	<div class="flex flex-wrap justify-between">
		<h1 class="mb-8 mt-4 font-normal">
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
			<cv-button @click="savePeople" class="mt-4" kind="primary" :icon="Save16"
				>Save Changes</cv-button
			>
		</div>
	</div>
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<PeopleDetail v-model="peopleDetailData" />
		<div class="flex flex-col gap-6">
			<PeopleMemberDetail
				title="Party"
				:classification="enumOrganizationType.POLITICAL_PARTY"
				v-model:memberships="partyMemberships"
			/>
			<PeopleMemberDetail
				title="Houses"
				:classification="enumOrganizationType.HOUSE_OF_REPRESENTATIVE"
				v-model:memberships="housesMemberships"
			/>
			<PeopleMemberDetail
				title="Cabinet"
				:classification="enumOrganizationType.CABINET"
				v-model:memberships="cabinetMemberships"
			/>
		</div>
	</div>
</template>
