import { describe, expect, test } from 'bun:test';
import { getOperationAST, parse } from 'graphql';
import { getAuditEntry } from '../../src/plugins/audit-log';

const entryOf = (
	query: string,
	variables?: Record<string, unknown>,
	data?: unknown,
) => {
	const document = parse(query);

	return getAuditEntry(document, getOperationAST(document)!, variables, data);
};

describe('getAuditEntry', () => {
	test('resolves positional variables to named args of each root field, by field name', () => {
		const { changes } = entryOf(
			`mutation Save($v1: PersonWhere, $v2: PersonUpdateInput, $v3: [ID!]) {
				renamed: updatePeople(where: $v1, update: $v2) { people { id } }
				deletePeople(where: { id: { in: $v3 } }) { nodesDeleted }
				__typename
			}`,
			{
				v1: { id: { eq: 'p1' } },
				v2: { birth_date: { set: '2000-01-31' } },
				v3: ['p2', 'p3'],
			},
		);

		expect(changes).toEqual([
			{
				field: 'updatePeople',
				args: {
					where: { id: { eq: 'p1' } },
					update: { birth_date: { set: '2000-01-31' } },
				},
			},
			{ field: 'deletePeople', args: { where: { id: { in: ['p2', 'p3'] } } } },
		]);
	});

	test('includes root fields inside fragments', () => {
		const { changes } = entryOf(`
			mutation {
				... on Mutation { deleteBills(where: { id: { eq: "b1" } }) { nodesDeleted } }
				...Rest
			}
			fragment Rest on Mutation { deleteLinks { nodesDeleted } }
		`);

		expect(changes.map(({ field }) => field)).toEqual([
			'deleteBills',
			'deleteLinks',
		]);
	});

	test('collects every id from where, nested connect/disconnect and the response, without duplicates', () => {
		const { nodeIds } = entryOf(
			`mutation ($v1: OrganizationWhere, $v2: OrganizationUpdateInput) {
				updateOrganizations(where: $v1, update: $v2) { organizations { id posts { id } } }
			}`,
			{
				v1: { id: { eq: 'o1' }, name: { eq: 'not-an-id' } },
				v2: {
					links: [
						{
							connect: [{ where: { node: { id: { in: ['l1', 'l2'] } } } }],
							disconnect: [{ where: { node: { id: { eq: 'l3' } } } }],
						},
					],
				},
			},
			{
				updateOrganizations: {
					organizations: [{ id: 'o1', posts: [{ id: 'p1' }, { id: 'l1' }] }],
				},
			},
		);

		expect(nodeIds).toEqual(['o1', 'l1', 'l2', 'l3', 'p1']);
	});
});
