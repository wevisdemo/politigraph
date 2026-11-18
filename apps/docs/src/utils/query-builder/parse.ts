import {
	Kind,
	parse,
	type FieldNode,
	type SelectionSetNode,
	type ValueNode,
} from 'graphql';
import {
	createSelection,
	FRAGMENT_PREFIX,
	hasIdField,
	type Filter,
	type Selection,
} from './query';
import type { BuilderField, BuilderSchema } from './schema';

const unsupported = (message: string) => new Error(message);

/**
 * The inverse of `buildQuery`: read a query written by hand back into the
 * builder's state. Anything the builder cannot express is rejected rather
 * than silently dropped.
 */
export function parseQuery(schema: BuilderSchema, source: string) {
	const { definitions } = parse(source);
	const [operation] = definitions;

	if (
		definitions.length !== 1 ||
		operation.kind !== Kind.OPERATION_DEFINITION ||
		operation.operation !== 'query' ||
		operation.variableDefinitions?.length ||
		operation.directives?.length
	) {
		throw unsupported('Only a single query without variables is supported');
	}

	const [node, ...others] = operation.selectionSet.selections;

	if (node.kind !== Kind.FIELD || others.length) {
		throw unsupported('Only one starting node is supported');
	}

	const root = schema.roots.find(({ name }) => name === node.name.value);

	if (!root) throw unsupported(`${node.name.value} is not a starting node`);

	return { root, selection: parseField(schema, root, node) };
}

export function canParseQuery(schema: BuilderSchema, source: string) {
	try {
		parseQuery(schema, source);
		return true;
	} catch {
		return false;
	}
}

function parseField(
	schema: BuilderSchema,
	field: BuilderField,
	node: FieldNode,
): Selection {
	if (node.alias || node.directives?.length) {
		throw unsupported(
			`Aliases and directives are not supported (${field.name})`,
		);
	}

	if (!node.selectionSet) {
		throw unsupported(`${field.name} needs a selection`);
	}

	return {
		...parseArguments(schema, field, node),
		fields: parseSelectionSet(schema, field.type, node.selectionSet),
	};
}

function parseSelectionSet(
	schema: BuilderSchema,
	typename: string,
	{ selections }: SelectionSetNode,
): Record<string, Selection> {
	const type = schema.types[typename];

	return Object.fromEntries(
		selections.flatMap((node) => {
			if (node.kind === Kind.FRAGMENT_SPREAD) {
				throw unsupported('Named fragments are not supported');
			}

			if (node.directives?.length) {
				throw unsupported('Directives are not supported');
			}

			if (node.kind === Kind.INLINE_FRAGMENT) {
				const name = node.typeCondition?.name.value;

				if (!name || !type.possibleTypes.includes(name)) {
					throw unsupported(`Cannot select ... on ${name} in ${typename}`);
				}

				return [
					[
						`${FRAGMENT_PREFIX}${name}`,
						{
							...createSelection(),
							fields: parseSelectionSet(schema, name, node.selectionSet),
						},
					],
				];
			}

			const name = node.name.value;

			if (
				name === '__typename' ||
				(name === 'id' && hasIdField(schema, typename))
			) {
				return [];
			}

			const field = type.fields.find((field) => field.name === name);

			if (!field) throw unsupported(`${typename}.${name} is not available`);

			if (field.isNode) return [[name, parseField(schema, field, node)]];

			if (node.selectionSet || node.arguments?.length) {
				throw unsupported(
					`${typename}.${name} cannot have a selection or arguments`,
				);
			}

			return [[name, createSelection()]];
		}),
	);
}

function parseArguments(
	schema: BuilderSchema,
	field: BuilderField,
	{ arguments: args = [] }: FieldNode,
): Pick<Selection, 'filters' | 'sort' | 'limit'> {
	const values = new Map(args.map(({ name, value }) => [name.value, value]));
	const unknown = [...values.keys()].find(
		(name) => !['where', 'sort', 'limit'].includes(name),
	);

	if (unknown) throw unsupported(`The ${unknown} argument is not supported`);

	const where = values.get('where');
	const sort = values.get('sort');
	const limit = values.get('limit');

	if (
		(where && !field.where) ||
		(sort && !field.sort) ||
		(limit && !field.hasLimit)
	) {
		throw unsupported(`${field.name} does not accept these arguments`);
	}

	return {
		filters: where ? parseWhere(schema, field.where!, where) : [],
		sort: sort ? parseSort(schema, field.sort!, sort) : undefined,
		limit: limit ? parseLimit(limit) : undefined,
	};
}

function parseWhere(
	schema: BuilderSchema,
	whereType: string,
	node: ValueNode,
): Filter[] {
	if (node.kind !== Kind.OBJECT) throw unsupported('where must be an object');

	return node.fields.flatMap(({ name, value }) => {
		const filter = schema.filters[whereType].find(
			({ field }) => field === name.value,
		);

		if (!filter || value.kind !== Kind.OBJECT) {
			throw unsupported(`Filtering by ${name.value} is not supported`);
		}

		return value.fields.map((opNode) => {
			const op = filter.ops.find(({ name }) => name === opNode.name.value);

			if (!op) {
				throw unsupported(
					`${name.value} does not support ${opNode.name.value}`,
				);
			}

			return {
				field: name.value,
				op: op.name,
				value:
					op.isList && opNode.value.kind === Kind.LIST
						? opNode.value.values.map(toFilterValue).join(', ')
						: toFilterValue(opNode.value),
			};
		});
	});
}

function toFilterValue(node: ValueNode): string {
	switch (node.kind) {
		case Kind.STRING:
			if (node.value.includes(',')) {
				throw unsupported('Values containing a comma are not supported');
			}
			return node.value;
		case Kind.INT:
		case Kind.FLOAT:
		case Kind.ENUM:
			return node.value;
		case Kind.BOOLEAN:
			return String(node.value);
		default:
			throw unsupported('Only literal filter values are supported');
	}
}

function parseSort(
	schema: BuilderSchema,
	sortType: string,
	node: ValueNode,
): NonNullable<Selection['sort']> {
	const entry =
		node.kind === Kind.LIST && node.values.length === 1 ? node.values[0] : node;

	if (entry.kind !== Kind.OBJECT || entry.fields.length !== 1) {
		throw unsupported('Only sorting by one property is supported');
	}

	const [{ name, value }] = entry.fields;

	if (
		!schema.sorts[sortType].includes(name.value) ||
		value.kind !== Kind.ENUM ||
		(value.value !== 'ASC' && value.value !== 'DESC')
	) {
		throw unsupported(`Cannot sort by ${name.value}`);
	}

	return { field: name.value, direction: value.value };
}

function parseLimit(node: ValueNode) {
	if (node.kind !== Kind.INT) throw unsupported('limit must be a number');

	return Number(node.value);
}
