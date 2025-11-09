<script setup lang="ts">
// @ts-ignore
import { Add16 } from '@carbon/icons-vue';
import type { Person, PublishStatus } from '~/.genql';
import PublishStatusLabel from '~/components/ui/PublishStatusLabel.vue';

type Membership = {
	id: string;
	posts: { id: string; label: string | null }[];
};

type PeopleProps = Pick<Person, 'id' | 'name' | 'created_at' | 'updated_at'> & {
	memberships: Membership[];
	publish_status: PublishStatus;
};

defineProps<{
	people: PeopleProps[];
	totalCount: number;
	page: number;
	pageSize: number;
	numberOfPage: number;
}>();

const emit = defineEmits<{
	(e: 'page-change', page: number): void;
	(e: 'page-size-change', pageSize: number): void;
	(e: 'search', query: string): void;
}>();

const router = useRouter();
</script>

<template>
	<div>
		<cv-data-table
			title="Persons"
			helperText="ข้อมูลบุคคลทางการเมืองทั้งหมด"
			@search="emit('search', $event)"
		>
			<template #actions>
				<cv-button
					hidden
					:icon="Add16"
					@click="() => $router.push('/admin/people/new')"
				>
					New Person
				</cv-button>
			</template>
			<template #headings>
				<cv-data-table-heading
					id="sb-title"
					heading="Name"
					order="ascending"
					class="w-sm md:w-lg"
				/>
				<cv-data-table-heading
					id="sb-post"
					heading="Post"
					class="w-sm md:w-lg"
				/>
				<cv-data-table-heading id="sb-created" heading="Created" />
				<cv-data-table-heading id="sb-lastupdate" heading="Last Updated" />
				<cv-data-table-heading id="sb-status" heading="Status" />
			</template>

			<template #data>
				<cv-data-table-row
					v-for="row in people"
					:id="row.id"
					:key="row.id"
					:value="row.id"
				>
					<cv-data-table-cell>
						<a
							:href="`/admin/people/${row.id}`"
							class="w-full text-inherit hover:underline"
							>{{ row.name }}</a
						>
					</cv-data-table-cell>
					<cv-data-table-cell>
						<div class="flex flex-wrap gap-1 py-2">
							<div v-for="memberships in row.memberships" :key="memberships.id">
								<div
									v-for="post in memberships.posts"
									:key="post.id"
									class="rounded-[24px] bg-[#D0E2FF] px-2 pb-[2px] text-[#0043CE]"
								>
									{{ post.label ?? '' }}
								</div>
							</div>
						</div>
					</cv-data-table-cell>
					<cv-data-table-cell>
						{{
							row.created_at
								? new Date(row.created_at).toLocaleDateString('en-CA')
								: new Date().toLocaleDateString('en-CA')
						}}
					</cv-data-table-cell>
					<cv-data-table-cell>
						{{
							row.updated_at
								? new Date(row.updated_at).toLocaleDateString('en-CA')
								: new Date().toLocaleDateString('en-CA')
						}}
					</cv-data-table-cell>
					<cv-data-table-cell>
						<PublishStatusLabel :status="row.publish_status" />
					</cv-data-table-cell>
				</cv-data-table-row>
			</template>
		</cv-data-table>

		<ui-pagination
			:page="page"
			:page-size="pageSize"
			:total-count="totalCount ?? 0"
			:number-of-page="numberOfPage"
			@on-page-change="emit('page-change', $event)"
			@on-page-size-change="emit('page-size-change', $event)"
		/>
	</div>
</template>

<style scoped>
::v-deep(.bx--table-toolbar) {
	background-color: white;
}
</style>
