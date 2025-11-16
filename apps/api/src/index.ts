import { auth } from '@politigraph/auth/auth';
import { Elysia } from 'elysia';
import { apolloServer, prepareNeo4j } from './neo4j-graphql';

await prepareNeo4j();

const app = new Elysia()
	.use(apolloServer)
	.all('/auth/*', (ctx) => auth.handler(ctx.request))
	.listen(3000);

console.info(
	`[Elysia] API is running at http://${app.server?.hostname}:${app.server?.port}`,
);
