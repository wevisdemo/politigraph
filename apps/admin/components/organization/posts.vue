<script lang="ts" setup>
// @ts-expect-error carbon icons vue type
import { Add16, Close16, Edit16, TrashCan16 } from '@carbon/icons-vue';
import type { Post } from '@politigraph/graphql/genql';
import type { PeopleOption } from '~/composables/use-people-options';
import { useToastNotification } from '~/composables/use-toast-notification';
import type { MembershipProp } from '~/types/membership';
import { formatDate, parseDate, serializeDate } from '~/utils/date';
import DeleteMembershipModal from '../membership/delete-modal.vue';
import MembershipModal from '../membership/modal.vue';

export type PostProp = Pick<Post, 'id' | 'role' | 'start_date' | 'end_date'> & {
	mode?: 'new' | 'edited' | 'deleted';
	membershipCount?: number;
	memberships?: MembershipProp[];
};

const posts = defineModel<PostProp[] | null>('posts');
const peopleOptions = defineModel<PeopleOption[] | null>('peopleOptions');
const organizationOptions = defineModel<Array<{
	label: string;
	value: string;
}> | null>('organizationOptions');
const props = withDefaults(
	defineProps<{
		defaultStartDate?: string | null;
		defaultEndDate?: string | null;
		organization?: { id: string; name: string; classification: string } | null;
	}>(),
	{
		defaultStartDate: null,
		defaultEndDate: null,
		organization: null,
	},
);
const emit = defineEmits<{
	'member-type-change': [type: 'Person' | 'Organization'];
}>();
const graphqlClient = useGraphqlClient();
const mode = ref<'add' | 'edit' | ''>('');
const showPostDetails = ref(false);
const showDeleteModal = ref(false);

const tempPost = ref<PostProp | null>(null);
const editingPost = ref<PostProp | null>(null);
const pendingDeletePostId = ref<string | null>(null);
const pendingDeletePostName = ref<string | null>(null);
const pendingDeletePostMembershipCount = ref<number>(0);

const modalDate = ref<{ start: Date | null; end: Date | null }>({
	start: null,
	end: null,
});

const loadedRelatedMembershipPostId = ref<string | null>(null);

const postMemberships = ref<MembershipProp[]>([]);
const postMembershipsMode = ref<'add' | 'edit' | null>(null);
const showPostMembershipModal = ref(false);
const showPostMembershipDeleteModal = ref(false);
const tempPostMembership = ref<MembershipProp | null>(null);
const editingPostMembership = ref<MembershipProp | null>(null);
const pendingDeletePostMembershipId = ref<string | null>(null);
const pendingDeletePostMembershipName = ref<string | null>(null);

const currentPost = computed({
	get: () => {
		if (mode.value === 'add' && tempPost.value) {
			return tempPost.value;
		}

		if (mode.value === 'edit' && editingPost.value) {
			return editingPost.value;
		}

		return null;
	},
	set: (value) => {
		if (!value) return;

		if (mode.value === 'add') {
			tempPost.value = value;
		} else if (mode.value === 'edit') {
			editingPost.value = value;
		}
	},
});

const currentPostMembership = computed(() => {
	if (postMembershipsMode.value === 'add' && tempPostMembership.value) {
		return tempPostMembership.value;
	}
	if (postMembershipsMode.value === 'edit' && editingPostMembership.value) {
		return editingPostMembership.value;
	}
	return null;
});

const getRowClass = (rowMode?: string): string => {
	if (rowMode) {
		return '[&>td]:bg-[#FFF8E1]';
	}

	return '';
};

const getEffectiveMembershipCount = (post: PostProp): number =>
	post.memberships
		? post.memberships.filter((m) => m.mode !== 'deleted').length
		: (post.membershipCount ?? 0);

const isPostAddDisabled = computed(() => {
	return !(currentPost.value?.role?.trim().length ?? 0);
});

const isPostMembershipAddDisabled = computed(() => {
	if (!currentPostMembership.value) return true;
	return !currentPostMembership.value.members?.[0]?.id;
});

const handleAddPost = () => {
	tempPost.value = {
		id: crypto.randomUUID(),
		role: '',
		start_date: props.defaultStartDate,
		end_date: props.defaultEndDate,
	};
	modalDate.value = {
		start: parseDate(props.defaultStartDate),
		end: parseDate(props.defaultEndDate),
	};
	mode.value = 'add';
	showPostDetails.value = true;
};

const handleEditPost = (data: PostProp) => {
	const index = posts.value?.findIndex((post) => post.id === data.id) ?? -1;

	if (index !== -1 && posts.value) {
		editingPost.value = JSON.parse(JSON.stringify(toRaw(posts.value[index])));
		modalDate.value = {
			start: parseDate(editingPost.value?.start_date ?? ''),
			end: parseDate(editingPost.value?.end_date ?? ''),
		};
	}

	tempPost.value = null;
	mode.value = 'edit';
	showPostDetails.value = true;
};

const handleSavePost = () => {
	if (mode.value === 'add' && isPostAddDisabled.value) {
		return;
	}

	if (mode.value === 'add' && tempPost.value) {
		tempPost.value.start_date = serializeDate(modalDate.value.start);
		tempPost.value.end_date = serializeDate(modalDate.value.end);
		tempPost.value.mode = 'new';
		posts.value = [...(posts.value || []), tempPost.value];
	} else if (mode.value === 'edit' && posts.value) {
		const current = currentPost.value;
		if (!current) return;

		current.start_date = serializeDate(modalDate.value.start);
		current.end_date = serializeDate(modalDate.value.end);
		current.mode = 'edited';
		current.memberships = [...postMemberships.value];

		const index = posts.value.findIndex((post) => post.id === current.id);
		if (index === -1) return;

		posts.value[index] = JSON.parse(JSON.stringify(toRaw(current)));
		posts.value = [...posts.value];
	}

	showPostDetails.value = false;
	tempPost.value = null;
	editingPost.value = null;
};

const handleCancelPost = () => {
	showPostDetails.value = false;
	tempPost.value = null;
	editingPost.value = null;
};

const handleDeletePost = () => {
	const target = posts.value?.find(
		(post) => post.id === pendingDeletePostId.value,
	);

	if (target?.mode === 'new') {
		posts.value =
			posts.value?.filter((post) => post.id !== pendingDeletePostId.value) ??
			[];
	} else {
		posts.value =
			posts.value?.map((post) =>
				post.id === pendingDeletePostId.value
					? { ...post, mode: 'deleted' }
					: post,
			) ?? [];
	}

	showDeleteModal.value = false;
};

const showModalDeletePost = (
	id: string,
	name: string,
	membershipCount: number,
) => {
	pendingDeletePostId.value = id;
	pendingDeletePostName.value = name;
	pendingDeletePostMembershipCount.value = membershipCount;
	showDeleteModal.value = true;
};

const loadRelatedMemberships = async (postId: string) => {
	const toast = useToastNotification();
	try {
		const { posts: postsResult } = await graphqlClient.query({
			posts: {
				__args: {
					where: { id: { eq: postId } },
				},
				id: true,
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
					members: {
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
		});

		const post = postsResult[0];
		const orgId = props.organization?.id ?? '';
		const orgName = props.organization?.name ?? '';
		const orgClassification = props.organization?.classification ?? '';

		const mapped: MembershipProp[] = (post?.memberships ?? []).map(
			(m: {
				id: string;
				start_date: string | null;
				end_date: string | null;
				label: string | null;
				province: string | null;
				district_number: number | null;
				list_number: number | null;
				links: Array<{ id: string; url: string; note: string | null }>;
				members?: Array<{
					__typename?: string;
					id: string;
					name: string;
				}>;
			}) => {
				const member = m.members?.[0];
				const resolvedMember = member
					? { id: member.id, name: member.name }
					: undefined;
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
					posts: [
						{
							id: postId,
							role: currentPost.value?.role ?? '',
							organizations: [
								{
									id: orgId,
									name: orgName,
									classification: orgClassification,
								},
							],
						},
					],
					members: resolvedMember ? [resolvedMember] : [],
					memberType: resolvedType,
				};
			},
		);

		postMemberships.value = mapped;
		loadedRelatedMembershipPostId.value = postId;
	} catch {
		toast.show({
			kind: 'warning',
			title: 'Failed to load post memberships',
		});
	}
};

const handleAddPostMembership = () => {
	if (!currentPost.value) return;
	const p = currentPost.value;
	const newMembership: MembershipProp = {
		id: crypto.randomUUID(),
		start_date: p.start_date ?? serializeDate(new Date()),
		end_date: p.end_date ?? null,
		label: null,
		district_number: null,
		list_number: null,
		province: null,
		links: [],
		posts: [
			{
				id: p.id,
				role: p.role,
				organizations: [
					{
						id: props.organization?.id ?? '',
						name: props.organization?.name ?? '',
						classification: props.organization?.classification ?? '',
					},
				],
			},
		],
		members: [],
		memberType: '',
		mode: 'new',
	};
	tempPostMembership.value = newMembership;
	postMembershipsMode.value = 'add';
	showPostMembershipModal.value = true;
};

const handleEditPostMembership = (m: MembershipProp) => {
	editingPostMembership.value = structuredClone(toRaw(m));
	tempPostMembership.value = null;
	postMembershipsMode.value = 'edit';
	showPostMembershipModal.value = true;
};

const handleSavePostMembership = (dates: {
	start: string | null;
	end: string | null;
}) => {
	if (
		postMembershipsMode.value === 'add' &&
		isPostMembershipAddDisabled.value
	) {
		return;
	}

	if (postMembershipsMode.value === 'add' && tempPostMembership.value) {
		tempPostMembership.value.start_date = dates.start || null;
		tempPostMembership.value.end_date = dates.end || null;
		tempPostMembership.value.mode = 'new';
		postMemberships.value = [
			...postMemberships.value,
			tempPostMembership.value,
		];
	} else if (postMembershipsMode.value === 'edit') {
		const current = currentPostMembership.value;
		if (!current) return;

		current.start_date = dates.start || null;
		current.end_date = dates.end || null;
		current.mode = current.mode === 'new' ? 'new' : 'edited';

		const index = postMemberships.value.findIndex((m) => m.id === current.id);
		if (index === -1) return;

		postMemberships.value[index] = structuredClone(toRaw(current));
		postMemberships.value = [...postMemberships.value];
	}

	tempPostMembership.value = null;
	editingPostMembership.value = null;
};

const handleCancelPostMembership = () => {
	tempPostMembership.value = null;
	editingPostMembership.value = null;
};

const handleDeletePostMembership = () => {
	const target = postMemberships.value.find(
		(m) => m.id === pendingDeletePostMembershipId.value,
	);

	if (target?.mode === 'new') {
		postMemberships.value = postMemberships.value.filter(
			(m) => m.id !== pendingDeletePostMembershipId.value,
		);
	} else {
		postMemberships.value = postMemberships.value.map((m) =>
			m.id === pendingDeletePostMembershipId.value
				? { ...m, mode: 'deleted' }
				: m,
		);
	}

	showPostMembershipDeleteModal.value = false;
};

const showModalDeletePostMembership = (id: string, name: string | null) => {
	pendingDeletePostMembershipId.value = id;
	pendingDeletePostMembershipName.value = name;
	showPostMembershipDeleteModal.value = true;
};

const activePostMemberships = computed(() =>
	postMemberships.value.filter((m) => m.mode !== 'deleted'),
);

watch(
	() => [showPostDetails.value, mode.value, currentPost.value?.id] as const,
	async ([visible, currentMode, postId]) => {
		if (!visible || currentMode !== 'edit' || !postId) {
			postMemberships.value = [];
			loadedRelatedMembershipPostId.value = null;
			return;
		}

		if (loadedRelatedMembershipPostId.value === postId) {
			return;
		}

		await loadRelatedMemberships(postId);
	},
);
</script>
<template>
	<div>
		<cv-data-table-skeleton
			v-if="!posts"
			title="Posts"
			helper-text="ตำแหน่งในองค์กรทั้งหมด"
			:rows="3"
		/>

		<cv-data-table
			v-else
			:key="posts.length"
			title="Posts"
			helper-text="ตำแหน่งในองค์กรทั้งหมด"
		>
			<template #actions>
				<cv-button :icon="Add16" aria-label="Add" @click="handleAddPost">
					Add
				</cv-button>
			</template>

			<template #headings>
				<cv-data-table-heading id="sb-role" heading="Role" class="w-1/3" />
				<cv-data-table-heading
					id="sb-start-date"
					heading="Start"
					class="w-1/5"
				/>
				<cv-data-table-heading id="sb-end-date" heading="End" class="w-1/5" />
				<cv-data-table-heading
					id="sb-membership-count"
					heading="Memberships"
					class="w-1/6"
				/>
				<cv-data-table-heading
					id="sb-actions"
					heading="Actions"
					class="w-1/6"
				/>
			</template>

			<template #data>
				<template v-if="posts.length">
					<cv-data-table-row
						v-for="post in posts"
						:id="post.id"
						:key="post.id"
						:value="post.id"
						:class="getRowClass(post.mode)"
					>
						<cv-data-table-cell>
							<p
								class="text-sm"
								:class="post.mode === 'deleted' ? 'line-through' : ''"
							>
								{{ post.role || '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p
								class="text-sm"
								:class="post.mode === 'deleted' ? 'line-through' : ''"
							>
								{{ formatDate(post.start_date ?? '') ?? '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p
								class="text-sm"
								:class="post.mode === 'deleted' ? 'line-through' : ''"
							>
								{{ formatDate(post.end_date ?? '') ?? '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p
								class="text-sm"
								:class="post.mode === 'deleted' ? 'line-through' : ''"
							>
								{{ getEffectiveMembershipCount(post) }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<div class="flex gap-2">
								<cv-icon-button
									label="แก้ไข"
									kind="ghost"
									:icon="Edit16"
									class="p-0"
									@click="handleEditPost(post)"
								/>
								<cv-icon-button
									label="ลบ"
									kind="ghost"
									:icon="TrashCan16"
									class="p-0"
									@click="
										showModalDeletePost(
											post.id,
											post.role,
											getEffectiveMembershipCount(post),
										)
									"
								/>
							</div>
						</cv-data-table-cell>
					</cv-data-table-row>
				</template>

				<ui-table-empty-state v-else message="No posts found" :colspan="5" />
			</template>
		</cv-data-table>

		<cv-modal
			class="post-modal"
			:visible="showPostDetails"
			auto-hide-off
			:primary-button-disabled="isPostAddDisabled"
			size="md"
			@modal-hide-request="handleCancelPost"
			@primary-click="handleSavePost"
			@secondary-click="handleCancelPost"
		>
			<template #title>
				<span class="capitalize">{{ mode ?? '' }}</span> Post
			</template>

			<template #content>
				<div v-if="currentPost" class="flex flex-col gap-5">
					<cv-text-input
						v-model="currentPost.role"
						label="Role*"
						helper-text="ชื่อตำแหน่งแบบสั้น"
					/>

					<div class="flex flex-row gap-5">
						<cv-date-picker
							v-model="modalDate.start"
							date-label="Start"
							kind="single"
							class="post-datepicker"
							:cal-options="{ dateFormat: 'Y-m-d' }"
						/>
						<button
							v-if="modalDate.start"
							type="button"
							class="absolute bottom-4 right-0 m-auto size-fit cursor-pointer"
							@click="modalDate.start = null"
						>
							<Close16 />
						</button>

						<cv-date-picker
							v-model="modalDate.end"
							date-label="End"
							kind="single"
							class="post-datepicker"
							:cal-options="{ dateFormat: 'Y-m-d' }"
						/>
						<button
							v-if="modalDate.end"
							type="button"
							class="absolute bottom-4 right-0 m-auto size-fit cursor-pointer"
							@click="modalDate.end = null"
						>
							<Close16 />
						</button>
					</div>

					<template v-if="mode === 'edit' && currentPost?.mode !== 'new'">
						<cv-data-table
							title="Memberships"
							:helper-text="`มี ${activePostMemberships.length} คนหรือองค์กรที่เชื่อมกับตำแหน่งนี้`"
							row-size="compact"
							sticky-header
						>
							<template #actions>
								<cv-button
									:icon="Add16"
									aria-label="Add Membership"
									@click="handleAddPostMembership"
								>
									Add
								</cv-button>
							</template>

							<template #headings>
								<cv-data-table-heading
									id="sb-member-name"
									heading="Member"
									class="w-1/2"
								/>
								<cv-data-table-heading
									id="sb-membership-start"
									heading="Start"
									class="w-1/6"
								/>
								<cv-data-table-heading
									id="sb-membership-end"
									heading="End"
									class="w-1/6"
								/>
								<cv-data-table-heading
									id="sb-membership-actions"
									heading="Actions"
									class="w-1/6"
								/>
							</template>

							<template #data>
								<template v-if="activePostMemberships.length">
									<cv-data-table-row
										v-for="m in activePostMemberships"
										:key="m.id"
										:class="m.mode ? '[&>td]:bg-[#FFF8E1]' : ''"
									>
										<cv-data-table-cell class="w-1/2">
											<p
												class="text-sm"
												:class="m.mode === 'deleted' ? 'line-through' : ''"
											>
												{{ m.members?.[0]?.name ?? '-' }}
											</p>
										</cv-data-table-cell>
										<cv-data-table-cell class="w-1/6">
											<p
												class="text-sm"
												:class="m.mode === 'deleted' ? 'line-through' : ''"
											>
												{{ formatDate(m.start_date ?? '') ?? '-' }}
											</p>
										</cv-data-table-cell>
										<cv-data-table-cell class="w-1/6">
											<p
												class="text-sm"
												:class="m.mode === 'deleted' ? 'line-through' : ''"
											>
												{{ formatDate(m.end_date ?? '') ?? '-' }}
											</p>
										</cv-data-table-cell>
										<cv-data-table-cell class="w-1/6">
											<div class="flex gap-2">
												<cv-icon-button
													label="แก้ไข"
													kind="ghost"
													:icon="Edit16"
													class="min-h-0 p-0"
													@click="handleEditPostMembership(m)"
												/>
												<cv-icon-button
													label="ลบ"
													kind="ghost"
													:icon="TrashCan16"
													class="min-h-0 p-0"
													@click="
														showModalDeletePostMembership(
															m.id,
															m.members?.[0]?.name ?? null,
														)
													"
												/>
											</div>
										</cv-data-table-cell>
									</cv-data-table-row>
								</template>

								<ui-table-empty-state
									v-else
									message="No memberships found"
									:colspan="4"
								/>
							</template>
						</cv-data-table>
					</template>

					<p v-else class="text-sm text-[#525252]">
						Membership can be added after the post has been successfully created
						and saved.
					</p>
				</div>
			</template>

			<template #secondary-button> Cancel </template>
			<template #primary-button>
				{{ mode == 'add' ? 'Add' : 'Update' }}
			</template>
		</cv-modal>

		<MembershipModal
			class="post-membership-modal"
			:visible="showPostMembershipModal"
			:mode="postMembershipsMode"
			:membership="currentPostMembership"
			:disabled="isPostMembershipAddDisabled"
			member-type="Person"
			variant="post-fixed"
			:fixed-post="
				currentPost && props.organization
					? {
							id: currentPost.id,
							role: currentPost.role,
							organizations: [
								{
									id: props.organization.id,
									name: props.organization.name,
									classification: props.organization.classification,
								},
							],
						}
					: null
			"
			:people-options="peopleOptions"
			:organization-options="organizationOptions"
			@update:visible="showPostMembershipModal = false"
			@save="handleSavePostMembership"
			@cancel="handleCancelPostMembership"
			@member-type-change="
				(type: 'Person' | 'Organization') => emit('member-type-change', type)
			"
		/>

		<DeleteMembershipModal
			class="post-delete-membership-modal"
			:visible="showPostMembershipDeleteModal"
			:membership-name="pendingDeletePostMembershipName"
			@update:visible="showPostMembershipDeleteModal = $event"
			@confirm="handleDeletePostMembership"
		/>

		<cv-modal
			class="delete-post-modal"
			:visible="showDeleteModal"
			kind="danger"
			size="sm"
			@primary-click="handleDeletePost"
			@secondary-click="showDeleteModal = false"
			@modal-hide-request="showDeleteModal = false"
		>
			<template #title> Delete Post </template>

			<template #content>
				<div class="space-y-3">
					<p class="p-0">
						Are you sure you want to remove a post of "{{
							pendingDeletePostName
						}}"?
					</p>
					<p class="p-0 text-sm text-[#525252]">
						Deleting this post will also delete
						{{ pendingDeletePostMembershipCount }} membership{{
							pendingDeletePostMembershipCount === 1 ? '' : 's'
						}}
						connected to it.
					</p>
				</div>
			</template>

			<template #secondary-button> Cancel </template>
			<template #primary-button> Delete </template>
		</cv-modal>
	</div>
</template>

<style scoped>
:deep(.membership-modal .bx--modal-header) {
	padding-bottom: 10px;
}

:deep(.membership-datepicker .bx--date-picker__input) {
	width: 100% !important;
}

:deep(.post-modal .bx--btn--icon-only) {
	min-height: 0;
	padding: 0;
}
</style>
