import type { Neo4jGraphQLConstructor } from '@neo4j/graphql';

/**
 * `Relation` fields use these instead of `@id` and `@timestamp`, which
 * `@neo4j/graphql` does not generate on relationships made with `connect`.
 */
export const populatedBy: NonNullable<
	Neo4jGraphQLConstructor['features']
>['populatedBy'] = {
	callbacks: {
		relationId: () => crypto.randomUUID(),
		relationCreatedAt: () => new Date().toISOString(),
	},
};
