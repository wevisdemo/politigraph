import { Kind, type ObjectTypeDefinitionNode } from 'graphql';
import { driver } from './driver';
import { typeDefinitions } from './schema-sdl';

const CACHE_TTL_MS = 60 * 60 * 1000;
const GITHUB_TIMEOUT_MS = 10 * 1000;
const TIMESTAMP_FIELDS = ['created_at', 'updated_at'];
const AUTOMATION_WORKFLOWS_URL =
	'https://api.github.com/repos/wevisdemo/politigraph-automation/actions/workflows';

const lastNodeUpdatedAt = cached(queryLastNodeUpdatedAt);
const lastVoteEventScrapedAt = cached(() =>
	fetchLastSuccessfulRunAt('scrape_and_ocr_votes.yml'),
);
const lastBillScrapedAt = cached(() =>
	fetchLastSuccessfulRunAt('scrape_and_update_bills.yml'),
);

export const getLastNodeUpdatedAt = lastNodeUpdatedAt.get;
export const getLastVoteEventScrapedAt = lastVoteEventScrapedAt.get;
export const getLastBillScrapedAt = lastBillScrapedAt.get;

export function resetTimestampsCache() {
	[lastNodeUpdatedAt, lastVoteEventScrapedAt, lastBillScrapedAt].forEach(
		({ reset }) => reset(),
	);
}

function cached(load: () => Promise<string | null>) {
	let cache: { value: string | null; expiresAt: number } | null = null;
	let inflight: Promise<string | null> | null = null;

	return {
		get: async () => {
			if (cache && Date.now() < cache.expiresAt) {
				return cache.value;
			}

			inflight ??= load()
				.then((value) => {
					cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
					return value;
				})
				.catch((error) => {
					if (cache) return cache.value;
					throw error;
				})
				.finally(() => {
					inflight = null;
				});

			return inflight;
		},
		reset: () => {
			cache = null;
		},
	};
}

async function queryLastNodeUpdatedAt() {
	const session = driver.session();

	try {
		const { records } = await session.run(latestTimestampQuery);
		const epochs = records.map((record) =>
			Number(record.get('epoch').toString()),
		);

		return epochs.length > 0
			? new Date(Math.max(...epochs)).toISOString()
			: null;
	} finally {
		await session.close();
	}
}

async function fetchLastSuccessfulRunAt(workflow: string) {
	const response = await fetch(
		`${AUTOMATION_WORKFLOWS_URL}/${workflow}/runs?per_page=20&exclude_pull_requests=true`,
		{
			headers: { Accept: 'application/vnd.github+json' },
			signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
		},
	);

	if (!response.ok) {
		throw new Error(`GitHub responded ${response.status} for ${workflow} runs`);
	}

	const { workflow_runs } = (await response.json()) as {
		workflow_runs: WorkflowRun[];
	};
	const run = workflow_runs.find(({ conclusion }) => conclusion === 'success');

	return run ? new Date(run.updated_at).toISOString() : null;
}

interface WorkflowRun {
	conclusion: string | null;
	updated_at: string;
}

/**
 * A top-1 lookup per label and timestamp field, rather than one `MATCH (n)`
 * over the whole graph.
 *
 * Some timestamps are stored as ISO strings instead of the `DateTime` the
 * schema declares, so each value is coerced before ordering — Cypher sorts
 * mixed types by type group, which would otherwise pick the wrong top-1.
 */
export const latestTimestampQuery = [...typeDefinitions.values()]
	.flatMap((definition) =>
		definition.kind === Kind.OBJECT_TYPE_DEFINITION
			? getNodeLabel(definition)
			: [],
	)
	.flatMap((label) =>
		TIMESTAMP_FIELDS.map(
			(field) =>
				`MATCH (n:${label}) WHERE n.${field} IS NOT NULL ` +
				`WITH CASE WHEN n.${field} IS :: STRING THEN datetime(n.${field}) ` +
				`ELSE n.${field} END AS latest ` +
				`ORDER BY latest DESC LIMIT 1 ` +
				`RETURN latest.epochMillis AS epoch`,
		),
	)
	.join('\nUNION ALL\n');

/**
 * A `@node(labels: [...])` type carries every listed label, so matching on the
 * first one is enough to reach all of its nodes.
 */
function getNodeLabel(definition: ObjectTypeDefinitionNode) {
	const nodeDirective = definition.directives?.find(
		({ name }) => name.value === 'node',
	);

	if (!nodeDirective) {
		return [];
	}

	const labels = nodeDirective.arguments?.find(
		({ name }) => name.value === 'labels',
	)?.value;

	const customLabel =
		labels?.kind === Kind.LIST
			? labels.values.find((value) => value.kind === Kind.STRING)?.value
			: undefined;

	return [customLabel ?? definition.name.value];
}
