import { Kind, parse, type ObjectTypeDefinitionNode } from 'graphql';
// @ts-expect-error graphql import with type assertion
import typeDefs from './dist/typedefs.graphql' with { type: 'text' };
import { driver } from './driver';

const CACHE_TTL_MS = 60 * 60 * 1000;
const TIMESTAMP_FIELDS = ['created_at', 'updated_at'];

let cache: { value: string | null; expiresAt: number } | null = null;
let inflightRefresh: Promise<string | null> | null = null;

export function resetLastUpdatedAtCache() {
	cache = null;
}

export async function getLastUpdatedAt() {
	if (cache && Date.now() < cache.expiresAt) {
		return cache.value;
	}

	inflightRefresh ??= refresh().finally(() => {
		inflightRefresh = null;
	});

	return inflightRefresh;
}

async function refresh() {
	const epochMs = await queryLatestEpochMs();

	cache = {
		value: epochMs === null ? null : new Date(epochMs).toISOString(),
		expiresAt: Date.now() + CACHE_TTL_MS,
	};

	return cache.value;
}

async function queryLatestEpochMs() {
	const session = driver.session();

	try {
		const { records } = await session.run(latestTimestampQuery);
		const epochs = records.map((record) =>
			Number(record.get('epoch').toString()),
		);

		return epochs.length > 0 ? Math.max(...epochs) : null;
	} finally {
		await session.close();
	}
}

/**
 * A top-1 lookup per label and timestamp field, rather than one `MATCH (n)`
 * over the whole graph.
 *
 * Some timestamps are stored as ISO strings instead of the `DateTime` the
 * schema declares, so each value is coerced before ordering — Cypher sorts
 * mixed types by type group, which would otherwise pick the wrong top-1.
 */
export const latestTimestampQuery = buildLatestTimestampQuery();

function buildLatestTimestampQuery() {
	const labels = parse(typeDefs).definitions.flatMap((definition) =>
		definition.kind === Kind.OBJECT_TYPE_DEFINITION
			? getNodeLabel(definition)
			: [],
	);

	return labels
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
}

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
