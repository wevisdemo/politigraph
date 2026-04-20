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
			url: 'https://politigraph.wevis.info/graphql',
			domain: 'politigraph.wevis.info',
		}),
	});
}
