import type { AlternatePersonName, Person } from '../../genql';

export const personResolvers = {
	name: (p: Person) => joinFullName(p.firstname, p.middlename, p.lastname),
	name_en: (p: Person) =>
		joinFullName(p.firstname_en, p.middlename_en, p.lastname_en),
};

export const alternatePersonNameResolvers = {
	name: (p: AlternatePersonName) =>
		joinFullName(p.firstname, p.middlename, p.lastname),
};

function joinFullName(...args: (string | null)[]) {
	const filteredArray: string[] = args.filter((x) => x !== null);
	return filteredArray.length > 0 ? filteredArray.join(' ') : null;
}
