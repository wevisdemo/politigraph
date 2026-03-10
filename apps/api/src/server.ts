import { auth } from '@politigraph/auth/auth';
import { initNeo4jGraphql } from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import { apollo } from './apollo';
import { triggerPlausiblePageview } from './plausible';

const port = process.env.PORT ?? 3000;
const origin = `http://127.0.0.1:${port}`;

const neo4jGraphql = initNeo4jGraphql(`${origin}/auth/jwks`);
const schema = await neo4jGraphql.getSchema();
await neo4jGraphql.checkNeo4jCompat();
await neo4jGraphql.assertIndexesAndConstraints();

const app = new Elysia()
	.use(
		apollo({
			schema,
			allowBatchedHttpRequests: true,
			introspection: true,
			context: async ({ request: { headers } }: Context) => {
				const apiKey = headers.get('x-api-key');
				const cookie = headers.get('cookie');

				if (!apiKey && !cookie?.includes('better-auth.session_token')) return;

				const res = await auth.handler(
					new Request(`${origin}/auth/token`, {
						headers: apiKey
							? {
									'x-api-key': apiKey,
								}
							: ({ cookie } as { cookie: string }),
					}),
				);

				if (res.ok) {
					return res.json();
				}
			},
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
	.all('/auth/*', (ctx) => auth.handler(ctx.request));

if (process.env.NODE_ENV !== 'production') {
	app.use((await import('@elysiajs/cors')).cors());
}

app.listen(port);

console.log(`🦊 Elysia is running at http://localhost:${port}`);
