<script setup lang="ts">
// @ts-ignore
import { Save16 } from '@carbon/icons-vue';
import type { Link } from '@politigraph/graphql/genql';
import type { BillForm } from '~/components/bills/detail.vue';
import type { BillEventForm } from '~/components/bills/events.vue';
import { diff } from 'radash';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

const successToast = useToastNotification();

const events = ref<BillEventForm[]>([]);

const {
	data: billData,
	refresh: refreshBillData,
	pending: billPending,
} = await useLazyAsyncData(async () => {
	const { bills } = await graphqlClient.query({
		bills: {
			__args: {
				limit: 1,
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
			events: {
				__typename: true,
				on_BillEnactEvent: {
					id: true,
					title: true,
					description: true,
					start_date: true,
					end_date: true,
					publish_status: true,
				},
				on_BillMergeEvent: {
					id: true,
					description: true,
					start_date: true,
					end_date: true,
					main_bill_id: true,
					publish_status: true,
					bills: {
						id: true,
						title: true,
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
							__args: {
								sort: [{ note: 'ASC' }],
							},
							note: true,
							url: true,
						},
					},
				},
				on_BillRejectEvent: {
					id: true,
					description: true,
					start_date: true,
					end_date: true,
					reject_reason: true,
					publish_status: true,
				},
				on_BillRoyalAssentEvent: {
					id: true,
					description: true,
					start_date: true,
					end_date: true,
					result: true,
					publish_status: true,
				},
				on_BillVoteEvent: {
					id: true,
					classification: true,
					description: true,
					start_date: true,
					end_date: true,
					title: true,
					nickname: true,
					result: true,
					publish_status: true,
					vote_events: {
						id: true,
					},
				},
			},
		},
	});

	bills[0].events =
		bills[0].events?.sort((a, b) =>
			(a.start_date ?? '').localeCompare(b.start_date ?? ''),
		) ?? [];

	return bills[0];
});

useHead({
	title: `${billData.value?.title || 'Bills'} | Politigraph Admin`,
});

const form = reactive<BillForm>({
	title: '',
	nickname: null,
	status: null,
	proposal_date: null,
	links: [],
	classification: null,
	creator_type: null,
	people_signature_count: null,
	organizations: [],
	co_creators: [],
	personCreators: [],
	organizationCreators: [],
});

watch(
	billData,
	(data) => {
		if (!data) return;
		form.title = data.title ?? '';
		form.nickname = data.nickname ?? null;
		form.status = data.status ?? null;
		form.proposal_date = data.proposal_date ?? null;
		form.links = data.links ? JSON.parse(JSON.stringify(data.links)) : [];
		form.classification = data.classification ?? null;
		form.creator_type = data.creator_type ?? null;
		form.people_signature_count = data.people_signature_count ?? null;
		form.organizations = data.organizations.map((d) => d.id);
		form.co_creators = data.co_creators.map((d) => d.id);
		form.personCreators =
			data.creator_type === 'POLITICIAN' || data.creator_type === 'PEOPLE'
				? (data.creators?.map((creator) => creator.id) ?? [])
				: [];
		form.organizationCreators =
			data.creator_type === 'ASSEMBLY'
				? (data.creators?.map((creator) => creator.id) ?? [])
				: [];

		events.value.splice(
			0,
			events.value.length,
			...(data.events?.map((e) => ({ ...e })) ?? []),
		);
	},
	{ immediate: true },
);

async function handleSave() {
	const prevOrgs = billData.value?.organizations.map((d) => d.id) ?? [];
	const nextOrgs = form.organizations ?? [];

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
		form.creator_type === 'POLITICIAN' || form.creator_type === 'PEOPLE'
			? (form.personCreators ?? [])
			: [];
	const nextOrganizationCreators =
		form.creator_type === 'ASSEMBLY' ? (form.organizationCreators ?? []) : [];
	const creatorPersonDisconnect = diff(prevPersonCreators, nextPersonCreators);
	const creatorPersonConnect = diff(nextPersonCreators, prevPersonCreators);
	const creatorOrganizationDisconnect = diff(
		prevOrganizationCreators,
		nextOrganizationCreators,
	);
	const creatorOrganizationConnect = diff(
		nextOrganizationCreators,
		prevOrganizationCreators,
	);

	const prevCoCreators = billData.value?.co_creators.map((d) => d.id) ?? [];
	const nextCoCreators =
		form.creator_type === 'POLITICIAN' ? (form.co_creators ?? []) : [];

	const coCreatorsDisconnect = diff(prevCoCreators, nextCoCreators);
	const coCreatorsConnect = diff(nextCoCreators, prevCoCreators);

	const currentLinks = billData.value?.links ?? [];
	const deletedLinkIds: string[] = currentLinks
		.filter(
			(oldLink) => !form.links.some((newLink) => oldLink.id === newLink.id),
		)
		.map((link) => link.id);
	const createdLinks: { node: Pick<Link, 'note' | 'url'> }[] = form.links
		.filter(
			(newLink) => !currentLinks.some((oldLink) => oldLink.id === newLink.id),
		)
		.map(({ note, url }) => ({ node: { note, url } }));

	const originalLinkIds = new Set(billData.value?.links.map((l) => l.id) ?? []);

	const updatedLinks =
		form.links?.filter((l) => originalLinkIds.has(l.id)) ?? [];

	await graphqlClient.mutation({
		updateBills: {
			__args: {
				where: { id: { eq: route.params.id as string } },
				update: {
					title: { set: form.title },
					nickname: { set: form.nickname },
					classification: { set: form.classification },
					status: { set: form.status },
					proposal_date: { set: form.proposal_date },
					creator_type: { set: form.creator_type },
					people_signature_count: { set: form.people_signature_count },
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

	for (const event of events.value) {
		const baseUpdate = {
			description: { set: event.description },
			start_date: { set: event.start_date },
			end_date: { set: event.end_date },
			publish_status: { set: event.publish_status },
		};
		const where = { id: { eq: event.id } };

		if (event.__typename === 'BillEnactEvent') {
			await graphqlClient.mutation({
				updateBillEnactEvents: {
					__args: {
						where,
						update: {
							...baseUpdate,
							title: { set: event.title },
						},
					},
					billEnactEvents: { id: true },
				},
			});
		} else if (event.__typename === 'BillMergeEvent') {
			await graphqlClient.mutation({
				updateBillMergeEvents: {
					__args: {
						where,
						update: {
							...baseUpdate,
							main_bill_id: { set: event.main_bill_id },
						},
					},
					billMergeEvents: { id: true },
				},
			});
		} else if (event.__typename === 'BillRejectEvent') {
			await graphqlClient.mutation({
				updateBillRejectEvents: {
					__args: {
						where,
						update: {
							...baseUpdate,
							reject_reason: { set: event.reject_reason },
						},
					},
					billRejectEvents: { id: true },
				},
			});
		} else if (event.__typename === 'BillRoyalAssentEvent') {
			await graphqlClient.mutation({
				updateBillRoyalAssentEvents: {
					__args: {
						where,
						update: {
							...baseUpdate,
							result: { set: event.result },
						},
					},
					billRoyalAssentEvents: { id: true },
				},
			});
		} else if (event.__typename === 'BillVoteEvent') {
			const originalEvent = billData.value?.events?.find(
				(e) => e.id === event.id,
			);
			const originalVoteEventId =
				originalEvent?.__typename === 'BillVoteEvent'
					? originalEvent.vote_events?.[0]?.id
					: undefined;
			const newVoteEventId = event.vote_events?.[0]?.id;

			await graphqlClient.mutation({
				updateBillVoteEvents: {
					__args: {
						where,
						update: {
							...baseUpdate,
							vote_events: [
								{
									connect:
										newVoteEventId && newVoteEventId !== originalVoteEventId
											? [
													{
														where: {
															node: {
																id: {
																	eq: newVoteEventId,
																},
															},
														},
													},
												]
											: [],
									disconnect:
										originalVoteEventId &&
										originalVoteEventId !== newVoteEventId
											? [
													{
														where: {
															node: {
																id: {
																	eq: originalVoteEventId,
																},
															},
														},
													},
												]
											: [],
								},
							],
						},
					},
					billVoteEvents: { id: true },
				},
			});
		}
	}

	successToast.show({
		kind: 'success',
		title: 'ข้อมูลถูกบันทึกเรียบร้อย',
	});
	refreshBillData();
}

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

	<div class="my-6 flex justify-between gap-4 md:flex-row md:items-center">
		<h2 class="md:min-w-xl">{{ billData?.title }}</h2>

		<cv-button @click="handleSave" class="mt-4" kind="primary" :icon="Save16"
			>Save Changes</cv-button
		>
	</div>

	<form
		@submit="
			(e: Event) => {
				e.preventDefault();
				e.stopPropagation();
			}
		"
	>
		<div class="mt-4 flex flex-col items-start gap-8 md:flex-row">
			<div class="flex-1 bg-white p-4">
				<BillsDetail
					:form="form"
					:bill-data="billData"
					:people-list="peopleList"
					:organization-list="organizationList"
				/>
			</div>
			<div class="flex-1 bg-white">
				<BillsEvents
					v-model="events"
					:current-bill-id="route.params.id as string"
					:loading="billPending"
					:original-events="billData?.events"
				/>
			</div>
		</div>
	</form>

	<ToastNotification
		:notification="successToast.notification"
		@close="successToast.hide"
	/>
</template>
