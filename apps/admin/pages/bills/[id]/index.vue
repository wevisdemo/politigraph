<script setup lang="ts">
// @ts-ignore
import { Save16 } from '@carbon/icons-vue';
import type { Link, OrganizationType } from '@politigraph/graphql/genql';
import { useForm } from '@tanstack/vue-form';
import RelatedLinksForm from '~/components/LinksForm.vue';
import { useGraphqlClient } from '~/utils/graphql/client';
import { usePeopleOptions } from '~/utils/graphql/people';
import { diff } from 'radash';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

const successToast = useToastNotification();
const originalLinks = ref<Pick<Link, 'id' | 'note' | 'url'>[]>([]);

const billClassification = ref([
	{
		name: 'NORMAL_BILL',
		label: 'ทั่วไป',
		value: 'NORMAL_BILL',
	},
	{
		name: 'BUDGET_BILL',
		label: 'เกี่ยวข้องกับงบประมาณ',
		value: 'BUDGET_BILL',
	},
	{
		name: 'EMERGENCY_DECREE',
		label: 'ประกาศฉุกเฉิน',
		value: 'EMERGENCY_DECREE',
	},
]);

const billStatus = ref([
	{
		name: 'POLITICIAN',
		label: 'กำลังดำเนินการ',
		value: 'IN_PROGRESS',
	},
	{
		name: 'MERGED',
		label: 'ถูกรวมร่าง',
		value: 'MERGED',
	},
	{
		name: 'ENACTED',
		label: 'ออกเป็นกฎหมาย',
		value: 'ENACTED',
	},
	{
		name: 'REJECTED',
		label: 'ตกไป',
		value: 'REJECTED',
	},
]);

const creatorTypes = ref([
	{
		name: 'POLITICIAN',
		label: 'สมาชิกรัฐสภา',
		value: 'POLITICIAN',
	},
	{
		name: 'ASSEMBLY',
		label: 'คณะรัฐมนตรี',
		value: 'ASSEMBLY',
	},
	{
		name: 'PEOPLE',
		label: 'ประชาชน',
		value: 'PEOPLE',
	},
	{
		name: 'UNKNOWN',
		label: 'อื่นๆ / ไม่พบข้อมูล',
		value: 'UNKNOWN',
	},
]);

const { data: billData, refresh: refreshBillData } = await useLazyAsyncData(
	async () => {
		const { bills } = await graphqlClient.query({
			bills: {
				__args: {
					limit: 20,
					offset: 0,
					where: {
						id: { eq: route.params.id as string },
					},
				},
				id: true,
				title: true,
				nickname: true,
				classification: true,
				creator_type: true,
				status: true,
				proposal_date: true,
				people_signature_count: true,
				organizations: {
					id: true,
					name: true,
				},
				co_creators: {
					id: true,
					name: true,
				},
				creators: {
					on_Person: {
						id: true,
						name: true,
					},
					on_Organization: {
						id: true,
						name: true,
					},
				},
				links: {
					id: true,
					note: true,
					url: true,
					__args: {
						sort: [{ note: 'ASC' }],
					},
				},
			},
		});

		originalLinks.value = JSON.parse(JSON.stringify(bills[0].links));

		return bills[0];
	},
);

useHead({
	title: `${billData.value?.title || 'Bills'} | Politigraph Admin`,
});

const defaultValues = reactive({
	title: computed(() => billData?.value?.title),
	nickname: computed(() => billData?.value?.nickname),
	status: computed(() => billData?.value?.status),
	proposal_date: computed(() => billData?.value?.proposal_date),
	links: computed(() => billData?.value?.links || []),
	classification: computed(() => billData?.value?.classification),
	creator_type: computed(() => billData?.value?.creator_type),
	people_signature_count: computed(
		() => billData?.value?.people_signature_count,
	),
	organizations: computed(() =>
		billData?.value?.organizations.map((d) => d.id),
	),
	co_creators: computed(() => billData?.value?.co_creators.map((d) => d.id)),
	personCreators: computed(() =>
		billData?.value?.creator_type === 'POLITICIAN' ||
		billData?.value?.creator_type === 'PEOPLE'
			? (billData?.value?.creators?.map((creator) => creator.id) ?? [])
			: [],
	),
	organizationCreators: computed(() =>
		billData?.value?.creator_type === 'ASSEMBLY'
			? (billData?.value?.creators?.map((creator) => creator.id) ?? [])
			: [],
	),
});

const billFormInput = useForm({
	defaultValues,
	onSubmit: async ({ value }) => {
		const prevOrgs = defaultValues.organizations ?? [];
		const nextOrgs = value.organizations ?? [];

		const organizationDisconnect = diff(prevOrgs, nextOrgs);
		const organizationsConnect = diff(nextOrgs, prevOrgs);

		const prevPersonCreators =
			billData.value?.creator_type === 'POLITICIAN' ||
			billData.value?.creator_type === 'PEOPLE'
				? (billData.value?.creators?.map((creator) => creator.id) ?? [])
				: [];
		const prevOrganizationCreators =
			billData.value?.creator_type === 'ASSEMBLY'
				? (billData.value?.creators?.map((creator) => creator.id) ?? [])
				: [];
		const nextPersonCreators =
			value.creator_type === 'POLITICIAN' || value.creator_type === 'PEOPLE'
				? (value.personCreators ?? [])
				: [];
		const nextOrganizationCreators =
			value.creator_type === 'ASSEMBLY'
				? (value.organizationCreators ?? [])
				: [];
		const creatorPersonDisconnect = diff(
			prevPersonCreators,
			nextPersonCreators,
		);
		const creatorPersonConnect = diff(nextPersonCreators, prevPersonCreators);
		const creatorOrganizationDisconnect = diff(
			prevOrganizationCreators,
			nextOrganizationCreators,
		);
		const creatorOrganizationConnect = diff(
			nextOrganizationCreators,
			prevOrganizationCreators,
		);

		const prevCoCreators = defaultValues.co_creators ?? [];
		const nextCoCreators =
			value.creator_type === 'POLITICIAN' ? (value.co_creators ?? []) : [];

		const coCreatorsDisconnect = diff(prevCoCreators, nextCoCreators);
		const coCreatorsConnect = diff(nextCoCreators, prevCoCreators);

		const deletedLinkIds: string[] = defaultValues.links
			.filter(
				(oldLink) => !value.links.some((newLink) => oldLink.id === newLink.id),
			)
			.map((link) => link.id);
		const createdLinks: { node: Pick<Link, 'note' | 'url'> }[] = value.links
			.filter(
				(newLink) =>
					!defaultValues.links.some((oldLink) => oldLink.id === newLink.id),
			)
			.map(({ note, url }) => ({ node: { note, url } }));

		const originalLinkIds = new Set(originalLinks.value.map((l) => l.id) ?? []);

		const updatedLinks =
			value.links?.filter((l) => originalLinkIds.has(l.id)) ?? [];

		await graphqlClient.mutation({
			updateBills: {
				__args: {
					where: { id: { eq: route.params.id as string } },
					update: {
						title: { set: value.title },
						nickname: { set: value.nickname },
						classification: { set: value.classification },
						status: { set: value.status },
						proposal_date: { set: value.proposal_date },
						creator_type: { set: value.creator_type },
						people_signature_count: { set: value.people_signature_count },
						links: [
							{
								delete: [
									{
										where: {
											node: {
												id: { in: deletedLinkIds },
											},
										},
									},
								],
								create: createdLinks,
							},
						],
						organizations: [
							{
								connect: [
									{
										where: {
											node: {
												id: { in: organizationsConnect },
											},
										},
									},
								],
								disconnect: [
									{
										where: {
											node: {
												id: { in: organizationDisconnect },
											},
										},
									},
								],
							},
						],
						creators: {
							Person: [
								{
									connect: creatorPersonConnect.map((id) => ({
										where: {
											node: {
												id: { eq: id },
											},
										},
									})),
									disconnect: creatorPersonDisconnect.map((id) => ({
										where: {
											node: {
												id: { eq: id },
											},
										},
									})),
								},
							],
							Organization: [
								{
									connect: creatorOrganizationConnect.map((id) => ({
										where: {
											node: {
												id: { eq: id },
											},
										},
									})),
									disconnect: creatorOrganizationDisconnect.map((id) => ({
										where: {
											node: {
												id: { eq: id },
											},
										},
									})),
								},
							],
						},
						co_creators: [
							{
								connect: [
									{
										where: {
											node: {
												id: { in: coCreatorsConnect },
											},
										},
									},
								],
								disconnect: [
									{
										where: {
											node: {
												id: { in: coCreatorsDisconnect },
											},
										},
									},
								],
							},
						],
					},
				},
				bills: {
					id: true,
				},
			},
		});

		await Promise.all(
			updatedLinks.map(({ id, ...data }) =>
				graphqlClient.mutation({
					updateLinks: {
						__args: {
							where: {
								id: { eq: id },
							},
							update: {
								note: { set: data.note },
								url: { set: data.url },
							},
						},
						links: {
							id: true,
						},
					},
				}),
			),
		);

		successToast.show({
			kind: 'success',
			title: 'ข้อมูลถูกบันทึกเรียบร้อย',
		});
		refreshBillData();
	},
});

const coCreatorKeyword = ref('');

const { data: peopleList } = await usePeopleOptions();
const { data: organizationList } = await useAsyncData(
	'organizationList',
	async () => {
		const { organizations } = await graphqlClient.query({
			organizations: {
				id: true,
				name: true,
				classification: true,
			},
		});
		return organizations ?? [];
	},
	{ lazy: true },
);

const getOrganizationOptions = (classification: OrganizationType) => {
	const org = organizationList.value?.filter(
		(o) => o.classification === classification,
	);
	return (
		org?.map((o) => ({
			label: o.name,
			value: o.id,
		})) || []
	);
};

const billFormStore = billFormInput.useStore();
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/bills">Bills</a></cv-breadcrumb-item>
		<cv-breadcrumb-item
			><span class="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap">{{
				billData?.title
			}}</span></cv-breadcrumb-item
		>
	</cv-breadcrumb>

	<billFormInput.Subscribe>
		<div
			class="my-6 flex items-end justify-end gap-4 md:flex-row md:items-center"
		>
			<h2 class="md:min-w-xl">{{ billData?.title }}</h2>

			<cv-button
				@click="billFormInput.handleSubmit"
				class="mt-4"
				kind="primary"
				:icon="Save16"
				>Save Changes</cv-button
			>
		</div>
	</billFormInput.Subscribe>

	<form
		@submit="
			(e) => {
				e.preventDefault();
				e.stopPropagation();
			}
		"
	>
		<div class="mt-4 flex flex-col items-start gap-8 md:flex-row">
			<div class="basis-2/4 bg-white p-4">
				<div class="flex flex-col gap-6">
					<div class="flex flex-col gap-1">
						<h4>Bill Details</h4>
					</div>
					<template v-if="!billData || !peopleList || !organizationList">
						<cv-number-input-skeleton
							v-for="i in 9"
							:key="i"
						></cv-number-input-skeleton>
					</template>
					<template v-else>
						<billFormInput.Field name="title">
							<template v-slot="{ field }">
								<cv-text-input
									label="Title*"
									:name="field.name"
									invalid-message=""
									:modelValue="field.state.value"
									@update:modelValue="field.handleChange"
								/>
							</template>
						</billFormInput.Field>

						<billFormInput.Field name="nickname">
							<template v-slot="{ field }">
								<cv-text-input
									label="Nickname"
									:name="field.name"
									invalid-message=""
									:modelValue="field.state.value"
									@update:modelValue="field.handleChange"
								/>
							</template>
						</billFormInput.Field>

						<div class="flex justify-between gap-5">
							<div class="relative w-1/2">
								<billFormInput.Field name="classification">
									<template v-slot="{ field }">
										<cv-select
											label="Classification*"
											:modelValue="field.state.value"
											@update:modelValue="field.handleChange"
										>
											<cv-select-option
												:value="item.value"
												v-for="item in billClassification"
												>{{ item.label }}</cv-select-option
											>
										</cv-select>
									</template>
								</billFormInput.Field>
							</div>

							<div class="relative w-1/2">
								<billFormInput.Field name="status">
									<template v-slot="{ field }">
										<cv-select
											label="Status*"
											:modelValue="field.state.value"
											@update:modelValue="field.handleChange"
										>
											<cv-select-option
												:value="item.value"
												v-for="item in billStatus"
												>{{ item.label }}</cv-select-option
											>
										</cv-select>
									</template>
								</billFormInput.Field>
							</div>
						</div>

						<div class="flex justify-between gap-5">
							<div class="relative w-1/2">
								<billFormInput.Field name="proposal_date">
									<template v-slot="{ field }">
										<cv-date-picker
											dateLabel="Proposal Date*"
											kind="single"
											class="membership-datepicker"
											:modelValue="field.state.value"
											@update:modelValue="field.handleChange"
											:calOptions="{ dateFormat: 'Y-m-d' }"
										/>
									</template>
								</billFormInput.Field>
							</div>

							<div class="relative w-1/2">
								<billFormInput.Field name="organizations">
									<template v-slot="{ field }">
										<cv-select
											label="Proposed in Representative Term"
											:modelValue="field.state.value"
											@update:modelValue="field.handleChange"
										>
											<cv-select-option
												:value="item.value"
												v-for="item in getOrganizationOptions(
													'HOUSE_OF_REPRESENTATIVE',
												)"
												>{{ item.label }}</cv-select-option
											>
										</cv-select>
									</template>
								</billFormInput.Field>
							</div>
						</div>

						<div>
							<h4 class="mb-3">Creator</h4>

							<billFormInput.Field name="creator_type">
								<template v-slot="{ field }">
									<cv-radio-group legendText="Type">
										<cv-radio-button
											v-for="item in creatorTypes"
											name="creator-type"
											:label="item.label"
											:value="item.value"
											:modelValue="field.state.value"
											@update:modelValue="field.handleChange"
										/>
									</cv-radio-group>
								</template>
							</billFormInput.Field>
						</div>

						<div
							v-if="billFormStore.values.creator_type == 'POLITICIAN'"
							class="flex flex-col gap-3"
						>
							<billFormInput.Field name="personCreators">
								<template v-slot="{ field }">
									<cv-combo-box
										title="Creator"
										:options="peopleList"
										item-value-key="value"
										item-text-key="label"
										autoFilter
										autoHighlight
										:modelValue="field.state.value?.[0]"
										@update:modelValue="field.handleChange([$event])"
									/>
								</template>
							</billFormInput.Field>

							<billFormInput.Field name="co_creators">
								<template v-slot="{ field }">
									<div class="flex flex-col gap-3">
										<cv-combo-box
											v-model="coCreatorKeyword"
											title="Co-Creators"
											:options="peopleList"
											item-value-key="value"
											item-text-key="label"
											autoFilter
											autoHighlight
											@update:modelValue="
												(creatorId: string) => {
													if (!peopleList?.some((p) => p.value === creatorId))
														return;
													field.handleChange([
														...(field.state.value ?? []),
														creatorId,
													]);
													coCreatorKeyword = '';
												}
											"
										/>

										<div class="flex flex-wrap gap-2">
											<cv-tag
												v-for="id in field.state.value ?? []"
												:key="id"
												:label="
													peopleList?.find((person) => person.value === id)
														?.label ?? id
												"
												filter
												@remove="
													field.handleChange(
														(field.state.value ?? []).filter(
															(value) => value !== id,
														),
													)
												"
											/>
										</div>
									</div>
								</template>
							</billFormInput.Field>
						</div>
						<div v-else-if="billFormStore.values.creator_type == 'ASSEMBLY'">
							<billFormInput.Field name="organizationCreators">
								<template v-slot="{ field }">
									<cv-select
										label="Creator*"
										:modelValue="field.state.value?.[0]"
										@update:modelValue="field.handleChange([$event])"
									>
										<cv-select-option
											:value="item.value"
											v-for="item in getOrganizationOptions('CABINET')"
											>{{ item.label }}</cv-select-option
										>
									</cv-select>
								</template>
							</billFormInput.Field>
						</div>
						<div v-else-if="billFormStore.values.creator_type == 'PEOPLE'">
							<div class="flex justify-between">
								<div>
									<billFormInput.Field name="personCreators">
										<template v-slot="{ field }">
											<cv-combo-box
												title="Creator*"
												:options="peopleList"
												item-value-key="value"
												item-text-key="label"
												autoFilter
												autoHighlight
												:modelValue="field.state.value?.[0]"
												@update:modelValue="field.handleChange([$event])"
											/>
										</template>
									</billFormInput.Field>
								</div>

								<div>
									<billFormInput.Field name="people_signature_count">
										<template v-slot="{ field }">
											<cv-number-input
												label="People Signature Count"
												placeholder=""
												:modelValue="field.state.value"
												type="number"
												@update:modelValue="field.handleChange"
											/>
										</template>
									</billFormInput.Field>
								</div>
							</div>
						</div>

						<div>
							<h4>References</h4>
							<billFormInput.Field name="links">
								<template v-slot="{ field }">
									<RelatedLinksForm
										v-model:links="field.state.value"
										@update:links="field.handleChange"
									/>
								</template>
							</billFormInput.Field>
						</div>
					</template>
				</div>
			</div>
		</div>
	</form>

	<ToastNotification
		:notification="successToast.notification"
		@close="successToast.hide"
	/>
</template>
