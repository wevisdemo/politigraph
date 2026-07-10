import { ApolloArmor } from '@escape.tech/graphql-armor';
import { auth } from '@politigraph/auth/auth';
import { serverConfig } from '@politigraph/config/server';
import { initNeo4jGraphql } from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import { apollo } from './routes/graphql';
import { upload } from './routes/upload-image';
import { getJwtToken } from './utils/auth';
import { triggerPlausiblePageview } from './utils/plausible';

const port = serverConfig.port;
const origin = `http://127.0.0.1:${port}`;

const neo4jGraphql = initNeo4jGraphql(`${origin}/auth/jwks`);
const schema = await neo4jGraphql.getSchema();
await neo4jGraphql.checkNeo4jCompat();
await neo4jGraphql.assertIndexesAndConstraints();

const armor = new ApolloArmor({
	blockFieldSuggestion: {
		enabled: false,
	},
	costLimit: {
		enabled: false,
	},
	maxAliases: {
		n: 10,
	},
	maxDepth: {
		n: 10,
	},
});

const app = new Elysia()
	.use(
		apollo({
			schema,
			...armor.protect(),
			allowBatchedHttpRequests: true,
			maxBatching: 5,
			introspection: true,
			context: async ({ request: { headers } }) =>
				(await getJwtToken(headers, origin)) ?? {},
			onLandingPageRequested: ({ server, request }: Context) => {
				const host = request.headers.get('host');

				if (host && !host.includes('localhost')) {
					triggerPlausiblePageview(
						request.headers.get('user-agent') ?? '',
						server?.requestIP(request)?.address ?? '',
					);
				}
			},
		}),
	)
	.use(upload(origin))
	.all('/auth/*', (ctx) => auth.handler(ctx.request));

if (!serverConfig.isProduction) {
	app.use((await import('@elysiajs/cors')).cors());
}

app.listen(port);

console.log(`🦊 Elysia is running at http://localhost:${port}`);
