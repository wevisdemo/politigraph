import { Neo4jGraphQL } from '@neo4j/graphql';
import { excludeDeprecatedFields } from '@politigraph/graphql/deprecated-fields';
// @ts-expect-error graphql import with type assertion
import typeDefs from '@politigraph/graphql/dist/typedefs.graphql' with { type: 'text' };
import { populatedBy } from '@politigraph/graphql/populated-by';
import { resolvers } from '@politigraph/graphql/resolvers';
import { describe, expect, test } from 'bun:test';
import { parse, validate } from 'graphql';
import {
	buildCenterNodeQuery,
	buildSearchQuery,
	normalizeAliasedFields,
	pruneToMainLeaves,
	searchableTypes,
} from '../../src/utils/explore';
import { toRelatedNodes, type GraphqlObject } from '../../src/utils/schema';

// Guard the docs explore page queries, which are generated from
// dist/definitions.json, against drifting from the augmented schema
const schema = await new Neo4jGraphQL({
	typeDefs,
	resolvers,
	features: {
		authorization: { key: 'unused-in-schema-validation' },
		excludeDeprecatedFields,
		populatedBy,
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
	const children = Object.values(node).flatMap(toRelatedNodes);
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
					post: {
						__typename: 'Post',
						id: 'post-1',
						organization: { __typename: 'Organization', id: 'org-1' },
						// dead-end: Membership with no onward relations
						memberships: [{ __typename: 'Membership', id: 'membership-2' }],
					},
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

	test('walks single relations, nulling dead-ends and renaming aliases', () => {
		const backReference = { __typename: 'Bill', id: 'bill-1' };
		const center: GraphqlObject = {
			__typename: 'Bill',
			id: 'bill-1',
			events: [
				{
					__typename: 'BillVoteEvent',
					id: 'bill-vote-event-1',
					title___1: 'วาระ 1',
					bill: backReference,
					vote_event: { __typename: 'VoteEvent', id: 'vote-event-1' },
				},
				{
					__typename: 'BillEnactEvent',
					id: 'enact-1',
					bill: null,
					// dead-end: single relation to a non-main leaf
					post: { __typename: 'Post', id: 'post-1' },
				},
			],
		};

		const [pruned] = normalizeAliasedFields({ bills: [center] }).bills.map(
			pruneToMainLeaves,
		);

		expect(pruned.events).toEqual([
			{
				__typename: 'BillVoteEvent',
				id: 'bill-vote-event-1',
				title: 'วาระ 1',
				bill: backReference,
				vote_event: { __typename: 'VoteEvent', id: 'vote-event-1' },
			},
		]);
	});

	test('keeps a main center node with no relations', () => {
		const center: GraphqlObject = { __typename: 'Person', id: 'person-1' };
		expect(pruneToMainLeaves(center)).toEqual(center);
	});
});
