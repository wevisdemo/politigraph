import type {
	AlternatePersonName,
	Organization,
	Person,
	Post,
	Vote,
} from './genql';

const Organization = {
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

const Person = {
	name: (p: Person) => joinFullName(p.firstname, p.middlename, p.lastname),
	name_en: (p: Person) =>
		joinFullName(p.firstname_en, p.middlename_en, p.lastname_en),
};

const Post = {
	label: ({ role, organizations: [org] }: Post) => {
		if (!org) return role;

		if (org.classification === 'POLITICAL_PARTY') {
			return `${role.replace('พรรคการเมือง', 'พรรค')}${org.name}`;
		}

		const abbreviation = Organization.abbreviation(org);
		const fullname = org.name.split(' ')[0] ?? '';

		return abbreviation
			? [
					role.replace('สมาชิก', '').replace(fullname, ''),
					abbreviation,
					...org.name.split(' ').slice(1),
				]
					.join(' ')
					.trim()
			: `${role} ${org.name}`;
	},
};

const Vote = {
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
};

const AlternatePersonName = {
	name: (p: AlternatePersonName) =>
		joinFullName(p.firstname, p.middlename, p.lastname),
};

export const resolvers = {
	Organization,
	Person,
	Post,
	Vote,
	AlternatePersonName,
};

function joinFullName(...args: (string | null)[]) {
	const filteredArray: string[] = args.filter((x) => x !== null);
	return filteredArray.length > 0 ? filteredArray.join(' ') : null;
}
