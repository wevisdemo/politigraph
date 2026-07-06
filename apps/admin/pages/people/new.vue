<script lang="ts" setup>
// @ts-ignore
import { Add16 } from '@carbon/icons-vue';
import { enumPublishStatus } from '@politigraph/graphql/genql';
import { PeopleDetail } from '#components';
import type { PeopleDetailProps } from '~/components/people/detail.vue';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'New Person | Politigraph Admin',
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

const router = useRouter();
const graphqlClient = useGraphqlClient();
const toast = useToastNotification();

const { setImageBlob, uploadImage } = useImageUpload();

const savePeople = async () => {
	const mandatoryFields = [
		{ value: peopleDetailData.value.prefix, name: 'Title' },
		{ value: peopleDetailData.value.firstname, name: 'Firstname' },
		{ value: peopleDetailData.value.lastname, name: 'Lastname' },
	];

	const emptyFields = mandatoryFields.filter((f) => !f.value?.trim());

	if (emptyFields.length > 0) {
		toast.show({
			kind: 'warning',
			title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
			subTitle: `กรุณากรอก: ${emptyFields.map((f) => f.name).join(', ')}`,
		});
		return;
	}

	try {
		const { firstname, middlename, lastname } = peopleDetailData.value;

		const imageUrl = await uploadImage(
			middlename
				? `${firstname}-${middlename}-${lastname}`
				: `${firstname}-${lastname}`,
			'people',
		);

		if (imageUrl) {
			peopleDetailData.value.image = imageUrl;
		}
	} catch (error) {
		toast.show({
			kind: 'warning',
			title: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
		});
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
							image: null,
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

		toast.show({
			kind: 'success',
			title: 'บุคคลใหม่ถูกสร้างเรียบร้อยแล้ว',
		});
		router.replace(`/people/${newPersonId}`);
	} catch (error) {
		console.error('Failed to create new person:', error);
		toast.show({
			kind: 'warning',
			title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
			subTitle: 'กรุณาลองใหม่อีกครั้ง',
		});
	}
};
</script>

<template>
	<cv-breadcrumb no-trailing-slash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/people">People</a></cv-breadcrumb-item>
	</cv-breadcrumb>

	<ToastNotification :notification="toast.notification" @close="toast.hide" />

	<div class="flex flex-wrap justify-between">
		<h1 class="mb-8 mt-4 font-normal">
			{{
				[
					peopleDetailData.firstname,
					peopleDetailData.middlename,
					peopleDetailData.lastname,
				]
					.filter(Boolean)
					.join(' ') || 'New Person'
			}}
		</h1>
		<div class="flex flex-wrap items-start gap-4">
			<cv-button class="mt-4" kind="primary" :icon="Add16" @click="savePeople">
				Create
			</cv-button>
		</div>
	</div>
	<div class="flex flex-col items-start gap-4 md:flex-row">
		<div class="flex-1">
			<PeopleDetail v-model="peopleDetailData" @crop="setImageBlob" />
		</div>
		<div class="flex flex-1 flex-col space-y-4 bg-white p-4">
			<h4 class="mb-1 pt-2">Membership</h4>
			<p class="text-sm text-neutral-600">การเป็นสมาชิกในองค์กรต่างๆ</p>
			<p class="py-12 text-center text-sm">
				ต้องสร้างบุคคลใหม่ให้เสร็จเรียบร้อยก่อนถึงจะสามารถเพิ่มการเป็นสมาชิกได้
			</p>
		</div>
	</div>
</template>
