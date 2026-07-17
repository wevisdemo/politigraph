<script lang="ts" setup>
import {
	Close16,
	// @ts-expect-error carbon icons vue type
} from '@carbon/icons-vue';
import { enumOrganizationType } from '@politigraph/graphql/genql';
import type { OrganizationWithPostsOption } from '~/composables/use-organizations-with-posts-options';
import type { PeopleOption } from '~/composables/use-people-options';
import type { MembershipProp } from '~/types/membership';
import { RepresentativeLabel } from '~/types/membership';

type FixedPost = {
	id: string;
	role: string;
	organizations: Array<{ id: string; name: string; classification: string }>;
};

const props = withDefaults(
	defineProps<{
		visible: boolean;
		mode: 'add' | 'edit' | null;
		membership: MembershipProp | null;
		organizationsOptions?: OrganizationWithPostsOption[] | null;
		disabled: boolean;
		memberType: 'Person' | 'Organization';
		variant?: 'member-fixed' | 'post-fixed';
		fixedPost?: FixedPost | null;
		peopleOptions?: PeopleOption[] | null;
		organizationOptions?: Array<{ label: string; value: string }> | null;
	}>(),
	{
		variant: 'member-fixed',
		organizationsOptions: null,
		fixedPost: null,
		peopleOptions: null,
		organizationOptions: null,
	},
);

const emit = defineEmits<{
	'update:visible': [value: boolean];
	save: [dates: { start: string | null; end: string | null }];
	cancel: [];
	'member-type-change': [type: 'Person' | 'Organization'];
}>();

const genId = () => crypto.randomUUID();

const organizationClassification = [
	{
		name: enumOrganizationType.HOUSE_OF_REPRESENTATIVE,
		label: 'สส.',
		value: enumOrganizationType.HOUSE_OF_REPRESENTATIVE,
	},
	{
		name: enumOrganizationType.HOUSE_OF_SENATE,
		label: 'สว.',
		value: enumOrganizationType.HOUSE_OF_SENATE,
	},
	{
		name: enumOrganizationType.CABINET,
		label: 'ครม.',
		value: enumOrganizationType.CABINET,
	},
	{
		name: enumOrganizationType.POLITICAL_PARTY,
		label: 'พรรคการเมือง',
		value: enumOrganizationType.POLITICAL_PARTY,
	},
];

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

const dateFields = [
	{ key: 'start' as const, label: 'Start' },
	{ key: 'end' as const, label: 'End' },
];

const modalDate = ref<{ start: string | null; end: string | null }>({
	start: null,
	end: null,
});

watch(
	() => props.membership,
	(m) => {
		modalDate.value = {
			start: m?.start_date ?? null,
			end: m?.end_date ?? null,
		};
	},
);

const handleCancel = () => {
	emit('cancel');
	emit('update:visible', false);
};

const handleSave = () => {
	if (props.disabled) return;
	emit('save', { ...modalDate.value });
	emit('update:visible', false);
};

const onClassificationChange = (newClassification: string) => {
	if (!props.membership) return;

	props.membership.posts[0].organizations[0].classification = newClassification;
	props.membership.posts[0].id = '';
	props.membership.posts[0].role = '';
	props.membership.posts[0].organizations[0].id = '';
	props.membership.posts[0].organizations[0].name = '';
};

const handleOrgNameChange = (selectedValue: string) => {
	if (!props.membership) return;

	const options = getOrganizationOptions(
		props.membership.posts[0].organizations[0].classification,
	);
	const selected = options.find((opt) => opt.value === selectedValue);

	props.membership.posts[0].organizations[0].id = selected?.value ?? '';
	props.membership.posts[0].organizations[0].name = selected?.label ?? '';
};

const handleRoleInput = (selectedValue: string) => {
	if (!props.membership) return;

	const options = getPostOptionsForOrg(
		props.membership.posts[0].organizations[0].id,
	);
	const selected = options.find((opt) => opt.value === selectedValue);

	props.membership.posts[0].id = selected?.value ?? '';
	props.membership.posts[0].role = selected?.label ?? '';
};

const resolvedClassification = computed(() =>
	props.variant === 'post-fixed'
		? props.fixedPost?.organizations[0]?.classification
		: props.membership?.posts[0]?.organizations[0]?.classification,
);

const memberTypeOptions = [
	{ label: 'Person', value: 'Person' },
	{ label: 'Organization', value: 'Organization' },
];

const handleMemberTypeChange = (newType: string) => {
	if (!props.membership) return;
	const validType = memberTypeOptions.find((opt) => opt.value === newType);
	if (!validType) return;
	props.membership.memberType = validType.value as 'Person' | 'Organization';
	props.membership.members = [];
	emit('member-type-change', validType.value as 'Person' | 'Organization');
};

watch(
	() => props.visible,
	(visible) => {
		if (visible && props.membership?.memberType) {
			emit('member-type-change', props.membership.memberType);
		}
	},
	{ immediate: true },
);

const handlePersonChange = (selectedValue: string) => {
	if (!props.membership) return;
	const selected = props.peopleOptions?.find(
		(opt) => opt.value === selectedValue,
	);
	if (selected) {
		props.membership.members = [{ id: selected.value, name: selected.name }];
		props.membership.memberType = 'Person';
	}
};

const handleOrgMemberChange = (selectedValue: string) => {
	if (!props.membership) return;
	const selected = props.organizationOptions?.find(
		(opt) => opt.value === selectedValue,
	);
	if (selected) {
		props.membership.members = [{ id: selected.value, name: selected.label }];
		props.membership.memberType = 'Organization';
	}
};
</script>

<template>
	<cv-modal
		class="membership-modal"
		:visible="visible"
		auto-hide-off
		:primary-button-disabled="disabled"
		size="md"
		@modal-hide-request="handleCancel"
		@primary-click="handleSave"
		@secondary-click="handleCancel"
	>
		<template #title>
			<span class="capitalize">{{ mode ?? '' }}</span> Membership
		</template>

		<template #content>
			<div v-if="membership" class="flex flex-col gap-5">
				<div v-if="variant === 'post-fixed'" class="flex flex-col gap-5">
					<p class="text-sm text-[#525252]">
						Post:
						<strong>{{ fixedPost?.role }}</strong>
						— {{ fixedPost?.organizations[0]?.name }}
					</p>

					<cv-dropdown
						:model-value="membership.memberType ?? ''"
						label="Member Type*"
						placeholder="Select member type"
						@change="(event: string) => handleMemberTypeChange(event)"
					>
						<cv-dropdown-item
							v-for="{ value, label } in memberTypeOptions"
							:key="value"
							:value="value"
							>{{ label }}</cv-dropdown-item
						>
					</cv-dropdown>

					<cv-combo-box
						v-if="membership.memberType === 'Person'"
						:model-value="membership.members?.[0]?.id ?? ''"
						title="Person*"
						:options="peopleOptions ?? []"
						item-value-key="value"
						item-text-key="label"
						auto-filter
						auto-highlight
						@change="(event: string) => handlePersonChange(event)"
					/>

					<cv-combo-box
						v-else-if="membership.memberType === 'Organization'"
						:model-value="membership.members?.[0]?.id ?? ''"
						title="Organization*"
						:options="organizationOptions ?? []"
						item-value-key="value"
						item-text-key="label"
						auto-filter
						auto-highlight
						@change="(event: string) => handleOrgMemberChange(event)"
					/>

					<div class="flex w-1/2 gap-5">
						<div v-for="field in dateFields" :key="field.key" class="relative">
							<cv-date-picker
								v-model="modalDate[field.key]"
								:date-label="field.label"
								kind="single"
								class="membership-datepicker"
								:cal-options="{ dateFormat: 'Y-m-d' }"
							/>
							<button
								v-if="modalDate[field.key]"
								class="absolute bottom-4 right-0 m-auto size-fit cursor-pointer"
								@click="modalDate[field.key] = null"
							>
								<Close16 />
							</button>
						</div>
					</div>
				</div>

				<template v-else>
					<div class="flex justify-between gap-5">
						<div class="relative w-1/2">
							<cv-combo-box
								v-model="membership.posts[0].organizations[0].classification"
								title="Organization Classification*"
								:options="organizationClassification"
								item-value-key="value"
								item-text-key="label"
								auto-filter
								auto-highlight
								@change="(event: string) => onClassificationChange(event)"
							/>
						</div>

						<div class="relative w-1/2">
							<cv-combo-box
								:key="membership.posts[0].organizations[0].classification"
								v-model="membership.posts[0].organizations[0].id"
								title="Organization Name*"
								:options="
									getOrganizationOptions(
										membership.posts[0].organizations[0].classification,
									)
								"
								:disabled="!membership.posts[0].organizations[0].classification"
								item-value-key="value"
								item-text-key="label"
								auto-filter
								auto-highlight
								@change="(event: string) => handleOrgNameChange(event)"
							/>
						</div>
					</div>

					<div class="flex w-full gap-5">
						<div class="w-1/2">
							<cv-combo-box
								:key="membership.posts[0].organizations[0].id"
								v-model="membership.posts[0].id"
								:options="
									getPostOptionsForOrg(membership.posts[0].organizations[0].id)
								"
								title="Post*"
								:disabled="!membership.posts[0].organizations[0].id"
								item-value-key="value"
								item-text-key="label"
								auto-filter
								auto-highlight
								@change="(event: string) => handleRoleInput(event)"
							/>
						</div>

						<div class="flex w-1/2 gap-5">
							<div
								v-for="field in dateFields"
								:key="field.key"
								class="relative"
							>
								<cv-date-picker
									v-model="modalDate[field.key]"
									:date-label="field.label"
									kind="single"
									class="membership-datepicker"
									:cal-options="{ dateFormat: 'Y-m-d' }"
								/>
								<button
									v-if="modalDate[field.key]"
									class="absolute bottom-4 right-0 m-auto size-fit cursor-pointer"
									@click="modalDate[field.key] = null"
								>
									<Close16 />
								</button>
							</div>
						</div>
					</div>
				</template>

				<template
					v-if="
						variant === 'member-fixed' &&
						memberType === 'Person' &&
						resolvedClassification ===
							enumOrganizationType.HOUSE_OF_REPRESENTATIVE
					"
				>
					<h4 class="font-normal">Representative Details</h4>

					<cv-radio-group legend-text="Label">
						<cv-radio-button
							v-for="label in Object.values(RepresentativeLabel)"
							:key="label"
							v-model="membership.label"
							name="representative-label"
							:label="label"
							:value="label"
						/>
					</cv-radio-group>

					<div
						v-if="membership.label === RepresentativeLabel.District"
						class="flex w-full gap-5"
					>
						<div class="w-1/2">
							<cv-text-input v-model="membership.province" label="Province" />
						</div>

						<div class="flex w-1/2 gap-5">
							<cv-text-input
								v-model.number="membership.district_number"
								label="District Number"
								type="number"
							/>
						</div>
					</div>

					<div
						v-if="membership.label === RepresentativeLabel.Partylist"
						class="flex w-1/2 gap-5"
					>
						<cv-text-input
							v-model.number="membership.list_number"
							label="List Number"
							type="number"
						/>
					</div>
				</template>

				<template
					v-else-if="
						variant === 'member-fixed' &&
						memberType === 'Person' &&
						resolvedClassification === enumOrganizationType.HOUSE_OF_SENATE
					"
				>
					<h4 class="font-normal">Senates Details</h4>

					<div class="flex w-1/2 gap-5">
						<cv-text-input
							v-model="membership.label"
							label="Label"
							helper-text="ประเภทที่ถูกแบ่ง เช่น วิธีการจัดตั้งหรือกลุ่มอาชีพของ สว."
						/>
					</div>
				</template>

				<h4 class="font-normal">References</h4>

				<FormLinks
					:links="membership?.links ?? []"
					@update:links="
						(val) => {
							if (membership) {
								membership.links = val.map((l) => ({
									...l,
									id: l.id || genId(),
								}));
							}
						}
					"
				/>
			</div>
		</template>

		<template #secondary-button> Cancel </template>
		<template #primary-button>
			{{ mode == 'add' ? 'Add' : 'Save' }}
		</template>
	</cv-modal>
</template>

<style scoped>
:deep(.membership-modal .bx--modal-header) {
	padding-bottom: 10px;
}

:deep(.membership-datepicker .bx--date-picker__input) {
	width: 100% !important;
}
</style>

<style>
.membership-modal .bx--modal-container {
	background-color: white !important;
}
</style>
