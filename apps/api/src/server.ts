import { ApolloArmor } from '@escape.tech/graphql-armor';
import { auth } from '@politigraph/auth/auth';
import { serverConfig } from '@politigraph/config/server';
import {
	createNeo4jIndex,
	initNeo4jGraphql,
} from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import { MAX_QUERY_TOKENS } from './constants/graphql';
import { apollo } from './routes/graphql';
import { mcp } from './routes/mcp';
import { playground } from './routes/playground';
import { upload } from './routes/upload-image';
import { getJwtToken } from './utils/auth';
import { trackEvent } from './utils/plausible';
import { usagePlugin } from './utils/usage';

const port = serverConfig.port;
const origin = `http://127.0.0.1:${port}`;

const neo4jGraphql = initNeo4jGraphql(`${origin}/auth/jwks`);
const schema = await neo4jGraphql.getSchema();
await neo4jGraphql.checkNeo4jCompat();
await neo4jGraphql.assertIndexesAndConstraints();
await createNeo4jIndex();

const armor = new ApolloArmor({
	blockFieldSuggestion: {
		enabled: false,
	},
	costLimit: {
		enabled: false,
	},
	maxTokens: {
		n: MAX_QUERY_TOKENS,
	},
	// Docs explore center node queries use up to 91 aliases (Organization)
	maxAliases: {
		n: 120,
	},
	maxDepth: {
		n: 10,
	},
});

const { plugins: armorPlugins, ...armorProtection } = armor.protect();

const app = new Elysia()
	.use(
		apollo({
			schema,
			...armorProtection,
			plugins: [...armorPlugins, usagePlugin],
			allowBatchedHttpRequests: true,
			maxBatching: 5,
			introspection: true,
			context: async ({ request: { headers } }) =>
				(await getJwtToken(headers, origin)) ?? {},
			onLandingPageRequested: ({ request: { headers } }: Context) =>
				trackEvent({
					name: 'pageview',
					path: '/graphql',
					userAgent: headers.get('user-agent') ?? '',
					clientIp: headers.get('x-real-ip') ?? undefined,
				}),
		}),
	)
	.use(playground)
	.use(mcp(origin))
	.use(upload(origin))
	.all('/auth/*', (ctx) => auth.handler(ctx.request));

if (!serverConfig.isProduction) {
	app.use((await import('@elysiajs/cors')).cors());
}

app.listen(port);

console.log(`🦊 Elysia is running at http://localhost:${port}`);
