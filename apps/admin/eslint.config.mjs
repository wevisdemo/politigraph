import prettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import base from '../../eslint.base.config.mjs';

// Admin (Nuxt/Vue) config: shared base + Vue SFC support.
// prettier must come LAST so it disables Vue formatting rules
// (vue/html-indent, vue/html-quotes, ...) that conflict with Prettier.
export default [
	...base,
	...vue.configs['flat/recommended'],
	{
		files: ['**/*.vue'],
		languageOptions: {
			parserOptions: {
				parser: '@typescript-eslint/parser',
			},
		},
	},
	{
		files: ['**/*.vue'],
		rules: {
			'vue/multi-word-component-names': 'off',
			// Nuxt auto-imports (useRoute, useHead, definePageMeta, ...) are
			// resolved at compile time and not visible to ESLint.
			'no-undef': 'off',
		},
	},
	prettier,
];
