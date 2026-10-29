import { join } from 'node:path';
import {
	Kind,
	parse,
	print,
	visit,
	type FieldDefinitionNode,
	type InterfaceTypeDefinitionNode,
	type ObjectTypeDefinitionNode,
} from 'graphql';
import { PARLIAMENT_WATCH_ID_NOTES } from '../support/parliament-watch';
import { TIMESTAMP_FIELD_NOTE } from '../support/summary';

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
	const noteType = (type: TypeDefinition) => ({
		...type,
		fields: type.fields?.map((field) => {
			const note = getFieldNote(type.name.value, field);

			return note ? withNote(field, note) : field;
		}),
	});

	return print(
		visit(parse(typeDefs), {
			ObjectTypeDefinition: noteType,
			InterfaceTypeDefinition: noteType,
		}),
	);
}

function getFieldNote(typeName: string, field: FieldDefinitionNode) {
	if (field.directives?.some(({ name }) => name.value === 'timestamp')) {
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
