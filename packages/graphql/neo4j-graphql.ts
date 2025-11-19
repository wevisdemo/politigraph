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

const neo4jGraphql = new Neo4jGraphQL({
	typeDefs,
	driver,
	resolvers,
	features: {
		authorization: {
			key: {
				url: 'http://127.0.0.1:3000/auth/jwks',
			},
		},
		excludeDeprecatedFields: {
			implicitEqualFilters: true,
			implicitSet: true,
			deprecatedOptionsArgument: true,
			directedArgument: true,
			connectOrCreate: true,
			typename_IN: true,
			idAggregations: true,
			deprecatedAggregateOperations: true,
		},
	},
});

export const schema = await neo4jGraphql.getSchema();

export async function prepareNeo4j() {
	if (!process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
		console.info('[Neo4j] Credential env not found, skipping setup');
		return;
	}

	await neo4jGraphql.checkNeo4jCompat();
	await neo4jGraphql.assertIndexesAndConstraints();

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
