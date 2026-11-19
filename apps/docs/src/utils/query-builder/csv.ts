import { toRelatedNodes, type GraphqlObject } from '../schema';

type Cell = GraphqlObject[string] | number | boolean | undefined;

interface Entry {
	type: string;
	row: Record<string, string>;
}

const BOM = String.fromCharCode(0xfeff);

const isObject = (value: unknown) => typeof value === 'object' && !!value;

const isRelation = (value: Cell) =>
	Array.isArray(value) ? value.every(isObject) : isObject(value);

const toCell = (value: Cell) =>
	value == null
		? ''
		: typeof value === 'object'
			? JSON.stringify(value)
			: String(value);

const escapeCell = (cell: string) =>
	/[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;

function flatten(node: GraphqlObject, parent?: GraphqlObject): Entry[] {
	const fields = Object.entries(node).filter(([name]) => name !== '__typename');

	return [
		{
			type: node.__typename,
			row: {
				...(parent && { [`${parent.__typename}_id`]: parent.id }),
				...Object.fromEntries(
					fields
						.filter(([, value]) => !isRelation(value))
						.map(([name, value]) => [name, toCell(value)]),
				),
			},
		},
		...fields
			.filter(([, value]) => isRelation(value))
			.flatMap(([, value]) =>
				toRelatedNodes(value).flatMap((child) => flatten(child, node)),
			),
	];
}

function toCsv(rows: Entry['row'][]) {
	const headers = [...new Set(rows.flatMap(Object.keys))];

	return [
		headers.map(escapeCell).join(','),
		...rows.map((row) =>
			headers.map((header) => escapeCell(row[header] ?? '')).join(','),
		),
	].join('\r\n');
}

/**
 * One CSV per node type, named after the type. Nested nodes get a
 * `<ParentType>_id` column pointing at the parent row, and a node reached from
 * several parents gets one row per parent.
 */
export function toCsvFiles(nodes: GraphqlObject[]) {
	const byType = Object.groupBy(
		nodes.flatMap((node) => flatten(node)),
		(entry) => entry.type,
	);

	return Object.fromEntries(
		Object.entries(byType).map(([type, entries]) => [
			`${type}.csv`,
			BOM + toCsv(entries!.map(({ row }) => row)),
		]),
	);
}
