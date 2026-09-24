import { serverConfig } from '@politigraph/config/server';

interface PlausibleEvent {
	name: string;
	path: string;
	props?: Record<string, string>;
	userAgent: string;
	clientIp?: string;
}

export function trackEvent({
	name,
	path,
	props,
	userAgent,
	clientIp,
}: PlausibleEvent) {
	if (!serverConfig.isProduction || !clientIp) return;

	fetch('https://analytics.punchup.world/api/event', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'user-agent': userAgent,
			'x-forwarded-for': clientIp,
		},
		body: JSON.stringify({
			name,
			url: `${serverConfig.siteUrl}${path}`,
			domain: new URL(serverConfig.siteUrl).hostname,
			props,
		}),
	}).catch((error) =>
		console.error(`Failed to send Plausible event ${name}`, error),
	);
}
