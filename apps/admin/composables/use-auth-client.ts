import {
	adminClient,
	apiKeyClient,
	createAuthClient,
	type UserWithRole,
} from '@politigraph/auth/betterauth';
import { getSafeRedirectPath } from '~/utils/auth-redirect';

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
		plugins: [adminClient(), apiKeyClient()],
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
	successCallback?: (user: UserWithRole) => void,
) {
	const client = useAuthClient();
	const router = useRouter();
	const route = useRoute();

	onMounted(async () => {
		isValidatingSession.value = true;

		const { data: session } = await client.getSession();

		if (!session) {
			if (route.path !== '/login') {
				router.replace({
					path: '/login',
					query: route.fullPath === '/' ? {} : { redirect: route.fullPath },
				});
			}
		} else {
			if (route.path === '/login') {
				router.replace(getSafeRedirectPath(route.query.redirect));
			}

			const user = {
				...session.user,
				role: session.user.role ?? undefined,
				banned: session.user.banned ?? null,
			} satisfies UserWithRole;
			successCallback?.(user);
		}

		isValidatingSession.value = false;
	});

	return client;
}
