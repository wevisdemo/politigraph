import { defineCollection, defineContentConfig, z } from '@nuxt/content';

export default defineContentConfig({
	collections: {
		docs: defineCollection({
			type: 'page',
			source: 'docs/**/*.md',
			schema: z.object({
				lang: z.string().optional().default('th'),
			}),
		}),
	},
});
