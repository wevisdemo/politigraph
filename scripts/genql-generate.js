import { generate } from '@genql/cli';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { getGraphqlTypeDefs } from '../utils/graphql-schema.js';

const typeDefs = getGraphqlTypeDefs();

const schema = await new Neo4jGraphQL({
	typeDefs,
}).getSchema();

generate({
	schema: printSchemaWithDirectives(schema),
	output: '.genql',
}).catch(console.error);
