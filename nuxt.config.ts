// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2024-11-01',
	devtools: { enabled: true },
	nitro: {
		esbuild: {
			options: {
				target: 'esnext',
			},
		},
	},
	runtimeConfig: {
		public: {
			baseUrl: 'http://localhost:3000',
		},
	},
	watch: ['schemas/politic.graphql'],
});
