import type { Organization, Person, Vote } from '~/.genql';

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
	Person: {
		name: ({ firstname, middlename, lastname }: Person) => {
			const filteredArray: string[] = [firstname, middlename, lastname].filter(
				(x) => x !== null,
			);
			return filteredArray.join(' ');
		},
		name_en: ({ firstname_en, middlename_en, lastname_en }: Person) => {
			const filteredArray: string[] = [
				firstname_en,
				middlename_en,
				lastname_en,
			].filter((x) => x !== null);
			return filteredArray.join(' ');
		},
	},
	Vote: {
		option_en: ({ option }: Vote) => {
			switch (option) {
				case 'เห็นด้วย':
					return 'Agree';
				case 'ไม่เห็นด้วย':
					return 'Disagree';
				case 'งดออกเสียง':
					return 'Abstain';
				case 'ไม่ลงคะแนนเสียง':
					return 'No Vote';
				case 'ลา / ขาดลงมติ':
					return 'Absent';
				default:
					return null;
			}
		},
	},
};
