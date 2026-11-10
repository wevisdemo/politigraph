import type { Vote, VoteEvent } from '@politigraph/graphql/genql';
import { standardVoteOptions, voteCountKeyMap } from '~/constants/votes';

export type VoteIssueType =
	| 'COUNT_MISMATCHED'
	| 'DUPLICATED'
	| 'INVALID_OPTION'
	| 'INVALID_VOTER_NAME'
	| 'MISSING_INFORMATION'
	| 'UNLINKED_AFFILIATION';

export interface VoteIssue {
	type: VoteIssueType;
	id?: string;
}

/**
 * Resolves the voter a row points at, preferring an unsaved selection over the persisted link.
 *
 * @param vote - Vote row with its persisted voter.
 * @param selectedVoterIds - Unsaved voter selections keyed by vote id.
 * @returns The person id the row should be linked to, or an empty string when unlinked.
 */
export function getEffectiveVoterId(
	vote: Pick<Vote, 'id'> & { voter: { id: string } | null },
	selectedVoterIds: Record<string, string>,
) {
	return selectedVoterIds[vote.id] ?? vote.voter?.id ?? '';
}

/**
 * Resolves the organization a row is affiliated with, preferring an unsaved selection over the persisted link.
 *
 * @param vote - Vote row with its persisted affiliation.
 * @param selectedAffiliationIds - Unsaved affiliation selections keyed by vote id.
 * @returns The organization id the row should be linked to, or an empty string when unlinked.
 */
export function getEffectiveAffiliationId(
	vote: Pick<Vote, 'id'> & { voter_affiliation: { id: string } | null },
	selectedAffiliationIds: Record<string, string>,
) {
	return selectedAffiliationIds[vote.id] ?? vote.voter_affiliation?.id ?? '';
}

type VoteFields = Pick<
	Vote,
	| 'id'
	| 'vote_order'
	| 'badge_number'
	| 'voter_name_raw'
	| 'voter_affiliation_raw'
	| 'option'
>;

const toVoteKey = (vote: VoteFields) =>
	JSON.stringify(
		(
			[
				'vote_order',
				'badge_number',
				'voter_name_raw',
				'voter_affiliation_raw',
				'option',
			] as const
		).map((key) => vote[key] ?? null),
	);

/**
 * Matches votes created without a known id back to the rows they were created from, by their saved fields.
 * Rows with identical fields are interchangeable, so any pairing between them stores the same votes.
 *
 * @param rows - Rows as sent to the create mutation, keyed by their temporary id.
 * @param createdVotes - Votes read back after the create, excluding votes that existed before.
 * @returns The created vote id for each row id.
 * @throws When a row has no matching created vote.
 */
export function matchCreatedVotes(
	rows: VoteFields[],
	createdVotes: VoteFields[],
) {
	const unmatchedByKey = Map.groupBy(createdVotes, toVoteKey);

	return new Map(
		rows.map((row) => {
			const createdId = unmatchedByKey.get(toVoteKey(row))?.shift()?.id;
			if (!createdId) {
				throw new Error(`No created vote matches row ${row.vote_order}`);
			}
			return [row.id, createdId];
		}),
	);
}

/**
 * Groups vote link changes by the node to connect or disconnect, so each node needs one mutation.
 *
 * @param changes - Per vote, the currently linked node id and the one it should link to ('' for none).
 * @returns Vote ids to connect and to disconnect, keyed by node id.
 */
export function groupVoteLinkChanges(
	changes: { voteId: string; from: string; to: string }[],
) {
	const changed = changes.filter(({ from, to }) => from !== to);
	const groupVoteIds = (key: 'from' | 'to') =>
		new Map(
			[...Map.groupBy(changed, (change) => change[key])]
				.filter(([nodeId]) => nodeId)
				.map(([nodeId, group]) => [nodeId, group.map(({ voteId }) => voteId)]),
		);

	return { connect: groupVoteIds('to'), disconnect: groupVoteIds('from') };
}

/**
 * Runs tasks in parallel and reruns the failed ones, so they must be safe to repeat.
 *
 * @param tasks - Idempotent tasks to run.
 * @param attempts - Maximum number of runs per task.
 * @throws The first error of the last attempt when some tasks still fail.
 */
export async function runWithRetries(
	tasks: (() => Promise<unknown>)[],
	attempts = 3,
) {
	const results = await Promise.allSettled(tasks.map((task) => task()));
	const failed = tasks.filter((_, i) => results[i]!.status === 'rejected');

	if (!failed.length) return;
	if (attempts <= 1) {
		throw (
			results.find(
				(result) => result.status === 'rejected',
			) as PromiseRejectedResult
		).reason;
	}

	await runWithRetries(failed, attempts - 1);
}

/**
 * Validates vote rows against the summary header and per-row constraints.
 *
 * @param votes - Vote rows plus the summary counts they should match.
 * @returns Validation errors and warnings for the provided votes.
 */
export function validateVotes({
	votes,
	...summaryHeader
}: Pick<
	VoteEvent,
	'agree_count' | 'disagree_count' | 'abstain_count' | 'novote_count'
> & {
	votes: (Pick<
		Vote,
		| 'id'
		| 'vote_order'
		| 'badge_number'
		| 'option'
		| 'voter_name_raw'
		| 'voter_affiliation_raw'
	> & {
		voter: { id: string } | null;
		voter_affiliation: { id: string } | null;
	})[];
}) {
	const errors: VoteIssue[] = [];
	const warnings: VoteIssue[] = [];

	const getVoterKey = (vote: (typeof votes)[number]) =>
		vote.voter?.id ?? vote.voter_name_raw;

	const countByOption = new Map<string, number>();
	const countByVoterKey = new Map<string | null, number>();

	votes.forEach((vote) => {
		countByOption.set(vote.option, (countByOption.get(vote.option) ?? 0) + 1);
		countByVoterKey.set(
			getVoterKey(vote),
			(countByVoterKey.get(getVoterKey(vote)) ?? 0) + 1,
		);
	});

	if (
		[...voteCountKeyMap.entries()].some(
			([option, key]) =>
				(countByOption.get(option) ?? 0) !== (summaryHeader[key] ?? 0),
		)
	) {
		errors.push({
			type: 'COUNT_MISMATCHED',
		});
	}

	votes.forEach((vote) => {
		if (!vote.id || !vote.vote_order || !vote.badge_number) {
			warnings.push({ type: 'MISSING_INFORMATION', id: vote.id });
		}

		if (!vote.voter) {
			warnings.push({ type: 'INVALID_VOTER_NAME', id: vote.id });
		}

		if (!vote.voter_affiliation) {
			warnings.push({ type: 'UNLINKED_AFFILIATION', id: vote.id });
		}

		if (!standardVoteOptions.includes(vote.option)) {
			errors.push({ type: 'INVALID_OPTION', id: vote.id });
		}

		if ((countByVoterKey.get(getVoterKey(vote)) ?? 0) > 1) {
			errors.push({
				type: 'DUPLICATED',
				id: vote.id,
			});
		}
	});

	return { errors, warnings };
}
