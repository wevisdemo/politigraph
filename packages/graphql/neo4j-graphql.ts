import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j from 'neo4j-driver';
import { resolvers } from './custom-resolvers';
// @ts-ignore
import typeDefs from './dist/typedefs.graphql' with { type: 'text' };
import { getGraphqlCreateIndexQueries } from './schema';

const driver = neo4j.driver(
	`neo4j://${process.env.NEO4J_HOST ?? '127.0.0.1'}:7687`,
	neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
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
			excludeDeprecatedFields: {
				mutationOperations: true,
				aggregationFilters: true,
				aggregationFiltersOutsideConnection: true,
				relationshipFilters: true,
				attributeFilters: true,
			},
		},
	});
}

export async function createNeo4jIndex() {
	if (!process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
		console.info('[Neo4j] Credential env not found, skipping setup');
		return;
	}

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
