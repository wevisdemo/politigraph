import cluster from 'node:cluster';
import os from 'node:os';
import { serverConfig } from '@politigraph/config/server';

if (process.argv.includes('healthcheck')) {
	const response = await fetch(
		`http://127.0.0.1:${serverConfig.port}/graphql`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: '{ __typename }' }),
		},
	).catch(() => null);

	process.exit(response?.ok ? 0 : 1);
} else if (cluster.isPrimary) {
	const availableThread = serverConfig.isProduction
		? os.availableParallelism()
		: 1;

	console.log(`Starting server on ${availableThread} threads...`);

	for (let i = 0; i < availableThread; i++) {
		cluster.fork();
	}
} else {
	await import('./server');
}
