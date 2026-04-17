<script lang="ts" setup>
// @ts-ignore
import { Enterprise32, Save16 } from '@carbon/icons-vue';
import {
	enumOrganizationType,
	type Link,
	type OrganizationType,
} from '@politigraph/graphql/genql';
import LinksForm from '~/components/LinksForm.vue';
import { organizationTypeLabel } from '~/constants/organization';
import { parseDate, serializeDate } from '~/utils/date';
import { diff } from 'radash';
import PickColors from 'vue-pick-colors';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();
const organizationId = route.params.id as string;

type OrganizationRelation = {
	id: string;
	name: string;
	classification: OrganizationType;
};

type OrganizationDetail = {
	id: string;
	name: string;
	name_en?: string | null;
	description?: string | null;
	classification: OrganizationType;
	founding_date?: string | null;
	dissolution_date?: string | null;
	image?: string | null;
	color?: string | null;
	parents: OrganizationRelation[];
	children: OrganizationRelation[];
	links: Pick<Link, 'id' | 'note' | 'url'>[];
};

const toDatePickerValue = (value?: string | Date | null) => {
	if (!value) return null;
	if (value instanceof Date) return value;
	return parseDate(value);
};

const originalParentIds = ref<string[]>([]);
const originalChildIds = ref<string[]>([]);
const originalLinks = ref<Pick<Link, 'id' | 'note' | 'url'>[]>([]);

const { data: organizationData, refresh: refreshOrganizationDetail } =
	await useLazyAsyncData<OrganizationDetail>(
		`organization-detail-${organizationId}`,
		async () => {
			const { organizations } = await graphqlClient.query({
				organizations: {
					__args: {
						where: { id: { eq: organizationId } },
					},
					id: true,
					name: true,
					name_en: true,
					description: true,
					classification: true,
					founding_date: true,
					dissolution_date: true,
					image: true,
					color: true,
					parents: {
						id: true,
						name: true,
						classification: true,
					},
					children: {
						id: true,
						name: true,
						classification: true,
					},
					links: {
						id: true,
						note: true,
						url: true,
					},
				},
			});

			const organization = organizations[0];
			if (!organization) {
				throw new Error('Organization not found');
			}

			originalParentIds.value = organization.parents.map((parent) => parent.id);
			originalChildIds.value = organization.children.map((child) => child.id);
			originalLinks.value = JSON.parse(JSON.stringify(organization.links));

			return organization;
		},
	);

useHead({
	title: computed(
		() =>
			`${organizationData.value?.name || 'Organizations'} | Politigraph Admin`,
	),
});

const selectedParentIds = ref<string[]>([]);
const selectedChildIds = ref<string[]>([]);

watch(
	() => organizationData.value?.parents,
	(newVal) => {
		selectedParentIds.value = newVal?.map((parent) => parent.id) ?? [];
	},
	{ immediate: true },
);

watch(
	() => organizationData.value?.children,
	(newVal) => {
		selectedChildIds.value = newVal?.map((child) => child.id) ?? [];
	},
	{ immediate: true },
);

const foundingDateLocal = ref<Date | null>(null);
const dissolutionDateLocal = ref<Date | null>(null);

watch(
	() => organizationData.value?.founding_date,
	(value) => {
		foundingDateLocal.value = toDatePickerValue(value ?? null);
	},
	{ immediate: true },
);

watch(
	() => organizationData.value?.dissolution_date,
	(value) => {
		dissolutionDateLocal.value = toDatePickerValue(value ?? null);
	},
	{ immediate: true },
);

const { data: organizationOptions } = await useAsyncData(
	'organization-options',
	async () => {
		const { organizations } = await graphqlClient.query({
			organizations: {
				__args: {
					sort: [{ name: 'ASC' }],
				},
				id: true,
				name: true,
				classification: true,
			},
		});

		return (
			organizations
				.filter((org) => org.id !== organizationId)
				.map((org) => ({
					label: `${org.name} (${
						organizationTypeLabel[org.classification] ?? org.classification
					})`,
					value: org.id,
				})) ?? []
		);
	},
	{ lazy: true },
);

const getSelectedOrganizationLabels = (ids: string[]) =>
	ids
		.map(
			(id) =>
				organizationOptions.value?.find((option) => option.value === id)
					?.label ?? id,
		)
		.join(', ');

const selectedParentLabels = computed(() =>
	getSelectedOrganizationLabels(selectedParentIds.value),
);

const selectedChildLabels = computed(() =>
	getSelectedOrganizationLabels(selectedChildIds.value),
);

const organizationColor = computed<string>({
	get: () => organizationData.value?.color ?? '',
	set: (value) => {
		if (!organizationData.value) return;
		organizationData.value.color = value || null;
	},
});

const toast = useToastNotification();

const saveChanges = async () => {
	if (!organizationData.value) return;

	try {
		const nextParentIds = selectedParentIds.value.filter(
			(id) => id && id !== organizationData.value?.id,
		);
		const nextChildIds = selectedChildIds.value.filter(
			(id) => id && id !== organizationData.value?.id,
		);

		const parentDisconnectIds = diff(originalParentIds.value, nextParentIds);
		const parentConnectIds = diff(nextParentIds, originalParentIds.value);
		const childDisconnectIds = diff(originalChildIds.value, nextChildIds);
		const childConnectIds = diff(nextChildIds, originalChildIds.value);

		await graphqlClient.mutation({
			updateOrganizations: {
				__args: {
					where: {
						id: { eq: organizationData.value.id },
					},
					update: {
						name: { set: organizationData.value.name },
						name_en: { set: organizationData.value.name_en },
						description: { set: organizationData.value.description },
						classification: { set: organizationData.value.classification },
						founding_date: { set: serializeDate(foundingDateLocal.value) },
						dissolution_date: {
							set: serializeDate(dissolutionDateLocal.value),
						},
						color: { set: organizationData.value.color },
						parents: [
							{
								connect: parentConnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: parentConnectIds },
													},
												},
											},
										]
									: [],
								disconnect: parentDisconnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: parentDisconnectIds },
													},
												},
											},
										]
									: [],
							},
						],
						children: [
							{
								connect: childConnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: childConnectIds },
													},
												},
											},
										]
									: [],
								disconnect: childDisconnectIds.length
									? [
											{
												where: {
													node: {
														id: { in: childDisconnectIds },
													},
												},
											},
										]
									: [],
							},
						],
					},
				},
				organizations: {
					id: true,
				},
			},
		});

		const linksToCreate = organizationData.value.links.filter(
			(link) => !link.id,
		);
		const linksToUpdate = organizationData.value.links.filter(
			(link) => link.id,
		);
		const linksToDelete = originalLinks.value.filter(
			(ol) => !organizationData.value?.links.some((el) => el.id === ol.id),
		);

		await Promise.all([
			...linksToCreate.map((link) =>
				graphqlClient.mutation({
					createLinks: {
						__args: {
							input: [
								{
									note: link.note,
									url: link.url,
									owners: {
										Organization: {
											connect: [
												{
													where: {
														node: {
															id: { eq: organizationData.value?.id },
														},
													},
												},
											],
										},
									},
								},
							],
						},
						links: { id: true },
					},
				}),
			),
			...linksToUpdate.map((link) =>
				graphqlClient.mutation({
					updateLinks: {
						__args: {
							where: { id: { eq: link.id } },
							update: { note: { set: link.note }, url: { set: link.url } },
						},
						links: { id: true },
					},
				}),
			),
			...linksToDelete.map((link) =>
				graphqlClient.mutation({
					deleteLinks: {
						__args: { where: { id: { eq: link.id } } },
						nodesDeleted: true,
						relationshipsDeleted: true,
					},
				}),
			),
		]);

		await refreshOrganizationDetail();
		toast.show({
			kind: 'success',
			title: 'ข้อมูลถูกบันทึกเรียบร้อย',
		});
	} catch (error) {
		console.error('Failed to save organization changes:', error);
		toast.show({
			kind: 'warning',
			title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
			subTitle: 'กรุณาลองใหม่อีกครั้ง',
		});
	}
};
</script>

<template>
	<cv-breadcrumb noTrailingSlash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item
			><a href="/admin/organizations">Organizations</a></cv-breadcrumb-item
		>
		<cv-breadcrumb-item>{{ organizationData?.name }}</cv-breadcrumb-item>
	</cv-breadcrumb>

	<ToastNotification :notification="toast.notification" @close="toast.hide" />

	<div class="flex flex-wrap justify-between">
		<div class="flex flex-wrap items-center gap-4">
			<h1 class="mb-8 mt-4 font-normal">{{ organizationData?.name }}</h1>
		</div>
		<div class="flex flex-wrap items-start gap-4">
			<cv-button @click="saveChanges" class="mt-4" kind="primary" :icon="Save16"
				>Save Changes</cv-button
			>
		</div>
	</div>

	<form
		@submit="
			(e: SubmitEvent) => {
				e.preventDefault();
				e.stopPropagation();
			}
		"
	>
		<div class="mt-4 flex flex-col items-start gap-8 md:flex-row">
			<div class="basis-2/4 bg-white p-4">
				<div class="flex flex-col gap-6">
					<div class="flex flex-col gap-1">
						<h4>Organization Details</h4>
						<p class="text-xs opacity-70">ID: {{ organizationData?.id }}</p>
					</div>

					<template v-if="!organizationData || !organizationOptions">
						<cv-text-input-skeleton />
						<cv-text-input-skeleton />
						<cv-text-input-skeleton />
						<cv-text-input-skeleton />
						<cv-text-input-skeleton />
						<cv-text-area-skeleton />
						<cv-text-input-skeleton />
						<cv-text-input-skeleton />
						<cv-text-input-skeleton />
					</template>

					<template v-else>
						<div
							class="flex size-32 flex-none items-center justify-center rounded-full border border-gray-400 bg-[#F4F4F4]"
						>
							<img
								v-if="organizationData.image"
								:src="organizationData.image"
								class="size-32 rounded-full object-cover"
							/>
							<Enterprise32 v-else class="size-12 text-[#A8A8A8]" />
						</div>

						<div class="flex items-center gap-3 text-[#525252]">
							<p class="text-xs font-medium">Color</p>
							<PickColors
								v-model:value="organizationColor"
								format="hex"
								:colors="[]"
							/>
							<span class="font-mono text-sm">
								{{ organizationColor || '-' }}
							</span>
						</div>

						<cv-text-input
							v-model="organizationData.name"
							label="Name*"
							placeholder=""
							required
						/>

						<cv-text-input
							v-model="organizationData.name_en"
							label="Name (Eng)"
							placeholder=""
						/>

						<cv-text-area
							v-model="organizationData.description"
							label="Description"
							placeholder=""
							rows="5"
						/>

						<FilterOptions
							v-model="organizationData.classification"
							label="Classification*"
							type="radio"
							name="organization-classification"
							:options="
								Object.values(enumOrganizationType).map((item) => ({
									label: organizationTypeLabel[item] ?? item,
									value: item,
								}))
							"
						/>

						<div class="flex flex-row">
							<cv-date-picker
								v-model="foundingDateLocal"
								dateLabel="Founding Date"
								kind="single"
								:calOptions="{ dateFormat: 'Y-m-d' }"
							/>

							<cv-date-picker
								v-model="dissolutionDateLocal"
								dateLabel="Dissolution Date"
								kind="single"
								:calOptions="{ dateFormat: 'Y-m-d' }"
							/>
						</div>

						<cv-multi-select
							title="Parents"
							:label="selectedParentLabels"
							:options="organizationOptions"
							v-model="selectedParentIds"
						/>

						<cv-multi-select
							title="Children"
							:label="selectedChildLabels"
							:options="organizationOptions"
							v-model="selectedChildIds"
						/>

						<div>
							<h4 class="mb-3">References</h4>
							<LinksForm v-model:links="organizationData.links" />
						</div>
					</template>
				</div>
			</div>

			<div class="basis-2/4" />
		</div>
	</form>
</template>
