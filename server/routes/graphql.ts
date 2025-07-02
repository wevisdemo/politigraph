import { ApolloServer } from '@apollo/server';
import { startServerAndCreateH3Handler } from '@as-integrations/h3';
import { ApolloArmor } from '@escape.tech/graphql-armor';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { resolvers } from '~/utils/graphql/custom-resolvers';
import {
	getGraphqlCreateIndexQueries,
	getGraphqlTypeDefs,
} from '~/utils/graphql/schema';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
	`neo4j://${process.env.NEO4J_HOST ?? 'localhost'}:7687`,
	neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
);

const neo4jgraphql = new Neo4jGraphQL({
	typeDefs: getGraphqlTypeDefs(),
	driver,
	resolvers,
	features: {
		authorization: {
			key: {
				url: 'http://localhost:3000/auth/jwks',
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

const schema = await neo4jgraphql.getSchema();

await neo4jgraphql.checkNeo4jCompat();
await neo4jgraphql.assertIndexesAndConstraints();

await createNeo4jIndexes();

const armor = new ApolloArmor({
	blockFieldSuggestion: {
		enabled: false,
	},
	costLimit: {
		maxCost: 50000,
	},
	maxDepth: {
		enabled: false,
	},
});

export default startServerAndCreateH3Handler(
	new ApolloServer({
		schema,
		...armor.protect(),
		allowBatchedHttpRequests: true,
	}),
	{
		context: async ({ event: { headers } }) => {
			const token = headers.get('authorization')?.replace('Bearer ', '');

			if (token) {
				return { token };
			}

			const res = await fetch('http://localhost:3000/auth/token', {
				headers,
			});

			if (res.ok) {
				return res.json();
			}
		},
	},
);

async function createNeo4jIndexes() {
	const queries = getGraphqlCreateIndexQueries();
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
