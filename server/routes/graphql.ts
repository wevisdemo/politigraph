import { ApolloServer } from '@apollo/server';
import { startServerAndCreateH3Handler } from '@as-integrations/h3';
import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j from 'neo4j-driver';
import { typeDefs } from '../../schemas/graph';

const driver = neo4j.driver(
	'neo4j://localhost:7687',
	neo4j.auth.basic(
		process.env.NEO4J_USERNAME as string,
		process.env.NEO4J_PASSWORD as string,
	),
);

const schema = await new Neo4jGraphQL({
	typeDefs,
	driver,
	features: {
		authorization: process.env.JWT_SECRET
			? {
					key: process.env.JWT_SECRET,
				}
			: undefined,
	},
}).getSchema();

export default startServerAndCreateH3Handler(
	new ApolloServer({
		schema,
	}),
	{
		context: async (req) => ({
			token: req.event.headers.get('authorization')?.replace('Bearer ', ''),
		}),
	},
);
