import { parseGraphQLSDL } from '@graphql-tools/utils';
import { getGraphqlTypeDefs } from '~/utils/graphql/schema';

export default defineEventHandler(parseSimpleGraphSchema);

export type GraphSchema = ReturnType<typeof parseSimpleGraphSchema>;
export type SchemaNode = GraphSchema[keyof GraphSchema][number];

function parseSimpleGraphSchema() {
	const { definitions } = parseGraphQLSDL(
		undefined,
		getGraphqlTypeDefs(),
	).document;

	const objects = definitions
		.filter((d) => d.kind === 'ObjectTypeDefinition')
		.filter((d) => !d.name.value.startsWith('Relation'))
		.map((d) => ({
			name: d.name.value,
			description: d.description?.value,
			interfaces: d.interfaces?.map((i) => i.name.value) ?? [],
			fields: parseNodeFields(d.fields),
		}));

	const unions = definitions
		.filter((d) => d.kind === 'UnionTypeDefinition')
		.map((d) => ({
			name: d.name.value,
			description: d.description?.value,
			types: d.types?.map((t) => t.name.value) ?? [],
		}));

	const interfaces = definitions
		.filter((d) => d.kind === 'InterfaceTypeDefinition')
		.map((d) => ({
			name: d.name.value,
			description: d.description?.value,
			fields: parseNodeFields(d.fields),
		}));

	const enums = definitions
		.filter((n) => n.kind === 'EnumTypeDefinition')
		.map((d) => ({
			name: d.name.value,
			description: d.description?.value,
			values:
				d.values?.map((v) => ({
					name: v.name.value,
					description: v.description?.value,
				})) ?? [],
		}));

	return {
		objects,
		unions,
		interfaces,
		enums,
	};
}

function parseNodeFields(
	fields?: readonly {
		type: any;
		directives?: readonly any[];
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
	/* @ts-expect-error */
	return args.find((a) => a.name.value === name)?.value.value;
}
