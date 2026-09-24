import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { serverConfig } from '@politigraph/config/server';
import {
	getTypeSdl,
	listTypes,
	schemaSdl,
} from '@politigraph/graphql/schema-sdl';
import { SUMMARY } from '@politigraph/graphql/summary';
import { Elysia } from 'elysia';
import { OperationTypeNode, parse } from 'graphql';
import { z } from 'zod';
import { version } from '../../package.json';
import { MAX_QUERY_TOKENS } from '../constants/graphql';
import { SOURCE_HEADER, trackMcpRequest } from '../utils/usage';

const GRAPHQL_TIMEOUT_MS = 30 * 1000;
const MCP_CLIENT_HEADER = 'x-politigraph-mcp-client';
const DOCS_TIMEOUT_MS = 10 * 1000;

const INSTRUCTIONS = `${SUMMARY}

Workflow: call \`list-types\` to see what exists, \`get-schema\` to read the exact fields of the types you need, then \`query\` to fetch data. Never guess field names. Before writing a non-trivial query, call \`get-docs\` for the documentation index and read the pages about the types involved: they explain how the data is modeled and include example queries.

Notes:
- Read-only and anonymous. Mutations are rejected, and nodes whose \`publish_status\` is not \`PUBLISHED\` are hidden.
- \`Person\` and \`Vote\` return at most 1,000 nodes per query. Use pagination (\`limit\`/\`offset\`) for larger result sets.
- Descriptions in the schema are written in Thai, and so is most of the data.
- The data is licensed CC BY-NC 4.0: credit WeVis and do not use it commercially.`;

const textResult = (text: string, isError = false) => ({
	content: [{ type: 'text' as const, text }],
	isError,
});

/**
 * @returns the reason the document is not accepted, or `undefined` when it is
 */
function getRejectionReason(query: string) {
	try {
		const { definitions } = parse(query, { maxTokens: MAX_QUERY_TOKENS });

		const mutating = definitions.some(
			(definition) =>
				definition.kind === 'OperationDefinition' &&
				definition.operation !== OperationTypeNode.QUERY,
		);

		return mutating
			? 'Only query operations are allowed. Politigraph exposes read-only data over MCP.'
			: undefined;
	} catch (error) {
		return (error as Error).message;
	}
}

function createMcpServer(origin: string, client?: string | null) {
	const server = new McpServer(
		{ name: 'politigraph', version },
		{ instructions: INSTRUCTIONS },
	);

	server.registerTool(
		'query',
		{
			title: 'Run a GraphQL query',
			description:
				'Execute a read-only GraphQL query against the Politigraph API and return the raw JSON response.',
			inputSchema: z.object({
				query: z.string().describe('GraphQL query document'),
				variables: z
					.record(z.string(), z.unknown())
					.optional()
					.describe('Variables referenced by the query document'),
				operationName: z
					.string()
					.optional()
					.describe('Operation to run when the document defines several'),
			}),
			annotations: { readOnlyHint: true, openWorldHint: true },
		},
		async ({ query, variables, operationName }) => {
			const rejectionReason = getRejectionReason(query);

			if (rejectionReason) {
				return textResult(rejectionReason, true);
			}

			const response = await fetch(`${origin}/graphql`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					[SOURCE_HEADER]: 'mcp',
					...(client && { 'apollographql-client-name': client }),
				},
				body: JSON.stringify({ query, variables, operationName }),
				signal: AbortSignal.timeout(GRAPHQL_TIMEOUT_MS),
			});

			const body = await response.text();

			return textResult(
				body,
				!response.ok || Boolean(safeParseJson(body)?.errors),
			);
		},
	);

	server.registerTool(
		'get-schema',
		{
			title: 'Read the GraphQL schema',
			description:
				'Return the Politigraph GraphQL schema as SDL, either in full or for a single type.',
			inputSchema: z.object({
				type: z
					.string()
					.optional()
					.describe(
						'Name of a single type to return, e.g. Person. Omit for the full schema.',
					),
			}),
			annotations: { readOnlyHint: true },
		},
		async ({ type }) => {
			if (!type) {
				return textResult(schemaSdl);
			}

			const sdl = getTypeSdl(type);

			return sdl
				? textResult(sdl)
				: textResult(
						`Unknown type "${type}". Call list-types to see the available types.`,
						true,
					);
		},
	);

	server.registerTool(
		'list-types',
		{
			title: 'List schema types',
			description:
				'List every type in the Politigraph schema with its kind and description, to find which types to read in detail.',
			annotations: { readOnlyHint: true },
		},
		async () =>
			textResult(
				listTypes()
					.map(
						({ name, kind, description }) =>
							`- ${kind} ${name}${description ? `: ${description}` : ''}`,
					)
					.join('\n'),
			),
	);

	server.registerTool(
		'get-docs',
		{
			title: 'Read the documentation',
			description:
				'Return the Politigraph documentation index (llms.txt) as markdown, or a single documentation page linked from it.',
			inputSchema: z.object({
				page: z
					.string()
					.optional()
					.describe(
						'Markdown URL or path of a page listed in the index, e.g. /en/schema/bill.md. Omit for the index.',
					),
			}),
			annotations: { readOnlyHint: true },
		},
		async ({ page = '/llms.txt' }) => {
			const url = new URL(page, serverConfig.siteUrl);

			if (url.origin !== new URL(serverConfig.siteUrl).origin) {
				return textResult(
					'Only pages of the Politigraph documentation can be read. Call get-docs without a page to see them.',
					true,
				);
			}

			const response = await fetchDocs(url);

			return response.ok
				? textResult(await response.text())
				: textResult(
						`Failed to read ${url.pathname}: ${response.status} ${response.statusText}. Call get-docs without a page to see the available pages.`,
						true,
					);
		},
	);

	server.registerResource(
		'schema',
		'politigraph://schema',
		{
			title: 'GraphQL schema',
			description: 'Full SDL of every node type, property and relationship',
			mimeType: 'application/graphql',
		},
		async (uri) => ({
			contents: [{ uri: uri.href, text: schemaSdl }],
		}),
	);

	server.registerResource(
		'docs',
		'politigraph://docs',
		{
			title: 'Documentation',
			description: 'The entire Politigraph documentation as plain markdown',
			mimeType: 'text/markdown',
		},
		async (uri) => ({
			contents: [{ uri: uri.href, text: await getDocs() }],
		}),
	);

	return server;
}

const fetchDocs = (url: URL) =>
	fetch(url, { signal: AbortSignal.timeout(DOCS_TIMEOUT_MS) });

async function getDocs() {
	const response = await fetchDocs(
		new URL('/llms-full.txt', serverConfig.siteUrl),
	);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch documentation: ${response.status} ${response.statusText}`,
		);
	}

	return response.text();
}

function safeParseJson(body: string) {
	try {
		return JSON.parse(body) as { errors?: unknown[] };
	} catch {
		return undefined;
	}
}

export const mcp = (origin: string) => {
	const handler = createMcpHandler(({ requestInfo }) =>
		createMcpServer(origin, requestInfo?.headers.get(MCP_CLIENT_HEADER)),
	);

	return new Elysia().mount('/mcp', async (request) => {
		const client =
			request.method === 'POST'
				? await request
						.clone()
						.json()
						.then((message) => trackMcpRequest(message, request.headers))
						.catch(() => undefined)
				: undefined;

		const headers = new Headers(request.headers);

		if (client) {
			headers.set(MCP_CLIENT_HEADER, client);
		} else {
			headers.delete(MCP_CLIENT_HEADER);
		}

		return handler.fetch(new Request(request, { headers }));
	});
};
