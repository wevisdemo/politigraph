import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	app: {
		head: {
			title: 'Politigraph - Civic-initiated open API for Thai political data',
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
	modules: ['@nuxt/content'],
	nitro: {
		esbuild: {
			options: {
				target: 'esnext',
			},
		},
		prerender: {
			crawlLinks: true,
			routes: ['/', '/schema.json'],
			ignore: ['/admin', '/auth', '/graphql'],
		},
	},
	runtimeConfig: {
		public: {
			baseUrl: 'http://localhost:3000',
		},
	},
	vite: { plugins: [tailwindcss()] },
	watch: [/schemas\/.+.graphql/],
});
