import { resolve } from 'node:path';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import mermaid from 'astro-mermaid';
import { defineConfig, passthroughImageService } from 'astro/config';
import { sidebarGroups } from './src/constants/sidebar';

const site = 'https://politigraph.wevis.info';

export default defineConfig({
	site,
	// @ts-expect-error starlight config type doesn't include vite
	vite: {
		plugins: [tailwindcss()],
		envDir: resolve(import.meta.dirname, '../../'),
	},
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
				{
					tag: 'link',
					attrs: {
						rel: 'llms',
						type: 'text/plain',
						href: `${site}/llms.txt`,
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:image',
						content: 'https://politigraph.wevis.info/og-image.png',
					},
				},
				{
					tag: 'meta',
					attrs: {
						name: 'twitter:card',
						content: 'summary_large_image',
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
				...sidebarGroups.map(({ directory, label, translations }) => ({
					label,
					translations,
					autogenerate: { directory },
				})),
				{
					label: 'สำรวจข้อมูล',
					translations: {
						en: 'Explore',
					},
					link: '/explore',
				},
				{
					label: 'GraphQL Playground',
					link: `${site}/graphql`,
					attrs: { target: '_blank' },
				},
			],
			tableOfContents: false,
			lastUpdated: true,
			customCss: [
				'./src/styles/global.css',
				'@fontsource/ibm-plex-sans-thai-looped',
			],
			components: {
				Header: './src/components/header.astro',
				SocialIcons: './src/components/social-icons.astro',
				Footer: './src/components/footer.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
				LanguageSelect: './src/components/LanguageSelect.astro',
			},
		}),
		vue(),
	],
});
