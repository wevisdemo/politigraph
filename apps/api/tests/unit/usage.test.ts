import { describe, expect, test } from 'bun:test';
import {
	buildSchema,
	getOperationAST,
	parse,
	type OperationDefinitionNode,
} from 'graphql';
import { getFieldUsage, getMcpUsage } from '../../src/utils/usage';

const schema = buildSchema(`
  type Query {
    people: [Person]
    bills: [Bill]
  }

  type Person {
    name: String
    memberships: [Membership]
  }

  type Membership {
    label: String
  }

  type Bill {
    title: String
    requirement: String @deprecated(reason: "Removed")
  }
`);

function getUsage(query: string, operationName?: string) {
	const document = parse(query);

	return getFieldUsage(
		schema,
		document,
		getOperationAST(document, operationName) as OperationDefinitionNode,
	);
}

describe('getFieldUsage', () => {
	test('collects nested, aliased and fragment fields without __typename', () => {
		const { fields, deprecated } = getUsage(`
			query People {
				people {
					__typename
					fullName: name
					...PersonMemberships
				}
			}

			fragment PersonMemberships on Person {
				memberships { label }
			}
		`);

		expect(fields.sort()).toEqual([
			'Membership.label',
			'Person.memberships',
			'Person.name',
			'Query.people',
		]);
		expect(deprecated).toEqual([]);
	});

	test('reports deprecated fields and ignores operations that did not run', () => {
		const { fields, deprecated } = getUsage(
			`
			query Bills { bills { title requirement } }
			query People { people { name } }
		`,
			'Bills',
		);

		expect(fields.sort()).toEqual([
			'Bill.requirement',
			'Bill.title',
			'Query.bills',
		]);
		expect(deprecated).toEqual(['Bill.requirement']);
	});
});

describe('getMcpUsage', () => {
	test('maps tracked JSON-RPC methods to events', () => {
		expect(
			getMcpUsage({
				jsonrpc: '2.0',
				method: 'initialize',
				params: { clientInfo: { name: 'claude-ai', version: '1.0.0' } },
			}),
		).toEqual({
			name: 'MCP Connect',
			props: { client: 'claude-ai', client_version: '1.0.0' },
		});
		expect(
			getMcpUsage({ method: 'tools/call', params: { name: 'query' } }),
		).toEqual({ name: 'MCP Tool', props: { tool: 'query' } });
		expect(
			getMcpUsage({
				method: 'resources/read',
				params: { uri: 'politigraph://schema' },
			}),
		).toEqual({ name: 'MCP Resource', props: { uri: 'politigraph://schema' } });
	});

	test('ignores untracked methods and oversized values', () => {
		expect(getMcpUsage({ method: 'tools/list' })).toBeUndefined();
		expect(
			getMcpUsage({ method: 'tools/call', params: { name: 'x'.repeat(201) } }),
		).toBeUndefined();
	});
});
