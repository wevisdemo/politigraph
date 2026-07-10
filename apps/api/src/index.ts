import cluster from 'node:cluster';
import os from 'node:os';
import { serverConfig } from '@politigraph/config/server';

if (cluster.isPrimary) {
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
