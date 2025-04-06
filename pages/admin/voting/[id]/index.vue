<script setup lang="ts">
import type { Vote, VoteEvent, VoteEventUpdateInput } from '~/.genql';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

const isShowNotification = ref(true);
const isShowNotificationError = ref(true);

const voteFormInput = ref<VoteEventUpdateInput>({
	title: '',
	// nickname: '',
	// date: '',
	// involving_assembly: '',
	result: '',
	// winning_condition: '',
	description: '',
	// source_url: '',
	// related_document: '',
	// document_url: '',
});

const paginationData = ref({
	page: 1,
	pageSize: 10,
});
const totalCount = ref(0);

const VoteEventData = ref<VoteEvent>();
const VoteList = ref<Vote[]>([]);
const {} = useAsyncData(
	'voteEventsConnection',
	async () => {
		const { voteEvents } = await graphqlClient.query({
			voteEvents: {
				__args: {
					limit: 20,
					offset: 0,
					where: {
						id_EQ: route.params.id as string,
					},
				},
				id: true,
				title: true,
				start_date: true,
				created_at: true,
				result: true,
				publish_status: true,
				classification: true,
				votes: {
					__args: {
						sort: [
							{
								vote_order: 'ASC',
							},
						],
						limit: 20,
						offset: 0,
					},
					id: true,
					vote_order: true,
					voter_name: true,
					voter_party: true,
					option: true,
				},
			},
		});
		if (voteEvents.length > 0) {
			const event = voteEvents[0] as VoteEvent;
			VoteEventData.value = event;
			VoteList.value = event.votes;
			voteFormInput.value.title = event.title;
		}
	},
	{ watch: [paginationData.value], server: false },
);

const handlePageChange = (page: number) => {
	paginationData.value.page = page;
};

const handlePageSizeChange = (pageSize: number) => {
	paginationData.value.pageSize = pageSize;
};
</script>

<!-- query Organizations($where: OrganizationWhere) {
  organizations(where: $where) {
		id
    name
    classification
  }
} -->

<!-- 
เอาไว้ edit votes ว่าตรงกับในระบบมั้ย
query People($limit: Int) {
  people(limit: $limit) {
    firstname
    lastname
  }
}
-->

<!-- 

query Votes($limit: Int) {
  votes(limit: $limit) {
    voter_name
    voter_party
    voters {
      firstname
      lastname
    }
    option
  }
}
	-->
<template>
	<div class="!p-10 min-h-dvh !bg-[#F4F4F4] !pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item class="text-[#0F62FE]">All Data</cv-breadcrumb-item>
			<cv-breadcrumb-item class="text-[#0F62FE]">Voting</cv-breadcrumb-item>
			<cv-breadcrumb-item>{{ VoteEventData?.title }}</cv-breadcrumb-item>
		</cv-breadcrumb>

		<h3 class="!font-normal !mb-12 !mt-4">
			{{ VoteEventData?.title }}
		</h3>

		<cv-inline-notification
			v-if="isShowNotification"
			lowContrast
			kind="warning"
			title="This item is unpublished"
			subTitle="It is not visible in public view."
			@close="isShowNotification = false"
		/>

		<cv-inline-notification
			v-if="route.params.id && isShowNotificationError"
			lowContrast
			kind="error"
			title="Error: Data Validation Failed"
			@close="isShowNotificationError = false"
		/>

		<div class="flex gap-8">
			<div class="bg-white !p-4 basis-2/4">
				<div class="flex justify-between items-center">
					<h4>Voting Details</h4>
					<div>
						<cv-button default="Save Changes">Save Changes</cv-button>
					</div>
				</div>

				<form @submit.prevent="() => {}">
					<div class="!mb-3">
						<cv-text-input label="Title" placeholder=""></cv-text-input>
					</div>

					<div class="!mb-3">
						<cv-text-input label="Nickname" placeholder=""> </cv-text-input>
					</div>

					<div class="!mb-3">
						<cv-date-picker
							dateLabel="Date label"
							invalidMessage=""
							:value="new Date().toLocaleDateString()"
						>
						</cv-date-picker>
					</div>

					<div class="!mb-3">
						<cv-text-input
							label="Involving Assembly(MultiSelect) query ทั้งหมด "
							placeholder=""
						>
						</cv-text-input>
					</div>

					<div class="!mb-3">
						<cv-select label="Result">
							<cv-select-option
								disabled
								selected
								hidden
								value="placeholder-item"
								>Choose an option</cv-select-option
							>
							<cv-select-option value="ผ่าน">ผ่าน</cv-select-option>
							<cv-select-option value="ไม่ผ่าน">ไม่ผ่าน</cv-select-option>
						</cv-select>
					</div>

					<div class="!mb-3">
						<cv-select label="Winning Condition">
							<cv-select-option
								disabled
								selected
								hidden
								value="placeholder-item"
								>Choose an option</cv-select-option
							>
							<cv-select-option value="ได้เสียงข้างมากในที่ประชุม"
								>ได้เสียงข้างมากในที่ประชุม</cv-select-option
							>
						</cv-select>
					</div>

					<div class="!mb-3">
						<cv-text-area label="Description" placeholder=""> </cv-text-area>
					</div>

					<div class="!mb-3">
						<cv-text-input label="Source URL" placeholder=""> </cv-text-input>
					</div>

					<p class="!font-bold !mb-3">Related Link</p>

					<div class="grid grid-cols-2 gap-2">
						<div class="!mb-3">
							<cv-text-input label="Document Note" placeholder="">
							</cv-text-input>
						</div>

						<div class="!mb-3">
							<cv-text-input label="Document URL" placeholder="">
							</cv-text-input>
						</div>
					</div>

					<div class="!mb-3">
						<cv-button default="Add Another Item" kind="tertiary"
							>Add Another Item</cv-button
						>
					</div>

					<div class="!mb-3 text-right">
						<cv-button default="Save Changes">Save Changes</cv-button>
					</div>
				</form>
			</div>

			<div class="basis-2/4">
				<cv-data-table
					title="Voting (ต้องแก้ไขได้)"
					helperText="Vote Summary: เห็นด้วย 400, ไม่เห็นด้วย 100, งดออกเสียง 2"
				>
					<template #headings>
						<cv-data-table-heading
							id="sb-title"
							heading="#"
							sortable
							order="ascending"
						/>
						<cv-data-table-heading
							id="sb-politician"
							heading="Politician"
							sortable
						/>
						<cv-data-table-heading id="sb-party" heading="Party" sortable />
						<cv-data-table-heading id="sb-vote" heading="Vote" sortable />
					</template>
					<div>voter_name ถ้าไม่ match voters ให้ใส่ชื้อสีแดง</div>
					<template #data>
						<cv-data-table-row
							v-for="(row, i) in VoteList"
							:id="row.id"
							:key="row.id"
							:value="row.id"
						>
							<cv-data-table-cell>{{ i + 1 }}</cv-data-table-cell>
							<cv-data-table-cell>{{ row.voter_name }}</cv-data-table-cell>
							<cv-data-table-cell>{{ row.voter_party }}</cv-data-table-cell>
							<cv-data-table-cell>{{ row.option }}</cv-data-table-cell>
						</cv-data-table-row>
					</template>
				</cv-data-table>
				<ui-pagination
					:page="paginationData.page"
					:page-size="paginationData.pageSize"
					:total-count="totalCount"
					:number-of-page="Math.ceil(totalCount / paginationData.pageSize)"
					@on-page-change="handlePageChange"
					@on-page-size-change="handlePageSizeChange"
				/>
			</div>
		</div>
	</div>
</template>

<style scoped></style>
