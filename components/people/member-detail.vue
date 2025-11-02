<script lang="ts" setup>
// @ts-ignore
import { Add16 } from '@carbon/icons-vue';
import { formatDate, parseDate } from '~/utils/dateUtils';
import type { title } from 'radash';

export type MemberShipProp = {
	id: string;
	start_date: string | null;
	end_date: string | null;
	posts: Array<{
		id: string;
		role: string;
		organizations: Array<{
			id: string;
			name: string;
			classification: string;
		}>;
	}>;
};

const props = defineProps<{
	title: string;
	classification: string;
	organizationsOptions: Array<{
		label: string;
		value: string;
		classification: string;
		posts: Array<{ label: string; value: string }>;
	}> | null;
	editedMembershipsId: Set<string>;
}>();

const memberships = defineModel<MemberShipProp[] | null>('memberships');

const localDates = ref<{ start: Date | null; end: Date | null }[]>([]);

const handleAddMembership = () => {
	const newItem: MemberShipProp = {
		id: '',
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
						classification: props.classification,
					},
				],
			},
		],
	};
	memberships.value = [...(memberships.value || []), newItem];
};

const getPostOptionsForOrg = (orgId: string) => {
	if (!orgId || !props.organizationsOptions) return [];
	const org = props.organizationsOptions.find((o) => o.value === orgId);
	return org?.posts || [];
};

const getRowClass = (id: string): string => {
	if (props.editedMembershipsId.has(id)) {
		return '[&>td]:bg-[#FCF4D6]';
	}
	return '';
};

const emit = defineEmits<{
	(e: 'savechanges'): void;
}>();

watch(
	memberships,
	(newVal) => {
		if (!newVal) return;
		localDates.value = newVal.map((m) => ({
			start: parseDate(m.start_date),
			end: parseDate(m.end_date),
		}));
	},
	{ immediate: true },
);

watch(
	localDates,
	(newVal) => {
		if (!memberships.value) return;
		newVal.forEach((d, i) => {
			if (memberships.value?.[i]) {
				memberships.value[i].start_date = formatDate(d.start);
				memberships.value[i].end_date = formatDate(d.end);
			}
		});
	},
	{ deep: true },
);
</script>

<template>
	<div>
		<div class="h-fit w-full space-y-4 bg-white p-4">
			<h4 class="pt-2">{{ title }} Membership</h4>

			<cv-data-table-skeleton
				v-if="!memberships"
				:headers="Array(4).fill('')"
				:rows="3"
			/>

			<cv-data-table v-else :key="memberships.length">
				<template #actions>
					<cv-button @click="" :icon="Add16" aria-label="Add"> Add </cv-button>
				</template>

				<template #headings>
					<cv-data-table-heading id="sb-title" :heading="title" class="w-1/4" />
					<cv-data-table-heading id="sb-post" heading="Post" class="w-1/4" />
					<cv-data-table-heading
						id="sb-created"
						heading="Start"
						class="w-1/4"
					/>
					<cv-data-table-heading
						id="sb-lastupdate"
						heading="End"
						class="w-1/4"
					/>
				</template>

				<template #data class="relative">
					<cv-data-table-row
						v-for="(m, i) in memberships"
						:key="m.id"
						:class="getRowClass(m.id)"
					>
						<!-- Organization classification -->
						<cv-data-table-cell>
							<cv-combo-box
								v-model="m.posts[0].organizations[0].id"
								:label="
									m.posts[0].organizations[0].id
										? m.posts[0].organizations[0].name
										: `Select ${title}`
								"
								aria-label="classification"
								autoFilter
								autoHighlight
								:options="organizationsOptions"
								class="no-style-combo absolute -mt-2.5 -ml-1.5 w-1/2 text-sm"
								item-value-key="value"
								item-text-key="label"
								@change="m.posts[0].id = ''"
							/>
						</cv-data-table-cell>

						<!-- Role -->
						<cv-data-table-cell>
							<cv-dropdown
								v-model="m.posts[0].id"
								aria-label="post"
								class="absolute -mt-2.5 -ml-1 w-1/2 border-0 bg-transparent text-sm"
								:disabled="!m.posts[0].organizations[0].id"
							>
								<cv-dropdown-item
									v-for="item in getPostOptionsForOrg(
										m.posts[0].organizations[0].id,
									)"
									:key="item.value"
									:value="item.value"
									class="text-[14px]"
								>
									{{ item.label }}
								</cv-dropdown-item>
							</cv-dropdown>
						</cv-data-table-cell>

						<!-- Start -->
						<cv-data-table-cell>
							<cv-date-picker
								v-model="localDates[i].start"
								dateLabel=""
								placeholder="Select date"
								kind="single"
								class="full-width-date-picker"
							/>
						</cv-data-table-cell>

						<!-- End -->
						<cv-data-table-cell>
							<cv-date-picker
								v-model="localDates[i].end"
								dateLabel=""
								placeholder="Select date"
								kind="single"
								class="full-width-date-picker"
							/>
						</cv-data-table-cell>
					</cv-data-table-row>
				</template>
			</cv-data-table>
		</div>
		<cv-inline-notification
			v-if="editedMembershipsId.size > 0"
			kind="warning"
			lowContrast
			title="Unsaved changes"
			subTitle="Click 'Save Changes' to apply your edits."
			class="w-full"
			hideCloseButton
			actionLabel="Save Changes"
			@action="$emit('savechanges')"
		/>
	</div>
</template>

<style scoped>
::v-deep(.bx--table-toolbar) {
	background-color: white;
}
:deep(.no-style-combo .bx--list-box) {
	border: none !important;
	background-color: transparent !important;
}

:deep(.no-style-combo .bx--text-input) {
	background-color: transparent !important;
	border: none !important;
}

:deep(.full-width-date-picker .bx--date-picker) {
	background-color: transparent !important;
	border: none !important;
	width: 100% !important;
	min-width: 0 !important;
}
:deep(.full-width-date-picker .bx--date-picker__input) {
	background-color: transparent !important;
	border: none !important;
	width: 100% !important;
	min-width: 0 !important;
}
</style>
