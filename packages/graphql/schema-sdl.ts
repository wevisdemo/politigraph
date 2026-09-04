import {
	Kind,
	parse,
	print,
	type DefinitionNode,
	type TypeDefinitionNode,
} from 'graphql';
// @ts-expect-error graphql import with type assertion
import typeDefs from './dist/typedefs.graphql' with { type: 'text' };

const KIND_LABELS = new Map<TypeDefinitionNode['kind'], string>([
	[Kind.OBJECT_TYPE_DEFINITION, 'type'],
	[Kind.INTERFACE_TYPE_DEFINITION, 'interface'],
	[Kind.UNION_TYPE_DEFINITION, 'union'],
	[Kind.ENUM_TYPE_DEFINITION, 'enum'],
	[Kind.INPUT_OBJECT_TYPE_DEFINITION, 'input'],
	[Kind.SCALAR_TYPE_DEFINITION, 'scalar'],
]);

const isTypeDefinition = (
	definition: DefinitionNode,
): definition is TypeDefinitionNode =>
	KIND_LABELS.has(definition.kind as TypeDefinitionNode['kind']);

export const schemaSdl: string = typeDefs;

export const typeDefinitions = new Map(
	parse(schemaSdl)
		.definitions.filter(isTypeDefinition)
		.map((definition) => [definition.name.value, definition]),
);

export function listTypes() {
	return [...typeDefinitions.values()].map((definition) => ({
		name: definition.name.value,
		kind: KIND_LABELS.get(definition.kind)!,
		description: definition.description?.value.split('\n')[0],
	}));
}

export function getTypeSdl(name: string) {
	const definition = typeDefinitions.get(name);

	return definition ? print(definition) : undefined;
}
