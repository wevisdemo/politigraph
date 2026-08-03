import { getLanguage, useTranslations } from './i18n';

export interface NavLink {
	label: string;
	href: string;
	external?: boolean;
}

export function getNavLinks(locale?: string): NavLink[] {
	const t = useTranslations(getLanguage(locale));
	const localePrefix = locale ? `/${locale}` : '';

	return [
		{ label: t.navDocumentation, href: `${localePrefix}/getting-started` },
		{ label: t.navExplore, href: `${localePrefix}/explore` },
		{ label: t.navPlayground, href: '/graphql', external: true },
	];
}

export function isActiveNavLink({ href, external }: NavLink, pathname: string) {
	return !external && (pathname.replace(/\/$/, '') || '/').startsWith(href);
}
