import { describe, expect, test } from 'bun:test';
import { parseQuery } from '../../../src/utils/query-builder/parse';
import { buildQuery } from '../../../src/utils/query-builder/query';
import { toBuilderSchema } from '../../../src/utils/query-builder/schema';

const sdl = await Bun.file(
	Bun.resolveSync('@politigraph/graphql/dist/schema.graphql', import.meta.dir),
).text();
const schema = toBuilderSchema(sdl);

const roundTrip = (source: string) => {
	const { root, selection } = parseQuery(schema, source);

	return buildQuery(schema, root, selection);
};

describe('parseQuery', () => {
	test('reads filters, sort, limits, nested fields and fragments back into a query', () => {
		const query = roundTrip(`query People {
			people(
				where: { firstname: { contains: "ชัย" }, gender: { in: [MALE, FEMALE] } }
				sort: { firstname: DESC }
				limit: 5
			) {
				firstname
				memberships(where: { district_number: { gte: 2 } }, limit: 3) {
					post { label }
				}
				links { owner { ... on Bill { title } } }
			}
		}`);

		expect(query).toContain(
			'people(where: { firstname: { contains: "ชัย" }, gender: { in: [MALE, FEMALE] } }, sort: [{ firstname: DESC }], limit: 5) {',
		);
		expect(query).toContain(
			'memberships(where: { district_number: { gte: 2 } }, limit: 3) {',
		);
		expect(query).toContain('... on Bill {');
	});

	test('is stable when the built query is parsed again', () => {
		const once = roundTrip(
			'{ organizations(limit: 2) { name posts { role } } }',
		);

		expect(roundTrip(once)).toBe(once);
	});

	test.each([
		[
			'relationship filters',
			'{ posts(where: { organization: { id: { eq: "x" } } }) { role } }',
		],
		[
			'NOT filters',
			'{ people(where: { NOT: { firstname: { eq: "x" } } }) { firstname } }',
		],
		[
			'several or aliased starting nodes',
			'{ a: people { firstname } b: people { firstname } }',
		],
		[
			'variables',
			'query ($w: PersonWhere) { people(where: $w) { firstname } }',
		],
		['unknown fields', '{ people { not_a_field } }'],
		['unknown starting nodes', '{ nothing { id } }'],
	])('rejects %s', (_, source) => {
		expect(() => parseQuery(schema, source)).toThrow();
	});
});
