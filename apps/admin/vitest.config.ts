import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [vue()],
	test: {
		environment: 'happy-dom',
		include: ['tests/**/*.test.ts'],
	},
	resolve: {
		alias: {
			'~': resolve(__dirname, '.'),
		},
	},
});
