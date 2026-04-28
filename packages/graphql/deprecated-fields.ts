import type { Neo4jGraphQLConstructor } from '@neo4j/graphql';

export const excludeDeprecatedFields: NonNullable<
	Neo4jGraphQLConstructor['features']
>['excludeDeprecatedFields'] = {
	mutationOperations: true,
	aggregationFilters: true,
	aggregationFiltersOutsideConnection: true,
	relationshipFilters: true,
	attributeFilters: true,
};
