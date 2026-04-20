<script lang="ts" setup>
// @ts-ignore
import { Save16 } from '@carbon/icons-vue';
import {
	type Link,
	type Organization,
	type Post,
} from '@politigraph/graphql/genql';
import type { OrganizationDetailProps } from '~/components/organization/detail.vue';
import { diff } from 'radash';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();
const organizationId = route.params.id as string;

const { previewImage, setImageBlob, upload } = useImageUpload();

type OrganizationRelation = Pick<
	Organization,
	'id' | 'name' | 'classification'
>;

type OrganizationDetail = OrganizationDetailProps & {
	parents: OrganizationRelation[];
	children: OrganizationRelation[];
	posts: OrganizationPost[];
};

type OrganizationPost = Pick<
	Post,
	'id' | 'role' | 'start_date' | 'end_date'
> & {
	mode?: 'new' | 'edited' | 'deleted';
	membershipCount?: number;
};

const originalParentIds = ref<string[]>([]);
const originalChildIds = ref<string[]>([]);
const originalPosts = ref<
	Pick<Post, 'id' | 'role' | 'start_date' | 'end_date'>[]
>([]);
const originalLinks = ref<Pick<Link, 'id' | 'note' | 'url'>[]>([]);

const { data: organizationData, refresh: refreshOrganizationDetail } =
	await useLazyAsyncData<OrganizationDetail>(
		`organization-detail-${organizationId}`,
		async () => {
			const { organizations } = await graphqlClient.query({
				organizations: {
					__args: {
						where: { id: { eq: organizationId } },
					},
					id: true,
					name: true,
					name_en: true,
					description: true,
					classification: true,
					founding_date: true,
					dissolution_date: true,
					image: true,
					color: true,
					parents: {
						id: true,
						name: true,
						classification: true,
					},
					children: {
						id: true,
						name: true,
						classification: true,
					},
					posts: {
						__args: {
							sort: [{ end_date: 'DESC' }, { start_date: 'DESC' }],
						},
						id: true,
						role: true,
						start_date: true,
						end_date: true,
						membershipsConnection: {
							aggregate: {
								count: {
									nodes: true,
								},
							},
						},
					},
					links: {
						id: true,
						note: true,
						url: true,
					},
				},
			});

			const organization = organizations[0];
			if (!organization) {
				throw new Error('Organization not found');
			}

			originalParentIds.value = organization.parents.map((parent) => parent.id);
			originalChildIds.value = organization.children.map((child) => child.id);
			originalPosts.value = JSON.parse(JSON.stringify(organization.posts));
			originalLinks.value = JSON.parse(JSON.stringify(organization.links));

			return {
				...organization,
				posts: organization.posts.map((post) => ({
					...post,
					membershipCount:
						post.membershipsConnection?.aggregate?.count?.nodes ?? 0,
				})),
			};
		},
	);

useHead({
	title: computed(
		() =>
			`${organizationData.value?.name || 'Organizations'} | Politigraph Admin`,
	),
});

const selectedParentIds = ref<string[]>([]);
const selectedChildIds = ref<string[]>([]);
const organizationPosts = computed<OrganizationPost[] | null>({
	get: () => organizationData.value?.posts ?? null,
	set: (value) => {
		if (!organizationData.value) return;
		organizationData.value.posts = value ?? [];
	},
});

watch(
	() => organizationData.value?.parents,
	(newVal) => {
		selectedParentIds.value = newVal?.map((parent) => parent.id) ?? [];
	},
	{ immediate: true },
);

watch(
	() => organizationData.value?.children,
	(newVal) => {
		selectedChildIds.value = newVal?.map((child) => child.id) ?? [];
	},
	{ immediate: true },
);

const { data: organizationOptions } = await useAsyncData(
	'organization-options',
	async () => {
		const { organizations } = await graphqlClient.query({
			organizations: {
				__args: {
					sort: [{ name: 'ASC' }],
				},
				id: true,
				name: true,
				classification: true,
			},
		});

		return (
			organizations
				.filter((org) => org.id !== organizationId)
				.map((org) => ({
					label: org.name,
					value: org.id,
				})) ?? []
		);
	},
	{ lazy: true },
);

const toast = useToastNotification();

const saveChanges = async () => {
	if (!organizationData.value) return;

	try {
		const imageUrl = await upload(organizationData.value.name, 'organizations');

		if (imageUrl) {
			organizationData.value.image = imageUrl;
		}
	} catch {
		toast.show({
			kind: 'warning',
			title: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
		});
		return;
	}

	try {
		const nextParentIds = selectedParentIds.value.filter(
			(id) => id && id !== organizationData.value?.id,
		);
		const nextChildIds = selectedChildIds.value.filter(
			(id) => id && id !== organizationData.value?.id,
		);

		const parentDisconnectIds = diff(originalParentIds.value, nextParentIds);
		const parentConnectIds = diff(nextParentIds, originalParentIds.value);
		const childDisconnectIds = diff(originalChildIds.value, nextChildIds);
		const childConnectIds = diff(nextChildIds, originalChildIds.value);

		await graphqlClient.mutation({
			updateOrganizations: {
				__args: {
					where: {
						id: { eq: organizationData.value.id },
					},
					update: {
						name: { set: organizationData.value.name },
						name_en: { set: organizationData.value.name_en },
						description: { set: organizationData.value.description },
						classification: { set: organizationData.value.classification },
						founding_date: { set: organizationData.value.founding_date },
						dissolution_date: { set: organizationData.value.dissolution_date },
						color: { set: organizationData.value.color },
						image: { set: organizationData.value.image },
						parents: [
							{
								connect: parentConnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: parentConnectIds },
													},
												},
											},
										]
									: [],
								disconnect: parentDisconnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: parentDisconnectIds },
													},
												},
											},
										]
									: [],
							},
						],
						children: [
							{
								connect: childConnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: childConnectIds },
													},
												},
											},
										]
									: [],
								disconnect: childDisconnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: childDisconnectIds },
													},
												},
											},
										]
									: [],
							},
						],
					},
				},
				organizations: {
					id: true,
				},
			},
		});

		const activePosts = organizationData.value.posts.filter(
			(post) => post.mode !== 'deleted',
		);
		const postsToCreate = activePosts.filter(
			(post) =>
				post.mode === 'new' ||
				!originalPosts.value.some((orig) => orig.id === post.id),
		);
		const postsToUpdate = activePosts.filter((post) => {
			const original = originalPosts.value.find((orig) => orig.id === post.id);
			if (!original) return false;

			return (
				post.mode === 'edited' ||
				post.role !== original.role ||
				post.start_date !== original.start_date ||
				post.end_date !== original.end_date
			);
		});
		const postsToDelete = originalPosts.value.filter(
			(orig) => !activePosts.some((post) => post.id === orig.id),
		);

		const linksToCreate = organizationData.value.links.filter(
			(link) => !link.id,
		);
		const linksToUpdate = organizationData.value.links.filter(
			(link) => link.id,
		);
		const linksToDelete = originalLinks.value.filter(
			(ol) => !organizationData.value?.links.some((el) => el.id === ol.id),
		);

		await Promise.all([
			...postsToCreate.map((post) =>
				graphqlClient.mutation({
					createPosts: {
						__args: {
							input: [
								{
									role: post.role,
									start_date: post.start_date,
									end_date: post.end_date,
									organizations: {
										connect: [
											{
												where: {
													node: {
														id: { eq: organizationData.value?.id },
													},
												},
											},
										],
									},
								},
							],
						},
						posts: { id: true },
					},
				}),
			),
			...postsToUpdate.map((post) =>
				graphqlClient.mutation({
					updatePosts: {
						__args: {
							where: { id: { eq: post.id } },
							update: {
								role: { set: post.role },
								start_date: { set: post.start_date },
								end_date: { set: post.end_date },
							},
						},
						posts: { id: true },
					},
				}),
			),
			...postsToDelete.map((post) =>
				graphqlClient.mutation({
					deletePosts: {
						__args: {
							where: { id: { eq: post.id } },
							delete: {
								memberships: [
									{
										where: {
											node: {
												posts: {
													single: {
														id: { eq: post.id },
													},
												},
											},
										},
									},
								],
							},
						},
						nodesDeleted: true,
						relationshipsDeleted: true,
					},
				}),
			),
			...linksToCreate.map((link) =>
				graphqlClient.mutation({
					createLinks: {
						__args: {
							input: [
								{
									note: link.note,
									url: link.url,
									owners: {
										Organization: {
											connect: [
												{
													where: {
														node: {
															id: { eq: organizationData.value?.id },
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
			),
			...linksToUpdate.map((link) =>
				graphqlClient.mutation({
					updateLinks: {
						__args: {
							where: { id: { eq: link.id } },
							update: { note: { set: link.note }, url: { set: link.url } },
						},
						links: { id: true },
					},
				}),
			),
			...linksToDelete.map((link) =>
				graphqlClient.mutation({
					deleteLinks: {
						__args: { where: { id: { eq: link.id } } },
						nodesDeleted: true,
						relationshipsDeleted: true,
					},
				}),
			),
		]);

		await refreshOrganizationDetail();
		toast.show({
			kind: 'success',
			title: 'ข้อมูลถูกบันทึกเรียบร้อย',
		});
	} catch (error) {
		console.error('Failed to save organization changes:', error);
		toast.show({
			kind: 'warning',
			title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
			subTitle: 'กรุณาลองใหม่อีกครั้ง',
		});
	}
};
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item
			><a href="/admin/organizations">Organizations</a></cv-breadcrumb-item
		>
		<cv-breadcrumb-item>{{ organizationData?.name }}</cv-breadcrumb-item>
	</cv-breadcrumb>

	<ToastNotification :notification="toast.notification" @close="toast.hide" />

	<div class="flex flex-wrap justify-between">
		<div class="flex flex-wrap items-center gap-4">
			<h1 class="mb-8 mt-4 font-normal">{{ organizationData?.name }}</h1>
		</div>
		<div class="flex flex-wrap items-start gap-4">
			<cv-button @click="saveChanges" class="mt-4" kind="primary" :icon="Save16"
				>Save Changes</cv-button
			>
		</div>
	</div>

	<form
		@submit="
			(e: SubmitEvent) => {
				e.preventDefault();
				e.stopPropagation();
			}
		"
	>
		<div class="mt-4 flex flex-col items-start gap-8 md:flex-row">
			<div class="basis-2/4 bg-white p-4">
				<OrganizationDetail
					v-model="organizationData"
					v-model:selected-parent-ids="selectedParentIds"
					v-model:selected-child-ids="selectedChildIds"
					:organization-options="organizationOptions"
					:preview-image="previewImage"
					@crop="setImageBlob"
				/>
			</div>

			<div class="basis-2/4">
				<PeoplePosts v-model:posts="organizationPosts" />
			</div>
		</div>
	</form>
</template>
