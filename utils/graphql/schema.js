import { readdirSync, readFileSync } from 'fs';

const SCHEMAS_DIR = 'schemas';

export function getGraphqlTypeDefs() {
	return readdirSync(SCHEMAS_DIR, { recursive: true })
		.filter((file) => file.endsWith('.graphql'))
		.map((schemaFile) => readFileSync(`${SCHEMAS_DIR}/${schemaFile}`, 'utf-8'))
		.join('\n');
}
