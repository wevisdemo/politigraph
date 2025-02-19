import tailwindcss from '@tailwindcss/vite';

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
	watch: ['schemas/politic.graphql'],
	vite: { plugins: [tailwindcss()] },
	css: ['~/assets/css/main.css'],
});
