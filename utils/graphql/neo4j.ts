import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j from 'neo4j-driver';
import { resolvers } from './custom-resolvers';
import { getGraphqlTypeDefs } from './schema';

export function initGraphqlNeo4j() {
	const driver = neo4j.driver(
		`neo4j://${process.env.NEO4J_HOST ?? '127.0.0.1'}:7687`,
		neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
	);

	const neo4jgraphql = new Neo4jGraphQL({
		typeDefs: getGraphqlTypeDefs(),
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

	return { driver, neo4jgraphql };
}
