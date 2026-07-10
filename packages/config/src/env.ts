import { resolve } from 'node:path';
import { config } from 'dotenv';

const g = globalThis as typeof globalThis & {
	__POLITIGRAPH_ENV_LOADED__?: boolean;
};

if (!g.__POLITIGRAPH_ENV_LOADED__) {
	const root = resolve(import.meta.dir, '../../../.env');

	config({ path: root });

	const nodeEnv = process.env.NODE_ENV ?? 'development';
	config({ path: `${root}.${nodeEnv}`, override: true });

	g.__POLITIGRAPH_ENV_LOADED__ = true;
}
