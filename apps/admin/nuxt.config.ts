import tailwindcss from '@tailwindcss/vite';

const apiUrl = process.env.API_URL ?? 'http://localhost:3000';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	app: {
		baseURL: '/admin',
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
	buildDir: process.env.NUXT_BUILD_DIR,
	compatibilityDate: '2024-11-01',
	css: ['~/assets/css/main.css'],
	devServer: {
		port: 8000,
	},
	devtools: { enabled: true },
	hooks: {
		// SPA - https://nuxt.com/docs/4.x/guide/concepts/rendering#deploying-a-static-client-rendered-app
		'prerender:routes'({ routes }) {
			routes.clear();
		},
	},
	modules: ['@vueuse/nuxt'],
	nitro: {
		preset: 'static',
	},
	routeRules:
		process.env.NODE_ENV !== 'production'
			? {
					'/auth/**': { proxy: `${apiUrl}/auth/**` },
					'/graphql': { proxy: `${apiUrl}/graphql` },
					'/upload-image': { proxy: `${apiUrl}/upload-image` },
				}
			: {},
	runtimeConfig: {
		public: {
			baseUrl: 'http://localhost:8000',
		},
	},
	sourcemap: true,
	ssr: false,
	vite: { cacheDir: process.env.VITE_CACHE_DIR, plugins: [tailwindcss()] },
});
