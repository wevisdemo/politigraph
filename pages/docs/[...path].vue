<script setup lang="ts">
// @ts-ignore
import { ChevronLeft16, ChevronRight16 } from '@carbon/icons-vue';

const route = useRoute();

const { data: navigations } = await useAsyncData('docs-navigation', () =>
	queryCollectionNavigation('docs'),
);

const { data: content } = await useAsyncData(route.path, () =>
	queryCollection('docs').path(route.path).first(),
);

const { data: surroundings } = await useAsyncData(
	`${route.path}-surroundings`,
	() => {
		return queryCollectionItemSurroundings('docs', route.path);
	},
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
	<div class="flex min-h-dvh flex-row">
		<div
			class="flex w-72 flex-col gap-4 border-r border-gray-300 bg-gray-100 p-6"
		>
			<a href="/">&lt; Back</a>
			<h1 class="text-2xl"><span class="font-bold">Politigraph</span> Docs</h1>
			<ul class="flex flex-col gap-3">
				<li
					v-for="parent in navigations?.[0].children"
					:key="parent.path"
					class="flex flex-col gap-3"
				>
					<span v-if="parent.path === route.path">{{ parent.title }}</span>
					<a v-else :href="parent.path">{{ parent.title }}</a>
					<ul v-if="parent.children" class="ml-4 flex list-disc flex-col gap-3">
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
		<div class="flex flex-1 px-6 py-16">
			<div class="mx-auto w-full max-w-screen-md">
				<ContentRenderer
					v-if="content"
					:value="content"
					class="markdown-content flex h-full flex-col justify-items-stretch gap-6"
				/>
				<div class="flex flex-row pt-2 pb-12">
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
