import type { Organization, Person } from '~/.genql';

export const resolvers = {
	Person: {
		image: ({ id }: Person) => `/images/politicians/${id}.webp`,
	},
	Organization: {
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
		image: ({ classification, id }: Organization) =>
			classification === 'POLITICAL_PARTY'
				? `/images/parties/${id.replace('พรรค', '')}.webp`
				: null,
		term: ({ classification, name }: Organization) =>
			['HOUSE_OF_REPRESENTATIVE', 'HOUSE_OF_SENATE', 'CABINET'].includes(
				classification,
			)
				? name.split(' ').at(-1)
				: null,
	},
};
