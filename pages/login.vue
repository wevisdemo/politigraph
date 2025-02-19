<script setup lang="ts">
definePageMeta({
	layout: 'admin-layout',
});

const email = ref('');
const password = ref('');

const { signIn, signUp } = useAuthClient();

const login = async () => {
	const { data, error } = await signIn.email(
		{
			email: email.value,
			password: password.value,
			callbackURL: '/admin',
			rememberMe: false,
		},
		{
			//callbacks
		},
	);
};

onMounted(async () => {
	// const { data, error } = await signUp.email(
	// 	{
	// 		email: 'poppap@wevis.info', // user email address
	// 		password: 'test1234', // user password -> min 8 characters by default
	// 		name: 'Poppap',
	// 	},
	// 	{
	// 		onRequest: (ctx) => {
	// 			//show loading
	// 		},
	// 		onSuccess: (ctx) => {
	// 			console.log(ctx);
	// 			//redirect to the dashboard or sign in page
	// 		},
	// 		onError: (ctx) => {
	// 			// display the error message
	// 			alert(ctx.error.message);
	// 		},
	// 	},
	// );
});
</script>

<template>
	<ClientOnly fallback-tag="span" fallback="Loading...">
		<div class="h-dvh overflow-hidden">
			<div class="flex px-0 h-full">
				<div class="basis-3/3 lg:basis-2/3 parliament-bg"></div>
				<div class="sm:basis-1/3 !p-7.5 !lg:pt-20 bg-white login-box">
					<h1 class="!font-normal !mb-12">Log in</h1>
					<cv-form @submit.prevent="login">
						<cv-text-input
							label="Username"
							placeholder="username@wevis.info"
							v-model="email"
							class="!mb-4"
						/>
						<cv-text-input
							v-model="password"
							type="password"
							label="Password"
							placeholder="Password"
							autocomplete="password"
							passwordHideLabel=""
							passwordShowLabel=""
						/>

						<cv-button class="!mt-10 w-full !max-w-full">Log in</cv-button>
					</cv-form>
				</div>
			</div>
		</div>
	</ClientOnly>
</template>

<style scoped>
.parliament-bg {
	background-image: url('/assets/parliament.png');
	background-position: center;
	background-size: cover;
	background-repeat: no-repeat;
}

.login-box {
	@media only screen and (max-width: 1023px) {
		position: absolute;
		margin: auto;
		top: 10%;
		left: 0;
		right: 0;
		height: fit-content;
		width: 95%;
		box-shadow:
			0 10px 15px -3px rgb(0 0 0 / 0.1),
			0 4px 6px -4px rgb(0 0 0 / 0.1);
	}
}
</style>
