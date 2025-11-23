import { staticPlugin } from '@elysiajs/static';
import { auth } from '@politigraph/auth/auth';
import { initNeo4jGraphql } from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import logixlysia from 'logixlysia';
import { apollo } from './apollo';

const isProduction = process.env.NODE_ENV === 'production';
const landingSpa = Bun.file('public/index.html');
const port = process.env.PORT ?? 3000;
const origin = `http://127.0.0.1:${port}`;

const neo4jGraphql = initNeo4jGraphql(`${origin}/auth/jwks`);
const schema = await neo4jGraphql.getSchema();
await neo4jGraphql.checkNeo4jCompat();
await neo4jGraphql.assertIndexesAndConstraints();

const app = new Elysia()
	.use(
		logixlysia({
			config: {
				showStartupMessage: true,
				startupMessageFormat: 'simple',
				logFilter: {
					level: isProduction ? 'WARNING' : 'DEBUG',
				},
			},
		}),
	)
	.use(
		apollo({
			schema,
			allowBatchedHttpRequests: true,
			introspection: true,
			context: async ({ request: { headers } }: Context) => {
				const apiKey = headers.get('x-api-key');
				const cookie = headers.get('cookie');

				if (!apiKey && !cookie) return;

				const res = await fetch(`${origin}/auth/token`, {
					headers: apiKey
						? {
								'x-api-key': apiKey,
							}
						: ({ cookie } as { cookie: string }),
				});

				if (res.ok) {
					return res.json();
				}
			},
		}),
	)
	.all('/auth/*', (ctx) => auth.handler(ctx.request));

if (await landingSpa.exists()) {
	app
		.use(
			staticPlugin({
				prefix: '/',
				alwaysStatic: true,
			}),
		)
		.get('/', () => landingSpa)
		.onError(({ code, path, set }) => {
			// Bun SPA Workaround https://github.com/elysiajs/elysia/issues/1515#issuecomment-3521899834
			if (code === 'NOT_FOUND' && !path.startsWith('/auth/')) {
				set.status = 200;
				return landingSpa;
			}
		});
}

app.listen(port);
