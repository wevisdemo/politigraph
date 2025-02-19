import { createAuthClient } from 'better-auth/vue';

export function useAuthClient() {
	const config = useRuntimeConfig();

	return createAuthClient({
		baseURL: `${config.public.baseUrl}/auth`,
	});
}
