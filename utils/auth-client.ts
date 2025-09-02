import type { User } from 'better-auth';
import { apiKeyClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/vue';

export const isValidatingSession = ref(true);

export function useAuthClient() {
	const config = useRuntimeConfig();

	return createAuthClient({
		baseURL: `${config.public.baseUrl}/auth`,
		plugins: [apiKeyClient()],
	});
}

export function useAuthClientWithRouteGuard(
	successCallback?: (user: User) => void,
) {
	const client = useAuthClient();
	const router = useRouter();
	const route = useRoute();

	onMounted(async () => {
		isValidatingSession.value = true;

		const { data: session } = await client.getSession();

		if (!session) {
			router.replace('/admin/login');
		} else {
			if (route.name === 'admin-login') {
				router.replace('/admin');
			}

			successCallback?.(session.user);
		}

		isValidatingSession.value = false;
	});

	return client;
}
