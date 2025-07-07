import { ApolloServer } from '@apollo/server';
import { startServerAndCreateH3Handler } from '@as-integrations/h3';
import { ApolloArmor } from '@escape.tech/graphql-armor';
import { initGraphqlNeo4j } from '~/utils/graphql/neo4j';

const armor = new ApolloArmor({
	blockFieldSuggestion: {
		enabled: false,
	},
	costLimit: {
		maxCost: 50000,
	},
	maxDepth: {
		enabled: false,
	},
});

const { neo4jgraphql } = initGraphqlNeo4j();

export default startServerAndCreateH3Handler(
	new ApolloServer({
		schema: await neo4jgraphql.getSchema(),
		...armor.protect(),
		allowBatchedHttpRequests: true,
	}),
	{
		context: async ({ event: { headers } }) => {
			const token = headers.get('authorization')?.replace('Bearer ', '');

			if (token) {
				return { token };
			}

			const res = await fetch('http://localhost:3000/auth/token', {
				headers,
			});

			if (res.ok) {
				return res.json();
			}
		},
	},
);
