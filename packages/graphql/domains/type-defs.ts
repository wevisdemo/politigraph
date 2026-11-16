import { join } from 'node:path';
import {
	Kind,
	parse,
	print,
	visit,
	type ConstValueNode,
	type FieldDefinitionNode,
	type InterfaceTypeDefinitionNode,
	type ObjectTypeDefinitionNode,
} from 'graphql';
import { anonymousFilters } from '../support/anonymous-filters';
import { PARLIAMENT_WATCH_ID_NOTES } from '../support/parliament-watch';
import { TIMESTAMP_FIELD_NOTE, TIMESTAMP_FIELDS } from '../support/summary';
import { toValueNode } from '../support/to-value-node';

export async function getGraphqlTypeDefs(schemaDir = __dirname) {
	const schemaFiles = (
		await Array.fromAsync(new Bun.Glob('**/*.graphql').scan(schemaDir))
	).toSorted();

	const schemas = await Promise.all(
		schemaFiles.map((schemaFile) =>
			Bun.file(join(schemaDir, schemaFile)).text(),
		),
	);

	return noteFields(schemas.join('\n'));
}

type TypeDefinition = ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode;

function noteFields(typeDefs: string) {
	const noteType = <T extends TypeDefinition>(type: T): T => ({
		...type,
		fields: type.fields?.map((field) => {
			const note = getFieldNote(type.name.value, field);

			return note ? withNote(field, note) : field;
		}),
	});

	return print(
		visit(parse(typeDefs), {
			ObjectTypeDefinition: (type) => withAnonymousFilter(noteType(type)),
			InterfaceTypeDefinition: noteType,
		}),
	);
}

function withAnonymousFilter(type: ObjectTypeDefinitionNode) {
	const filter = anonymousFilters[type.name.value];

	if (!filter) return type;

	return {
		...type,
		directives: [
			...(type.directives ?? []),
			{
				kind: Kind.DIRECTIVE,
				name: { kind: Kind.NAME, value: 'authorization' },
				arguments: [
					{
						kind: Kind.ARGUMENT,
						name: { kind: Kind.NAME, value: 'filter' },
						value: toValueNode([
							{ where: {} },
							{ requireAuthentication: false, where: { node: filter } },
						]) as ConstValueNode,
					},
				],
			},
		],
	} satisfies ObjectTypeDefinitionNode;
}

function getFieldNote(typeName: string, field: FieldDefinitionNode) {
	if (TIMESTAMP_FIELDS.includes(field.name.value)) {
		return TIMESTAMP_FIELD_NOTE;
	}

	return field.name.value === 'id'
		? PARLIAMENT_WATCH_ID_NOTES[typeName]
		: undefined;
}

const withNote = (
	field: FieldDefinitionNode,
	note: string,
): FieldDefinitionNode => ({
	...field,
	description: {
		kind: Kind.STRING,
		block: true,
		value: field.description ? `${field.description.value} (${note})` : note,
	},
});
