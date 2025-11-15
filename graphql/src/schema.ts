import { join } from 'node:path';
import { Glob } from 'bun';

const defaultSchemaDir = join(__dirname, '../schemas');

export async function getGraphqlTypeDefs(schemaDir = defaultSchemaDir) {
	const schemaFilesGlob = new Glob('**/*.graphql').scan(schemaDir);

	const schemaFiles: string[] = [];

	for await (const file of schemaFilesGlob) {
		schemaFiles.push(file);
	}

	const schemas = await Promise.all(
		schemaFiles.map((schemaFile) =>
			Bun.file(join(schemaDir, schemaFile)).text(),
		),
	);

	return schemas.join('\n');
}

export async function getGraphqlCreateIndexQueries(
	schemaDir = defaultSchemaDir,
) {
	return (await Bun.file(join(schemaDir, 'indexes.cypher')).text())
		.split(';')
		.map((query) => query.trim())
		.filter((query) => query);
}
