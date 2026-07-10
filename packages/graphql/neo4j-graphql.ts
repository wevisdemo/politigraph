import { Neo4jGraphQL } from '@neo4j/graphql';
import { neo4jConfig } from '@politigraph/config/neo4j';
import neo4j from 'neo4j-driver';
import { resolvers } from './custom-resolvers';
import { excludeDeprecatedFields } from './deprecated-fields';
// @ts-expect-error graphql import with type assertion
import typeDefs from './dist/typedefs.graphql' with { type: 'text' };
import { getGraphqlCreateIndexQueries } from './schema';

const driver = neo4j.driver(
	neo4jConfig.uri,
	neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password),
);

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
	const queries = await getGraphqlCreateIndexQueries();
	const session = driver.session();
	const tx = await session.beginTransaction();

	let createdIndexes = 0;

	for (const query of queries) {
		const result = await tx.run(query);
		createdIndexes += result.summary.counters.updates().indexesAdded;
	}

	await tx.commit();
	await session.close();

	console.info(`[Neo4j] ${createdIndexes}/${queries.length} indexes created`);
}
