const published = { publish_status: { eq: 'PUBLISHED' } };
const unpublished = { publish_status: { eq: 'UNPUBLISHED' } };
const unpublishedMember = { member: { Person: unpublished } };

const BILL_EVENTS = [
	'BillVoteEvent',
	'BillMergeEvent',
	'BillEnactEvent',
	'BillRejectEvent',
	'BillRoyalAssentEvent',
];

/** What an anonymous caller may see of each node type */
export const anonymousFilters: Record<string, unknown> = {
	Person: published,
	VoteEvent: published,
	...Object.fromEntries(BILL_EVENTS.map((type) => [type, published])),
	Vote: { vote_event: published },
	Membership: { NOT: unpublishedMember },
	AlternatePersonName: { NOT: { named_entity: unpublished } },
	Link: {
		NOT: {
			OR: [
				{ owner: { Person: unpublished } },
				{ owner: { Membership: unpublishedMember } },
				...['VoteEvent', ...BILL_EVENTS].map((type) => ({
					owner: { [type]: unpublished },
				})),
			],
		},
	},
};
