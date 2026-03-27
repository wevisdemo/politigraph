import {
	apiKeyClient,
	createAuthClient,
	type User,
} from '@politigraph/auth/betterauth';

export const isValidatingSession = ref(true);

/**
 * Creates the admin auth client that talks to the backend auth endpoint.
 *
 * @returns A configured auth client instance.
 */
export function useAuthClient() {
	const config = useRuntimeConfig();

	return createAuthClient({
		baseURL: `${config.public.baseUrl}/auth`,
		plugins: [apiKeyClient()],
	});
}

/**
 * Creates the auth client and enforces the admin route guard on mount.
 *
 * Redirects unauthenticated users to `/login` and authenticated users away
 * from the login page.
 *
 * @param successCallback - Called with the current user after session validation succeeds.
 * @returns A configured auth client instance.
 */
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
			router.replace('/login');
		} else {
			if (route.name === 'admin-login') {
				router.replace('/');
			}

			successCallback?.(session.user);
		}

		isValidatingSession.value = false;
	});

	return client;
}
