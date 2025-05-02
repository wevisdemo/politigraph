<script setup lang="ts">
//@ts-ignore
import { Save16, View16, ViewOff16 } from '@carbon/icons-vue';
import { useForm } from '@tanstack/vue-form';
import { VotesCollection } from '#components';
import { graphqlClient } from '~/utils/graphql/client';
import { diff } from 'radash';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

const isShowNotification = ref(true);
const isShowNotificationError = ref(true);

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
				nickname: true,
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
		return voteEvents[0];
	},
	{ server: false },
);

const defaultValues = reactive({
	title: computed(() => VoteEventData?.value?.title),
	nickname: computed(() => VoteEventData?.value?.nickname),
	start_date: computed(() => VoteEventData?.value?.start_date),
	result: computed(() => VoteEventData?.value?.result),
	description: computed(() => VoteEventData?.value?.description),

	agree_count: computed(() => VoteEventData?.value?.agree_count ?? 0),
	abstain_count: computed(() => VoteEventData?.value?.abstain_count ?? 0),
	novote_count: computed(() => VoteEventData?.value?.novote_count ?? 0),
	disagree_count: computed(() => VoteEventData?.value?.disagree_count ?? 0),

	organizations: computed(() =>
		VoteEventData?.value?.organizations.map((d) => d.id),
	),
	links: computed(() => VoteEventData?.value?.links || []),
	publish_status: computed(() => VoteEventData?.value?.publish_status),
});

const isPublish = computed(
	() => voteEventFormInput.getFieldValue('publish_status') === 'PUBLISHED',
);

const voteEventFormInput = useForm({
	defaultValues,
	onSubmit: async ({ value }) => {
		// Do something with form data
		let organizationDisconnect: string[] = [],
			organizationsConnect: string[] = [];
		if (defaultValues.organizations && value.organizations) {
			organizationDisconnect = diff(
				defaultValues.organizations,
				value.organizations,
			);
			organizationsConnect = diff(
				value.organizations,
				defaultValues.organizations,
			);
		}

		const linkDelete: string[] = defaultValues.links.map((d) => d.url);
		const linkCreate: { node: { note: string; url: string } }[] =
			value.links.map((d) => ({ node: { note: d.note ?? '', url: d.url } }));

		const { updateVoteEvents } = await graphqlClient.mutation({
			updateVoteEvents: {
				__args: {
					where: {
						id_EQ: route.params.id as string,
					},
					update: {
						title: value.title,
						nickname: value.nickname,
						start_date: value.start_date,
						result: value.result,
						description: value.description,

						disagree_count: Number(value.disagree_count),
						agree_count: Number(value.agree_count),
						abstain_count: Number(value.abstain_count),
						novote_count: Number(value.novote_count),
						organizations: [
							{
								connect: [
									{
										where: {
											node: {
												id_IN: organizationsConnect,
											},
										},
									},
								],
								disconnect: [
									{
										where: {
											node: {
												id_IN: organizationDisconnect,
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
												url_IN: linkDelete,
											},
										},
									},
								],
								create: linkCreate,
							},
						],
					},
				},
				voteEvents: {
					id: true,
				},
			},
		});
		refreshNuxtData(['VoteEventData']);
	},
});

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
	{ server: false },
);
</script>
<template>
	<div class="!p-10 min-h-dvh !bg-[#F4F4F4] !pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item class="text-[#0F62FE]">All Data</cv-breadcrumb-item>
			<cv-breadcrumb-item class="text-[#0F62FE]">Voting</cv-breadcrumb-item>
			<cv-breadcrumb-item>{{
				voteEventFormInput.getFieldValue('title')
			}}</cv-breadcrumb-item>
		</cv-breadcrumb>
		<form
			@submit="
				(e: any) => {
					e.preventDefault();
					e.stopPropagation();
					voteEventFormInput.handleSubmit();
				}
			"
		>
			<div class="flex flex-row justify-between">
				<div class="basis-1/2 flex flex-row items-center gap-6">
					<h3 class="!font-normal !mb-12 !mt-4">
						{{ voteEventFormInput.getFieldValue('title') }}
					</h3>
					<div>
						<ui-publish-status-tag
							:status="voteEventFormInput.getFieldValue('publish_status') || ''"
						/>
					</div>
				</div>
				<div class="flex justify-between items-center gap-4">
					<voteEventFormInput.Subscribe>
						<template v-slot="{ canSubmit }">
							<cv-button
								default="Save Changes"
								:icon="Save16"
								:disabled="!canSubmit"
								type="submit"
								>Save Changes</cv-button
							>
						</template>
					</voteEventFormInput.Subscribe>
					<cv-button
						default="Unpublished"
						:icon="isPublish ? ViewOff16 : View16"
						:kind="isPublish ? 'tertiary' : 'primary'"
						@click="
							async () => {
								const { updateVoteEvents } = await graphqlClient.mutation({
									updateVoteEvents: {
										__args: {
											where: {
												id_EQ: route.params.id as string,
											},
											update: {
												publish_status:
													defaultValues.publish_status !== 'PUBLISHED'
														? 'PUBLISHED'
														: 'UNPUBLISHED',
											},
										},
										voteEvents: {
											publish_status: true,
										},
									},
								});
								console.log(updateVoteEvents);

								if (updateVoteEvents.voteEvents) {
									refreshNuxtData(['VoteEventData']);
								}
							}
						"
						>{{ isPublish ? 'Unpublished' : 'Published' }}</cv-button
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
							<voteEventFormInput.Field name="title">
								<template v-slot="{ field }">
									<cv-text-input
										label="Title"
										:name="field.name"
										invalid-message=""
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
									/>
								</template>
							</voteEventFormInput.Field>
						</div>
						<div class="!mb-3">
							<voteEventFormInput.Field name="nickname">
								<template v-slot="{ field }">
									<cv-text-input
										label="Nickname"
										:name="field.name"
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
									/>
								</template>
							</voteEventFormInput.Field>
						</div>
						<div class="!mb-3">
							<voteEventFormInput.Field name="start_date">
								<template v-slot="{ field }">
									<cv-date-picker
										dateLabel="Start Date"
										:name="field.name"
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
									/>
								</template>
							</voteEventFormInput.Field>
						</div>

						<div class="!mb-3" v-if="OrganizationList">
							<voteEventFormInput.Field name="organizations">
								<template v-slot="{ field }">
									<cv-multi-select
										title="Involving Assembly(MultiSelect) query ทั้งหมด "
										placeholder=""
										:options="
											OrganizationList.map((d) => ({
												label: d.name,
												value: d.id,
											}))
										"
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
									/>
								</template>
							</voteEventFormInput.Field>
						</div>

						<div class="!mb-3">
							<voteEventFormInput.Field name="result">
								<template v-slot="{ field }">
									<cv-select
										label="Result"
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
									>
										<cv-select-option :value="null"></cv-select-option>
										<cv-select-option value="ผ่าน">ผ่าน</cv-select-option>
										<cv-select-option value="ไม่ผ่าน">ไม่ผ่าน</cv-select-option>
									</cv-select>
								</template>
							</voteEventFormInput.Field>
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
							<voteEventFormInput.Field name="description">
								<template v-slot="{ field }">
									<cv-text-area
										label="Description"
										placeholder=""
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
									/>
								</template>
							</voteEventFormInput.Field>
						</div>

						<p class="!font-bold !mb-3">Related Link</p>

						<voteEventFormInput.Field name="links">
							<template v-slot="{ field, state }">
								<div v-for="(_, i) of field.state.value">
									<voteEventFormInput.Field :key="i" :name="`links[${i}].note`">
										<template v-slot="{ field: subField, state }">
											<div>{{ `Document ${i + 1}` }}</div>
											<div class="!mb-3">
												<cv-text-input
													label="Document Note"
													placeholder=""
													:modelValue="subField.state.value"
													@update:modelValue="subField.handleChange"
												>
												</cv-text-input>
											</div>
										</template>
									</voteEventFormInput.Field>
									<voteEventFormInput.Field :key="i" :name="`links[${i}].url`">
										<template v-slot="{ field: subField, state }">
											<div class="!mb-3">
												<cv-text-input
													label="Document URL"
													placeholder=""
													:modelValue="subField.state.value"
													@update:modelValue="subField.handleChange"
												>
												</cv-text-input>
											</div>
										</template>
									</voteEventFormInput.Field>
								</div>
								<div class="!mb-3">
									<cv-button
										default="Add Another Item"
										kind="tertiary"
										@click="() => field.pushValue({ note: '', url: '' })"
										>Add Another Item</cv-button
									>
								</div>
							</template>
						</voteEventFormInput.Field>
					</form>
					<!-- <div>{{ voteEventFormInput. }}</div> -->
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
								<voteEventFormInput.Field name="agree_count">
									<template v-slot="{ field }">
										<cv-number-input
											placeholder=""
											:modelValue="field.state.value"
											type="number"
											@update:modelValue="field.handleChange"
										/>
									</template>
								</voteEventFormInput.Field>
							</div>
							<div class="flex flex-row items-center gap-4">
								<div class="basis-1/2">ไม่เห็นด้วย</div>
								<voteEventFormInput.Field name="disagree_count">
									<template v-slot="{ field }">
										<cv-number-input
											placeholder=""
											:modelValue="field.state.value"
											type="number"
											@update:modelValue="field.handleChange"
										/>
									</template>
								</voteEventFormInput.Field>
							</div>
							<div class="flex flex-row items-center gap-4">
								<div class="basis-1/2">งดออกเสียง</div>
								<voteEventFormInput.Field name="abstain_count">
									<template v-slot="{ field }">
										<cv-number-input
											placeholder=""
											type="number"
											:modelValue="field.state.value"
											@update:modelValue="field.handleChange"
										/>
									</template>
								</voteEventFormInput.Field>
							</div>
							<div class="flex flex-row items-center gap-4">
								<div class="basis-1/2">ไ่ม่ลงคะแนน</div>
								<voteEventFormInput.Field name="novote_count">
									<template v-slot="{ field }">
										<cv-number-input
											placeholder=""
											:modelValue="field.state.value"
											type="number"
											@update:modelValue="field.handleChange"
										/>
									</template>
								</voteEventFormInput.Field>
							</div>
						</div>
					</div>
					<template v-if="VoteEventData">
						<VotesCollection :vote-event-id="VoteEventData?.id" />
					</template>
				</div>
			</div>
		</form>
	</div>
	<!-- <pre v-if="voteEventFormInput">{{
		JSON.stringify(voteEventFormInput, undefined, 2)
	}}</pre> -->
</template>

<style scoped></style>
