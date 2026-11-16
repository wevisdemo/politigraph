import { describe, expect, test } from 'bun:test';
import { buildSchema, parse, print } from 'graphql';
import { hideUnpublishedPlugin } from '../../src/utils/hide-unpublished';
import { getFieldUsage } from '../../src/utils/usage';

const schema = buildSchema(`
  enum PublishStatus { PUBLISHED UNPUBLISHED }
  input PublishStatusFilters { eq: PublishStatus }
  type Person { id: ID! }
  input PersonWhere { id: ID, publish_status: PublishStatusFilters }
  type Vote { id: ID! }
  input VoteWhere { id: ID, voter: PersonWhere }
  type Query { votes(where: VoteWhere): [Vote!]! }
`);

async function resolveOperation(contextValue: object) {
	const document = parse(
		'query { votes(where: { voter: { id: { eq: "a" } } }) { id } }',
	);
	const requestContext = {
		schema,
		document,
		operation: document.definitions[0],
		operationName: null,
		request: { variables: {} },
	};
	const listener = await hideUnpublishedPlugin.requestDidStart!({
		contextValue,
	} as never);

	await listener?.didResolveOperation?.(requestContext as never);

	return requestContext;
}

describe('hideUnpublishedPlugin', () => {
	test('anonymous requests execute the rewritten document and its own operation', async () => {
		const { document, operation } = await resolveOperation({});

		expect(print(document)).toContain('AND');
		expect(document.definitions).toContain(operation);
		expect(
			getFieldUsage(schema, document, operation as never).fields,
		).toContain('Query.votes');
	});

	test('authenticated requests are left untouched', async () => {
		const { document } = await resolveOperation({ token: 'jwt' });

		expect(print(document)).not.toContain('AND');
	});
});
