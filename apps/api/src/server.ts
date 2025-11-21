import { bearer } from '@elysiajs/bearer';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { auth, trustedOrigins } from '@politigraph/auth/auth';
import { schema } from '@politigraph/graphql/neo4j-graphql';
import { Elysia, type Context } from 'elysia';
import logixlysia from 'logixlysia';
import { apollo } from './apollo';

const port = process.env.PORT ?? 3000;
const landingSpa = Bun.file('public/index.html');
const ca = Bun.file('tls/ca.pem');
const cert = Bun.file('tls/cert.pem');
const key = Bun.file('tls/key.pem');

const isProduction = process.env.NODE_ENV === 'production';

const app = new Elysia({
	serve: {
		tls: {
			ca: (await ca.exists()) ? ca : undefined,
			cert: (await cert.exists()) ? cert : undefined,
			key: (await key.exists()) ? key : undefined,
		},
	},
})
	.use(
		logixlysia({
			config: {
				showStartupMessage: true,
				startupMessageFormat: 'simple',
				logFilter: {
					level: isProduction ? 'ERROR' : 'DEBUG',
				},
			},
		}),
	)
	.use(cors({ origin: trustedOrigins }))
	.use(
		apollo({
			schema,
			allowBatchedHttpRequests: true,
			introspection: true,
			context: async ({ request: { headers } }: Context) => {
				const apiKey = headers.get('x-api-key');
				const cookie = headers.get('cookie');

				if (!apiKey && !cookie) return;

				const res = await fetch(`http://127.0.0.1:${port}/auth/token`, {
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

if (isProduction) {
	app.use(bearer()).post('/auth/sign-up/email', (ctx) => {
		if (
			!process.env.SIGN_UP_TOKEN ||
			ctx.bearer !== process.env.SIGN_UP_TOKEN
		) {
			ctx.set.status = 'Forbidden';
			return 'Forbidden';
		}

		return auth.handler(ctx.request);
	});
}

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
