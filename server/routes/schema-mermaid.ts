import { parseGraphQLSDL } from '@graphql-tools/utils';
import { getGraphqlTypeDefs } from '~/utils/graphql-schema';

export default defineEventHandler(async () => {
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

	return [
		'flowchart',
		// Node types
		...nodes.flatMap(({ name, description, fields, interfaces }) => [
			createBoxNode(name, description),
			...fields
				.filter((f) => f.relationship?.direction === 'IN')
				.map(
					({ type, relationship }) =>
						`${type.name}-- ${relationship?.type} -->${name}`,
				),
			...interfaces.map(
				(interfaceName) => `${name}-. inherit .->${interfaceName}`,
			),
		]),
		// Union types
		...unions.flatMap(({ name, types, description }) => [
			createBoxNode(name, description, 'Union'),
			`style ${name} fill:none`,
			...types.map((type) => `${type}-. is .->${name}`),
		]),
		// Interfaces types
		...interfaces.flatMap(({ name, description }) => [
			createBoxNode(name, description, 'Interface'),
			`style ${name} fill:none`,
		]),
	].join('\n');
});

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

function createBoxNode(name: string, description?: string, type?: string) {
	const shortDescription = description?.split('\n').at(0)?.split(' ').at(0);
	return `${name}["${type ? `_${type}_ ` : ''}**${name}**\n${shortDescription}"]`;
}
