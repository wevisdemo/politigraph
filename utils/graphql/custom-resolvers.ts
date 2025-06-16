import type { Organization } from '~/.genql';

export const resolvers = {
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
		term: ({ classification, name }: Organization) =>
			['HOUSE_OF_REPRESENTATIVE', 'HOUSE_OF_SENATE', 'CABINET'].includes(
				classification,
			)
				? name.split(' ').at(-1)
				: null,
	},
};
