<script setup lang="ts">
import {
	DocumentView16,
	Save16,
	TrashCan16,
	View16,
	ViewOff16,
	//@ts-ignore
} from '@carbon/icons-vue';
import { useForm } from '@tanstack/vue-form';
import { graphqlClient } from '~/utils/graphql/client';
import { validateVotes } from '~/utils/votes/validator';
import { diff } from 'radash';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();

const isShowSuccessNotification = ref(false);

const { data: voteEventData, refresh: refreshVoteEvent } = await useAsyncData(
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
					__args: {
						sort: [{ note: 'ASC' }],
					},
				},
				disagree_count: true,
				agree_count: true,
				abstain_count: true,
				novote_count: true,
				votes: {
					id: true,
					vote_order: true,
					voter_name: true,
					voter_party: true,
					option: true,
					badge_number: true,
					voters: {
						id: true,
						firstname: true,
						lastname: true,
					},
				},
			},
		});
		return voteEvents[0];
	},
	{ server: false },
);

useHead({
	title: `${voteEventData.value?.title || 'Vote Event'} | Politigraph Admin`,
});

const defaultValues = reactive({
	title: computed(() => voteEventData?.value?.title),
	nickname: computed(() => voteEventData?.value?.nickname),
	start_date: computed(() => voteEventData?.value?.start_date),
	result: computed(() => voteEventData?.value?.result),
	description: computed(() => voteEventData?.value?.description),

	agree_count: computed(() => voteEventData?.value?.agree_count ?? 0),
	abstain_count: computed(() => voteEventData?.value?.abstain_count ?? 0),
	novote_count: computed(() => voteEventData?.value?.novote_count ?? 0),
	disagree_count: computed(() => voteEventData?.value?.disagree_count ?? 0),

	organizations: computed(() =>
		voteEventData?.value?.organizations.map((d) => d.id),
	),
	links: computed(() => voteEventData?.value?.links || []),
	publish_status: computed(() => voteEventData?.value?.publish_status),
});

const isPublish = computed(
	() => voteEventData.value?.publish_status === 'PUBLISHED',
);

const voteEventFormInput = useForm({
	defaultValues,
	onSubmit: async ({ value }) => {
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

		await graphqlClient.mutation({
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
						publish_status:
							value.publish_status === 'PUBLISHED'
								? 'PUBLISHED'
								: errors.value.length > 0
									? 'ERROR'
									: 'UNPUBLISHED',
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

		openSuccessToastNotification();
		refreshVoteEvent();
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

const voteEventFormStore = voteEventFormInput.useStore();

const errors = computed(() =>
	voteEventData.value && voteEventFormStore.value
		? validateVotes({
				...voteEventFormStore.value.values,
				votes: voteEventData.value?.votes,
			})
		: [],
);

const openOriginalDocument = computed(() => {
	const link = voteEventData.value?.links.find(
		(link) => link.note === 'ใบประมวลผลการลงมติ',
	)?.url;

	return link ? () => window.open(link, '_blank') : undefined;
});

async function togglePublishStatus() {
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

	if (updateVoteEvents.voteEvents) {
		openSuccessToastNotification();
		refreshVoteEvent();
	}
}

function openSuccessToastNotification() {
	isShowSuccessNotification.value = false;
	isShowSuccessNotification.value = true;

	setTimeout(() => {
		isShowSuccessNotification.value = false;
	}, 5000);
}
</script>

<template>
	<div class="!p-10 min-h-dvh !bg-[#F4F4F4] !pt-[90px]">
		<cv-breadcrumb noTrailingSlash>
			<cv-breadcrumb-item class="text-[#0F62FE]"
				><a href="/admin/vote-events">Vote Events</a></cv-breadcrumb-item
			>
			<cv-breadcrumb-item
				><span
					class="max-w-sm text-ellipsis whitespace-nowrap overflow-hidden"
					>{{ voteEventData?.title }}</span
				></cv-breadcrumb-item
			>
		</cv-breadcrumb>
		<form
			@submit="
				(e: any) => {
					e.preventDefault();
					e.stopPropagation();
				}
			"
		>
			<cv-skeleton-text
				v-if="!voteEventData"
				class="!my-6"
				heading
				:line-count="2"
			></cv-skeleton-text>
			<div
				v-else
				class="flex flex-col md:flex-row flex-wrap justify-end items-end md:items-center gap-4 !my-6"
			>
				<div class="flex-1 flex flex-row gap-4 items-center">
					<h2 class="md:min-w-xl">
						{{ voteEventData.title }}
					</h2>

					<div>
						<UiPublishStatusTag :status="voteEventData.publish_status" />
					</div>
				</div>

				<div class="flex gap-2">
					<cv-button
						v-if="openOriginalDocument"
						:icon="DocumentView16"
						kind="tertiary"
						@click="openOriginalDocument"
					>
						View Original
					</cv-button>
					<cv-button
						default="Unpublished"
						:icon="isPublish ? ViewOff16 : View16"
						kind="tertiary"
						@click="togglePublishStatus"
						:disabled="errors.length"
						>{{ isPublish ? 'Unpublished' : 'Published' }}</cv-button
					>
					<voteEventFormInput.Subscribe>
						<template v-slot="{ canSubmit }">
							<cv-button
								default="Save Changes"
								:icon="Save16"
								:disabled="!canSubmit"
								type="submit"
								@click="voteEventFormInput.handleSubmit"
								>Save Changes</cv-button
							>
						</template>
					</voteEventFormInput.Subscribe>
				</div>
			</div>

			<cv-inline-notification
				v-if="voteEventData?.publish_status !== 'PUBLISHED'"
				lowContrast
				kind="warning"
				title="This item is unpublished"
				subTitle="It is not visible in public view."
				hideCloseButton
			/>

			<VotesErrorNotifications
				:errors
				:getActionLabel="() => 'Review'"
				@action="
					() => $router.push(`/admin/vote-events/${voteEventData?.id}/votes`)
				"
			/>

			<div class="flex flex-col md:flex-row gap-8 items-start !mt-4">
				<div class="bg-white !p-4 basis-2/4">
					<div class="flex flex-col gap-6">
						<div class="flex flex-col gap-1">
							<h4>Vote Events Details</h4>

							<p class="!text-xs opacity-70">ID: {{ voteEventData?.id }}</p>
						</div>
						<template v-if="!voteEventData">
							<cv-number-input-skeleton
								v-for="i in 9"
								:key="i"
							></cv-number-input-skeleton>
						</template>
						<template v-else>
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
							<voteEventFormInput.Field name="start_date">
								<template v-slot="{ field }">
									<cv-date-picker
										kind="single"
										dateLabel="Start Date"
										:name="field.name"
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
										:calOptions="{ dateFormat: 'Y-m-d' }"
									/>
								</template>
							</voteEventFormInput.Field>
							<voteEventFormInput.Field
								v-if="OrganizationList"
								name="organizations"
							>
								<template v-slot="{ field }">
									<cv-multi-select
										title="Involving Assemblies"
										:label="
											field.state.value
												?.map(
													(id) =>
														OrganizationList?.find((org) => org.id === id)
															?.name,
												)
												.join(', ')
										"
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
							<voteEventFormInput.Field name="description">
								<template v-slot="{ field }">
									<cv-text-area
										label="Description"
										class="!min-h-48"
										placeholder=""
										:modelValue="field.state.value"
										@update:modelValue="field.handleChange"
									/>
								</template>
							</voteEventFormInput.Field>
							<div>
								<p class="!font-bold">Related Links</p>

								<div class="opacity-50">
									สำหรับช่อง Notes ให้ใส่ชนิดเอกสาร เช่น "ใบประมวลผลการลงมติ"
									หรือ "ระบบฐานข้อมูลรายงานและบันทึกการประชุม"
								</div>
							</div>
							<voteEventFormInput.Field name="links">
								<template v-slot="{ field }">
									<div
										v-for="(_, i) of field.state.value"
										class="flex flex-col gap-3"
									>
										<voteEventFormInput.Field
											:key="i"
											:name="`links[${i}].note`"
										>
											<template v-slot="{ field: subField }">
												<div class="flex flex-row justify-between">
													<h6>{{ `Link ${i + 1}` }}</h6>
													<cv-button
														@click="field.removeValue(i)"
														kind="danger--ghost"
														:icon="TrashCan16"
														>Delete</cv-button
													>
												</div>
												<cv-text-input
													label="Notes"
													placeholder=""
													:modelValue="subField.state.value"
													@update:modelValue="subField.handleChange"
												>
												</cv-text-input>
											</template>
										</voteEventFormInput.Field>
										<voteEventFormInput.Field
											:key="i"
											:name="`links[${i}].url`"
										>
											<template v-slot="{ field: subField }">
												<cv-text-input
													label="URL"
													placeholder=""
													:modelValue="subField.state.value"
													@update:modelValue="subField.handleChange"
												>
												</cv-text-input>
											</template>
										</voteEventFormInput.Field>
									</div>
									<cv-button
										default="Add Another Item"
										kind="tertiary"
										@click="() => field.pushValue({ note: '', url: '' })"
										>Add a link</cv-button
									>
								</template>
							</voteEventFormInput.Field>
						</template>
					</div>
				</div>

				<div class="bg-white basis-2/4">
					<div class="!p-4 flex flex-col gap-2 !mb-3">
						<h4>Vote Summary (Original)</h4>

						<p class="text-body-01">
							ข้อมูลสรุปผลคะแนนที่ OCR จากหัวเอกสารบันทึกผลการลงมติ
							โดยระบบจะใช้ผลคะแนนนี้ในการตรวจสอบข้อมูลการลงมติ (Votes)
							ว่าถูกต้องตรงกันหรือไม่
						</p>

						<div v-if="!voteEventData" class="grid grid-cols-2 gap-2">
							<cv-button-skeleton
								v-for="i in 4"
								:key="i"
								size="field"
							></cv-button-skeleton>
						</div>

						<div v-else class="grid grid-cols-2 gap-x-12 gap-y-4">
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
								<div class="basis-1/2">ไม่ลงคะแนนเสียง</div>
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
					<VoteEventCollection
						:vote-event-id="voteEventData?.id"
						:votes="voteEventData?.votes"
					/>
				</div>
			</div>
		</form>
	</div>

	<cv-toast-notification
		v-if="isShowSuccessNotification"
		kind="success"
		title="ข้อมูลถูกบันทึกเรียบร้อย"
		@close="isShowSuccessNotification = false"
		class="z-50 fixed right-[4px] top-[60px]"
	/>
</template>
