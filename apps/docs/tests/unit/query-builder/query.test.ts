import { describe, expect, test } from 'bun:test';
import { buildSchema, parse, validate } from 'graphql';
import {
	buildQuery,
	createSelection,
	toStructureNode,
	type Selection,
} from '../../../src/utils/query-builder/query';
import { toBuilderSchema } from '../../../src/utils/query-builder/schema';

const sdl = await Bun.file(
	Bun.resolveSync('@politigraph/graphql/dist/schema.graphql', import.meta.dir),
).text();
const schema = toBuilderSchema(sdl);
const getRoot = (name: string) =>
	schema.roots.find((root) => root.name === name)!;

const selection: Selection = {
	...createSelection(getRoot('people')),
	filters: [
		{ field: 'firstname', op: 'contains', value: 'ชัย' },
		{ field: 'gender', op: 'in', value: 'MALE, FEMALE' },
		{ field: 'lastname', op: 'eq', value: ' ' },
	],
	sort: { field: 'firstname', direction: 'DESC' },
	fields: {
		firstname: createSelection(),
		memberships: {
			...createSelection(),
			limit: 3,
			filters: [{ field: 'district_number', op: 'gte', value: '2' }],
			fields: {
				post: {
					...createSelection(),
					fields: { label: createSelection() },
				},
			},
		},
		links: {
			...createSelection(),
			fields: {
				owner: {
					...createSelection(),
					fields: {
						'... on Bill': {
							...createSelection(),
							fields: { title: createSelection() },
						},
					},
				},
			},
		},
	},
};

describe('buildQuery', () => {
	test('builds a valid query with filters, sort, limits and ids on every object', () => {
		const query = buildQuery(schema, getRoot('people'), selection);

		expect(validate(buildSchema(sdl), parse(query))).toEqual([]);
		expect(query).toContain(
			'people(where: { firstname: { contains: "ชัย" }, gender: { in: [MALE, FEMALE] } }, sort: [{ firstname: DESC }], limit: 10) {',
		);
		expect(query).toContain(
			'memberships(where: { district_number: { gte: 2 } }, limit: 3) {',
		);
		expect(query).toContain('... on Bill {');
		expect(query.match(/\bid\b/g)?.length).toBeGreaterThan(4);
	});

	test('offers only scalar filters, not relationship filters', () => {
		expect(
			schema.filters[getRoot('people').where!].map(({ field }) => field),
		).not.toContain('memberships');
	});
});

describe('toStructureNode', () => {
	test('orders properties like the query, id first, regardless of selection order', () => {
		const node = toStructureNode(schema, 'Person', {
			...createSelection(),
			fields: { links: createSelection(), firstname: createSelection() },
		});

		expect(Object.keys(node)).toEqual([
			'__typename',
			'id',
			'firstname',
			'links',
		]);
	});

	test('nests selected relations and shows property types', () => {
		const node = toStructureNode(schema, 'Person', selection);

		expect(node).toMatchObject({
			__typename: 'Person',
			id: 'Person',
			firstname: 'String',
			memberships: {
				__typename: 'Membership',
				id: 'Person.memberships',
				post: { __typename: 'Post', label: 'String' },
			},
		});
	});
});
