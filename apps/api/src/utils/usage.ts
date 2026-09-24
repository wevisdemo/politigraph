import { createHash, randomBytes } from 'node:crypto';
import type { ApolloServerPlugin, BaseContext } from '@apollo/server';
import { CLIENT_INFO_META_KEY } from '@modelcontextprotocol/server';
import { serverConfig } from '@politigraph/config/server';
import {
	TypeInfo,
	visit,
	visitWithTypeInfo,
	type DocumentNode,
	type GraphQLSchema,
	type OperationDefinitionNode,
} from 'graphql';
import { z } from 'zod';
import { trackEvent } from './plausible';

export const SOURCE_HEADER = 'x-politigraph-source';

let salt = process.env.USAGE_SALT ?? randomBytes(16).toString('hex');

process.on('message', (message: { usageSalt?: string }) => {
	if (message?.usageSalt) salt = message.usageSalt;
});

/** Written to stdout for the log collector to ship into the `api_usage` stream */
export function logUsage(event: Record<string, unknown>) {
	if (serverConfig.isProduction) {
		console.log(JSON.stringify({ type: 'usage', ...event }));
	}
}

/**
 * PDPA: the salt only lives in memory and rotates daily, like Plausible,
 * so a stored hash can't be traced back to an IP once its day has passed
 */
export function getVisitorHash(ip: string, userAgent: string) {
	return createHash('sha256')
		.update(`${salt}:${ip}:${userAgent}`)
		.digest('hex')
		.slice(0, 16);
}

/**
 * @returns every `Type.field` the operation selects, and those that are deprecated
 */
export function getFieldUsage(
	schema: GraphQLSchema,
	document: DocumentNode,
	operation: OperationDefinitionNode,
) {
	const typeInfo = new TypeInfo(schema);
	const fields = new Set<string>();
	const deprecated = new Set<string>();

	visit(
		document,
		visitWithTypeInfo(typeInfo, {
			OperationDefinition: (node) => (node === operation ? undefined : false),
			Field: (node) => {
				const parent = typeInfo.getParentType();
				const field = typeInfo.getFieldDef();

				if (!parent || !field || node.name.value === '__typename') return;

				const name = `${parent.name}.${field.name}`;

				fields.add(name);

				if (field.deprecationReason != null) deprecated.add(name);
			},
		}),
	);

	return { fields: [...fields], deprecated: [...deprecated] };
}

export const usagePlugin: ApolloServerPlugin<BaseContext> = {
	async requestDidStart({ request, contextValue }) {
		const startedAt = performance.now();
		const headers = request.http?.headers;
		const ip = headers?.get('x-real-ip');
		const userAgent = headers?.get('user-agent') ?? '';
		const source =
			headers?.get(SOURCE_HEADER) === 'mcp'
				? 'mcp'
				: 'token' in contextValue
					? 'admin'
					: 'public';

		// Requests that bypass nginx are internal, e.g. the container healthcheck
		if (!ip && source !== 'mcp') return;

		const client =
			URL.parse(headers?.get('origin') ?? '')?.hostname ??
			(headers?.get('apollographql-client-name')?.slice(0, 100) || 'direct');
		const clientVersion = headers
			?.get('apollographql-client-version')
			?.slice(0, 100);

		return {
			async willSendResponse({
				schema,
				document,
				operation,
				operationName,
				errors,
			}) {
				if (!document || !operation) return;

				logUsage({
					event: 'GraphQL Query',
					source,
					client,
					client_version: clientVersion,
					operation_name: operationName,
					operation_type: operation.operation,
					...getFieldUsage(schema, document, operation),
					duration_ms: Math.round(performance.now() - startedAt),
					has_errors: Boolean(errors?.length),
					visitor: ip && getVisitorHash(ip, userAgent),
				});

				if (source !== 'mcp') {
					trackEvent({
						name: 'GraphQL Query',
						path: '/graphql',
						props: { source, client },
						userAgent,
						clientIp: ip,
					});
				}
			},
		};
	},
};

const label = z.string().max(200);

const MCP_EVENTS: Record<string, string> = {
	initialize: 'MCP Connect',
	'tools/call': 'MCP Tool',
	'resources/read': 'MCP Resource',
};

const clientInfo = z.object({ name: label, version: label.optional() });

const mcpMessage = z.object({
	method: z.string(),
	params: z
		.object({
			name: label.optional(),
			uri: label.optional(),
			clientInfo: clientInfo.optional(),
			_meta: z
				.object({ [CLIENT_INFO_META_KEY]: clientInfo.optional() })
				.optional(),
		})
		.optional(),
});

interface McpUsage {
	name: string;
	props: {
		client?: string;
		client_version?: string;
		tool?: string;
		uri?: string;
	};
}

/**
 * @returns the usage event of a JSON-RPC message, or `undefined` when it is not tracked
 */
export function getMcpUsage(message: unknown): McpUsage | undefined {
	const { data } = mcpMessage.safeParse(message);
	const name = data && MCP_EVENTS[data.method];

	if (!name) return;

	const { params } = data;
	// Protocol 2026-07-28 has no `initialize` and sends client info on every request
	// https://modelcontextprotocol.io/specification/2026-07-28/basic
	const info = params?.clientInfo ?? params?._meta?.[CLIENT_INFO_META_KEY];

	return {
		name,
		props: {
			client: info?.name,
			client_version: info?.version,
			tool: params?.name,
			uri: params?.uri,
		},
	};
}

/**
 * @returns the product name of a user agent, e.g. `claude-code` from `claude-code/2.1.0 (cli)`
 */
export const getUserAgentName = (userAgent: string) =>
	userAgent.match(/^[^\s/;(]+/)?.[0].slice(0, 100);

/**
 * @returns the client name, to attribute the GraphQL queries the request runs
 */
export function trackMcpRequest(message: unknown, headers: Headers) {
	const usage = getMcpUsage(message);
	const ip = headers.get('x-real-ip');
	const userAgent = headers.get('user-agent') ?? '';
	const client = usage?.props.client ?? getUserAgentName(userAgent);

	if (usage && ip) {
		const props = { ...usage.props, client: client ?? 'unknown' };

		logUsage({
			event: usage.name,
			source: 'mcp',
			...props,
			visitor: getVisitorHash(ip, userAgent),
		});

		trackEvent({
			name: usage.name,
			path: '/mcp',
			props,
			userAgent,
			clientIp: ip,
		});
	}

	return client;
}
