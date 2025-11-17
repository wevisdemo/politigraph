import { auth } from '@politigraph/auth/auth';
import { Elysia } from 'elysia';
import { apolloServer } from './neo4j-graphql';

const app = new Elysia()
	.use(apolloServer)
	.all('/auth/*', (ctx) => auth.handler(ctx.request))
	.listen(3000);

console.info(
	`[Elysia] API is running at http://${app.server?.hostname}:${app.server?.port}`,
);
