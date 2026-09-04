import {
	Client,
	StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { afterAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { MAX_QUERY_TOKENS } from '../../src/constants/graphql';
import { mcp } from '../../src/routes/mcp';

const ORIGIN = 'http://127.0.0.1:3000';
const MCP_URL = new URL('http://localhost/mcp');

const app = mcp(ORIGIN);

const graphqlFetch = spyOn(globalThis, 'fetch');

const firstText = (content: unknown) => (content as [{ text: string }])[0].text;

const jsonResponse = (body: unknown) =>
	new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json' },
	});

let lastInboundRequest: Request | undefined;

async function connect(headers?: Record<string, string>) {
	const client = new Client({ name: 'test', version: '1.0.0' });

	await client.connect(
		new StreamableHTTPClientTransport(MCP_URL, {
			requestInit: { headers },
			fetch: (url, init) => {
				lastInboundRequest = new Request(url, init);
				return app.handle(lastInboundRequest);
			},
		}),
	);

	return client;
}

afterAll(() => {
	graphqlFetch.mockRestore();
});

describe('mcp server', () => {
	beforeEach(() => {
		graphqlFetch.mockReset();
	});

	test('advertises read-only tools', async () => {
		const client = await connect();
		const { tools } = await client.listTools();

		expect(tools.map(({ name }) => name).sort()).toEqual([
			'get-schema',
			'list-types',
			'query',
		]);
		expect(
			tools.every(({ annotations }) => annotations?.readOnlyHint),
		).toBeTrue();

		await client.close();
	});

	describe('query tool', () => {
		test('forwards the operation to the GraphQL route without auth headers', async () => {
			graphqlFetch.mockResolvedValue(
				jsonResponse({ data: { people: [{ id: '1' }] } }),
			);

			const client = await connect({
				authorization: 'Bearer caller-token',
				cookie: 'better-auth.session_token=caller-session',
			});
			const result = await client.callTool({
				name: 'query',
				arguments: {
					query: 'query People($limit: Int) { people(limit: $limit) { id } }',
					variables: { limit: 1 },
					operationName: 'People',
				},
			});

			expect(lastInboundRequest?.headers.get('authorization')).toBe(
				'Bearer caller-token',
			);
			expect(graphqlFetch).toHaveBeenCalledTimes(1);

			const [url, init] = graphqlFetch.mock.calls[0] as [string, RequestInit];
			expect(url).toBe(`${ORIGIN}/graphql`);

			const forwarded = new Headers(init.headers);
			expect(forwarded.has('authorization')).toBeFalse();
			expect(forwarded.has('cookie')).toBeFalse();
			expect(JSON.parse(init.body as string)).toEqual({
				query: 'query People($limit: Int) { people(limit: $limit) { id } }',
				variables: { limit: 1 },
				operationName: 'People',
			});

			expect(result.isError).toBeFalsy();
			expect(result.content).toEqual([
				{ type: 'text', text: '{"data":{"people":[{"id":"1"}]}}' },
			]);

			await client.close();
		});

		test('reports GraphQL errors as a tool error', async () => {
			graphqlFetch.mockResolvedValue(
				jsonResponse({ errors: [{ message: 'Cannot query field "nope"' }] }),
			);

			const client = await connect();
			const result = await client.callTool({
				name: 'query',
				arguments: { query: '{ nope }' },
			});

			expect(result.isError).toBeTrue();

			await client.close();
		});

		test('rejects mutations without calling the GraphQL route', async () => {
			const client = await connect();
			const result = await client.callTool({
				name: 'query',
				arguments: {
					query: 'mutation { createPeople { info { nodesCreated } } }',
				},
			});

			expect(result.isError).toBeTrue();
			expect(graphqlFetch).not.toHaveBeenCalled();

			await client.close();
		});

		test('rejects a document over the token limit without calling the GraphQL route', async () => {
			const client = await connect();
			const result = await client.callTool({
				name: 'query',
				arguments: { query: `{ ${'a '.repeat(MAX_QUERY_TOKENS)} }` },
			});

			expect(result.isError).toBeTrue();
			expect(graphqlFetch).not.toHaveBeenCalled();

			await client.close();
		});
	});

	describe('schema tools', () => {
		test('returns a single type definition', async () => {
			const client = await connect();
			const result = await client.callTool({
				name: 'get-schema',
				arguments: { type: 'Person' },
			});

			expect(firstText(result.content)).toInclude('type Person @node');
			expect(firstText(result.content)).not.toInclude('type Organization');

			await client.close();
		});

		test('errors on an unknown type', async () => {
			const client = await connect();
			const result = await client.callTool({
				name: 'get-schema',
				arguments: { type: 'Unicorn' },
			});

			expect(result.isError).toBeTrue();

			await client.close();
		});

		test('lists every type with its kind', async () => {
			const client = await connect();
			const result = await client.callTool({ name: 'list-types' });

			expect(firstText(result.content)).toInclude('- type Person');
			expect(firstText(result.content)).toInclude('- union OtherNames');

			await client.close();
		});
	});

	test('exposes the schema as a resource', async () => {
		const client = await connect();
		const { contents } = await client.readResource({
			uri: 'politigraph://schema',
		});

		expect(firstText(contents)).toInclude('type Person');

		await client.close();
	});
});
