import {
	getNamedType,
	getOperationAST,
	GraphQLError,
	isInputObjectType,
	isInterfaceType,
	isListType,
	isNonNullType,
	isObjectType,
	TypeInfo,
	valueFromASTUntyped,
	visit,
	visitWithTypeInfo,
	type DocumentNode,
	type GraphQLInputObjectType,
	type GraphQLInputType,
	type GraphQLSchema,
} from 'graphql';
import { anonymousFilters } from './anonymous-filters';
import { toValueNode } from './to-value-node';

type Value = Record<string, unknown>;

const LOGICAL_KEYS = ['AND', 'OR', 'NOT'];

function getGuard(
	schema: GraphQLSchema,
	type: GraphQLInputObjectType,
): unknown {
	if (type.name.endsWith('ConnectionWhere')) {
		const nodeType = type.getFields().node?.type;
		const named = nodeType && getNamedType(nodeType);
		const nodeGuard = isInputObjectType(named)
			? getGuard(schema, named)
			: undefined;

		return nodeGuard && { node: nodeGuard };
	}

	const source = schema.getType(type.name.replace(/Where$/, ''));
	const objects = isObjectType(source)
		? [source]
		: isInterfaceType(source)
			? schema.getImplementations(source).objects
			: [];
	const filters = [
		...new Map(
			objects.flatMap(({ name }) =>
				anonymousFilters[name]
					? [[JSON.stringify(anonymousFilters[name]), anonymousFilters[name]]]
					: [],
			),
		).values(),
	];

	return filters.length > 1 ? { OR: filters } : filters[0];
}

function createRewriter(schema: GraphQLSchema) {
	function rewriteFilter(
		value: unknown,
		type: GraphQLInputType,
		universal: boolean,
		unguarded = false,
	): unknown {
		if (value === null || value === undefined) return value;
		if (isNonNullType(type))
			return rewriteFilter(value, type.ofType, universal, unguarded);
		if (isListType(type))
			return [value]
				.flat()
				.map((item) => rewriteFilter(item, type.ofType, universal, unguarded));
		if (!isInputObjectType(type)) return value;

		const rewritten = rewriteFields(value as Value, type, universal);
		const guard = unguarded ? undefined : getGuard(schema, type);

		if (!guard) return rewritten;

		return universal
			? { OR: [{ NOT: guard }, rewritten] }
			: { AND: [rewritten, guard] };
	}

	function rewriteFields(
		value: Value,
		type: GraphQLInputObjectType,
		universal: boolean,
	): Value {
		const fields = type.getFields();
		const isUnion = !('AND' in fields);
		const isConnection = type.name.endsWith('ConnectionWhere');

		const rewriteLogical = (item: unknown): unknown =>
			Array.isArray(item)
				? item.map(rewriteLogical)
				: item && rewriteFields(item as Value, type, false);

		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => {
				const field = fields[key];

				if (!field) return [key, item];

				if (key === 'aggregate')
					throw new GraphQLError(
						'Aggregate filters on relationships are only available to authenticated users',
						{ extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } },
					);

				if (LOGICAL_KEYS.includes(key)) return [key, rewriteLogical(item)];

				return [
					key,
					rewriteFilter(
						item,
						field.type,
						key === 'all' || (universal && isUnion),
						isConnection && key === 'node',
					),
				];
			}),
		);
	}

	return rewriteFields;
}

/**
 * Restricts nodes reached through relationships in `where` arguments to what the anonymous
 * caller may see, which `@authorization` does not cover. Variables in `where` are inlined.
 */
export function hideUnpublishedInFilters(
	schema: GraphQLSchema,
	document: DocumentNode,
	variables: Readonly<Record<string, unknown>> | null | undefined,
	operationName?: string | null,
): DocumentNode {
	const defaults = Object.fromEntries(
		(
			getOperationAST(document, operationName)?.variableDefinitions ?? []
		).flatMap(({ variable, defaultValue }) =>
			defaultValue
				? [[variable.name.value, valueFromASTUntyped(defaultValue)]]
				: [],
		),
	);
	const values = { ...defaults, ...variables };
	const typeInfo = new TypeInfo(schema);
	const rewriteFields = createRewriter(schema);

	return visit(
		document,
		visitWithTypeInfo(typeInfo, {
			Argument: (node) => {
				const argument = typeInfo.getArgument();
				const type =
					argument && isNonNullType(argument.type)
						? argument.type.ofType
						: argument?.type;
				const value = valueFromASTUntyped(node.value, values);

				if (
					argument?.name !== 'where' ||
					!isInputObjectType(type) ||
					value === undefined ||
					value === null
				)
					return;

				return {
					...node,
					value: toValueNode(
						rewriteFields(value as Value, type, false),
						argument.type,
					),
				};
			},
		}),
	);
}
