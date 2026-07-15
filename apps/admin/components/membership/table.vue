<script lang="ts" setup>
import {
	Add16,
	CheckmarkFilled16,
	Edit16,
	TrashCan16,
	// @ts-expect-error carbon icons vue type
} from '@carbon/icons-vue';
import { enumOrganizationType } from '@politigraph/graphql/genql';
import type { OrganizationWithPostsOption } from '~/composables/use-organizations-with-posts-options';
import type { MembershipProp } from '~/types/membership';
import { formatDate } from '~/utils/date';
import DeleteMembershipModal from './delete-modal.vue';
import MembershipModal from './modal.vue';

defineProps<{
	organizationsOptions?: OrganizationWithPostsOption[] | null;
	memberType: 'Person' | 'Organization';
}>();

const memberships = defineModel<MembershipProp[] | null>('memberships');
const mode = ref<'add' | 'edit' | null>(null);
const showMembershipDetails = ref(false);
const showDeleteModal = ref(false);
const genId = () => crypto.randomUUID();

const tempMembership = ref<MembershipProp | null>(null);
const editingMembership = ref<MembershipProp | null>(null);
const pendingDeleteMembershipId = ref<string | null>(null);
const pendingDeleteMembershipName = ref<string | null>(null);

const currentMembership = computed(() => {
	if (mode.value === 'add' && tempMembership.value) {
		return tempMembership.value;
	}
	if (mode.value === 'edit' && editingMembership.value) {
		return editingMembership.value;
	}
	return null;
});

const isFormValid = (m: MembershipProp): boolean => {
	return !!(
		m.posts?.[0]?.organizations?.[0]?.classification &&
		m.posts?.[0]?.organizations?.[0]?.id &&
		m.posts?.[0]?.id
	);
};

const isMembershipAddDisabled = computed(() => {
	if (mode.value !== 'add' || !currentMembership.value) return false;
	return !isFormValid(currentMembership.value);
});

const handleAddMembership = () => {
	const newItem: MembershipProp = {
		id: genId(),
		start_date: null,
		end_date: null,
		label: null,
		district_number: null,
		list_number: null,
		province: null,
		posts: [
			{
				id: '',
				role: '',
				organizations: [{ id: '', name: '', classification: '' }],
			},
		],
		links: [],
	};
	tempMembership.value = newItem;
	mode.value = 'add';
	showMembershipDetails.value = true;
};

const handleEditMembership = (data: MembershipProp) => {
	const index = memberships.value?.findIndex((m) => m.id === data.id) ?? -1;

	if (index !== -1 && memberships.value) {
		editingMembership.value = structuredClone(toRaw(memberships.value[index]));
	}

	tempMembership.value = null;
	mode.value = 'edit';
	showMembershipDetails.value = true;
};

const handleSaveMembership = (dates: {
	start: string | null;
	end: string | null;
}) => {
	if (mode.value === 'add' && isMembershipAddDisabled.value) {
		return;
	}

	if (mode.value === 'add' && tempMembership.value) {
		tempMembership.value.start_date = dates.start || null;
		tempMembership.value.end_date = dates.end || null;
		tempMembership.value.mode = 'new';
		memberships.value = [...(memberships.value || []), tempMembership.value];
	} else if (mode.value === 'edit' && memberships.value) {
		const current = currentMembership.value;
		if (!current) return;

		current.start_date = dates.start || null;
		current.end_date = dates.end || null;
		current.mode = 'edited';

		const index = memberships.value.findIndex((m) => m.id === current.id);
		if (index === -1) return;

		memberships.value[index] = structuredClone(toRaw(current));
		memberships.value = [...memberships.value];
	}

	tempMembership.value = null;
	editingMembership.value = null;
};

const handleCancelMembership = () => {
	tempMembership.value = null;
	editingMembership.value = null;
};

const handleDeleteMembership = () => {
	const target = memberships.value?.find(
		(m) => m.id === pendingDeleteMembershipId.value,
	);

	if (target?.mode === 'new') {
		memberships.value =
			memberships.value?.filter(
				(m) => m.id !== pendingDeleteMembershipId.value,
			) ?? [];
	} else {
		memberships.value =
			memberships.value?.map((m) =>
				m.id === pendingDeleteMembershipId.value
					? { ...m, mode: 'deleted' }
					: m,
			) ?? [];
	}

	showDeleteModal.value = false;
};

const showModalDeleteMembership = (id: string, name: string | undefined) => {
	pendingDeleteMembershipId.value = id;
	pendingDeleteMembershipName.value = name ?? null;
	showDeleteModal.value = true;
};
</script>

<template>
	<div>
		<cv-data-table-skeleton
			v-if="!memberships"
			title="Memberships"
			helper-text="การเป็นสมาชิกในองค์กรต่างๆ"
			:rows="3"
		/>

		<cv-data-table
			v-else
			:key="memberships.length"
			title="Memberships"
			helper-text="การเป็นสมาชิกในองค์กรต่างๆ"
		>
			<template #actions>
				<cv-button :icon="Add16" aria-label="Add" @click="handleAddMembership">
					Add
				</cv-button>
			</template>

			<template #headings>
				<cv-data-table-heading
					id="sb-title"
					heading="Organization"
					class="w-1/3"
				/>
				<cv-data-table-heading id="sb-post" heading="Post" class="w-1/4" />
				<cv-data-table-heading id="sb-created" heading="Start" class="w-1/4" />
				<cv-data-table-heading id="sb-lastupdate" heading="End" class="w-1/4" />
				<cv-data-table-heading
					id="sb-lastupdate"
					heading="Actions"
					class="w-1/4"
				/>
			</template>

			<template #data>
				<template v-if="memberships.length">
					<cv-data-table-row
						v-for="m in memberships"
						:key="m.id"
						:class="m?.mode ? '[&>td]:bg-[#FFF8E1]' : ''"
					>
						<cv-data-table-cell>
							<a
								:href="`/admin/organizations/${m.posts?.[0]?.organizations?.[0]?.id}`"
								class="space-x-1 hover:underline"
								:class="m.mode == 'deleted' ? 'line-through' : ''"
							>
								{{
									m.posts?.[0]?.organizations?.[0]?.classification ==
									enumOrganizationType.POLITICAL_PARTY
										? 'พรรค'
										: ''
								}}{{ m.posts?.[0]?.organizations?.[0]?.name ?? '-' }}

								<CheckmarkFilled16
									v-if="m.end_date === null"
									class="mb-0.5 inline text-[#0043CE]"
								/>
							</a>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p
								class="text-sm"
								:class="m.mode == 'deleted' ? 'line-through' : ''"
							>
								{{ m.posts[0]?.role ?? '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p
								class="text-sm"
								:class="m.mode == 'deleted' ? 'line-through' : ''"
							>
								{{ formatDate(m.start_date ?? '') ?? '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<p
								class="text-sm"
								:class="m.mode == 'deleted' ? 'line-through' : ''"
							>
								{{ formatDate(m.end_date ?? '') ?? '-' }}
							</p>
						</cv-data-table-cell>
						<cv-data-table-cell>
							<div class="flex gap-2">
								<cv-icon-button
									label="แก้ไข"
									kind="ghost"
									:icon="Edit16"
									class="p-0"
									@click="handleEditMembership(m)"
								/><cv-icon-button
									label="ลบ"
									kind="ghost"
									:icon="TrashCan16"
									class="p-0"
									@click="
										showModalDeleteMembership(
											m.id,
											m.posts?.[0]?.organizations?.[0]?.name,
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
					:colspan="5"
				/>
			</template>
		</cv-data-table>

		<MembershipModal
			:visible="showMembershipDetails"
			:mode="mode"
			:membership="currentMembership"
			:organizations-options="organizationsOptions"
			:disabled="isMembershipAddDisabled"
			:member-type="memberType"
			@update:visible="showMembershipDetails = false"
			@save="handleSaveMembership"
			@cancel="handleCancelMembership"
		/>

		<DeleteMembershipModal
			:visible="showDeleteModal"
			:membership-name="pendingDeleteMembershipName"
			@update:visible="showDeleteModal = $event"
			@confirm="handleDeleteMembership"
		/>
	</div>
</template>
