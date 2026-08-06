import cluster from 'node:cluster';
import os from 'node:os';
import { serverConfig } from '@politigraph/config/server';

const RESTART_DELAY_MS = 1000;

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

	cluster.on('exit', (worker, code, signal) => {
		if (signal === 'SIGTERM' || signal === 'SIGINT') return;

		console.error(
			`Worker ${worker.process.pid} exited (code ${code}, signal ${signal}), restarting in ${RESTART_DELAY_MS}ms...`,
		);
		setTimeout(() => cluster.fork(), RESTART_DELAY_MS);
	});
} else {
	await import('./server');
}
