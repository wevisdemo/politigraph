<script lang="ts" setup>
// @ts-ignore
import { Save16, View16, ViewOff16 } from '@carbon/icons-vue';
import {
	enumPublishStatus,
	type Link,
	type Membership,
} from '@politigraph/graphql/genql';
import { PeopleDetail, PeopleMembershipList } from '#components';
import type { MembershipProp } from '~/types/membership';
import { useGraphqlClient } from '~/utils/graphql/client';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

useHead({
	title: 'People | Politigraph Admin',
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

const setMembershipMutation = () => {
	const deletedMemberships = editableMemberships.value.filter(
		(m) => m.mode === 'deleted',
	);

	const activeMemberships = editableMemberships.value.filter(
		(m) => m.mode !== 'deleted',
	);

	const changedMemberships = activeMemberships
		.filter((m) => {
			const orig = originalMemberships.value?.find((o) => o.id === m.id);
			if (!orig) return true;
			return (
				m.start_date !== orig.start_date ||
				m.end_date !== orig.end_date ||
				m.posts?.[0]?.id !== orig.posts?.[0]?.id ||
				m.posts?.[0]?.organizations?.[0]?.id !==
					orig.posts?.[0]?.organizations?.[0]?.id ||
				m.links !== orig.links
			);
		})
		.map(({ mode, ...rest }) => rest);

	const newMemberships = changedMemberships.filter(
		(m) => !originalMemberships.value?.find((o) => o.id === m.id),
	);
	const updatedMemberships = changedMemberships.filter((m) =>
		originalMemberships.value?.find((o) => o.id === m.id),
	);

	const deleteMemberships = [
		...deletedMemberships,
		...(originalMemberships.value ?? []).filter(
			(ol) =>
				!activeMemberships.some((el) => el.id === ol.id) &&
				!deletedMemberships.some((d) => d.id === ol.id),
		),
	];

	return [
		...newMemberships.map((membership) =>
			graphqlClient.mutation({
				createMemberships: {
					__args: {
						input: [
							{
								district_number: membership.district_number,
								province: membership.province,
								label: membership.label,
								start_date: membership.start_date,
								end_date: membership.end_date,
								links: {
									create: membership.links.map(({ note, url }) => ({
										node: { note, url },
									})),
								},
								members: {
									Person: {
										connect: [
											{
												where: {
													node: { id: { eq: peopleData.value?.id } },
												},
											},
										],
									},
								},
								posts: {
									connect: [
										{
											where: {
												node: { id: { eq: membership.posts[0]?.id } },
											},
										},
									],
								},
							},
						],
					},
					memberships: { id: true },
				},
			}),
		),

		...deleteMemberships.map((membership) =>
			graphqlClient.mutation({
				deleteMemberships: {
					__args: { where: { id: { eq: membership.id } } },
					nodesDeleted: true,
					relationshipsDeleted: true,
				},
			}),
		),

		...updatedMemberships.map((membership) => {
			const originalMembership = originalMemberships.value?.find(
				(s) => s.id === membership.id,
			);

			const originalLinkIds = new Set(
				originalMembership?.links?.map((l) => l.id) ?? [],
			);
			const currentLinkIds = new Set(membership.links?.map((l) => l.id) ?? []);

			const newLinks =
				membership.links?.filter((l) => !originalLinkIds.has(l.id)) ?? [];
			const deletedLinks =
				originalMembership?.links?.filter((l) => !currentLinkIds.has(l.id)) ??
				[];
			const updatedLinks =
				membership.links?.filter((l) => originalLinkIds.has(l.id)) ?? [];

			return graphqlClient.mutation({
				updateMemberships: {
					__args: {
						where: { id: { eq: membership.id } },
						update: {
							start_date: { set: membership.start_date },
							end_date: { set: membership.end_date },
							posts: membership.posts[0]?.id
								? [
										{
											update: {
												node: {
													role: { set: membership.posts[0]?.role },
													organizations: membership.posts[0]?.organizations?.[0]
														?.id
														? [
																{
																	update: {
																		node: {
																			name: {
																				set: membership.posts[0]
																					?.organizations?.[0]?.name,
																			},
																		},
																	},
																},
															]
														: [],
												},
											},
										},
									]
								: [],
							label: { set: membership.label },
							district_number: { set: membership.district_number },
							links: [
								...newLinks.map((link) => ({
									create: [
										{
											node: {
												url: link.url,
												note: link.note,
											},
										},
									],
								})),
								...deletedLinks.map((link) => ({
									delete: [{ where: { node: { id: { eq: link.id } } } }],
								})),
								...updatedLinks.map((link) => ({
									update: {
										where: {
											node: {
												id: {
													eq: link.id,
												},
											},
										},
										node: {
											url: { set: link.url },
											note: { set: link.note },
										},
									},
								})),
							],
						},
					},
					memberships: { id: true },
				},
			});
		}),
	];
};

const saveChanges = async () => {
	if (!peopleData.value) return;

	try {
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
						image: { set: peopleData.value?.image },
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
			...setMembershipMutation(),
		]);
		await refreshPeopleDetail();
		openSuccessToastNotification();
	} catch (error) {
		console.error('Failed to save changes:', error);
		openFailureToastNotification();
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
		openSuccessToastNotification();
		refreshPeopleDetail();
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

		return organizationsOptions;
	},
	{ lazy: true },
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
		class="top-15 fixed right-1 z-50"
	/>

	<cv-toast-notification
		v-if="isShowFailureNotification"
		title="เกิดข้อผิดพลาดในการบันทึกข้อมูล"
		kind="warning"
		@close="isShowFailureNotification = false"
		subTitle="กรุณาลองใหม่อีกครั้ง"
		class="top-15 fixed right-1 z-50"
	/>

	<div class="flex flex-wrap justify-between">
		<div class="flex flex-wrap items-center gap-4">
			<h1 class="mb-8 mt-4 font-normal">{{ peopleData?.name }}</h1>
			<div class="pb-2">
				<UiPublishStatusTag :status="peopleData?.publish_status" />
			</div>
		</div>
		<div class="flex flex-wrap items-start gap-4">
			<cv-button @click="saveChanges" class="mt-4" kind="primary" :icon="Save16"
				>Save Changes</cv-button
			>
			<cv-button
				default="Unpublished"
				:icon="isPublished ? ViewOff16 : View16"
				class="mt-4"
				kind="tertiary"
				@click="togglePublishStatus"
				>{{ isPublished ? 'Unpublished' : 'Published' }}</cv-button
			>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<PeopleDetail v-model="peopleData" />
		<div v-if="peopleData" class="flex flex-col gap-6">
			<PeopleMembershipList
				v-model:memberships="editableMemberships"
				:organizationsOptions="organizationsOptions"
			/>
		</div>
	</div>
</template>
