import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import mermaid from 'astro-mermaid';
import { defineConfig, passthroughImageService } from 'astro/config';

export default defineConfig({
	site: 'https://politigraph.wevis.info',
	// @ts-ignore
	vite: { plugins: [tailwindcss()] },
	image: {
		service: passthroughImageService(),
	},
	integrations: [
		mermaid(),
		starlight({
			title: 'Politigraph',
			favicon: '/favicon.png',
			logo: {
				light: './src/assets/logo-black.png',
				dark: './src/assets/logo-white.png',
				replacesTitle: true,
			},
			head: [
				{
					tag: 'script',
					attrs: {
						defer: true,
						'data-domain': 'politigraph.wevis.info',
						src: 'https://analytics.punchup.world/js/script.js',
					},
				},
			],
			defaultLocale: 'root',
			locales: {
				root: {
					label: 'ไทย',
					lang: 'th',
				},
				en: {
					label: 'English',
				},
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/wevisdemo/politigraph',
				},
			],
			sidebar: [
				{
					label: 'เริ่มต้น',
					translations: {
						en: 'Getting Started',
					},
					autogenerate: { directory: 'getting-started' },
				},
				{
					label: 'โครงสร้างของข้อมูล',
					translations: {
						en: 'Schema',
					},
					autogenerate: { directory: 'schema' },
				},
			],
			tableOfContents: false,
			lastUpdated: true,
			customCss: [
				'./src/styles/global.css',
				'@fontsource/ibm-plex-sans-thai-looped',
			],
			components: {
				Footer: './src/components/footer.astro',
			},
		}),
		vue(),
	],
});
