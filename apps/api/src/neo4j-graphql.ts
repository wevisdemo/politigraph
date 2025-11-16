import { resolvers } from '@politigraph/graphql/custom-resolvers';
import { Neo4jGraphQL } from '@politigraph/graphql/libs';
import {
	getGraphqlCreateIndexQueries,
	getGraphqlTypeDefs,
} from '@politigraph/graphql/schema';
import { Context } from 'elysia';
import neo4j from 'neo4j-driver';
import { apollo } from './apollo';

const driver = neo4j.driver(
	`neo4j://${process.env.NEO4J_HOST ?? '127.0.0.1'}:7687`,
	neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
);

const neo4jGraphql = new Neo4jGraphQL({
	typeDefs: await getGraphqlTypeDefs(),
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

const schema = await neo4jGraphql.getSchema();

export const apolloServer = apollo({
	schema,
	allowBatchedHttpRequests: true,
	context: async ({ request: { headers } }: Context) => {
		const res = await fetch('http://127.0.0.1:3000/auth/token', {
			headers: {
				cookie: headers.get('cookie') ?? '',
				'x-api-key': headers.get('x-api-key') ?? '',
			},
		});

		if (res.ok) {
			return res.json();
		}
	},
});

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
