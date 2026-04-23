<script setup lang="ts">
import type {
	Bill,
	BillCreatorType,
	BillStatus,
	BillType,
	Link,
	OrganizationType,
} from '@politigraph/graphql/genql';
import RelatedLinksForm from '~/components/LinksForm.vue';
import type { PeopleOption } from '~/composables/use-people-options';

interface OrganizationOption {
	id: string;
	name: string;
	classification: OrganizationType;
}

type BillData = Pick<
	Bill,
	'id' | 'title' | 'nickname' | 'proposal_date' | 'people_signature_count'
> & {
	classification: BillType | null;
	creator_type: BillCreatorType | null;
	status: BillStatus | null;
	links: Pick<Link, 'id' | 'note' | 'url'>[];
	organizations: { id: string; name: string }[];
	co_creators: { id: string; name: string }[];
	creators?: { id: string; name: string }[];
};

export type BillForm = Omit<
	BillData,
	'id' | 'creators' | 'organizations' | 'co_creators'
> & {
	organizations: string[];
	co_creators: string[];
	personCreators: string[];
	organizationCreators: string[];
};

const props = defineProps<{
	form: BillForm;
	billData: BillData | null;
	peopleList: PeopleOption[] | null;
	organizationList: OrganizationOption[] | null;
}>();

const coCreatorKeyword = ref('');

const billClassification = [
	{ label: 'ทั่วไป', value: 'NORMAL_BILL' },
	{ label: 'เกี่ยวข้องกับงบประมาณ', value: 'BUDGET_BILL' },
	{ label: 'ประกาศฉุกเฉิน', value: 'EMERGENCY_DECREE' },
];

const billStatus = [
	{ label: 'กำลังดำเนินการ', value: 'IN_PROGRESS' },
	{ label: 'ถูกรวมร่าง', value: 'MERGED' },
	{ label: 'ออกเป็นกฎหมาย', value: 'ENACTED' },
	{ label: 'ตกไป', value: 'REJECTED' },
];

const creatorTypes = [
	{ label: 'สมาชิกรัฐสภา', value: 'POLITICIAN' },
	{ label: 'คณะรัฐมนตรี', value: 'ASSEMBLY' },
	{ label: 'ประชาชน', value: 'PEOPLE' },
	{ label: 'อื่นๆ / ไม่พบข้อมูล', value: 'UNKNOWN' },
];

const getOrganizationOptions = (classification: OrganizationType) => {
	const org = props.organizationList?.filter(
		(o) => o.classification === classification,
	);
	return org?.map((o) => ({ label: o.name, value: o.id })) || [];
};
</script>

<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h4>Bill Details</h4>
		</div>
		<template v-if="!billData || !peopleList || !organizationList">
			<cv-number-input-skeleton v-for="i in 9" :key="i" />
		</template>
		<template v-else>
			<cv-text-input label="Title*" v-model="form.title" />

			<cv-text-input label="Nickname" v-model="form.nickname" />

			<div class="flex justify-between gap-5">
				<div class="relative w-1/2">
					<cv-select v-model="form.classification" label="Classification*">
						<cv-select-option
							v-for="item in billClassification"
							:key="item.value"
							:value="item.value"
						>
							{{ item.label }}
						</cv-select-option>
					</cv-select>
				</div>
				<div class="relative w-1/2">
					<cv-select v-model="form.status" label="Status*">
						<cv-select-option
							v-for="item in billStatus"
							:key="item.value"
							:value="item.value"
						>
							{{ item.label }}
						</cv-select-option>
					</cv-select>
				</div>
			</div>

			<div class="flex justify-between gap-5">
				<div class="relative w-1/2">
					<cv-date-picker
						v-model="form.proposal_date"
						dateLabel="Proposal Date*"
						kind="single"
						class="membership-datepicker"
						:calOptions="{ dateFormat: 'Y-m-d' }"
					/>
				</div>
				<div class="relative w-1/2">
					<cv-select
						:modelValue="form.organizations[0]"
						@update:modelValue="form.organizations = [$event]"
						label="Proposed in Representative Term"
					>
						<cv-select-option
							v-for="item in getOrganizationOptions('HOUSE_OF_REPRESENTATIVE')"
							:key="item.value"
							:value="item.value"
						>
							{{ item.label }}
						</cv-select-option>
					</cv-select>
				</div>
			</div>

			<div>
				<h4 class="mb-3">Creator</h4>
				<cv-radio-group legendText="Type">
					<cv-radio-button
						v-for="item in creatorTypes"
						:key="item.value"
						name="creator-type"
						:label="item.label"
						:value="item.value"
						:modelValue="form.creator_type"
						@update:modelValue="form.creator_type = $event"
					/>
				</cv-radio-group>
			</div>

			<div
				v-if="form.creator_type === 'POLITICIAN'"
				class="flex flex-col gap-3"
			>
				<cv-combo-box
					title="Creator"
					:options="peopleList"
					item-value-key="value"
					item-text-key="label"
					autoFilter
					autoHighlight
					:modelValue="form.personCreators?.[0]"
					@update:modelValue="form.personCreators = [$event]"
				/>

				<div class="flex flex-col gap-3">
					<cv-combo-box
						v-model="coCreatorKeyword"
						title="Co-Creators"
						:options="peopleList"
						item-value-key="value"
						item-text-key="label"
						autoFilter
						autoHighlight
						@update:modelValue="
							(creatorId: string) => {
								if (!peopleList?.some((p) => p.value === creatorId)) return;
								form.co_creators = [...(form.co_creators ?? []), creatorId];
								coCreatorKeyword = '';
							}
						"
					/>

					<div class="flex flex-wrap gap-2">
						<cv-tag
							v-for="id in form.co_creators ?? []"
							:key="id"
							:label="
								peopleList?.find((person) => person.value === id)?.label ?? id
							"
							filter
							@remove="
								form.co_creators = (form.co_creators ?? []).filter(
									(value) => value !== id,
								)
							"
						/>
					</div>
				</div>
			</div>

			<div v-else-if="form.creator_type === 'ASSEMBLY'">
				<cv-select
					label="Creator*"
					:modelValue="form.organizationCreators?.[0]"
					@update:modelValue="form.organizationCreators = [$event]"
				>
					<cv-select-option
						v-for="item in getOrganizationOptions('CABINET')"
						:key="item.value"
						:value="item.value"
					>
						{{ item.label }}
					</cv-select-option>
				</cv-select>
			</div>

			<div v-else-if="form.creator_type === 'PEOPLE'">
				<div class="flex justify-between">
					<div>
						<cv-combo-box
							title="Creator*"
							:options="peopleList"
							item-value-key="value"
							item-text-key="label"
							autoFilter
							autoHighlight
							:modelValue="form.personCreators?.[0]"
							@update:modelValue="form.personCreators = [$event]"
						/>
					</div>
					<div>
						<cv-number-input
							v-model="form.people_signature_count"
							label="People Signature Count"
							placeholder=""
							type="number"
						/>
					</div>
				</div>
			</div>

			<div>
				<h4>References</h4>
				<RelatedLinksForm v-model:links="form.links" />
			</div>
		</template>
	</div>
</template>
