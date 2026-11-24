<script lang="ts" setup>
import {
	type Link,
	type Membership,
	type Organization,
	type OrganizationUpdateInput,
	type Post,
	type PostUpdateInput,
} from '@politigraph/graphql/genql';
import type { OrganizationDetailProps } from '~/components/organization/detail.vue';
import type { MembershipProp } from '~/types/membership';
import type { UpdateFields } from '~/utils/update-input';
import { diff } from 'radash';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();
const organizationId = route.params.id as string;

const { previewImage, setImageBlob, uploadImage, clearImage } =
	useImageUpload();

type OrganizationRelation = Pick<
	Organization,
	'id' | 'name' | 'classification'
>;

type OrganizationDetail = OrganizationDetailProps & {
	parents: OrganizationRelation[];
	children: OrganizationRelation[];
	posts: OrganizationPost[];
	memberships: MembershipProp[];
};

type OrganizationPost = Pick<
	Post,
	'id' | 'role' | 'start_date' | 'end_date'
> & {
	mode?: 'new' | 'edited' | 'deleted';
	membershipCount?: number;
	memberships?: MembershipProp[];
};

const originalParentIds = ref<string[]>([]);
const originalChildIds = ref<string[]>([]);
const originalPosts = ref<
	(Pick<Post, 'id' | 'role' | 'start_date' | 'end_date'> & {
		memberships?: MembershipProp[];
	})[]
>([]);
const originalOrganization = ref<Partial<Organization>>();
const originalLinks = ref<Pick<Link, 'id' | 'note' | 'url'>[]>([]);
const originalMemberships = ref<Partial<Membership>[] | null>(null);

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
						memberships: {
							__args: {
								sort: [{ end_date: 'DESC' }, { start_date: 'DESC' }],
							},
							id: true,
							start_date: true,
							end_date: true,
							label: true,
							province: true,
							district_number: true,
							list_number: true,
							links: {
								id: true,
								url: true,
								note: true,
							},
							member: {
								on_Person: {
									__typename: true,
									id: true,
									name: true,
								},
								on_Organization: {
									__typename: true,
									id: true,
									name: true,
								},
							},
						},
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
			originalOrganization.value = JSON.parse(JSON.stringify(organization));
			originalLinks.value = JSON.parse(JSON.stringify(organization.links));
			originalMemberships.value = JSON.parse(
				JSON.stringify(organization.memberships),
			);

			const posts = organization.posts.map((post) => ({
				...post,
				membershipCount:
					post.membershipsConnection?.aggregate?.count?.nodes ?? 0,
				memberships: (post.memberships ?? []).map((m) => {
					const member = m.member as {
						__typename?: string;
						id: string;
						name: string;
					} | null;
					const resolvedType: 'Person' | 'Organization' =
						member?.__typename === 'Organization' ? 'Organization' : 'Person';

					return {
						id: m.id,
						start_date: m.start_date,
						end_date: m.end_date,
						label: m.label,
						province: m.province,
						district_number: m.district_number,
						list_number: m.list_number,
						links: m.links ?? [],
						post: {
							id: post.id,
							role: post.role,
							organization: {
								id: organization.id,
								name: organization.name,
								classification: organization.classification,
							},
						},
						member: member ? { id: member.id, name: member.name } : null,
						memberType: resolvedType,
					};
				}),
			}));
			originalPosts.value = JSON.parse(JSON.stringify(posts));

			return {
				...organization,
				posts,
				memberships: organization.memberships.map(withEditablePost),
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

const editableMemberships = ref<MembershipProp[]>([]);

const memberId = computed(() => organizationData.value?.id);
const { buildMembershipMutations } = useMembershipMutations({
	memberType: 'Organization',
	memberId,
	originalMemberships,
});

watch(
	() => organizationData.value?.memberships,
	(newVal) => {
		if (!newVal) return;
		editableMemberships.value = newVal;
	},
	{ immediate: true },
);

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

const { data: organizationsWithPostsOptions } =
	useOrganizationsWithPostsOptions();

const { data: peopleOptions, execute: executePeopleOptions } = usePeopleOptions(
	{ immediate: false },
);

const onMemberTypeChange = (type: 'Person' | 'Organization') => {
	if (type === 'Person') {
		executePeopleOptions();
	}
};

const membershipOrganizationsOptions = computed(() => {
	return (
		organizationsWithPostsOptions.value?.filter(
			(org) => org.value !== organizationId,
		) ?? []
	);
});

const toast = useToastNotification();
const { isSaving, guardSave } = useSaveGuard(toast);

function getOrganizationTypePlural(type: string): string {
	const lower = type.toLowerCase().replaceAll('_', '-');
	return lower.endsWith('y') ? lower.slice(0, -1) + 'ies' : lower + 's';
}

const organizationFields = [
	'name',
	'name_en',
	'description',
	'classification',
	'founding_date',
	'dissolution_date',
	'color',
	'image',
] as const satisfies UpdateFields<OrganizationUpdateInput>;
const postFields = [
	'role',
	'start_date',
	'end_date',
] as const satisfies UpdateFields<PostUpdateInput>;

const saveChanges = async () => {
	if (!organizationData.value) return;

	try {
		const imageUrl = await uploadImage(
			organizationData.value.name,
			`organizations/${getOrganizationTypePlural(organizationData.value.classification)}`,
		);

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

		const links = diffLinks(originalLinks.value, organizationData.value.links);
		const organizationUpdate = {
			...changedSets(
				originalOrganization.value,
				organizationData.value,
				organizationFields,
			),
			links: linksUpdate(links),
			parents: relationUpdate(parentConnectIds, parentDisconnectIds),
			children: relationUpdate(childConnectIds, childDisconnectIds),
		};

		if (hasChanges(organizationUpdate)) {
			await graphqlClient.mutation({
				updateOrganizations: {
					__args: {
						where: { id: { eq: organizationData.value.id } },
						update: organizationUpdate,
					},
					organizations: { id: true },
				},
			});
		}

		const activePosts = organizationData.value.posts.filter(
			(post) => post.mode !== 'deleted',
		);
		const postsToCreate = activePosts.filter(
			(post) =>
				post.mode === 'new' ||
				!originalPosts.value.some((orig) => orig.id === post.id),
		);
		const postsToUpdate = activePosts.flatMap((post) => {
			const original = originalPosts.value.find((orig) => orig.id === post.id);
			const update = changedSets(original, post, postFields);
			return original && hasChanges(update) ? [{ id: post.id, update }] : [];
		});
		const postsToDelete = originalPosts.value.filter(
			(orig) => !activePosts.some((post) => post.id === orig.id),
		);

		const postMembershipMutations = organizationData.value.posts
			.filter((p) => p.mode !== 'deleted' && p.mode !== 'new' && p.memberships)
			.flatMap((post) => {
				const original = originalPosts.value.find((o) => o.id === post.id);
				const { buildMembershipMutations: buildPostMembershipMutations } =
					useMembershipMutations({
						memberType: 'Person',
						memberId: ref(undefined),
						originalMemberships: ref(
							(original?.memberships ?? []) as Partial<Membership>[],
						),
					});
				return buildPostMembershipMutations(post.memberships ?? []);
			});

		await Promise.all([
			...postsToCreate.map((post) =>
				graphqlClient.mutation({
					updateOrganizations: {
						__args: {
							where: { id: { eq: organizationData.value?.id } },
							update: {
								posts: [
									{
										create: [
											{
												node: {
													role: post.role,
													start_date: post.start_date,
													end_date: post.end_date,
												},
											},
										],
									},
								],
							},
						},
						organizations: { id: true },
					},
				}),
			),
			...postsToUpdate.map(({ id, update }) =>
				graphqlClient.mutation({
					updatePosts: {
						__args: { where: { id: { eq: id } }, update },
						posts: { id: true },
					},
				}),
			),
			...postsToDelete.map((post) =>
				graphqlClient.mutation({
					deletePosts: {
						__args: {
							where: { id: { eq: post.id } },
							delete: { memberships: [{ delete: { links: [{}] } }] },
						},
						nodesDeleted: true,
						relationshipsDeleted: true,
					},
				}),
			),
			...links.updates.map(({ id, update }) =>
				graphqlClient.mutation({
					updateLinks: {
						__args: { where: { id: { eq: id } }, update },
						links: { id: true },
					},
				}),
			),
			...buildMembershipMutations(editableMemberships.value),
			...postMembershipMutations,
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
	<cv-breadcrumb no-trailing-slash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>
			<a href="/admin/organizations">Organizations</a>
		</cv-breadcrumb-item>
		<cv-breadcrumb-item>{{ organizationData?.name }}</cv-breadcrumb-item>
	</cv-breadcrumb>

	<FeedbackToast :notification="toast.notification" @close="toast.hide" />

	<UiEntityHeader
		entity="organization"
		:entity-id="route.params.id as string"
		:title="organizationData?.name"
		:is-save-disabled="isSaving"
		@save="guardSave(saveChanges)"
	/>

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
					:organization-options="organizationOptions ?? null"
					:preview-image="previewImage"
					@crop="setImageBlob"
					@delete="
						() => {
							if (!organizationData) return;
							organizationData.image = null;
							clearImage();
						}
					"
				/>
			</div>

			<div class="flex basis-2/4 flex-col gap-6">
				<OrganizationPosts
					v-model:posts="organizationPosts"
					v-model:people-options="peopleOptions"
					v-model:organization-options="organizationOptions"
					:default-start-date="organizationData?.founding_date ?? null"
					:default-end-date="organizationData?.dissolution_date ?? null"
					:organization="
						organizationData
							? {
									id: organizationData.id,
									name: organizationData.name,
									classification: organizationData.classification,
								}
							: null
					"
					@member-type-change="onMemberTypeChange"
				/>
				<MembershipTable
					v-model:memberships="editableMemberships"
					:organizations-options="membershipOrganizationsOptions"
					member-type="Organization"
				/>
			</div>
		</div>
	</form>
</template>
