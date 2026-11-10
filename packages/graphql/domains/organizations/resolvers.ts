import type { Organization, Post } from '../../genql';

export const organizationResolvers = {
	abbreviation: ({ classification }: Organization) => {
		switch (classification) {
			case 'CABINET':
				return 'ครม.';
			case 'HOUSE_OF_REPRESENTATIVE':
				return 'สส.';
			case 'HOUSE_OF_SENATE':
				return 'สว.';
			default:
				return null;
		}
	},
	term: ({ classification, name }: Organization) =>
		['HOUSE_OF_REPRESENTATIVE', 'HOUSE_OF_SENATE', 'CABINET'].includes(
			classification,
		)
			? name.split(' ').at(-1)
			: null,
};

export const postResolvers = {
	label: ({ role, organization }: Post) => {
		if (!organization) return role;

		if (organization.classification === 'POLITICAL_PARTY') {
			return `${role.replace('พรรคการเมือง', 'พรรค')}${organization.name}`;
		}

		const abbreviation = organizationResolvers.abbreviation(organization);
		const fullname = organization.name.split(' ')[0] ?? '';

		return abbreviation
			? [
					role.replace('สมาชิก', '').replace(fullname, ''),
					abbreviation,
					...organization.name.split(' ').slice(1),
				]
					.join(' ')
					.trim()
			: `${role} ${organization.name}`;
	},
};
