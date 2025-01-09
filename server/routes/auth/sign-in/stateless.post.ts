export default defineEventHandler(async (event) => {
	const loginRes = await fetch('http://localhost:3000/auth/sign-in/email', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			...(await readBody(event)),
			rememberMe: false,
		}),
	});

	await forwardResponseErrorIfExist(loginRes);

	const [authCookie] = loginRes.headers.getSetCookie();

	const tokenRes = await fetch('http://localhost:3000/auth/token', {
		headers: {
			Cookie: authCookie,
		},
	});

	await forwardResponseErrorIfExist(tokenRes);

	const { token } = await tokenRes.json();

	const signoutRes = await fetch('http://localhost:3000/auth/sign-out', {
		method: 'POST',
		headers: {
			Cookie: authCookie,
		},
	});

	await forwardResponseErrorIfExist(signoutRes);

	return token;
});

async function forwardResponseErrorIfExist(res: Response) {
	if (res.ok) return;

	throw createError({
		status: res.status,
		statusText: res.statusText,
		statusMessage: await res.text(),
	});
}
