import { parseGraphQLSDL } from '@graphql-tools/utils';
import { getGraphqlTypeDefs } from '~/utils/graphql/schema';

export default defineEventHandler(parseSimpleGraphSchema);

export type GraphSchema = ReturnType<typeof parseSimpleGraphSchema>;
export type GraphEntity = GraphSchema[keyof GraphSchema][number];

function parseSimpleGraphSchema() {
	const { definitions } = parseGraphQLSDL(
		undefined,
		getGraphqlTypeDefs(),
	).document;

	const nodes = definitions
		.filter((n) => n.kind === 'ObjectTypeDefinition')
		.filter((n) => !n.name.value.startsWith('Relation'))
		.map((d) => ({
			name: d.name.value,
			description: d.description?.value,
			interfaces: d.interfaces?.map((i) => i.name.value) ?? [],
			fields:
				d.fields?.map((f) => {
					const type = extractFieldType(f.type)!;
					const rel = f.directives?.find(
						(d) => d.name.value === 'relationship',
					);

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
				}) ?? [],
		}));

	const unions = definitions
		.filter((n) => n.kind === 'UnionTypeDefinition')
		.map((d) => ({
			name: d.name.value,
			description: d.description?.value,
			types: d.types?.map((t) => t.name.value) ?? [],
		}));

	const interfaces = definitions
		.filter((n) => n.kind === 'InterfaceTypeDefinition')
		.map((d) => ({
			name: d.name.value,
			description: d.description?.value,
		}));

	return {
		nodes,
		unions,
		interfaces,
	};
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
