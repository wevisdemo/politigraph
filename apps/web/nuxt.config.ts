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
			script: [
				{
					defer: true,
					'data-domain': 'politigraph.wevis.info',
					src: 'https://analytics.punchup.world/js/script.js',
				},
			],
		},
	},
	compatibilityDate: '2024-11-01',
	content: {
		build: {
			markdown: {
				highlight: {
					theme: 'catppuccin-mocha',
					langs: ['graphql', 'json', 'typescript'],
				},
			},
		},
	},
	css: ['~/assets/css/main.css'],
	devServer: {
		port: 8000,
	},
	devtools: { enabled: true },
	modules: ['@nuxt/content', '@vueuse/nuxt'],
	nitro: {
		preset: 'static',
		esbuild: {
			options: {
				target: 'esnext',
			},
		},
	},
	routeRules: {
		'/': { prerender: true },
		'/admin/**': { prerender: false },
		'/docs/**': { prerender: true },
		'/graphql': { prerender: false },
		'/schema.json': { prerender: true },
		...(process.env.NODE_ENV !== 'production'
			? {
					'/auth/**': { proxy: 'http://localhost:3000/auth/**' },
					'/graphql': { proxy: 'http://localhost:3000/graphql' },
				}
			: {}),
	},
	runtimeConfig: {
		public: {
			baseUrl: 'http://localhost:8000',
		},
	},
	sourcemap: true,
	ssr: false,
	vite: { plugins: [tailwindcss()] },
});
