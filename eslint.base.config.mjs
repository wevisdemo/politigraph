import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

/**
 * Shared base ESLint flat config for the politigraph monorepo.
 *
 * Not auto-loaded by ESLint (filename doesn't match `eslint.config.*`).
 * Each workspace package's `eslint.config.mjs` imports and spreads this,
 * then appends package-specific plugins (Vue, Astro, etc.).
 */
export const baseConfig = tseslint.config(
	{
		ignores: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.output/**',
			'**/.nuxt/**',
			'**/.astro/**',
			'**/genql/**',
			'**/.next/**',
			'**/build.ts',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	// Disable every ESLint rule that conflicts with Prettier (indent, quotes,
	// semi, vue/html-indent, etc.). Prettier owns formatting; ESLint catches logic.
	prettier,
	{
		files: ['**/*.{ts,tsx,js,mjs,cjs}'],
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
);

export default baseConfig;
