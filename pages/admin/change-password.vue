<script lang="ts" setup>
definePageMeta({
	layout: 'admin-layout',
});

const { changePassword, signOut } = useAuthClient();
const router = useRouter();

const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const isErrorPassword = ref('');
const isErrorNewPassword = ref('');
const isErrorConfirmNewPassword = ref('');
const errorMsg = ref('');
const isShowErrorMsg = ref(false);
const isSuccessChangePassword = ref(false);

const changepassword = async () => {
	isErrorPassword.value = '';
	isErrorNewPassword.value = '';
	isErrorConfirmNewPassword.value = '';
	isShowErrorMsg.value = false;

	if (currentPassword.value == '') {
		isErrorPassword.value = 'Please enter current password';
		return;
	} else if (newPassword.value == '') {
		isErrorNewPassword.value = 'Please enter new password';
		return;
	} else if (confirmNewPassword.value == '') {
		isErrorConfirmNewPassword.value = 'Please enter confirm new password';
		return;
	} else if (confirmNewPassword.value != newPassword.value) {
		isErrorConfirmNewPassword.value =
			'The confirmation password doesn’t match.';
		return;
	} else if (confirmNewPassword.value.length < 8) {
		isErrorConfirmNewPassword.value =
			'Your new password must be at least 8 characters long.';
		return;
	}

	const { data, error } = await changePassword(
		{
			newPassword: newPassword.value,
			currentPassword: currentPassword.value,
			revokeOtherSessions: true, // revoke all other sessions the user is signed into
		},
		{
			onRequest: (ctx) => {
				//show loading
			},
			onSuccess: async (ctx) => {
				//redirect to the dashboard or sign in page
				isSuccessChangePassword.value = true;
			},
			onError: (ctx) => {
				// display the error message
				isShowErrorMsg.value = true;
				// errorMsg.value = ctx.error.message;
				errorMsg.value = 'Double-check your current password and try again.';
			},
		},
	);
};

const signout = async () => {
	await signOut({
		fetchOptions: {
			onSuccess: () => {
				localStorage.setItem('isLogout', true);
				router.push('/login'); // redirect to login page
			},
		},
	});
};
</script>

<template>
	<div class="bg-[#F4F4F4] h-dvh">
		<ClientOnly fallback-tag="span" fallback="Loading...">
			<div
				class="absolute top-20 inset-x-0 bg-white !p-7.5 max-w-[544px] w-full !mx-auto"
			>
				<template v-if="!isSuccessChangePassword">
					<h1 class="!font-normal !mb-12">Change Password</h1>
					<cv-form
						@submit.prevent="changepassword"
						class="flex flex-col gap-y-4"
					>
						<cv-text-input
							v-model="currentPassword"
							type="password"
							label="Current Password"
							placeholder="Password"
							autocomplete="password"
							:invalid-message="isErrorPassword"
						>
							<template v-if="isErrorPassword" v-slot:invalid-message />
						</cv-text-input>

						<cv-text-input
							v-model="newPassword"
							type="password"
							label="New Password"
							placeholder="Password"
							autocomplete="password"
							:invalid-message="isErrorNewPassword"
							helperText="Your new password must be at least 8 characters long."
						>
							<template v-if="isErrorNewPassword" v-slot:invalid-message />
						</cv-text-input>

						<cv-text-input
							v-model="confirmNewPassword"
							type="password"
							label="Confirm New Password"
							placeholder="Password"
							autocomplete="password"
							:invalid-message="isErrorConfirmNewPassword"
						>
							<template
								v-if="isErrorConfirmNewPassword"
								v-slot:invalid-message
							/>
						</cv-text-input>

						<cv-toast-notification
							kind="error"
							title="Incorrect Password"
							:subTitle="errorMsg"
							@close="isShowErrorMsg = false"
							v-if="isShowErrorMsg"
						>
						</cv-toast-notification>

						<cv-button class="w-full !max-w-full">Change Password</cv-button>
					</cv-form>
				</template>
				<template v-else
					><h1 class="!font-normal">You're all set!</h1>
					<p class="!my-12">
						Your password has been updated successfully. You can now sign in
						with your new password.
					</p>

					<cv-button
						class="w-full !max-w-full"
						kind="secondary"
						@click="signout"
						>Go to Sign In</cv-button
					>
				</template>
			</div>
		</ClientOnly>
	</div>
</template>

<style scoped></style>
