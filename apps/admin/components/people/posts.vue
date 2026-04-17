<script lang="ts" setup>
// @ts-ignore
import { Add16, Close16, Edit16, TrashCan16 } from '@carbon/icons-vue';
import {
	type Membership,
	type Person,
	type Post,
} from '@politigraph/graphql/genql';
import { formatDate, parseDate, serializeDate } from '~/utils/date';

type RelatedMembership = Pick<Membership, 'id' | 'start_date' | 'end_date'> & {
	members: Pick<Person, 'id' | 'name'>[];
};

export type PostProp = Pick<Post, 'id' | 'role' | 'start_date' | 'end_date'> & {
	mode?: 'new' | 'edited' | 'deleted';
	membershipCount?: number;
};

const posts = defineModel<PostProp[] | null>('posts');
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

const relatedMemberships = ref<RelatedMembership[]>([]);
const relatedMembershipsLoading = ref(false);
const loadedRelatedMembershipPostId = ref<string | null>(null);

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

const getRowClass = (rowMode?: string): string => {
	if (rowMode) {
		return '[&>td]:bg-[#FFF8E1]';
	}

	return '';
};

const isPostAddDisabled = computed(() => {
	return !(currentPost.value?.role?.trim().length ?? 0);
});

const handleAddPost = () => {
	tempPost.value = {
		id: crypto.randomUUID(),
		role: '',
		start_date: null,
		end_date: null,
	};
	modalDate.value = { start: null, end: null };
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
	relatedMembershipsLoading.value = true;

	try {
		const { posts } = await graphqlClient.query({
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
					members: {
						on_Person: {
							id: true,
							name: true,
						},
						on_Organization: {
							id: true,
							name: true,
						},
					},
				},
			},
		});

		relatedMemberships.value = posts[0]?.memberships ?? [];
		loadedRelatedMembershipPostId.value = postId;
	} finally {
		relatedMembershipsLoading.value = false;
	}
};

const relatedMembershipRows = computed(() =>
	relatedMemberships.value.flatMap((membership) =>
		membership.members
			.filter((person) => !!person)
			.map((person) => ({
				id: `${membership.id}-${person.id}`,
				name: person.name,
				start_date: membership.start_date,
				end_date: membership.end_date,
			})),
	),
);

watch(
	() => [showPostDetails.value, mode.value, currentPost.value?.id] as const,
	async ([visible, currentMode, postId]) => {
		if (!visible || currentMode !== 'edit' || !postId) {
			relatedMemberships.value = [];
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
	<div class="h-fit w-full space-y-4 bg-white p-4">
		<cv-data-table-skeleton
			v-if="!posts"
			title="Posts"
			helperText="ตำแหน่งในองค์กรทั้งหมด"
			:rows="3"
		/>

		<cv-data-table
			v-else
			:key="posts.length"
			title="Posts"
			helperText="ตำแหน่งในองค์กรทั้งหมด"
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
						:key="post.id"
						:id="post.id"
						:value="post.id"
						:class="getRowClass(post.mode)"
					>
						<cv-data-table-cell>
							<p :class="post.mode === 'deleted' ? 'line-through' : ''">
								{{ post.role || '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p :class="post.mode === 'deleted' ? 'line-through' : ''">
								{{ formatDate(post.start_date ?? '') ?? '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p :class="post.mode === 'deleted' ? 'line-through' : ''">
								{{ formatDate(post.end_date ?? '') ?? '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p :class="post.mode === 'deleted' ? 'line-through' : ''">
								{{ post.membershipCount ?? 0 }}
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
											post.membershipCount ?? 0,
										)
									"
								/>
							</div>
						</cv-data-table-cell>
					</cv-data-table-row>
				</template>

				<cv-data-table-row v-else>
					<cv-data-table-cell colspan="5">
						<p class="py-4 text-sm text-[#525252]">No posts found</p>
					</cv-data-table-cell>
				</cv-data-table-row>
			</template>
		</cv-data-table>

		<cv-modal
			class="post-modal"
			:visible="showPostDetails"
			autoHideOff
			:primary-button-disabled="isPostAddDisabled"
			@modal-hide-request="handleCancelPost"
			@primary-click="handleSavePost"
			@secondary-click="handleCancelPost"
			size="md"
		>
			<template v-slot:title>
				<span class="capitalize">{{ mode ?? '' }}</span> Post
			</template>

			<template v-slot:content>
				<div v-if="currentPost" class="flex flex-col gap-5">
					<cv-text-input
						v-model="currentPost.role"
						label="Role*"
						helperText="ชื่อตำแหน่งแบบสั้น"
					/>

					<div class="flex flex-row gap-5">
						<cv-date-picker
							dateLabel="Start"
							v-model="modalDate.start"
							kind="single"
							class="post-datepicker"
							:calOptions="{ dateFormat: 'Y-m-d' }"
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
							dateLabel="End"
							v-model="modalDate.end"
							kind="single"
							class="post-datepicker"
							:calOptions="{ dateFormat: 'Y-m-d' }"
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

					<cv-data-table
						title="Memberships"
						:helperText="`มี ${relatedMemberships.length} คนหรือองค์กรที่เชื่อมกับตำแหน่งนี้`"
						rowSize="compact"
						stickyHeader
						class="max-h-96 overflow-y-scroll"
					>
						<template #headings>
							<cv-data-table-heading
								id="sb-name"
								heading="Name"
								class="w-1/2"
							/>
							<cv-data-table-heading
								id="sb-membership-start"
								heading="Start Date"
								class="w-1/4"
							/>
							<cv-data-table-heading
								id="sb-membership-end"
								heading="End Date"
								class="w-1/4"
							/>
						</template>

						<template #data>
							<template v-if="relatedMembershipsLoading">
								<cv-data-table-skeleton
									title="Memberships"
									helperText="คนหรือองค์กรที่เชื่อมกับตำแหน่งนี้"
									:rows="3"
								/>
							</template>

							<template v-else-if="relatedMembershipRows.length">
								<cv-data-table-row
									v-for="row in relatedMembershipRows"
									:key="row.id"
									:id="row.id"
									:value="row.id"
								>
									<cv-data-table-cell class="w-1/2">
										{{ row.name || '-' }}
									</cv-data-table-cell>
									<cv-data-table-cell class="w-1/4">
										{{ formatDate(row.start_date ?? '') ?? '-' }}
									</cv-data-table-cell>
									<cv-data-table-cell class="w-1/4">
										{{ formatDate(row.end_date ?? '') ?? '-' }}
									</cv-data-table-cell>
								</cv-data-table-row>
							</template>
						</template>
					</cv-data-table>
				</div>
			</template>

			<template v-slot:secondary-button>Cancel</template>
			<template v-slot:primary-button>
				{{ mode == 'add' ? 'Add' : 'Save' }}
			</template>
		</cv-modal>

		<cv-modal
			class="delete-post-modal"
			:visible="showDeleteModal"
			kind="danger"
			size="sm"
			@primary-click="handleDeletePost"
			@secondary-click="showDeleteModal = false"
			@modal-hide-request="showDeleteModal = false"
		>
			<template v-slot:title>Delete Post</template>

			<template v-slot:content>
				<div class="space-y-3">
					<p class="p-0">
						Are you sure you want to remove a post of “{{
							pendingDeletePostName
						}}”?
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

			<template v-slot:secondary-button>Cancel</template>
			<template v-slot:primary-button>Delete</template>
		</cv-modal>
	</div>
</template>
