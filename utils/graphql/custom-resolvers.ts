import type { Organization, Person, VoteEvent } from '~/.genql';

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
		image: ({ id, classification }: Organization) =>
			classification === 'POLITICAL_PARTY'
				? `/images/parties/${id.replace('พรรค', '')}.webp`
				: null,
	},
	VoteEvent: {
		created_at: ({ created_at }: VoteEvent) => `${created_at}`,
	},
};
