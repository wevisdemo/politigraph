<script setup lang="ts">
definePageMeta({
	layout: 'admin-layout',
});

const email = ref('');
const password = ref('');
const isErrorUsername = ref('');
const isErrorPassword = ref('');
const errorMsg = ref('');
const logoutTime = ref('');
const isShowErrorMsg = ref(false);
const isShowLogoutMsg = ref(false);

const { signIn, signUp } = useAuthClient();

const login = async () => {
	isErrorUsername.value = '';
	isErrorPassword.value = '';
	isShowErrorMsg.value = false;

	if (email.value == '') {
		isErrorUsername.value = 'Please enter username';
		return;
	} else if (password.value == '') {
		isErrorPassword.value = 'Please enter password';
		return;
	}

	const { data, error } = await signIn.email(
		{
			email: email.value,
			password: password.value,
			callbackURL: '/admin/voting',
			rememberMe: false,
		},
		{
			onRequest: (ctx) => {
				//show loading
			},
			onSuccess: (ctx) => {
				//redirect to the dashboard or sign in page
			},
			onError: (ctx) => {
				// display the error message
				isShowErrorMsg.value = true;
				errorMsg.value = ctx.error.message;
			},
		},
	);
};

onMounted(async () => {
	const isLogout = localStorage.getItem('isLogout');
	const time = new Date();

	if (isLogout != null && isLogout) {
		logoutTime.value = time.toLocaleString('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true,
		});
		isShowLogoutMsg.value = true;
		localStorage.removeItem('isLogout');
	}
});
</script>

<template>
	<ClientOnly fallback-tag="span" fallback="Loading...">
		<div class="h-dvh overflow-hidden !pt-[47px]">
			<div class="flex px-0 h-full">
				<div class="basis-3/3 lg:basis-2/3 parliament-bg"></div>
				<div class="sm:basis-1/3 !p-7.5 !lg:pt-20 bg-white login-box relative">
					<cv-toast-notification
						kind="success"
						title="Logged Out"
						subTitle="You have been successfully logged out."
						:caption="logoutTime"
						@close="isShowLogoutMsg = false"
						v-if="isShowLogoutMsg"
						class="absolute right-0 top-0 z-10"
					>
					</cv-toast-notification>

					<h1 class="!font-normal !mb-12">Log in</h1>
					<cv-form @submit.prevent="login" class="flex flex-col gap-y-4">
						<cv-text-input
							label="Username"
							placeholder="username@wevis.info"
							v-model="email"
							:invalid-message="isErrorUsername"
						>
							<template v-if="isErrorUsername" v-slot:invalid-message />
						</cv-text-input>
						<cv-text-input
							v-model="password"
							type="password"
							label="Password"
							placeholder="Password"
							autocomplete="password"
							passwordHideLabel=""
							passwordShowLabel=""
							:invalid-message="isErrorPassword"
						>
							<template v-if="isErrorPassword" v-slot:invalid-message />
						</cv-text-input>

						<cv-button class="w-full !max-w-full">Log in</cv-button>

						<cv-toast-notification
							kind="error"
							title="Error"
							:subTitle="errorMsg"
							@close="isShowErrorMsg = false"
							v-if="isShowErrorMsg"
						>
						</cv-toast-notification>
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
