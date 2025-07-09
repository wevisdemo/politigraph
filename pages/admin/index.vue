<script setup lang="ts">
definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Politigraph Admin',
});

const email = ref('');
const password = ref('');
const isErrorEmail = ref('');
const isErrorPassword = ref('');
const errorMsg = ref('');
const logoutTime = ref('');
const isShowErrorMsg = ref(false);
const isShowLogoutMsg = ref(false);

const { signIn } = useAuthClient();

const login = async () => {
	isErrorEmail.value = '';
	isErrorPassword.value = '';
	isShowErrorMsg.value = false;

	if (email.value == '') {
		isErrorEmail.value = 'Please enter email address';
		return;
	} else if (password.value == '') {
		isErrorPassword.value = 'Please enter password';
		return;
	}

	await signIn.email(
		{
			email: email.value,
			password: password.value,
			callbackURL: '/admin/vote-events',
			rememberMe: false,
		},
		{
			onError: (ctx) => {
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
	<div class="h-dvh overflow-hidden pt-[47px]">
		<div class="flex px-0 h-full">
			<div class="basis-3/3 lg:basis-2/3 parliament-bg"></div>
			<div class="sm:basis-1/3 p-7.5 lg:pt-20 bg-white login-box relative">
				<h1 class="font-normal mb-12">Log in</h1>
				<cv-form @submit.prevent="login" class="flex flex-col gap-y-4">
					<template v-if="isValidatingSession">
						<cv-text-input-skeleton />
						<cv-text-input-skeleton />
						<cv-button-skeleton />
					</template>
					<template v-else>
						<cv-text-input
							label="Email"
							placeholder="username@wevis.info"
							v-model="email"
							:invalid-message="isErrorEmail"
						>
							<template v-if="isErrorEmail" v-slot:invalid-message />
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

						<cv-button class="w-full max-w-full">Log in</cv-button>
					</template>
				</cv-form>
			</div>
		</div>
	</div>

	<cv-toast-notification
		kind="error"
		title="Error"
		:subTitle="errorMsg"
		@close="isShowErrorMsg = false"
		v-if="isShowErrorMsg"
	>
	</cv-toast-notification>

	<cv-toast-notification
		v-if="isShowLogoutMsg"
		kind="success"
		title="Logged Out"
		subTitle="You have been successfully logged out."
		:caption="logoutTime"
		@close="isShowLogoutMsg = false"
		class="absolute right-0 bottom-0 z-10"
	>
	</cv-toast-notification>
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
