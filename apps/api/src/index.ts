import cluster from 'node:cluster';
import os from 'node:os';

if (cluster.isPrimary) {
	const availableThread =
		process.env.NODE_ENV === 'production' ? os.availableParallelism() : 1;

	console.log(`Starting server on ${availableThread} threads...`);

	for (let i = 0; i < availableThread; i++) {
		cluster.fork();
	}
} else {
	await import('./server');
}
