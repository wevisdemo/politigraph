import { readdir } from 'node:fs/promises';

const SCHEMAS_DIR = 'schemas';

export async function getGraphqlTypeDefs() {
	const schemaFiles = (await readdir(SCHEMAS_DIR, { recursive: true })).filter(
		(file) => (file as string).endsWith('.graphql'),
	);

	const schemas = await Promise.all(
		schemaFiles.map((schemaFile) =>
			Bun.file(`${SCHEMAS_DIR}/${schemaFile}`).text(),
		),
	);

	return schemas.join('\n');
}

export async function getGraphqlCreateIndexQueries() {
	return (await Bun.file(`${SCHEMAS_DIR}/indexes.cypher`).text())
		.split(';')
		.map((query) => query.trim())
		.filter((query) => query);
}
