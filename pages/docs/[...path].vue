<script setup lang="ts">
// @ts-ignore
import { ChevronLeft16, ChevronRight16 } from '@carbon/icons-vue';

const route = useRoute();

const lang = computed(() =>
	route.path.includes('/en')
		? { current: 'en', change: 'th' }
		: { current: 'th', change: 'en' },
);

const { data: navigations } = await useAsyncData(
	`docs-navigation-${lang.value.current}`,
	async () => {
		const [rootNavigation] = await queryCollectionNavigation('docs').where(
			'lang',
			'=',
			lang.value.current,
		);

		return lang.value.current === 'th'
			? rootNavigation.children
			: rootNavigation.children?.[0].children;
	},
);

const { data: content } = await useAsyncData(route.path, () =>
	queryCollection('docs').path(route.path).first(),
);

const { data: surroundings } = await useAsyncData(
	`${route.path}-surroundings`,
	() =>
		queryCollectionItemSurroundings('docs', route.path).where(
			'lang',
			'=',
			lang.value.current,
		),
);

useSeoMeta({
	title: `${content.value?.title} - Politigraph Docs`,
	description: content.value?.description,
});

onMounted(() => {
	if (!content.value) {
		navigateTo({
			path: '/docs',
			replace: true,
		});
	}
});
</script>

<template>
	<div class="flex min-h-dvh flex-col md:flex-row">
		<div class="relative border-r border-gray-300 bg-gray-100 md:w-72">
			<div class="sticky top-0 flex flex-col gap-4 p-3 md:p-6">
				<div class="flex flex-row justify-between">
					<a href="/">&lt; Back</a>
					<a
						:href="
							route.path.replace(
								...((lang.current === 'en'
									? ['/docs/en', '/docs']
									: ['/docs', '/docs/en']) as [string, string]),
							)
						"
					>
						{{ lang.change.toUpperCase() }}
					</a>
				</div>
				<h1 class="text-2xl">
					<span class="font-bold">Politigraph</span> Docs
				</h1>
				<ul class="flex flex-col gap-3">
					<li
						v-for="parent in navigations"
						:key="parent.path"
						class="flex flex-col gap-3"
					>
						<span v-if="parent.path === route.path">{{ parent.title }}</span>
						<a v-else :href="parent.path">{{ parent.title }}</a>
						<ul
							v-if="parent.children"
							class="ml-4 flex list-disc flex-col gap-3"
						>
							<li
								v-for="child in parent.children.filter(
									(c) => c.title !== parent.title,
								)"
								:key="child.path"
							>
								<span v-if="child.path === route.path">{{ child.title }}</span>
								<a v-else :href="child.path">{{ child.title }}</a>
							</li>
						</ul>
					</li>
				</ul>
			</div>
		</div>
		<div class="flex flex-1 px-3 py-6 md:px-6 md:py-16">
			<div class="mx-auto flex w-full max-w-screen-md flex-col gap-12">
				<ContentRenderer
					v-if="content"
					:value="content"
					class="markdown-content flex h-full flex-col justify-items-stretch gap-6"
				/>
				<div class="flex flex-row">
					<a v-if="surroundings?.[0]" :href="surroundings?.[0].path">
						<CvLink><ChevronLeft16 />{{ surroundings?.[0].title }}</CvLink>
					</a>
					<div class="flex-1"></div>
					<a v-if="surroundings?.[1]" :href="surroundings?.[1].path">
						<CvLink>{{ surroundings?.[1].title }}<ChevronRight16 /></CvLink>
					</a>
				</div>
			</div>
		</div>
	</div>
</template>
