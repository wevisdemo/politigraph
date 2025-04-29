import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	app: {
		head: {
			title: 'Politigraph Admin',
			link: [
				{
					rel: 'icon',
					type: 'image/x-icon',
					href: 'https://wevis.info/wp-content/uploads/2022/01/favicon.png',
				},
			],
		},
	},
	sourcemap: true,
	compatibilityDate: '2024-11-01',
	css: ['~/assets/css/main.css'],
	devtools: { enabled: true },
	nitro: {
		esbuild: {
			options: {
				target: 'esnext',
			},
		},
	},
	routeRules: {
		'/': { prerender: true },
		'/schema-mermaid': { prerender: true },
	},
	runtimeConfig: {
		public: {
			baseUrl: 'http://localhost:3000',
		},
	},
	vite: { plugins: [tailwindcss()] },
	watch: [/schemas\/.+.graphql/],
});
