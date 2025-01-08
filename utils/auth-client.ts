import { createAuthClient } from 'better-auth/vue';

export function useAuthClient() {
	const config = useRuntimeConfig();

	const { signIn, signOut, useSession } = createAuthClient({
		baseURL: `${config.public.baseUrl}/auth`,
	});

	return {
		signIn,
		signOut,
		session: useSession(),
	};
}
