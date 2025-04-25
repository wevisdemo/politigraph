<script setup lang="ts">
//@ts-ignore
import Save16 from '@carbon/icons-vue/es/save/16';
//@ts-ignore
import ViewOff16 from '@carbon/icons-vue/es/view--off/16';
import type {
	UpdateVoteEventsMutationResponse,
	VoteEvent,
	VoteEventUpdateInput,
} from '~/.genql';
import { graphqlClient } from '~/utils/graphql/client';
import type { organization } from 'better-auth/plugins';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

const isShowNotification = ref(true);
const isShowNotificationError = ref(true);

interface VoteEventFormInput {
	title: string;
	start_date: string;
	result: string | null;
	description: string | null;

	disagree_count: number;
	agree_count: number;
	abstain_count: number;
	novote_count: number;
	organizations: string[];
	links: { url: string; note: string | null }[];
}

const defaultValue = {
	title: '',
	start_date: '',
	result: null,
	description: null,

	disagree_count: 0,
	agree_count: 0,
	abstain_count: 0,
	novote_count: 0,
	organizations: [],
	links: [],
};
const voteEventFormInput = ref<VoteEventFormInput>(defaultValue);
const voteEventFormInputDefault = ref<VoteEventFormInput>(defaultValue);

const paginationData = ref({
	page: 1,
	pageSize: 10,
});
const totalCount = ref(0);

const { data: VoteEventData } = await useAsyncData(
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
				organizations: {
					id: true,
					name: true,
				},
				links: {
					note: true,
					url: true,
				},

				disagree_count: true,
				agree_count: true,
				abstain_count: true,
				novote_count: true,
			},
		});
		if (voteEvents.length > 0) {
			const event = voteEvents[0];
			console.log(voteEvents[0]);
			const organizations = event.organizations.map((d) => d.id);

			const data = {
				title: event.title,
				start_date: event.start_date,
				result: event.result,
				description: event.description,

				disagree_count: event.disagree_count ?? 0,
				agree_count: event.agree_count ?? 0,
				abstain_count: event.abstain_count ?? 0,
				novote_count: event.novote_count ?? 0,
				organizations: organizations,
				links: event.links,
			};
			console.log(data);

			voteEventFormInput.value = data;
			voteEventFormInputDefault.value = data;

			// isFormDirty.value = false;
		}
		return voteEvents[0];
	},
	{ watch: [paginationData.value], server: false },
);

const isFormDirty = computed(() => {
	return (
		JSON.stringify(voteEventFormInput.value) !==
		JSON.stringify(voteEventFormInputDefault.value)
	);
});

const { data: VoteList } = await useAsyncData(
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

const { data: OrganizationList } = await useAsyncData(
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
		return organizations ?? [];
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

<!-- organization 
 disconnect - อันที่เคยเลือกแต่ไม่เลือกแล้ว
 connect - อันที่ไม่เคยเลือก แต่เลือกเพิ่มมาใหม่
// organizations: [
// 	{
// 		connect: {
// 				where: {
// 					node: {
// 						// id_IN: ["xx"]
// 					}
// 				}
// 			},
// 		disconnect: [
// 			{
// 				where: {
// 					node: {
// 						// id_IN: ["xx"]
// 					}
// 				}
// 			}
// 		]
// 	}
// ]
-->

<!-- 
	การ update link 
	- เช็ค link ทั้งหมด ว่าเปลี่ยนมั้ย
	if เปลี่ยน
	- ให้ลบ link เก่า ทั้งหมด 
	- แล้ว เพิ่ม link url ใหม่
	else 
	- ไม่ทำอะไรนะ

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
											title: voteEventFormInput.title,
											start_date: voteEventFormInput.start_date,
											result: voteEventFormInput.result,
											description: voteEventFormInput.description,

											disagree_count: Number(voteEventFormInput.disagree_count),
											agree_count: Number(voteEventFormInput.agree_count),
											abstain_count: Number(voteEventFormInput.abstain_count),
											novote_count: Number(voteEventFormInput.novote_count),
											organizations: [
												{
													connect: [
														{
															where: {
																node: {
																	id_IN: null,
																},
															},
														},
													],
													disconnect: [
														{
															where: {
																node: {
																	id_IN: null,
																},
															},
														},
													],
												},
											],
											links: [
												{
													delete: [
														{
															where: {
																node: {
																	url_IN: ['x'],
																},
															},
														},
													],
													create: [
														{
															node: {
																note: null,
																url: 'a',
															},
														},
														{
															node: {
																note: null,
																url: 'b',
															},
														},
													],
												},
											],
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
						/>
					</div>
					<div class="!mb-3">
						<cv-text-input
							label="Nickname"
							placeholder=""
							modelValue="no-field-in-database"
						>
						</cv-text-input>
					</div>
					<div class="!mb-3">
						<cv-date-picker
							dateLabel="Start Date"
							invalidMessage=""
							v-model="voteEventFormInput.start_date"
						>
						</cv-date-picker>
					</div>

					<div class="!mb-3" v-if="OrganizationList">
						<cv-multi-select
							title="Involving Assembly(MultiSelect) query ทั้งหมด "
							placeholder=""
							:options="
								OrganizationList.map((d) => ({
									label: d.name,
									value: d.id,
								}))
							"
							v-model="voteEventFormInput.organizations"
						/>
					</div>
					<div>{{ voteEventFormInput.organizations }}</div>

					<div class="!mb-3">
						<cv-select label="Result" v-model="voteEventFormInput.result">
							<cv-select-option :value="null"></cv-select-option>
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
						/>
					</div>

					<p class="!font-bold !mb-3">Related Link</p>

					<div class="">
						<div v-for="(row, i) in voteEventFormInput.links">
							<div>{{ `Document ${i + 1}` }}</div>
							<div class="!mb-3">
								<cv-text-input
									label="Document Note"
									placeholder=""
									v-model="row.note"
								>
								</cv-text-input>
							</div>

							<div class="!mb-3">
								<cv-text-input
									label="Document URL"
									placeholder=""
									v-model="row.url"
								>
								</cv-text-input>
							</div>
						</div>
					</div>

					<div class="!mb-3">
						<cv-button default="Add Another Item" kind="tertiary"
							>Add Another Item</cv-button
						>
					</div>
				</form>
				<div>{{ voteEventFormInput.links }}</div>
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
