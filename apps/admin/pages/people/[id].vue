<script lang="ts" setup>
import {
	enumPublishStatus,
	type Link,
	type Membership,
	type Person,
	type PersonUpdateInput,
} from '@politigraph/graphql/genql';
import { PeopleDetail } from '#components';
import type { MembershipProp } from '~/types/membership';
import type { UpdateFields } from '~/utils/update-input';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

const { previewImage, setImageBlob, uploadImage, clearImage } =
	useImageUpload();

const originalPerson = ref<Partial<Person>>();
const originalMemberships = ref<Partial<Membership>[] | null>(null);
const originalLinks = ref<Pick<Link, 'id' | 'note' | 'url'>[]>([]);

const { data: peopleData, refresh: refreshPeopleDetail } =
	await useLazyAsyncData(`people-detail-${route.params.id}`, async () => {
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
					post: {
						id: true,
						role: true,
						organization: {
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
		originalPerson.value = JSON.parse(JSON.stringify(people[0]));
		originalMemberships.value = JSON.parse(
			JSON.stringify(people[0].memberships),
		);

		originalLinks.value = JSON.parse(JSON.stringify(people[0].links));
		return {
			...people[0],
			memberships: people[0].memberships.map(withEditablePost),
		};
	});

useHead({
	title: computed(
		() => `${peopleData.value?.name || 'People'} | Politigraph Admin`,
	),
});

const editableMemberships = ref<MembershipProp[]>([]);

const memberId = computed(() => peopleData.value?.id);
const { buildMembershipMutations } = useMembershipMutations({
	memberType: 'Person',
	memberId,
	originalMemberships,
});

const personFields = [
	'prefix',
	'firstname',
	'middlename',
	'lastname',
	'firstname_en',
	'middlename_en',
	'lastname_en',
	'gender',
	'birth_date',
	'educations',
	'previous_occupations',
	'image',
] as const satisfies UpdateFields<PersonUpdateInput>;

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

		const links = diffLinks(originalLinks.value, peopleData.value.links);
		const personUpdate = {
			...changedSets(originalPerson.value, peopleData.value, personFields),
			links: linksUpdate(links),
		};

		if (hasChanges(personUpdate)) {
			await graphqlClient.mutation({
				updatePeople: {
					__args: {
						where: { id: { eq: peopleData.value.id } },
						update: personUpdate,
					},
					people: {
						id: true,
					},
				},
			});
		}

		const updateLinkPromises = links.updates.map(({ id, update }) =>
			graphqlClient.mutation({
				updateLinks: {
					__args: { where: { id: { eq: id } }, update },
					links: { id: true },
				},
			}),
		);

		await Promise.all([
			...updateLinkPromises,
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
const { isSaving, guardSave } = useSaveGuard(toast);

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

	<UiEntityHeader
		entity="person"
		:entity-id="route.params.id as string"
		:title="peopleData?.name"
		:publish-status="peopleData?.publish_status"
		:is-save-disabled="isSaving"
		@toggle-publish-status="togglePublishStatus"
		@save="guardSave(saveChanges)"
	/>

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
