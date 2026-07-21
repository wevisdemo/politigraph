import { Neo4jGraphQL } from '@neo4j/graphql';
import { describe, expect, test } from 'bun:test';
import { parse, validate } from 'graphql';
import {
	buildCenterNodeQuery,
	buildSearchQuery,
	pruneToMainLeaves,
	searchableTypes,
} from '../../../../apps/docs/src/utils/explore';
import type { GraphqlObject } from '../../../../apps/docs/src/utils/schema';
import { resolvers } from '../../custom-resolvers';
import { excludeDeprecatedFields } from '../../deprecated-fields';
// @ts-expect-error graphql import with type assertion
import typeDefs from '../../dist/typedefs.graphql' with { type: 'text' };

// Guard the docs explore page queries, which are generated from
// dist/definitions.json, against drifting from the augmented schema
const schema = await new Neo4jGraphQL({
	typeDefs,
	resolvers,
	features: {
		authorization: { key: 'unused-in-schema-validation' },
		excludeDeprecatedFields,
	},
}).getSchema();

describe('docs explore queries', () => {
	test('search query is valid against the schema', () => {
		const errors = validate(schema, parse(buildSearchQuery()));
		expect(errors.map((e) => e.message)).toEqual([]);
	});

	searchableTypes.forEach(({ name }) => {
		test(`${name} center node query is valid against the schema`, () => {
			const errors = validate(schema, parse(buildCenterNodeQuery(name)));
			expect(errors.map((e) => e.message)).toEqual([]);
		});
	});
});

function leafTypenames(node: GraphqlObject): string[] {
	const children = Object.values(node).filter(Array.isArray).flat();
	return children.length ? children.flatMap(leafTypenames) : [node.__typename];
}

describe('pruneToMainLeaves', () => {
	test('drops non-main dead-end branches, keeps paths reaching a main node', () => {
		const center: GraphqlObject = {
			__typename: 'Person',
			id: 'person-1',
			memberships: [
				{
					__typename: 'Membership',
					id: 'membership-1',
					posts: [
						{
							__typename: 'Post',
							id: 'post-1',
							organizations: [{ __typename: 'Organization', id: 'org-1' }],
							// dead-end: Membership with no onward relations
							memberships: [{ __typename: 'Membership', id: 'membership-2' }],
						},
					],
				},
				// dead-end: Membership whose only branch is a non-main leaf
				{
					__typename: 'Membership',
					id: 'membership-3',
					links: [{ __typename: 'Link', id: 'link-1' }],
				},
			],
		};

		const pruned = pruneToMainLeaves(center);

		expect([...new Set(leafTypenames(pruned))]).toEqual(['Organization']);
		expect(pruned.memberships).toHaveLength(1);
	});

	test('keeps a main center node with no relations', () => {
		const center: GraphqlObject = { __typename: 'Person', id: 'person-1' };
		expect(pruneToMainLeaves(center)).toEqual(center);
	});
});
