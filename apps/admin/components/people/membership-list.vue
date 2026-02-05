<script lang="ts" setup>
import {
	Add16,
	CheckmarkFilled16,
	Edit16,
	TrashCan16,
} from '@carbon/icons-vue';
import LinksForm from '~/components/LinksForm.vue';

export type MemberShipProp = {
	id: string;
	start_date: string | null;
	end_date: string | null;
	posts: {
		id: string;
		role: string;
		organizations: {
			id: string;
			name: string;
			classification: string;
		}[];
	}[];
};

const props = defineProps<{
	organizationsOptions?: Array<{
		label: string;
		value: string;
		classification: string;
		posts: Array<{ label: string; value: string }>;
	}>;
}>();

const memberships = defineModel<MemberShipProp[] | null>('memberships');
const showMembershipDetails = ref(false);
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

const handleAddMembership = () => {
	const membership: MemberShipProp = {
		id: crypto.randomUUID(),
		start_date: null,
		end_date: null,
		posts: [
			{
				id: '',
				role: '',
				organizations: [
					{
						id: '',
						name: '',
						classification: '',
					},
				],
			},
		],
	};
	console.log(membership);
	showMembershipDetails.value = true;
};

const handleEditMembership = (data: MemberShipProp) => {
	console.log(data);
	showMembershipDetails.value = true;
};
</script>

<template>
	<div class="h-fit w-full space-y-4 bg-white p-4">
		<h4 class="pt-2">Membership</h4>
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
				<cv-data-table-row v-for="(m, i) in memberships" :key="m.id">
					<cv-data-table-cell>
						<p>
							{{
								m.posts[0].organizations[0].classification == 'POLITICAL_PARTY'
									? 'พรรค'
									: ''
							}}{{ m.posts[0].organizations[0].name }}
							<CheckmarkFilled16
								v-if="m.end_date === null"
								class="inline text-[#0043CE]"
							/>
						</p>
					</cv-data-table-cell>
					<cv-data-table-cell
						><p>{{ m.posts[0].role }}</p></cv-data-table-cell
					>
					<cv-data-table-cell>{{
						formatDate(m.start_date) ?? '-'
					}}</cv-data-table-cell>
					<cv-data-table-cell>{{
						formatDate(m.end_date) ?? '-'
					}}</cv-data-table-cell>
					<cv-data-table-cell>
						<div class="flex gap-2">
							<cv-button
								kind="ghost"
								:icon="Edit16"
								class="p-0"
								@click="handleEditMembership(m)"
							></cv-button
							><cv-button
								kind="ghost"
								:icon="TrashCan16"
								class="p-0"
							></cv-button></div
					></cv-data-table-cell>
				</cv-data-table-row>
			</template>
		</cv-data-table>

		<cv-modal
			:visible="showMembershipDetails"
			autoHideOff
			primaryButtonDisabled
			disableTeleport
			@modal-hide-request="showMembershipDetails = false"
			size="sm"
		>
			<template v-slot:title>Add/Edit Membership</template>

			<template v-slot:content>
				<div class="flex justify-between">
					<cv-combo-box
						title="Organization Classification*"
						:options="organizationClassification"
						item-value-key="value"
						item-text-key="label"
						autoFilter
						autoHighlight
					/>

					<cv-combo-box
						title="Organization Name*"
						:options="organizationsOptions"
						item-value-key="value"
						item-text-key="label"
						autoFilter
						autoHighlight
					/>
				</div>

				<LinksForm :links="[]" />
			</template>
		</cv-modal>
	</div>
</template>

<style scoped>
::v-deep(.bx--table-toolbar),
::v-deep(.bx--modal-header),
::v-deep(.bx--modal-content) {
	background-color: white;
}
</style>
