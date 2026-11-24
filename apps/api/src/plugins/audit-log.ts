import type { ApolloServerPlugin, BaseContext } from '@apollo/server';
import { db } from '@politigraph/auth/db';
import { auditLogs } from '@politigraph/auth/schema/audit';
import {
	Kind,
	valueFromASTUntyped,
	type DocumentNode,
	type FieldNode,
	type FragmentDefinitionNode,
	type OperationDefinitionNode,
	type SelectionNode,
} from 'graphql';

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';

const idValues = (value: unknown): string[] =>
	(isObject(value) ? [value.eq, value.in].flat() : [value]).filter(isString);

const collectIds = (value: unknown): string[] =>
	Array.isArray(value)
		? value.flatMap(collectIds)
		: isObject(value)
			? Object.entries(value).flatMap(([key, child]) => [
					...(key === 'id' ? idValues(child) : []),
					...collectIds(child),
				])
			: [];

const rootFields = (
	selections: readonly SelectionNode[],
	fragments: Map<string, FragmentDefinitionNode>,
): FieldNode[] =>
	selections.flatMap((selection) =>
		selection.kind === Kind.FIELD
			? [selection]
			: rootFields(
					selection.kind === Kind.INLINE_FRAGMENT
						? selection.selectionSet.selections
						: (fragments.get(selection.name.value)?.selectionSet.selections ??
								[]),
					fragments,
				),
	);

/**
 * Arguments are resolved by name but left as the client sent them, since
 * `getArgumentValues` would coerce scalars such as `Date` into Neo4j driver objects
 * @returns each root field (by name, not alias) with its arguments, and every node id in the arguments and the response data
 */
export function getAuditEntry(
	document: DocumentNode,
	operation: OperationDefinitionNode,
	variables: Record<string, unknown> | undefined,
	data: unknown,
) {
	const fragments = new Map(
		document.definitions
			.filter((node) => node.kind === Kind.FRAGMENT_DEFINITION)
			.map((node) => [node.name.value, node]),
	);

	const changes = rootFields(operation.selectionSet.selections, fragments)
		.filter((field) => field.name.value !== '__typename')
		.map((field) => ({
			field: field.name.value,
			args: Object.fromEntries(
				(field.arguments ?? []).map((arg) => [
					arg.name.value,
					valueFromASTUntyped(arg.value, variables),
				]),
			),
		}));

	return {
		changes,
		nodeIds: [...new Set([...collectIds(changes), ...collectIds(data)])],
	};
}

const getClaims = (token: string): { sub: string; sid?: string } =>
	JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString());

export const auditLogPlugin: ApolloServerPlugin<BaseContext> = {
	async requestDidStart({ request, contextValue }) {
		const { token } = contextValue as { token?: unknown };
		if (!isString(token)) return;

		const via = request.http?.headers.get('x-api-key') ? 'api_key' : 'session';

		return {
			async willSendResponse({ document, operation, operationName, response }) {
				if (!document || operation?.operation !== 'mutation') return;

				try {
					const result =
						response.body.kind === 'single'
							? response.body.singleResult
							: undefined;

					const { sub, sid } = getClaims(token);

					await db.insert(auditLogs).values({
						userId: sub,
						via,
						credentialId: sid,
						operationName,
						...getAuditEntry(
							document,
							operation,
							request.variables,
							result?.data,
						),
						errors:
							result?.errors?.map(({ message, path }) => ({ message, path })) ??
							null,
					});
				} catch (error) {
					console.error('Failed to write audit log', error);
				}
			},
		};
	},
};
