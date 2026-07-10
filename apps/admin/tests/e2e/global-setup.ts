import { request } from '@playwright/test';
import { TEST_USER } from './fixtures';

async function globalSetup() {
	const apiContext = await request.newContext({
		baseURL: 'http://localhost:3000',
	});

	await apiContext.post('/auth/sign-up/email', {
		data: {
			email: TEST_USER.email,
			password: TEST_USER.password,
			name: 'Admin',
		},
		headers: { Origin: 'http://localhost:8000' },
	});

	await apiContext.dispose();
}

export default globalSetup;
