import { ApolloServer } from '@apollo/server';
import { startServerAndCreateH3Handler } from '@as-integrations/h3';
import { initGraphqlNeo4j } from '~/utils/graphql/neo4j';

const { neo4jgraphql } = await initGraphqlNeo4j();

export default startServerAndCreateH3Handler(
	new ApolloServer({
		schema: await neo4jgraphql.getSchema(),
		allowBatchedHttpRequests: true,
	}),
	{
		context: async ({ event: { headers } }) => {
			const res = await fetch('http://127.0.0.1:3000/auth/token', {
				headers: {
					cookie: headers.get('cookie') ?? '',
					'x-api-key': headers.get('x-api-key') ?? '',
				},
			});

			if (res.ok) {
				return res.json();
			}
		},
	},
);
