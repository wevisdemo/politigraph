import { join } from 'node:path';

export async function getGraphqlTypeDefs(schemaDir = __dirname) {
	const schemaFilesGlob = new Bun.Glob('**/*.graphql').scan(schemaDir);

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
