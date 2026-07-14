import { resolve } from 'node:path';
import { config } from 'dotenv';

declare const __dirname: string | undefined;

const g = globalThis as typeof globalThis & {
	__POLITIGRAPH_ENV_LOADED__?: boolean;
};

if (!g.__POLITIGRAPH_ENV_LOADED__) {
	const currentDir = import.meta.dir ?? __dirname;
	const root = resolve(currentDir!, '../../../.env');

	config({ path: root });

	const nodeEnv = process.env.NODE_ENV ?? 'development';
	config({ path: `${root}.${nodeEnv}`, override: true });

	g.__POLITIGRAPH_ENV_LOADED__ = true;
}
