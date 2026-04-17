<script setup lang="ts">
import {
	Add16,
	Password16,
	TrashCan16,
	UserIdentification16,
	UserMilitary16,
	// @ts-ignore
} from '@carbon/icons-vue';
import type { UserWithRole } from '@politigraph/auth/betterauth';
import { formatDate } from '~/utils/date';

definePageMeta({
	layout: 'admin-layout',
});

useHead({
	title: 'Users | Politigraph Admin',
});

const { admin } = useAuthClient();
const actionError = ref('');
const updatingUserId = ref('');
const userToCreate = ref(false);
const newUserName = ref('');
const newUserEmail = ref('');
const newUserPassword = ref('');
const newUserRole = ref<'user' | 'admin'>('user');
const userToRemove = ref<UserWithRole | null>(null);
const userToChangePassword = ref<UserWithRole | null>(null);

const {
	offset,
	numberOfPage,
	paginationData,
	handlePageChange,
	handlePageSizeChange,
} = usePaginationQuery({
	defaultPageSize: 20,
	totalCount: () => users.value?.total,
});

const {
	data: users,
	status,
	error,
	refresh,
} = await useLazyAsyncData(
	'admin-users',
	async () => {
		const { data, error } = await admin.listUsers({
			query: {
				limit: paginationData.value.pageSize,
				offset: offset.value,
				sortBy: 'createdAt',
				sortDirection: 'desc',
			},
		});

		if (error || !data) {
			throw new Error(error?.message || 'Failed to load users');
		}

		return data;
	},
	{
		watch: [paginationData.value],
		server: false,
	},
);

const openCreateUserModal = () => {
	actionError.value = '';
	userToCreate.value = true;
	newUserName.value = '';
	newUserEmail.value = '';
	newUserRole.value = 'user';
	newUserPassword.value = generateRandomPassword();
};

const toggleAdminRole = async (user: UserWithRole) => {
	actionError.value = '';
	updatingUserId.value = user.id;

	const nextRole = user.role === 'admin' ? 'user' : 'admin';

	const { error } = await admin.setRole({
		userId: user.id,
		role: nextRole,
	});

	updatingUserId.value = '';

	if (error) {
		actionError.value = error.message || 'Failed to update user role';
		return;
	}

	await refresh();
};

const removeUser = async (user: UserWithRole) => {
	actionError.value = '';
	updatingUserId.value = user.id;

	const { error } = await admin.removeUser({
		userId: user.id,
	});

	updatingUserId.value = '';

	if (error) {
		actionError.value = error.message || 'Failed to remove user';
		return;
	}

	await refresh();
};

const confirmRemoveUser = (user: UserWithRole) => {
	userToRemove.value = user;
};

const handleRemoveUser = async () => {
	if (!userToRemove.value) return;

	await removeUser(userToRemove.value);
	userToRemove.value = null;
};

const generateRandomPassword = (length = 24) => {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const values = new Uint32Array(length);

	if (globalThis.crypto?.getRandomValues) {
		globalThis.crypto.getRandomValues(values);
		return Array.from(values, (value) => chars[value % chars.length]).join('');
	}

	return Array.from(
		{ length },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join('');
};

const openChangePasswordModal = (user: UserWithRole) => {
	userToChangePassword.value = user;
	newUserPassword.value = generateRandomPassword();
};

const handleChangePassword = async () => {
	if (!userToChangePassword.value) return;

	actionError.value = '';
	updatingUserId.value = userToChangePassword.value.id;

	const { error } = await admin.setUserPassword({
		userId: userToChangePassword.value.id,
		newPassword: newUserPassword.value,
	});

	updatingUserId.value = '';

	if (error) {
		actionError.value = error.message || 'Failed to update user password';
		return;
	}

	userToChangePassword.value = null;
	newUserPassword.value = '';
};

const handleCreateUser = async () => {
	actionError.value = '';
	updatingUserId.value = 'create-user';

	const { error } = await admin.createUser({
		email: newUserEmail.value,
		password: newUserPassword.value,
		name: newUserName.value,
		role: newUserRole.value,
	});

	updatingUserId.value = '';

	if (error) {
		actionError.value = error.message || 'Failed to create user';
		return;
	}

	userToCreate.value = false;
	newUserName.value = '';
	newUserEmail.value = '';
	newUserRole.value = 'user';
	newUserPassword.value = '';
	await refresh();
};
</script>

<template>
	<div class="flex justify-center">
		<div class="mx-auto w-full max-w-5xl">
			<cv-data-table-skeleton
				v-if="status === 'pending'"
				title="Users"
			></cv-data-table-skeleton>
			<div v-else-if="error" class="rounded bg-red-50 p-4 text-red-700">
				{{ error.message || 'Failed to load users' }}
			</div>
			<div v-else class="flex flex-col">
				<div
					v-if="actionError"
					class="rounded bg-red-50 px-4 py-3 text-sm text-red-700"
				>
					{{ actionError }}
				</div>
				<cv-data-table title="Users" helper-text="ผู้ใช้งานในระบบ">
					<template #actions>
						<cv-button :icon="Add16" @click="openCreateUserModal">
							New User
						</cv-button>
					</template>
					<template #headings>
						<cv-data-table-heading heading="Name" />
						<cv-data-table-heading heading="Email" />
						<cv-data-table-heading heading="Role" />
						<cv-data-table-heading heading="Created On" />
						<cv-data-table-heading heading="Actions" />
					</template>
					<template #data>
						<cv-data-table-row
							v-for="user in users?.users ?? []"
							:key="user.id"
							:value="user.id"
						>
							<cv-data-table-cell>
								{{ user.name || '-' }}
							</cv-data-table-cell>
							<cv-data-table-cell>
								{{ user.email || '-' }}
							</cv-data-table-cell>
							<cv-data-table-cell class="whitespace-nowrap">
								{{ user.role }}
							</cv-data-table-cell>
							<cv-data-table-cell class="whitespace-nowrap">
								{{ formatDate(user.createdAt) || '-' }}
							</cv-data-table-cell>
							<cv-data-table-cell>
								<div class="flex items-center gap-1">
									<cv-icon-button
										:icon="Password16"
										label="Change password"
										tipPosition="top"
										size="sm"
										kind="ghost"
										:disabled="updatingUserId === user.id"
										@click="openChangePasswordModal(user)"
									/>
									<cv-icon-button
										:icon="
											user.role === 'admin'
												? UserIdentification16
												: UserMilitary16
										"
										:label="
											user.role === 'admin'
												? 'Remove admin role'
												: 'Assign admin role'
										"
										tipPosition="top"
										size="sm"
										kind="ghost"
										:disabled="updatingUserId === user.id"
										@click="toggleAdminRole(user)"
									/>
									<cv-icon-button
										:icon="TrashCan16"
										label="Remove user"
										tipPosition="top"
										size="sm"
										kind="danger--ghost"
										:disabled="updatingUserId === user.id"
										@click="confirmRemoveUser(user)"
									/>
								</div>
							</cv-data-table-cell>
						</cv-data-table-row>
					</template>
				</cv-data-table>
				<p
					v-if="(users?.users ?? []).length === 0"
					class="text-center text-sm opacity-50"
				>
					No users found
				</p>

				<ui-pagination
					:page="paginationData.page"
					:page-size="paginationData.pageSize"
					:total-count="users?.total ?? 0"
					:number-of-page="numberOfPage"
					@on-page-change="handlePageChange"
					@on-page-size-change="handlePageSizeChange"
				/>
			</div>
		</div>
	</div>

	<ClientOnly>
		<cv-modal
			:visible="userToCreate"
			autoHideOff
			@modal-hidden="
				userToCreate = false;
				newUserName = '';
				newUserEmail = '';
				newUserPassword = '';
			"
			@modal-hide-request="
				userToCreate = false;
				newUserName = '';
				newUserEmail = '';
				newUserPassword = '';
			"
			@primary-click="handleCreateUser"
		>
			<template v-slot:title>Create user</template>
			<template v-slot:content>
				<div class="flex flex-col gap-4">
					<cv-text-input
						label="Name"
						:modelValue="newUserName"
						@update:modelValue="newUserName = $event"
					/>
					<cv-text-input
						label="Email"
						type="email"
						:modelValue="newUserEmail"
						@update:modelValue="newUserEmail = $event"
					/>
					<cv-text-input
						label="Password"
						type="password"
						:modelValue="newUserPassword"
						@update:modelValue="newUserPassword = $event"
					/>
					<cv-radio-group legendText="Role">
						<cv-radio-button
							v-model="newUserRole"
							name="new-user-role"
							label="User"
							value="user"
						/>
						<cv-radio-button
							v-model="newUserRole"
							name="new-user-role"
							label="Admin"
							value="admin"
						/>
					</cv-radio-group>
				</div>
			</template>
			<template v-slot:primary-button>Create</template>
			<template v-slot:secondary-button>Cancel</template>
		</cv-modal>
		<cv-modal
			:visible="userToChangePassword !== null"
			autoHideOff
			@modal-hidden="
				userToChangePassword = null;
				newUserPassword = '';
			"
			@modal-hide-request="
				userToChangePassword = null;
				newUserPassword = '';
			"
			@primary-click="handleChangePassword"
		>
			<template v-slot:title>Change password</template>
			<template v-slot:content>
				<div class="flex flex-col gap-4">
					<p>
						Set a new password for
						<strong>{{
							userToChangePassword?.name ||
							userToChangePassword?.email ||
							'this user'
						}}</strong>
						.
					</p>
					<cv-text-input
						label="New password"
						type="password"
						:modelValue="newUserPassword"
						@update:modelValue="newUserPassword = $event"
					/>
				</div>
			</template>
			<template v-slot:primary-button>Change password</template>
			<template v-slot:secondary-button>Cancel</template>
		</cv-modal>
		<cv-modal
			:visible="userToRemove !== null"
			kind="danger"
			autoHideOff
			@modal-hidden="userToRemove = null"
			@modal-hide-request="userToRemove = null"
			@primary-click="handleRemoveUser"
		>
			<template v-slot:title>Remove user</template>
			<template v-slot:content>
				<div class="flex flex-col gap-2">
					<p>
						Remove
						<strong>{{
							userToRemove?.name || userToRemove?.email || 'this user'
						}}</strong>
						permanently?
					</p>
					<p class="text-sm text-neutral-600">This action cannot be undone.</p>
				</div>
			</template>
			<template v-slot:primary-button>Remove</template>
			<template v-slot:secondary-button>Cancel</template>
		</cv-modal>
	</ClientOnly>
</template>
