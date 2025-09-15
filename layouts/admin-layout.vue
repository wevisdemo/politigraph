<script setup lang="ts">
import {
	ApiKey16,
	Logout16,
	UserAvatar24,
	UserSettings16,
	//@ts-ignore
} from '@carbon/icons-vue';
import { ADMIN_NAVIGATIONS } from '~/constants/navigation';

const { signOut } = useAuthClientWithRouteGuard((user) => {
	username.value = user.name;
	email.value = user.email;
});

const router = useRouter();
const route = useRoute();
const username = ref('');
const email = ref('');
const showSettings = ref(false);

const signout = async () => {
	await signOut({
		fetchOptions: {
			onSuccess: () => {
				username.value = '';
				localStorage.setItem('isLogout', 'true');
				router.push('/admin/login');
			},
		},
	});
};
</script>

<template>
	<ClientOnly>
		<cv-header aria-label="Header">
			<template v-slot:left-panels>
				<cv-side-nav
					id="side-nav"
					rail
					fixed
					class="border-r border-gray-200 shadow-lg"
				>
					<cv-side-nav-items>
						<cv-side-nav-link
							v-for="{ label, path } in ADMIN_NAVIGATIONS"
							:key="label"
							:href="`/admin/${path}`"
							:active="route.path.includes(path)"
						>
							{{ label }}
						</cv-side-nav-link>
					</cv-side-nav-items>
				</cv-side-nav>
			</template>
			<div class="flex items-center">
				<cv-header-menu-button
					aria-label="Header menu"
					aria-controls="side-nav"
					v-show="username"
				/>
				<cv-header-name href="/admin"
					><p class="text-black">
						WeVis <span class="font-bold">Politigraph Admin</span>
					</p></cv-header-name
				>
			</div>
			<cv-overflow-menu flipMenu v-if="username">
				<template v-slot:trigger><UserAvatar24 /></template>
				<div class="p-4">
					<p class="text-sm">{{ username }}</p>

					<p class="text-xs text-[#525252]">{{ email }}</p>
				</div>
				<a href="/admin/api-keys">
					<cv-overflow-menu-item
						value="API Keys"
						class="flex items-center"
						@click="() => {}"
						>API Keys <ApiKey16 />
					</cv-overflow-menu-item>
				</a>
				<cv-overflow-menu-item
					value="Settings"
					class="flex items-center"
					@click="showSettings = true"
					>Settings <UserSettings16
				/></cv-overflow-menu-item>
				<cv-overflow-menu-item
					value="item 3"
					danger
					class="flex items-center"
					@click="signout"
					>Log out <Logout16
				/></cv-overflow-menu-item>
			</cv-overflow-menu>
		</cv-header>
		<cv-modal
			:visible="showSettings"
			autoHideOff
			primaryButtonDisabled
			disableTeleport
			@modal-hide-request="showSettings = false"
			size="sm"
		>
			<template v-slot:title>Account Settings</template>
			<template v-slot:content
				><div class="mb-6">
					<p class="font-bold">Name</p>
					<p>{{ username }}</p>
				</div>
				<div class="mb-6">
					<p class="font-bold">Email</p>
					<p>{{ email }}</p>
				</div>
				<div class="mb-6">
					<p class="font-bold">Role</p>
					<p>Admin</p>
				</div>
				<hr class="border-[#C6C6C6]" />
				<div class="mt-6">
					<p class="mb-1 font-bold">Password</p>
					<a href="/admin/change-password" class="text-xs">Change Password</a>
				</div></template
			>
		</cv-modal>
	</ClientOnly>
	<div
		class="mt-12 flex h-full min-h-[calc(100dvh-3rem)] flex-col bg-neutral-100 p-3 md:p-10"
	>
		<slot />
	</div>
</template>
