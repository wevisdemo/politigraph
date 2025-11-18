import { watch } from 'node:fs';
import { exists, mkdir } from 'node:fs/promises';
import { parseArgs } from 'util';
import { generate } from '@genql/cli';
import {
	parseGraphQLSDL,
	printSchemaWithDirectives,
} from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { getGraphqlTypeDefs } from './schema';

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		watch: {
			type: 'boolean',
		},
	},
	allowPositionals: true,
});

if (values.watch) {
	console.log('Watching for schema changes...');

	const watcher = watch(
		`${import.meta.dir}/schema`,
		{ recursive: true },
		build,
	);

	process.on('SIGINT', () => {
		watcher.close();
		process.exit(0);
	});
} else {
	build();
}

async function build() {
	console.log('Building GraphQL artifacts...');

	const OUTDIR = 'dist';

	if (!exists(OUTDIR)) {
		mkdir(OUTDIR);
	}

	const typeDefs = await getGraphqlTypeDefs();
	const { definitions } = parseGraphQLSDL(undefined, typeDefs).document;

	await Bun.write(`${OUTDIR}/typedefs.graphql`, typeDefs);
	await Bun.write(`${OUTDIR}/definitions.json`, JSON.stringify(definitions));

	const schema = await new Neo4jGraphQL({
		typeDefs,
	}).getSchema();

	generate({
		schema: printSchemaWithDirectives(schema),
		output: 'genql',
	}).catch(console.error);
}
