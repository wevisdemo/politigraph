div
<script lang="ts" setup>
import {
	Add16,
	CheckmarkFilled16,
	Close16,
	Edit16,
	TrashCan16,
} from '@carbon/icons-vue';
import LinksForm from '~/components/LinksForm.vue';
import type { MembershipProp } from '~/types/membership';
import { formatDate, parseDate } from '~/utils/date';
import dayjs from 'dayjs';

const props = defineProps<{
	organizationsOptions?: Array<{
		label: string;
		value: string;
		classification: string;
		posts: Array<{ label: string; value: string }>;
	}> | null;
}>();

const memberships = defineModel<MembershipProp[] | null>('memberships');
const mode = ref<'add' | 'edit' | string>('');
const showMembershipDetails = ref(false);
const showDeleteModal = ref(false);
const genId = () => crypto.randomUUID();

const tempMembership = ref<MembershipProp | null>(null);
const editingMembership = ref<MembershipProp | null>(null);
const pendingDeleteMembershipId = ref<string | null>(null);
const pendingDeleteMembershipName = ref<string | null>(null);

const organizationClassification = ref([
	{
		name: 'HOUSE_OF_REPRESENTATIVE',
		label: 'สส.',
		value: 'HOUSE_OF_REPRESENTATIVE',
	},
	{
		name: 'HOUSE_OF_SENATE',
		label: 'สว.',
		value: 'HOUSE_OF_SENATE',
	},
	{
		name: 'CABINET',
		label: 'ครม.',
		value: 'CABINET',
	},
	{
		name: 'POLITICAL_PARTY',
		label: 'พรรคการเมือง',
		value: 'POLITICAL_PARTY',
	},
]);

const getOrganizationOptions = (classification: string) => {
	const org = props.organizationsOptions?.filter(
		(o) => o.classification === classification,
	);
	return (
		org?.map((o) => ({
			label: o.label,
			value: o.value,
			classification: o.classification,
			posts: o.posts,
		})) || []
	);
};

const getPostOptionsForOrg = (orgId: string) => {
	if (!orgId || !props.organizationsOptions) return [];
	const org = props.organizationsOptions.find((o) => o.value === orgId);
	return org?.posts || [];
};

const modalDate = ref<{ start: Date | null; end: Date | null }>({
	start: null,
	end: null,
});

const handleAddMembership = () => {
	const newItem: MembershipProp = {
		id: crypto.randomUUID(),
		start_date: null,
		end_date: null,
		label: null,
		district_number: null,
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
	modalDate.value = { start: null, end: null };
	mode.value = 'add';
	showMembershipDetails.value = true;
};

const handleEditMembership = (data: MembershipProp) => {
	const index = memberships.value?.findIndex((m) => m.id === data.id) ?? null;

	if (index !== null && memberships.value) {
		editingMembership.value = JSON.parse(
			JSON.stringify(toRaw(memberships.value[index])),
		);

		modalDate.value = {
			start: parseDate(editingMembership.value!.start_date ?? ''),
			end: parseDate(editingMembership.value!.end_date ?? ''),
		};
	}

	tempMembership.value = null;
	mode.value = 'edit';
	showMembershipDetails.value = true;
};

const toISODate = (d: Date | string | null): string | null => {
	if (!d) return null;
	if (d instanceof Date) return dayjs(d).format('YYYY-MM-DD');
	return dayjs(d, 'MM/DD/YYYY').format('YYYY-MM-DD');
};

const handleSaveMembership = () => {
	if (mode.value === 'add' && tempMembership.value) {
		tempMembership.value.start_date = toISODate(modalDate.value.start);
		tempMembership.value.end_date = toISODate(modalDate.value.end);
		tempMembership.value.mode = 'new';
		memberships.value = [...(memberships.value || []), tempMembership.value];
	} else if (mode.value === 'edit' && memberships.value) {
		const current = currentMembership.value;
		if (!current) return;

		current.start_date = toISODate(modalDate.value.start);
		current.end_date = toISODate(modalDate.value.end);
		current.mode = 'edited';

		const index = memberships.value.findIndex((m) => m.id === current.id);
		if (index === -1) return;

		memberships.value[index] = JSON.parse(JSON.stringify(toRaw(current)));
		memberships.value = [...memberships.value];
	}

	showMembershipDetails.value = false;
	tempMembership.value = null;
	editingMembership.value = null;
};

const handleCancelMembership = () => {
	showMembershipDetails.value = false;
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

const showModalDeleteMembership = (id: string, name: string) => {
	pendingDeleteMembershipId.value = id;
	pendingDeleteMembershipName.value = name;
	showDeleteModal.value = true;
};

const onClassificationChange = (
	newClassification: string,
	m: MembershipProp,
) => {
	if (!currentMembership.value) return;

	m.posts[0].organizations[0].classification = newClassification;
	m.posts[0].id = '';
	m.posts[0].role = '';
	m.posts[0].organizations[0].id = '';
	m.posts[0].organizations[0].name = '';
};

const handleOrgNameChange = (selectedValue: string, m: MembershipProp) => {
	const options = getOrganizationOptions(
		currentMembership.value!.posts[0].organizations[0].classification,
	);
	const selected = options.find((opt) => opt.value === selectedValue);

	m.posts[0].organizations[0].id = selected?.value ?? '';
	m.posts[0].organizations[0].name = selected?.label ?? '';
};

const handleRoleInput = (selectedValue: string, m: MembershipProp) => {
	const options = getPostOptionsForOrg(m.posts[0].organizations[0].id);
	const selected = options.find((opt) => opt.value === selectedValue);

	m.posts[0].id = selected?.value ?? '';
	m.posts[0].role = selected?.label ?? '';
};

const getRowClass = (mode: string): string => {
	if (mode != null) {
		return '[&>td]:bg-[#FFF8E1]';
	}

	return '';
};

const currentMembership = computed({
	get: () => {
		if (mode.value === 'add' && tempMembership.value) {
			return tempMembership.value;
		}
		if (mode.value === 'edit' && editingMembership.value) {
			return editingMembership.value;
		}
		return null;
	},
	set: (value) => {
		if (!value) return;
		if (mode.value === 'add') {
			tempMembership.value = value;
		} else if (mode.value === 'edit') {
			editingMembership.value = value;
		}
	},
});
</script>

<template>
	<div class="h-fit w-full space-y-4 bg-white p-4">
		<h4 class="mb-1 pt-2">Membership</h4>
		<p>การเป็นสมาชิกในองค์กรต่างๆ</p>

		<cv-data-table-skeleton
			v-if="!memberships"
			:headers="Array(5).fill('')"
			:rows="3"
		/>

		<cv-data-table v-else :key="memberships.length">
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

			<template #data class="relative">
				<cv-data-table-row
					v-for="(m, i) in memberships"
					:key="m.id"
					:class="m?.mode ? getRowClass(m.mode) : ''"
				>
					<cv-data-table-cell>
						<p :class="m.mode == 'deleted' ? 'line-through' : ''">
							{{
								m.posts?.[0]?.organizations?.[0]?.classification ==
								'POLITICAL_PARTY'
									? 'พรรค'
									: ''
							}}{{ m.posts?.[0]?.organizations?.[0]?.name ?? '-' }}
							<CheckmarkFilled16
								v-if="m.end_date === null"
								class="inline text-[#0043CE]"
							/>
						</p>
					</cv-data-table-cell>
					<cv-data-table-cell
						><p :class="m.mode == 'deleted' ? 'line-through' : ''">
							{{ m.posts[0]?.role ?? '-' }}
						</p></cv-data-table-cell
					>
					<cv-data-table-cell
						><p :class="m.mode == 'deleted' ? 'line-through' : ''">
							{{ formatDate(m.start_date ?? '') ?? '-' }}
						</p></cv-data-table-cell
					>
					<cv-data-table-cell
						><p :class="m.mode == 'deleted' ? 'line-through' : ''">
							{{ formatDate(m.end_date ?? '') ?? '-' }}
						</p></cv-data-table-cell
					>
					<cv-data-table-cell>
						<div class="flex gap-2">
							<cv-icon-button
								label="แก้ไข"
								kind="ghost"
								:icon="Edit16"
								class="p-0"
								@click="handleEditMembership(m)"
							></cv-icon-button
							><cv-icon-button
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
							></cv-icon-button></div
					></cv-data-table-cell>
				</cv-data-table-row>
			</template>
		</cv-data-table>

		<cv-modal
			class="membership-modal"
			:visible="showMembershipDetails"
			autoHideOff
			@modal-hide-request="handleCancelMembership"
			@primary-click="handleSaveMembership"
			@secondary-click="handleCancelMembership"
			size="md"
		>
			<template v-slot:title
				><span class="capitalize">{{ mode ?? '' }}</span> Membership</template
			>

			<template v-slot:content>
				<div class="flex flex-col gap-5" v-if="currentMembership">
					<div class="flex justify-between gap-5">
						<div class="relative w-1/2">
							<cv-combo-box
								v-model="
									currentMembership.posts[0].organizations[0].classification
								"
								title="Organization Classification*"
								:options="organizationClassification"
								item-value-key="value"
								item-text-key="label"
								autoFilter
								autoHighlight
								@change="
									(event: string) =>
										currentMembership &&
										onClassificationChange(event, currentMembership)
								"
							/>
						</div>

						<div class="relative w-1/2">
							<cv-combo-box
								:key="
									currentMembership.posts[0].organizations[0].classification
								"
								v-model="currentMembership.posts[0].organizations[0].id"
								title="Organization Name*"
								:options="
									getOrganizationOptions(
										currentMembership.posts[0].organizations[0].classification,
									)
								"
								item-value-key="value"
								item-text-key="label"
								autoFilter
								autoHighlight
								@change="
									(event: string) =>
										currentMembership &&
										handleOrgNameChange(event, currentMembership)
								"
							/>
						</div>
					</div>

					<div class="flex w-full gap-5">
						<div class="w-1/2">
							<cv-combo-box
								:options="
									getPostOptionsForOrg(
										currentMembership.posts[0].organizations[0].id,
									)
								"
								:key="currentMembership.posts[0].organizations[0].id"
								v-model="currentMembership.posts[0].id"
								title="Post*"
								item-value-key="value"
								item-text-key="label"
								autoFilter
								autoHighlight
								@change="
									(event: string) =>
										currentMembership &&
										handleRoleInput(event, currentMembership)
								"
							/>
						</div>

						<div class="flex w-1/2 gap-5">
							<div class="relative">
								<cv-date-picker
									dateLabel="Start"
									v-model="modalDate.start"
									kind="single"
									class="membership-datepicker"
								/>
								<button
									v-if="modalDate.start"
									@click="modalDate.start = null"
									class="absolute bottom-4 right-0 m-auto size-fit cursor-pointer"
								>
									<Close16 />
								</button>
							</div>

							<div class="relative">
								<cv-date-picker
									dateLabel="End"
									v-model="modalDate.end"
									kind="single"
									class="membership-datepicker"
								/>
								<button
									v-if="modalDate.end"
									@click="modalDate.end = null"
									class="absolute bottom-4 right-0 m-auto size-fit cursor-pointer"
								>
									<Close16 />
								</button>
							</div>
						</div>
					</div>

					<template
						v-if="
							currentMembership &&
							currentMembership.posts[0].organizations[0].classification ===
								'HOUSE_OF_REPRESENTATIVE'
						"
					>
						<h4 class="font-normal">Representative Details</h4>

						<cv-radio-group legendText="Label">
							<cv-radio-button
								v-model="currentMembership.label"
								name="group-1"
								label="เขต"
								value="เขต"
							/>

							<cv-radio-button
								v-model="currentMembership.label"
								name="group-1"
								label="บัญชีรายชื่อ"
								value="บัญชีรายชื่อ"
							/>
						</cv-radio-group>

						<div class="flex w-full gap-5">
							<div class="w-1/2">
								<cv-text-input
									v-model="currentMembership.province"
									label="Province"
								/>
							</div>

							<div class="flex w-1/2 gap-5">
								<cv-text-input
									v-model="currentMembership.district_number"
									label="District Number"
									type="number"
									@change="
										currentMembership.district_number = Number(
											$event.target.value,
										)
									"
								/>
							</div>
						</div>
					</template>

					<template
						v-else-if="
							currentMembership &&
							currentMembership.posts[0].organizations[0].classification ===
								'HOUSE_OF_SENATE'
						"
					>
						<h4 class="font-normal">Senates Details</h4>

						<div class="flex w-1/2 gap-5">
							<cv-text-input
								v-model="currentMembership.label"
								label="Label"
								helperText="ประเภทที่ถูกแบ่ง เช่น วิธีการจัดตั้งหรือกลุ่มอาชีพของ สว."
							/>
						</div>
					</template>

					<h4 class="font-normal">References</h4>

					<LinksForm
						:links="currentMembership?.links ?? []"
						@update:links="
							(val) => {
								if (currentMembership) {
									currentMembership.links = val.map((l) => ({
										...l,
										id: l.id || genId(),
									}));
								}
							}
						"
					/>
				</div>
			</template>

			<template v-slot:secondary-button>Cancel</template>
			<template v-slot:primary-button>{{
				mode == 'add' ? 'Add' : 'Save'
			}}</template>
		</cv-modal>

		<cv-modal
			class="delete-membership-modal"
			:visible="showDeleteModal"
			kind="danger"
			size="sm"
			@primary-click="handleDeleteMembership"
			@secondary-click="showDeleteModal = false"
			@modal-hide-request="showDeleteModal = false"
		>
			<template v-slot:title>Delete Membership</template>

			<template v-slot:content
				><p class="p-0">
					Are you sure you want to remove a membership of “{{
						pendingDeleteMembershipName
					}}”?
				</p></template
			>

			<template v-slot:secondary-button>Cancel</template>
			<template v-slot:primary-button>Delete</template>
		</cv-modal>
	</div>
</template>

<style scoped>
::v-deep(.bx--table-toolbar) {
	background-color: white;
}

:deep(.membership-modal .bx--modal-header) {
	padding-bottom: 10px;
}

:deep(.membership-modal .bx--modal-header) {
	padding-bottom: 10px;
}

:deep(.membership-datepicker .bx--date-picker__input) {
	width: 100% !important;
}

.bx--modal-content p {
	padding: 0;
}
</style>

<style>
.membership-modal .bx--modal-container {
	background-color: white !important;
}

.delete-membership-modal .bx--modal-content {
	overflow: hidden;
}
</style>
