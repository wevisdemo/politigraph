import { makeExecutableSchema } from '@graphql-tools/schema';
import { describe, expect, mock, test } from 'bun:test';
import { Elysia } from 'elysia';

const typeDefs = `
  type Query {
    hello: String
  }
`;

const executableSchema = makeExecutableSchema({
	typeDefs,
	resolvers: {
		Query: {
			hello: () => 'world',
		},
	},
});

const { apollo, ElysiaApolloServer } = await import('../../src/routes/graphql');

describe('graphql route', () => {
	test('batch size over maxBatching returns 400 with validation error', async () => {
		const app = new Elysia().use(
			await apollo({
				schema: executableSchema,
				allowBatchedHttpRequests: true,
				maxBatching: 2,
			}),
		);

		const batch = [
			{ query: '{ hello }' },
			{ query: '{ hello }' },
			{ query: '{ hello }' },
		];

		const response = await app.handle(
			new Request('http://localhost/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(batch),
			}),
		);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors).toBeDefined();
		expect(body.errors[0].message).toContain(
			'Batch operation limit of 2 exceeded',
		);
		expect(body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
	});

	test('context function receives request headers', async () => {
		const contextSpy = mock(async (ctx: { request: Request }) => {
			return {
				headers: Object.fromEntries(ctx.request.headers.entries()),
			};
		});

		const app = new Elysia().use(
			await apollo({
				schema: executableSchema,
				context: contextSpy,
			}),
		);

		const response = await app.handle(
			new Request('http://localhost/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-custom-header': 'test-value',
				},
				body: JSON.stringify({ query: '{ hello }' }),
			}),
		);

		expect(response.status).toBe(200);

		expect(contextSpy).toHaveBeenCalledTimes(1);
		const callArgs = contextSpy.mock.calls[0][0];
		expect(callArgs.request).toBeDefined();
		expect(callArgs.request.headers.get('x-custom-header')).toBe('test-value');
	});

	test('valid single query returns 200', async () => {
		const app = new Elysia().use(
			await apollo({
				schema: executableSchema,
			}),
		);

		const response = await app.handle(
			new Request('http://localhost/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: '{ hello }' }),
			}),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.data.hello).toBe('world');
	});

	test('invalid variable type returns a graphql error, not a crash', async () => {
		const app = new Elysia().use(
			await apollo({
				schema: makeExecutableSchema({
					typeDefs: `type Query { echo(count: Int!): Int }`,
					resolvers: { Query: { echo: (_, { count }) => count } },
				}),
			}),
		);

		const response = await app.handle(
			new Request('http://localhost/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: 'query ($count: Int!) { echo(count: $count) }',
					variables: { count: 'not-a-number' },
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.errors[0].message).toContain('count');
	});

	test('execution failure returns 500 with a generic error', async () => {
		class FailingServer extends ElysiaApolloServer {
			override async executeHTTPGraphQLRequest(): Promise<never> {
				throw new Error('execution exploded');
			}
		}

		const app = new Elysia().use(
			await new FailingServer({ schema: executableSchema }).createHandler({}),
		);

		const response = await app.handle(
			new Request('http://localhost/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: '{ hello }' }),
			}),
		);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.errors[0].message).toBe('Internal server error');
	});

	test('batch within limit returns 200', async () => {
		const app = new Elysia().use(
			await apollo({
				schema: executableSchema,
				allowBatchedHttpRequests: true,
				maxBatching: 5,
			}),
		);

		const batch = [{ query: '{ hello }' }, { query: '{ hello }' }];

		const response = await app.handle(
			new Request('http://localhost/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(batch),
			}),
		);

		expect(response.status).toBe(200);
		const text = await response.text();
		const body = JSON.parse(text);
		expect(Array.isArray(body)).toBe(true);
		expect(body[0].data.hello).toBe('world');
		expect(body[1].data.hello).toBe('world');
	});
});
