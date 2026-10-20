import { join } from 'node:path';

export async function getGraphqlTypeDefs(schemaDir = __dirname) {
	const schemaFiles = (
		await Array.fromAsync(new Bun.Glob('**/*.graphql').scan(schemaDir))
	).toSorted();

	const schemas = await Promise.all(
		schemaFiles.map((schemaFile) =>
			Bun.file(join(schemaDir, schemaFile)).text(),
		),
	);

	return schemas.join('\n');
}
