import { Neo4jGraphQL } from '@neo4j/graphql';
import { resolvers } from './custom-resolvers';
import { excludeDeprecatedFields } from './deprecated-fields';
// @ts-expect-error graphql import with type assertion
import typeDefs from './dist/typedefs.graphql' with { type: 'text' };
import { driver } from './driver';
// @ts-expect-error cypher import with type assertion
import indexesCypher from './schema/indexes.cypher' with { type: 'text' };

export function initNeo4jGraphql(jwksUrl: string) {
	return new Neo4jGraphQL({
		typeDefs,
		driver,
		resolvers,
		features: {
			authorization: {
				key: {
					url: jwksUrl,
				},
			},
			excludeDeprecatedFields,
		},
	});
}

export async function createNeo4jIndex() {
	const queries = (indexesCypher as string)
		.split(';')
		.map((query) => query.trim())
		.filter(Boolean);
	const session = driver.session();

	try {
		let created = 0;

		for (const query of queries) {
			const { indexesAdded, constraintsAdded } = (
				await session.run(query)
			).summary.counters.updates();
			created += indexesAdded + constraintsAdded;
		}

		console.info(`[Neo4j] ${created} indexes/constraints created`);
	} finally {
		await session.close();
	}
}
