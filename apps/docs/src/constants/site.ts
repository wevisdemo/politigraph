const DEV_SITE_URL = 'http://localhost:4321';

export const SITE_URL =
	import.meta.env.PUBLIC_SITE_URL ||
	(import.meta.env.DEV ? DEV_SITE_URL : import.meta.env.SITE);
