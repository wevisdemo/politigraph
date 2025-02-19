<script setup lang="ts">
const { getSession, signOut } = useAuthClient();
const router = useRouter();
const username = ref('');

const signout = async () => {
	await signOut({
		fetchOptions: {
			onSuccess: () => {
				router.push('/login'); // redirect to login page
			},
		},
	});
};

onMounted(async () => {
	const { data: session, error } = await getSession();

	if (session == null) {
		router.push('/login');
	} else {
		router.push('/admin');
		username.value = session.user.name;
	}
});
</script>

<template>
	<div>
		<div
			class="bg-white !p-4 !border !border-[#C6C6C6] fixed top-0 w-full z-10 flex justify-between"
		>
			<p>WeVis <span class="!font-bold">Politigraph Admin</span></p>

			<div class="flex gap-3 items-center" v-if="username != null">
				<a href="#" class="!text-black underline">Voting</a>
				<div class="flex gap-1 items-center">
					<img src="../assets/avatar.svg" alt="avatar" class="cursor-pointer" />
					<p>{{ username }}</p>
				</div>
				<img
					src="../assets/logout.svg"
					alt="logout"
					class="cursor-pointer"
					@click="signout"
				/>
			</div>
		</div>
		<slot />
	</div>
</template>
