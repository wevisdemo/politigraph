import { Neo4jGraphQL } from '@neo4j/graphql';
import { excludeDeprecatedFields } from '../deprecated-fields';
// @ts-expect-error graphql import with type assertion
import typeDefs from '../dist/typedefs.graphql' with { type: 'text' };
import { resolvers } from '../domains/resolvers';
import { driver } from './driver';

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
