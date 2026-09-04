import { serverConfig } from '@politigraph/config/server';

export function triggerPlausiblePageview(userAgent: string, clientIp: string) {
	fetch('https://analytics.punchup.world/api/event', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'user-agent': userAgent,
			'x-forwarded-for': clientIp,
		},
		body: JSON.stringify({
			name: 'pageview',
			url: `${serverConfig.siteUrl}/graphql`,
			domain: new URL(serverConfig.siteUrl).hostname,
		}),
	}).catch((error) =>
		console.error('Failed to send Plausible pageview', error),
	);
}
