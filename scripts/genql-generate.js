import { readFile } from 'fs/promises';
import { generate } from '@genql/cli';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';

const typeDefs = await readFile('schemas/politic.graphql', {
	encoding: 'utf-8',
});

const schema = await new Neo4jGraphQL({
	typeDefs,
}).getSchema();

generate({
	schema: printSchemaWithDirectives(schema),
	output: '.genql',
}).catch(console.error);
