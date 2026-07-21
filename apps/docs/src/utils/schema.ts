import definitions from '@politigraph/graphql/dist/definitions.json';

export interface GraphqlObject {
	__typename: string;
	id: string;
	[key: string]: string | GraphqlObject[];
}

export type GraphqlDataResponse = Record<string, GraphqlObject[]>;

export const objects = definitions
	.filter((d) => d.kind === 'ObjectTypeDefinition')
	.filter((d) => !d.name!.value.startsWith('Relation'))
	.map((d) => ({
		name: d.name!.value,
		description: d.description?.value,
		interfaces: d.interfaces?.map((i) => i.name.value) ?? [],
		fields: parseNodeFields(d.fields),
	}));

export const unions = definitions
	.filter((d) => d.kind === 'UnionTypeDefinition')
	.map((d) => ({
		name: d.name!.value,
		description: d.description?.value,
		types: d.types?.map((t) => t.name.value) ?? [],
	}));

export const interfaces = definitions
	.filter((d) => d.kind === 'InterfaceTypeDefinition')
	.map((d) => ({
		name: d.name!.value,
		description: d.description?.value,
		fields: parseNodeFields(d.fields),
	}));

export const enums = definitions
	.filter((n) => n.kind === 'EnumTypeDefinition')
	.map((d) => ({
		name: d.name!.value,
		description: d.description?.value,
		values:
			d.values?.map((v) => ({
				name: v.name.value,
				description: v.description?.value,
			})) ?? [],
	}));

export type SchemaNode = (
	| typeof objects
	| typeof unions
	| typeof interfaces
	| typeof enums
)[number];

export const typenameSchemaMap = new Map(
	objects.map((obj) => [
		obj.name,
		{
			...obj,
			description: obj.description?.split('อ้างอิงจาก').at(0)?.trim(),
		},
	]),
);

export function getObjectLabel(
	obj: GraphqlObject,
	preferredLang: 'en' | 'th' = 'en',
) {
	const [name, option] =
		preferredLang === 'th'
			? [obj.name || obj.name_en, obj.option || obj.option_en]
			: [obj.name_en || obj.name, obj.option_en || obj.option];

	return (name ||
		obj.label ||
		obj.nickname ||
		obj.title ||
		obj.note ||
		option ||
		(obj.start_date
			? `${getShortDateString(obj.start_date)} - ${getShortDateString(obj.end_date)}`
			: '')) as string;
}

function getShortDateString(date: unknown) {
	return typeof date === 'string'
		? new Date(date).toLocaleDateString('TH-th', { dateStyle: 'short' })
		: 'now';
}

function parseNodeFields(
	fields?: readonly {
		type: unknown;
		directives?: readonly {
			name: { value: string };
			arguments?: readonly unknown[];
		}[];
		name: { value: string };
		description?: { value: string };
	}[],
) {
	return (
		fields?.map((f) => {
			const type = extractFieldType(f.type)!;
			const rel = f.directives?.find((d) => d.name.value === 'relationship');

			return {
				name: f.name.value,
				description: f.description?.value,
				type,
				relationship: rel?.arguments
					? {
							type: getArgumentValue(rel.arguments, 'type'),
							direction: getArgumentValue(rel.arguments, 'direction'),
						}
					: undefined,
			};
		}) ?? []
	);
}

function extractFieldType(obj: unknown, isRequired = false, hasMany = false) {
	if (obj && typeof obj === 'object') {
		if ('name' in obj) {
			return {
				isRequired,
				hasMany,
				name: (obj.name as { value: string }).value,
			};
		} else if ('kind' in obj && 'type' in obj) {
			return extractFieldType(
				obj.type,
				isRequired || obj.kind === 'NonNullType',
				hasMany || obj.kind === 'ListType',
			);
		}
	}

	return undefined;
}

function getArgumentValue(args: readonly unknown[], name: string): string {
	/* @ts-expect-error arg shape comes from graphql AST */
	return args.find((a) => a.name.value === name)?.value.value;
}
