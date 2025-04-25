<script setup lang="ts">
//@ts-ignore
import Save16 from '@carbon/icons-vue/es/save/16';
//@ts-ignore
import ViewOff16 from '@carbon/icons-vue/es/view--off/16';
import type { VoteEventUpdateInput } from '~/.genql';
import { graphqlClient } from '~/utils/graphql/client';

const { getSession } = useAuthClient();
definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

const isShowNotification = ref(true);
const isShowNotificationError = ref(true);

const isFormDirty = ref(false);
const voteEventFormInput = ref<VoteEventUpdateInput>({});

const paginationData = ref({
	page: 1,
	pageSize: 10,
});
const totalCount = ref(0);

const { data: VoteEventData } = useAsyncData(
	'VoteEventData',
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
				result: true,
				description: true,

				publish_status: true,
				classification: true,
				disagree_count: true,
				agree_count: true,
				abstain_count: true,
				novote_count: true,
			},
		});
		if (voteEvents.length > 0) {
			const event = voteEvents[0];
			voteEventFormInput.value = {
				title: event.title,
				start_date: event.start_date,
				result: event.result,
				description: event.description,

				disagree_count: event.disagree_count,
				agree_count: event.agree_count,
				abstain_count: event.abstain_count,
				novote_count: event.novote_count,
			};

			// isFormDirty.value = false;
		}
		return voteEvents[0];
	},
	{ watch: [paginationData.value], server: false },
);

const { data: VoteList } = useAsyncData(
	'VoteList',
	async () => {
		const { votes } = await graphqlClient.query({
			votes: {
				__args: {
					limit: 20,
					offset: 0,
					where: {
						vote_events_ALL: {
							id_EQ: route.params.id as string,
						},
					},
					sort: [
						{
							vote_order: 'ASC',
						},
					],
				},
				id: true,
				voter_name: true,
				voter_party: true,
				voters: {
					firstname: true,
					lastname: true,
				},
				badge_number: true,
				option: true,
			},
		});
		return votes;
	},
	{ watch: [paginationData.value], server: false },
);

const { data: OrganizationList } = useAsyncData(
	'OrganizationList',
	async () => {
		const { organizations } = await graphqlClient.query({
			organizations: {
				__args: {
					where: {
						classification_IN: ['HOUSE_OF_SENATE', 'HOUSE_OF_REPRESENTATIVE'],
					},
				},
				id: true,
				name: true,
				classification: true,
			},
		});
		return organizations;
	},
	{ watch: [paginationData.value], server: false },
);

const handlePageChange = (page: number) => {
	paginationData.value.page = page;
};

const handlePageSizeChange = (pageSize: number) => {
	paginationData.value.pageSize = pageSize;
};

const handleChangeInput = () => {
	isFormDirty.value = true;
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
		<div class="flex flex-row justify-between">
			<div class="basis-1/2 flex flex-row items-center gap-6">
				<h3 class="!font-normal !mb-12 !mt-4">
					{{ VoteEventData?.title }}
				</h3>
				<div>
					<ui-publish-status-tag
						:status="VoteEventData?.publish_status || ''"
					/>
				</div>
			</div>
			<div class="flex justify-between items-center gap-4">
				<cv-button
					default="Save Changes"
					:icon="Save16"
					:disabled="!isFormDirty"
					@click="
						async () => {
							console.log(voteEventFormInput);

							const { updateVoteEvents } = await graphqlClient.mutation({
								updateVoteEvents: {
									__args: {
										where: {
											id_EQ: route.params.id as string,
										},
										update: {
											...voteEventFormInput,
										},
									},
									voteEvents: {
										id: true,
									},
								},
							});
							console.log(updateVoteEvents);
						}
					"
					>Save Changes</cv-button
				>
				<cv-button
					default="Unpublished"
					:icon="ViewOff16"
					kind="tertiary"
					@click="
						async () => {
							// const { data: session, error } = await getSession();
							// if (session !== null && session.user.email)
							// 	getPostToken(session.user.email, 'worawit2025');
						}
					"
					>Unpublished</cv-button
				>
			</div>
		</div>
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
				<form class="flex flex-col gap-6" @submit.prevent="() => {}">
					<div class="flex justify-between items-center">
						<h4>Voting Details</h4>
					</div>
					<div class="!mb-3">
						<cv-text-input
							label="Title"
							placeholder=""
							v-model="voteEventFormInput.title"
							@change="handleChangeInput"
						/>
						<div>{{ voteEventFormInput.title }} {{ isFormDirty }}</div>
					</div>

					<div class="!mb-3">
						<cv-text-input
							label="Nickname"
							placeholder=""
							modelValue="no-field-in-database"
							@change="handleChangeInput"
						>
						</cv-text-input>
					</div>

					<div class="!mb-3">
						<cv-date-picker
							dateLabel="Start Date"
							invalidMessage=""
							v-model="voteEventFormInput.start_date"
							@change="handleChangeInput"
						>
						</cv-date-picker>
					</div>

					<div class="!mb-3">
						<cv-multi-select
							title="Involving Assembly(MultiSelect) query ทั้งหมด "
							placeholder=""
							:options="
								OrganizationList && OrganizationList.length > 0
									? OrganizationList.map((d) => ({
											label: d.name,
											value: d.id,
										}))
									: []
							"
							v-model="voteEventFormInput.organizations"
							@change="handleChangeInput"
						/>
					</div>

					<div class="!mb-3">
						<cv-select
							label="Result"
							v-model="voteEventFormInput.result"
							@change="handleChangeInput"
						>
							<cv-select-option value="`null`">ไม่รู้ผล</cv-select-option>
							<cv-select-option value="ผ่าน">ผ่าน</cv-select-option>
							<cv-select-option value="ไม่ผ่าน">ไม่ผ่าน</cv-select-option>
						</cv-select>
					</div>
					<!-- <div class="!mb-3">
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
					</div> -->

					<div class="!mb-3">
						<cv-text-area
							label="Description"
							placeholder=""
							v-model="voteEventFormInput.description"
							@change="handleChangeInput"
						/>
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
				</form>
			</div>

			<div class="bg-white basis-2/4">
				<div class="!p-4 flex flex-col gap-2">
					<h4>Vote Summary (Original)</h4>
					<div class="text-body-01 !mb-6">
						ข้อมูลสรุปผลคะแนนที่ OCR จากหัวเอกสารบันทึกผลการลงมติ
						โดยระบบจะใช้ผลคะแนนนี้ในการตรวจสอบข้อมูลการลงมติ (Votes)
						ว่าถูกต้องตรงกันหรือไม่
					</div>
					<div class="grid grid-cols-2 gap-x-12 gap-y-4">
						<div class="flex flex-row items-center gap-4">
							<div class="basis-1/2">เห็นด้วย</div>
							<cv-number-input
								placeholder=""
								v-model="voteEventFormInput.agree_count"
							/>
						</div>
						<div class="flex flex-row items-center gap-4">
							<div class="basis-1/2">ไม่เห็นด้วย</div>
							<cv-number-input
								placeholder=""
								v-model="voteEventFormInput.disagree_count"
							/>
						</div>
						<div class="flex flex-row items-center gap-4">
							<div class="basis-1/2">งดออกเสียง</div>
							<cv-number-input
								placeholder=""
								v-model="voteEventFormInput.abstain_count"
							/>
						</div>
						<div class="flex flex-row items-center gap-4">
							<div class="basis-1/2">ไ่ม่ลงคะแนน</div>
							<cv-number-input
								placeholder=""
								v-model="voteEventFormInput.novote_count"
							/>
						</div>
					</div>
				</div>
				<cv-data-table title="Votes" helperText="">
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
