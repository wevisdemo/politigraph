<script lang="ts" setup>
// @ts-ignore
import { Add16 } from '@carbon/icons-vue';
import type { Membership, Organization, Post } from '~/.genql';

type MemberShipProp = Pick<Membership, 'start_date' | 'end_date'> & {
	posts: Array<
		Pick<Post, 'role'> & {
			organizations: Array<Pick<Organization, 'name' | 'classification'>>;
		}
	> | null;
};
const props = defineProps<{
	classification: string;
}>();

const memberships = defineModel<MemberShipProp[] | null>('memberships');
</script>
<template>
	<div class="h-fit w-full space-y-4 bg-white p-4">
		<h4 class="pt-2">{{ props.classification }} Membership</h4>
		<cv-data-table-skeleton
			v-if="!memberships"
			:headers="Array(4).fill('')"
			:rows="3"
		/>
		<cv-data-table v-else>
			<template #actions>
				<cv-button :icon="Add16" aria-label="Add"> Add </cv-button>
			</template>
			<template #headings>
				<cv-data-table-heading id="sb-title" :heading="classification" />
				<cv-data-table-heading id="sb-post" heading="Post" />
				<cv-data-table-heading id="sb-created" heading="Start" />
				<cv-data-table-heading id="sb-lastupdate" heading="End" />
			</template>
			<template #data>
				<cv-data-table-row v-for="(m, index) in memberships" :key="index">
					<cv-data-table-cell>
						{{ m.posts?.[0]?.organizations?.[0]?.name || '-' }}
					</cv-data-table-cell>
					<cv-data-table-cell>
						{{ m.posts?.[0]?.role }}
					</cv-data-table-cell>
					<cv-data-table-cell>
						{{ m.start_date || '-' }}
					</cv-data-table-cell>
					<cv-data-table-cell>
						{{ m.end_date || '-' }}
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
