<script lang="ts" setup>
// @ts-expect-error carbon icons vue type
import { Save16, View16, ViewOff16 } from '@carbon/icons-vue';
import {
	enumPublishStatus,
	type Link,
	type Membership,
} from '@politigraph/graphql/genql';
import { PeopleDetail } from '#components';
import type { MembershipProp } from '~/types/membership';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

const { previewImage, setImageBlob, uploadImage, clearImage } =
	useImageUpload();

useHead({
	title: computed(
		() => `${peopleData.value?.name || 'People'} | Politigraph Admin`,
	),
});

const originalMemberships = ref<Partial<Membership>[] | null>(null);
const originalLinks = ref<Pick<Link, 'id' | 'note' | 'url'>[]>([]);

const { data: peopleData, refresh: refreshPeopleDetail } =
	await useLazyAsyncData('people-detail', async () => {
		const { people } = await graphqlClient.query({
			people: {
				__args: {
					where: { id: { eq: route.params.id as string } },
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
				publish_status: true,
				image: true,
				links: {
					id: true,
					url: true,
					note: true,
				},
				memberships: {
					__args: {
						sort: [{ end_date: 'DESC' }, { start_date: 'DESC' }],
					},
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
					district_number: true,
					label: true,
					province: true,
					list_number: true,
					links: {
						id: true,
						url: true,
						note: true,
					},
				},
			},
		});
		originalMemberships.value = JSON.parse(
			JSON.stringify(people[0].memberships),
		);

		originalLinks.value = JSON.parse(JSON.stringify(people[0].links));
		return people[0];
	});

const editableMemberships = ref<MembershipProp[]>([]);

const memberId = computed(() => peopleData.value?.id);
const { buildMembershipMutations } = useMembershipMutations({
	memberType: 'Person',
	memberId,
	originalMemberships,
});

const saveChanges = async () => {
	if (!peopleData.value) return;

	try {
		try {
			const { firstname, middlename, lastname } = peopleData.value;

			const imageUrl = await uploadImage(
				middlename
					? `${firstname}-${middlename}-${lastname}`
					: `${firstname}-${lastname}`,
				'people',
			);

			if (imageUrl) {
				peopleData.value.image = imageUrl;
			}
		} catch {
			toast.show({
				kind: 'warning',
				title: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
			});
			return;
		}

		await graphqlClient.mutation({
			updatePeople: {
				__args: {
					where: {
						id: { eq: peopleData.value?.id as string },
					},
					update: {
						prefix: { set: peopleData.value?.prefix },
						firstname: { set: peopleData.value?.firstname },
						middlename: { set: peopleData.value?.middlename },
						lastname: { set: peopleData.value?.lastname },
						firstname_en: { set: peopleData.value?.firstname_en },
						middlename_en: { set: peopleData.value?.middlename_en },
						lastname_en: { set: peopleData.value?.lastname_en },
						gender: { set: peopleData.value?.gender },
						birth_date: { set: peopleData.value?.birth_date },
						educations: { set: peopleData.value?.educations },
						previous_occupations: {
							set: peopleData.value?.previous_occupations,
						},
						image: {
							set: peopleData.value.image,
						},
					},
				},
				people: {
					id: true,
				},
			},
		});

		const linksToCreate = peopleData.value.links.filter((l) => !l.id);
		const linksToUpdate = peopleData.value.links.filter((l) => l.id);
		const linksToDelete = originalLinks.value.filter(
			(ol) => !peopleData.value?.links.some((el) => el.id === ol.id),
		);

		const createLinksPromises = linksToCreate.map((l) =>
			graphqlClient.mutation({
				createLinks: {
					__args: {
						input: [
							{
								note: l.note,
								url: l.url,
								owners: {
									Person: {
										connect: [
											{
												where: {
													node: {
														id: { eq: peopleData.value?.id },
													},
												},
											},
										],
									},
								},
							},
						],
					},
					links: { id: true },
				},
			}),
		);

		const updateLinkPromises = linksToUpdate.map((l) =>
			graphqlClient.mutation({
				updateLinks: {
					__args: {
						where: { id: { eq: l.id } },
						update: { note: { set: l.note }, url: { set: l.url } },
					},
					links: { id: true },
				},
			}),
		);

		const deleteLinksPromises = linksToDelete.map((l) =>
			graphqlClient.mutation({
				deleteLinks: {
					__args: { where: { id: { eq: l.id } } },
					nodesDeleted: true,
					relationshipsDeleted: true,
				},
			}),
		);

		await Promise.all([
			...createLinksPromises,
			...updateLinkPromises,
			...deleteLinksPromises,
			...buildMembershipMutations(editableMemberships.value),
		]);
		await refreshPeopleDetail();
		toast.show({
			kind: 'success',
			title: 'ข้อมูลถูกบันทึกเรียบร้อย',
		});
	} catch (error) {
		console.error('Failed to save changes:', error);
		toast.show({
			kind: 'warning',
			title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
			subTitle: 'กรุณาลองใหม่อีกครั้ง',
		});
	}
};

const isPublished = computed(
	() => peopleData.value?.publish_status === enumPublishStatus.PUBLISHED,
);

const togglePublishStatus = async () => {
	const { updatePeople } = await graphqlClient.mutation({
		updatePeople: {
			__args: {
				where: {
					id: { eq: peopleData.value?.id },
				},
				update: {
					publish_status: {
						set:
							peopleData.value?.publish_status !== enumPublishStatus.PUBLISHED
								? enumPublishStatus.PUBLISHED
								: enumPublishStatus.UNPUBLISHED,
					},
				},
			},
			people: {
				publish_status: true,
			},
		},
	});

	if (updatePeople.people) {
		toast.show({
			kind: 'success',
			title: 'ข้อมูลถูกบันทึกเรียบร้อย',
		});
		refreshPeopleDetail();
	}
};

const toast = useToastNotification();

const { data: organizationsOptions } = useOrganizationsWithPostsOptions();

watch(
	() => peopleData.value?.memberships,
	(newVal) => {
		if (!newVal) return;
		editableMemberships.value = newVal;
	},
	{ immediate: true },
);
</script>

<template>
	<cv-breadcrumb no-trailing-slash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/people">People</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>{{ peopleData?.name }}</cv-breadcrumb-item>
	</cv-breadcrumb>

	<FeedbackToast :notification="toast.notification" @close="toast.hide" />

	<div class="flex flex-wrap justify-between">
		<div class="flex flex-wrap items-center gap-4">
			<h1 class="mb-8 mt-4 font-normal">
				{{ peopleData?.name }}
			</h1>
			<div class="pb-2">
				<PublishStatusTag :status="peopleData?.publish_status" />
			</div>
		</div>
		<div class="flex flex-wrap items-start gap-4">
			<cv-button
				class="mt-4"
				kind="primary"
				:icon="Save16"
				@click="saveChanges"
			>
				Save Changes
			</cv-button>
			<cv-button
				default="Unpublished"
				:icon="isPublished ? ViewOff16 : View16"
				class="mt-4"
				kind="tertiary"
				@click="togglePublishStatus"
			>
				{{ isPublished ? 'Unpublished' : 'Published' }}
			</cv-button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<PeopleDetail
			v-model="peopleData"
			:preview-image="previewImage"
			@crop="setImageBlob"
			@delete="
				() => {
					if (!peopleData) return;
					peopleData.image = null;
					clearImage();
				}
			"
		/>
		<div v-if="peopleData" class="flex flex-col gap-6">
			<MembershipTable
				v-model:memberships="editableMemberships"
				:organizations-options="organizationsOptions"
				member-type="Person"
			/>
		</div>
	</div>
</template>
