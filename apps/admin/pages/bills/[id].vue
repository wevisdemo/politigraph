<script setup lang="ts">
import type {
	BillEnactEventUpdateInput,
	BillMergeEventUpdateInput,
	BillRejectEventUpdateInput,
	BillRoyalAssentEventUpdateInput,
	BillUpdateInput,
	BillVoteEventUpdateInput,
} from '@politigraph/graphql/genql';
import type { BillForm } from '~/components/bills/detail.vue';
import type { BillEventForm } from '~/components/bills/events.vue';
import type { UpdateFields } from '~/utils/update-input';
import { diff } from 'radash';

definePageMeta({
	layout: 'admin-layout',
});

const route = useRoute();
const graphqlClient = useGraphqlClient();

const successToast = useToastNotification();
const { isSaving, guardSave } = useSaveGuard(successToast);

const events = ref<BillEventForm[]>([]);

const {
	data: billData,
	refresh: refreshBillData,
	pending: billPending,
} = await useLazyAsyncData(`bill-detail-${route.params.id}`, async () => {
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
					main_bill: { id: true },
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
	title: computed(
		() => `${billData.value?.title || 'Bills'} | Politigraph Admin`,
	),
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

const billFields = [
	'title',
	'nickname',
	'classification',
	'status',
	'proposal_date',
	'creator_type',
	'people_signature_count',
] as const satisfies UpdateFields<BillUpdateInput>;

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

	const links = diffLinks(billData.value?.links ?? [], form.links);
	const creators = {
		Person: relationUpdate(creatorPersonConnect, creatorPersonDisconnect),
		Organization: relationUpdate(
			creatorOrganizationConnect,
			creatorOrganizationDisconnect,
		),
	};
	const billUpdate = {
		...changedSets(billData.value, form, billFields),
		links: linksUpdate(links),
		organizations: relationUpdate(organizationsConnect, organizationDisconnect),
		creators: hasChanges(creators) ? creators : undefined,
		co_creators: relationUpdate(coCreatorsConnect, coCreatorsDisconnect),
	};

	if (hasChanges(billUpdate)) {
		await graphqlClient.mutation({
			updateBills: {
				__args: {
					where: { id: { eq: route.params.id as string } },
					update: billUpdate,
				},
				bills: { id: true },
			},
		});
	}

	await Promise.all(
		links.updates.map(({ id, update }) =>
			graphqlClient.mutation({
				updateLinks: {
					__args: { where: { id: { eq: id } }, update },
					links: { id: true },
				},
			}),
		),
	);

	for (const event of events.value) {
		const originalEvent = billData.value?.events?.find(
			(e) => e.id === event.id,
		);
		const where = { id: { eq: event.id } };
		const baseKeys = [
			'description',
			'start_date',
			'end_date',
			'publish_status',
		] as const satisfies UpdateFields<
			| BillEnactEventUpdateInput
			| BillMergeEventUpdateInput
			| BillRejectEventUpdateInput
			| BillRoyalAssentEventUpdateInput
			| BillVoteEventUpdateInput
		>;

		if (event.__typename === 'BillEnactEvent') {
			const update = changedSets(originalEvent, event, [
				...baseKeys,
				'title',
			] satisfies UpdateFields<BillEnactEventUpdateInput>);
			if (hasChanges(update)) {
				await graphqlClient.mutation({
					updateBillEnactEvents: {
						__args: { where, update },
						billEnactEvents: { id: true },
					},
				});
			}
		} else if (event.__typename === 'BillMergeEvent') {
			const originalMainBillId =
				originalEvent?.__typename === 'BillMergeEvent'
					? originalEvent.main_bill?.id
					: undefined;
			const newMainBillId = event.main_bill?.id;
			const eventWhere = { where: { node: { id: { eq: event.id } } } };
			const update = changedSets(originalEvent, event, baseKeys);

			if (hasChanges(update)) {
				await graphqlClient.mutation({
					updateBillMergeEvents: {
						__args: { where, update },
						billMergeEvents: { id: true },
					},
				});
			}

			if (newMainBillId !== originalMainBillId) {
				await graphqlClient.mutation({
					updateBills: {
						__args: {
							where: { main_bill_merge_events: { some: where } },
							update: {
								main_bill_merge_events: [{ disconnect: [eventWhere] }],
							},
						},
						bills: { id: true },
					},
				});

				if (newMainBillId) {
					await graphqlClient.mutation({
						updateBills: {
							__args: {
								where: { id: { eq: newMainBillId } },
								update: {
									main_bill_merge_events: [{ connect: [eventWhere] }],
								},
							},
							bills: { id: true },
						},
					});
				}
			}
		} else if (event.__typename === 'BillRejectEvent') {
			const update = changedSets(originalEvent, event, [
				...baseKeys,
				'reject_reason',
			] satisfies UpdateFields<BillRejectEventUpdateInput>);
			if (hasChanges(update)) {
				await graphqlClient.mutation({
					updateBillRejectEvents: {
						__args: { where, update },
						billRejectEvents: { id: true },
					},
				});
			}
		} else if (event.__typename === 'BillRoyalAssentEvent') {
			const update = changedSets(originalEvent, event, [
				...baseKeys,
				'result',
			] satisfies UpdateFields<BillRoyalAssentEventUpdateInput>);
			if (hasChanges(update)) {
				await graphqlClient.mutation({
					updateBillRoyalAssentEvents: {
						__args: { where, update },
						billRoyalAssentEvents: { id: true },
					},
				});
			}
		} else if (event.__typename === 'BillVoteEvent') {
			const originalVoteEventId =
				originalEvent?.__typename === 'BillVoteEvent'
					? originalEvent.vote_events?.[0]?.id
					: undefined;
			const newVoteEventId = event.vote_events?.[0]?.id;
			const update = {
				...changedSets(originalEvent, event, baseKeys),
				vote_events:
					newVoteEventId !== originalVoteEventId
						? relationUpdate(
								newVoteEventId ? [newVoteEventId] : [],
								originalVoteEventId ? [originalVoteEventId] : [],
							)
						: undefined,
			};

			if (hasChanges(update)) {
				await graphqlClient.mutation({
					updateBillVoteEvents: {
						__args: { where, update },
						billVoteEvents: { id: true },
					},
				});
			}
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
	'bill-detail-organizations',
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
	<cv-breadcrumb no-trailing-slash>
		<cv-breadcrumb-item><a href="/admin">Datasets</a></cv-breadcrumb-item>
		<cv-breadcrumb-item><a href="/admin/bills">Bills</a></cv-breadcrumb-item>
		<cv-breadcrumb-item>
			<span class="max-w-sm overflow-hidden text-ellipsis whitespace-nowrap">{{
				billData?.title
			}}</span>
		</cv-breadcrumb-item>
	</cv-breadcrumb>

	<UiEntityHeader
		entity="bill"
		:entity-id="route.params.id as string"
		:title="billData?.title"
		:is-save-disabled="isSaving"
		@save="guardSave(handleSave)"
	/>

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
					:bill-data="billData ?? null"
					:people-list="peopleList ?? null"
					:organization-list="organizationList ?? null"
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

	<FeedbackToast
		:notification="successToast.notification"
		@close="successToast.hide"
	/>
</template>
