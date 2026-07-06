import prettier from 'eslint-config-prettier/flat';
import astro from 'eslint-plugin-astro';
import base from '../../eslint.base.config.mjs';

// Docs (Astro) config: shared base + Astro component support.
// prettier must come LAST so it disables Astro formatting rules
// that conflict with Prettier.
export default [
	...base,
	...astro.configs['flat/recommended'],
	{
		files: ['**/*.astro'],
		languageOptions: {
			parserOptions: {
				parser: '@typescript-eslint/parser',
			},
		},
	},
	{
		files: ['**/*.astro'],
		rules: {
			// Starlight/Astro auto-imports are resolved at build time.
			'no-undef': 'off',
		},
	},
	{
		// Astro processor extracts frontmatter into virtual files
		// (e.g. `foo.astro/*.ts`); the `.astro` glob above does not match them.
		files: ['**/*.astro/*.js', '**/*.astro/*.ts'],
		rules: {
			'no-undef': 'off',
		},
	},
	prettier,
];
