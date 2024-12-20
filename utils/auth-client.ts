import { createAuthClient } from 'better-auth/vue';

export const { signIn, signOut, useSession } = createAuthClient({
	baseURL: 'http://localhost:3000/auth',
});
