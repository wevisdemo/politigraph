<script lang="ts" setup>
// @ts-ignore
import { Add16 } from '@carbon/icons-vue';

export type MemberShipProp = {
	start_date: string | null;
	end_date: string | null;
	posts: Array<{
		role: string;
		organizations: Array<{
			id: string;
			name: string;
			classification: string;
		}>;
	}>;
	isNew?: boolean;
};

const props = defineProps<{
	title: string;
	classification: string;
	organizationsOptions: Array<{ label: string; value: string }> | null;
	postOptions: Array<{ label: string; value: string }>;
}>();

const memberships = defineModel<MemberShipProp[] | null>('memberships');

const handleAddMembership = () => {
	const newItem: MemberShipProp = {
		start_date: null,
		end_date: null,
		posts: [
			{
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
		isNew: true,
	};
	memberships.value = [...(memberships.value || []), newItem];
};
</script>

<template>
	<div class="h-fit w-full space-y-4 bg-white p-4">
		<h4 class="pt-2">{{ title }} Membership</h4>

		<cv-data-table-skeleton
			v-if="!memberships"
			:headers="Array(4).fill('')"
			:rows="3"
		/>

		<cv-data-table v-else :key="memberships.length">
			<template #actions>
				<cv-button @click="handleAddMembership" :icon="Add16" aria-label="Add">
					Add
				</cv-button>
			</template>

			<template #headings>
				<cv-data-table-heading id="sb-title" :heading="title" class="w-1/4" />
				<cv-data-table-heading id="sb-post" heading="Post" class="w-1/4" />
				<cv-data-table-heading id="sb-created" heading="Start" class="w-1/4" />
				<cv-data-table-heading id="sb-lastupdate" heading="End" class="w-1/4" />
			</template>

			<template #data class="relative">
				<cv-data-table-row v-for="(m, index) in memberships" :key="index">
					<!-- Organization classification -->
					<cv-data-table-cell>
						<cv-dropdown
							v-model="m.posts[0].organizations[0].id"
							aria-label="classification"
							class="absolute left-1 -mt-2.5 w-1/2 border-0 text-sm"
						>
							<cv-dropdown-item
								v-for="item in organizationsOptions"
								:key="item.value"
								:value="item.value"
								class="text-[14px]"
							>
								{{ item.label }}
							</cv-dropdown-item>
						</cv-dropdown>
					</cv-data-table-cell>

					<!-- Role -->
					<cv-data-table-cell>
						<cv-text-input
							placeholder="Enter Order No."
							v-model="m.posts[0].role"
							type="text"
							class="-mt-2 border-0 bg-transparent"
						/>
					</cv-data-table-cell>

					<!-- Start -->
					<cv-data-table-cell>
						<cv-date-picker
							v-model="m.start_date"
							dateLabel=""
							placeholder="Select date"
						/>
					</cv-data-table-cell>

					<!-- End -->
					<cv-data-table-cell>
						<cv-date-picker
							v-model="m.end_date"
							dateLabel=""
							placeholder="Select date"
						/>
					</cv-data-table-cell>
				</cv-data-table-row>
			</template>
		</cv-data-table>
	</div>
</template>

<style scoped>
::v-deep(.bx--table-toolbar) {
	background-color: white;
}
</style>
