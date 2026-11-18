import { NODE_COLOR_FIELDS } from '../graph-node-colors';
import type { Language } from '../i18n';
import type { GraphqlObject } from '../schema';
import type {
	BuilderField,
	BuilderFilterOperator,
	BuilderSchema,
} from './schema';

export interface Filter {
	field: string;
	op: string;
	value: string;
}

export interface Selection {
	fields: Record<string, Selection>;
	filters: Filter[];
	sort?: { field: string; direction: 'ASC' | 'DESC' };
	limit?: number;
}

export const FRAGMENT_PREFIX = '... on ';

const INDENT = '  ';

export function createSelection(field?: BuilderField): Selection {
	return {
		fields: {},
		filters: [],
		limit: field?.isList && field.hasLimit ? 10 : undefined,
	};
}

const LABEL_FIELDS = ['name', 'label', 'nickname', 'title', 'note'];

/**
 * Preselects the first field that `getObjectLabel` would draw as the node
 * label, preferring `name_en` over `name` for English, and the field that
 * decides its color in the graph.
 */
export function createNodeSelection(
	schema: BuilderSchema,
	field: BuilderField,
	lang: Language,
): Selection {
	if (!field.isNode) return createSelection(field);

	const names = new Set(schema.types[field.type].fields.map((f) => f.name));
	const candidates =
		lang === 'en' ? ['name_en', ...LABEL_FIELDS] : LABEL_FIELDS;
	const preselected = [
		candidates.find((name) => names.has(name)),
		NODE_COLOR_FIELDS.get(field.type),
	].filter((name) => name && names.has(name));

	return {
		...createSelection(field),
		fields: Object.fromEntries(
			preselected.map((name) => [name, createSelection()]),
		),
	};
}

/**
 * Every object gets `__typename` and `id`, so the response can be drawn as a
 * graph.
 */
export function buildQuery(
	schema: BuilderSchema,
	root: BuilderField,
	selection: Selection,
) {
	return `query {\n${printField(schema, root, selection, 1).join('\n')}\n}`;
}

function printField(
	schema: BuilderSchema,
	field: BuilderField,
	selection: Selection,
	depth: number,
): string[] {
	const indent = INDENT.repeat(depth);
	const where = field.where && printWhere(schema, field.where, selection);
	const args = [
		where && `where: ${where}`,
		field.sort &&
			selection.sort &&
			`sort: [{ ${selection.sort.field}: ${selection.sort.direction} }]`,
		field.hasLimit &&
			selection.limit !== undefined &&
			`limit: ${selection.limit}`,
	].filter(Boolean);

	return [
		`${indent}${field.name}${args.length ? `(${args.join(', ')})` : ''} {`,
		`${indent}${INDENT}__typename`,
		...printSelectionSet(schema, field.type, selection, depth + 1),
		`${indent}}`,
	];
}

function printSelectionSet(
	schema: BuilderSchema,
	typename: string,
	selection: Selection,
	depth: number,
): string[] {
	const indent = INDENT.repeat(depth);
	const type = schema.types[typename];
	const hasId = hasIdField(schema, typename);

	const fields = type.fields.flatMap((field) => {
		const child = selection.fields[field.name];

		if (field.name === 'id' || !child) return [];

		return field.isNode
			? printField(schema, field, child, depth)
			: [`${indent}${field.name}`];
	});

	const fragments = type.possibleTypes.flatMap((possibleType) => {
		const child = selection.fields[`${FRAGMENT_PREFIX}${possibleType}`];

		if (!child && (hasId || !hasIdField(schema, possibleType))) return [];

		return [
			`${indent}${FRAGMENT_PREFIX}${possibleType} {`,
			...printSelectionSet(
				schema,
				possibleType,
				child ?? createSelection(),
				depth + 1,
			),
			`${indent}}`,
		];
	});

	return [...(hasId ? [`${indent}id`] : []), ...fields, ...fragments];
}

export function hasIdField(schema: BuilderSchema, typename: string) {
	return schema.types[typename].fields.some(({ name }) => name === 'id');
}

function printWhere(
	schema: BuilderSchema,
	whereType: string,
	{ filters }: Selection,
) {
	const conditions = (schema.filters[whereType] ?? []).flatMap(
		({ field, ops }) => {
			const values = filters.flatMap((filter) => {
				const op = ops.find(({ name }) => name === filter.op);

				return filter.field === field && op && filter.value.trim()
					? [`${op.name}: ${toLiteral(schema, op, filter.value)}`]
					: [];
			});

			return values.length ? [`${field}: { ${values.join(', ')} }`] : [];
		},
	);

	return conditions.length ? `{ ${conditions.join(', ')} }` : undefined;
}

function toLiteral(
	schema: BuilderSchema,
	op: BuilderFilterOperator,
	value: string,
): string {
	if (op.isList) {
		const items = value
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean)
			.map((item) => toLiteral(schema, { ...op, isList: false }, item));

		return `[${items.join(', ')}]`;
	}

	const trimmed = value.trim();

	if (op.type === 'Int' || op.type === 'Float') return String(Number(trimmed));
	if (op.type === 'Boolean' || schema.enums[op.type]) return trimmed;

	return JSON.stringify(trimmed);
}

/**
 * Turn the selection into graph nodes, one per selected type, with the
 * selected properties showing their type in the same order as the query.
 */
export function toStructureNode(
	schema: BuilderSchema,
	typename: string,
	selection: Selection,
	path = typename,
): GraphqlObject {
	const type = schema.types[typename];

	const fields = type.fields.flatMap((field) => {
		const child = selection.fields[field.name];

		if (field.name === 'id' || !child) return [];

		return [
			[
				field.name,
				field.isNode
					? toStructureNode(schema, field.type, child, `${path}.${field.name}`)
					: `${field.type}${field.isList ? '[]' : ''}`,
			],
		];
	});

	const fragments = type.possibleTypes.flatMap((possibleType) => {
		const key = `${FRAGMENT_PREFIX}${possibleType}`;
		const child = selection.fields[key];

		return child
			? [[key, toStructureNode(schema, possibleType, child, `${path}.${key}`)]]
			: [];
	});

	return {
		__typename: typename,
		id: path,
		...Object.fromEntries([...fields, ...fragments]),
	};
}
