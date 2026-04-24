import type { VoteEventType } from '@politigraph/graphql/genql';

export const voteEventTypes: { label: string; value: VoteEventType }[] = [
	{ label: 'สส. วาระ 1', value: 'MP_1' },
	{ label: 'สส. วาระ 2', value: 'MP_2' },
	{ label: 'สส. วาระ 3', value: 'MP_3' },
	{ label: 'สว. วาระ 1', value: 'SENATE_1' },
	{ label: 'สว. วาระ 2', value: 'SENATE_2' },
	{ label: 'สว. วาระ 3', value: 'SENATE_3' },
	{ label: 'โหวตนายก', value: 'PM_VOTE' },
];
