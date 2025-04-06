<script setup lang="ts">
const { getSession, signOut } = useAuthClient();
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
				router.push('/admin'); // redirect to login page
			},
		},
	});
};

onMounted(async () => {
	const { data: session, error } = await getSession();

	if (session == null) {
		router.push('/admin');
	} else {
		if (route.name == 'admin') router.push('/admin/voting');
		username.value = session.user.name;
		email.value = session.user.email;
	}
});
</script>

<template>
	<div>
		<ClientOnly fallback-tag="span" fallback="Loading...">
			<cv-header aria-label="Header">
				<template v-slot:left-panels>
					<cv-side-nav id="side-nav" rail fixed>
						<cv-side-nav-items>
							<cv-side-nav-link href="/admin/voting" active>
								Voting
							</cv-side-nav-link>
						</cv-side-nav-items>
					</cv-side-nav>
				</template>

				<div class="flex items-center">
					<cv-header-menu-button
						aria-label="Header menu"
						aria-controls="side-nav"
						v-if="username != ''"
					/>

					<cv-header-name href="javascript:void(0)" class="pointer-events-none"
						><p class="!text-black">
							WeVis <span class="!font-bold">Politigraph Admin</span>
						</p></cv-header-name
					>
				</div>

				<cv-overflow-menu flipMenu v-if="username != ''">
					<template v-slot:trigger
						><img src="../assets/avatar.svg" alt="avatar"
					/></template>
					<div class="!p-4">
						<p class="!text-sm">{{ username }}</p>
						<p class="!text-xs text-[#525252]">{{ email }}</p>
					</div>

					<cv-overflow-menu-item
						value="Settings"
						class="flex items-center"
						@click="showSettings = true"
						>Settings
						<img
							src="../assets/settings.svg"
							alt="settings"
							class="cursor-pointer"
					/></cv-overflow-menu-item>
					<cv-overflow-menu-item
						value="item 3"
						danger
						class="flex items-center"
						@click="signout"
						>Log out
						<img src="../assets/logout.svg" alt="logout" class="cursor-pointer"
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
					><div class="!mb-6">
						<p class="!font-bold">Name</p>
						<p>{{ username }}</p>
					</div>
					<div class="!mb-6">
						<p class="!font-bold">Email</p>
						<p>{{ email }}</p>
					</div>
					<div class="!mb-6">
						<p class="!font-bold">Role</p>
						<p>Admin</p>
					</div>
					<hr class="border-[#C6C6C6]" />
					<div class="!mt-6">
						<p class="!font-bold !mb-1">Password</p>
						<a href="/admin/change-password" class="!text-xs"
							>Change Password</a
						>
					</div></template
				>
			</cv-modal>
		</ClientOnly>
		<slot />
	</div>
</template>
