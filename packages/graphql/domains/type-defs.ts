import { join } from 'node:path';
import { Kind, parse, print, visit } from 'graphql';
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

	return noteTimestampFields(schemas.join('\n'));
}

function noteTimestampFields(typeDefs: string) {
	return print(
		visit(parse(typeDefs), {
			FieldDefinition(field) {
				if (!field.directives?.some(({ name }) => name.value === 'timestamp')) {
					return undefined;
				}

				return {
					...field,
					description: {
						kind: Kind.STRING,
						block: true,
						value: field.description
							? `${field.description.value} (${TIMESTAMP_FIELD_NOTE})`
							: TIMESTAMP_FIELD_NOTE,
					},
				};
			},
		}),
	);
}
