export type DeletableEntity = 'person' | 'organization' | 'bill' | 'voteEvent';

export type DeletionSummaryItem = { label: string; count: number };

export type DeletionSummary = {
	deleted: DeletionSummaryItem[];
	unlinked: DeletionSummaryItem[];
};

const TOTAL_COUNT = { totalCount: true } as const;
const LINK_COUNT = { linksConnection: TOTAL_COUNT } as const;
const ALL_LINKS = { links: [{}] };

const sum = (counts: number[]) => counts.reduce((a, b) => a + b, 0);

export const ENTITY_LIST_PATH: Record<DeletableEntity, string> = {
	person: '/people',
	organization: '/organizations',
	bill: '/bills',
	voteEvent: '/vote-events',
};

export const ENTITY_LABEL: Record<DeletableEntity, string> = {
	person: 'person',
	organization: 'organization',
	bill: 'bill',
	voteEvent: 'vote event',
};

export function useEntityDeletion(entity: DeletableEntity) {
	const graphqlClient = useGraphqlClient();

	const fetchPersonSummary = async (id: string): Promise<DeletionSummary> => {
		const {
			people: [person],
		} = await graphqlClient.query({
			people: {
				__args: { where: { id: { eq: id } } },
				memberships: LINK_COUNT,
				linksConnection: TOTAL_COUNT,
				other_namesConnection: TOTAL_COUNT,
				votesConnection: TOTAL_COUNT,
				created_motionsConnection: TOTAL_COUNT,
				co_created_motionsConnection: TOTAL_COUNT,
			},
		});

		return {
			deleted: [
				{ label: 'Memberships', count: person.memberships.length },
				{
					label: 'Membership links',
					count: sum(
						person.memberships.map((m) => m.linksConnection.totalCount),
					),
				},
				{ label: 'Links', count: person.linksConnection.totalCount },
				{
					label: 'Other names',
					count: person.other_namesConnection.totalCount,
				},
			],
			unlinked: [
				{
					label: 'Votes (will become unmatched voters)',
					count: person.votesConnection.totalCount,
				},
				{
					label: 'Bills created',
					count: person.created_motionsConnection.totalCount,
				},
				{
					label: 'Bills co-created',
					count: person.co_created_motionsConnection.totalCount,
				},
			],
		};
	};

	const fetchOrganizationSummary = async (
		id: string,
	): Promise<DeletionSummary> => {
		const {
			organizations: [organization],
		} = await graphqlClient.query({
			organizations: {
				__args: { where: { id: { eq: id } } },
				posts: { memberships: LINK_COUNT },
				memberships: LINK_COUNT,
				linksConnection: TOTAL_COUNT,
				other_namesConnection: TOTAL_COUNT,
				childrenConnection: TOTAL_COUNT,
				motionsConnection: TOTAL_COUNT,
				eventsConnection: TOTAL_COUNT,
			},
		});

		const allMemberships = [
			...organization.posts.flatMap((p) => p.memberships),
			...organization.memberships,
		];

		return {
			deleted: [
				{ label: 'Posts', count: organization.posts.length },
				{ label: 'Memberships', count: allMemberships.length },
				{
					label: 'Membership links',
					count: sum(allMemberships.map((m) => m.linksConnection.totalCount)),
				},
				{ label: 'Links', count: organization.linksConnection.totalCount },
				{
					label: 'Other names',
					count: organization.other_namesConnection.totalCount,
				},
			],
			unlinked: [
				{
					label: 'Child organizations',
					count: organization.childrenConnection.totalCount,
				},
				{ label: 'Bills', count: organization.motionsConnection.totalCount },
				{
					label: 'Vote events and bill events',
					count: organization.eventsConnection.totalCount,
				},
			],
		};
	};

	const fetchBillSummary = async (id: string): Promise<DeletionSummary> => {
		const eventFields = { billsConnection: TOTAL_COUNT, ...LINK_COUNT };
		const {
			bills: [bill],
			billMergeEventsConnection: mainBillMergeEvents,
		} = await graphqlClient.query({
			bills: {
				__args: { where: { id: { eq: id } } },
				linksConnection: TOTAL_COUNT,
				events: {
					on_BillEnactEvent: eventFields,
					on_BillMergeEvent: eventFields,
					on_BillRejectEvent: eventFields,
					on_BillRoyalAssentEvent: eventFields,
					on_BillVoteEvent: eventFields,
				},
			},
			billMergeEventsConnection: {
				__args: {
					where: {
						main_bill_id: { eq: id },
						NOT: { bills: { all: { id: { eq: id } } } },
					},
				},
				...TOTAL_COUNT,
			},
		});

		const ownEvents = bill.events.filter(
			(e) => e.billsConnection.totalCount === 1,
		);

		return {
			deleted: [
				{ label: 'Bill events', count: ownEvents.length },
				{
					label: 'Bill event links',
					count: sum(ownEvents.map((e) => e.linksConnection.totalCount)),
				},
				{ label: 'Links', count: bill.linksConnection.totalCount },
			],
			unlinked: [
				{
					label: 'Bill events shared with other bills',
					count: bill.events.length - ownEvents.length,
				},
				{
					label:
						'Merge events with this as main bill (main bill will be cleared)',
					count: mainBillMergeEvents.totalCount,
				},
			],
		};
	};

	const fetchVoteEventSummary = async (
		id: string,
	): Promise<DeletionSummary> => {
		const {
			voteEvents: [voteEvent],
		} = await graphqlClient.query({
			voteEvents: {
				__args: { where: { id: { eq: id } } },
				votesConnection: TOTAL_COUNT,
				linksConnection: TOTAL_COUNT,
				bill_vote_eventsConnection: TOTAL_COUNT,
			},
		});

		return {
			deleted: [
				{ label: 'Votes', count: voteEvent.votesConnection.totalCount },
				{ label: 'Links', count: voteEvent.linksConnection.totalCount },
			],
			unlinked: [
				{
					label: 'Bill vote events',
					count: voteEvent.bill_vote_eventsConnection.totalCount,
				},
			],
		};
	};

	const deletePerson = (id: string) =>
		graphqlClient.mutation({
			deletePeople: {
				__args: {
					where: { id: { eq: id } },
					delete: {
						memberships: [{ delete: ALL_LINKS }],
						links: [{}],
						other_names: { AlternateName: [{}], AlternatePersonName: [{}] },
					},
				},
				nodesDeleted: true,
			},
		});

	const deleteOrganization = (id: string) =>
		graphqlClient.mutation({
			deleteOrganizations: {
				__args: {
					where: { id: { eq: id } },
					delete: {
						posts: [{ delete: { memberships: [{ delete: ALL_LINKS }] } }],
						memberships: [{ delete: ALL_LINKS }],
						links: [{}],
						other_names: [{}],
					},
				},
				nodesDeleted: true,
			},
		});

	const deleteBill = async (id: string) => {
		const ownEvents = [
			{
				where: { node: { bills: { all: { id: { eq: id } } } } },
				delete: ALL_LINKS,
			},
		];

		await graphqlClient.mutation({
			deleteBills: {
				__args: {
					where: { id: { eq: id } },
					delete: {
						links: [{}],
						events: {
							BillEnactEvent: ownEvents,
							BillMergeEvent: ownEvents,
							BillRejectEvent: ownEvents,
							BillRoyalAssentEvent: ownEvents,
							BillVoteEvent: ownEvents,
						},
					},
				},
				nodesDeleted: true,
			},
		});

		await graphqlClient.mutation({
			updateBillMergeEvents: {
				__args: {
					where: { main_bill_id: { eq: id } },
					update: { main_bill_id: { set: null } },
				},
				billMergeEvents: { id: true },
			},
		});
	};

	const deleteVoteEvent = (id: string) =>
		graphqlClient.mutation({
			deleteVoteEvents: {
				__args: {
					where: { id: { eq: id } },
					delete: { votes: [{}], links: [{}] },
				},
				nodesDeleted: true,
			},
		});

	const handlers = {
		person: { fetchSummary: fetchPersonSummary, deleteEntity: deletePerson },
		organization: {
			fetchSummary: fetchOrganizationSummary,
			deleteEntity: deleteOrganization,
		},
		bill: { fetchSummary: fetchBillSummary, deleteEntity: deleteBill },
		voteEvent: {
			fetchSummary: fetchVoteEventSummary,
			deleteEntity: deleteVoteEvent,
		},
	} satisfies Record<
		DeletableEntity,
		{
			fetchSummary: (id: string) => Promise<DeletionSummary>;
			deleteEntity: (id: string) => Promise<unknown>;
		}
	>;

	return handlers[entity];
}
