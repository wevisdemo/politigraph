import type {
	Bill,
	BillMergeEvent,
	BillRejectEvent,
	Event,
	Organization,
	Person,
	Post,
	Vote,
} from '~/.genql';

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

		return abbreviation
			? [abbreviation, ...org.name.split(' ').slice(1)].join(' ')
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

interface BillWithResolveType extends Bill {
	bill_events: (Event & { __resolveType: Event['__typename'] })[];
}

const getRejectEventStatus = (event: BillRejectEvent): string => {
	if (!event.reject_reason || event.reject_reason.length > 50) {
		return 'ตกไป';
	}
	return event.reject_reason;
};
const Bill = {
	status: ({ id, bill_events }: BillWithResolveType) => {
		if (bill_events && Array.isArray(bill_events)) {
			// ถูกรวมร่าง
			if (
				bill_events.some((event) => event.__resolveType === 'BillMergeEvent')
			) {
				// Check id there is main bill
				const merge_event = bill_events.find(
					(event) => event.__resolveType === 'BillMergeEvent',
				) as BillMergeEvent | undefined;
				if (merge_event && merge_event.main_bill_id !== id) {
					// this bill is not main bill
					return 'ถูกรวมร่าง';
				}
			}

			// ร่างกฎหมายผ่าน
			if (
				bill_events.some((event) => event.__resolveType === 'BillEnforceEvent')
			) {
				return 'ประกาศในราชกิจจานุเบกษา';
			}

			// ร่างกฎหมายตกไป
			if (
				bill_events.some((event) => event.__resolveType === 'BillRejectEvent')
			) {
				const reject_event = bill_events.find(
					(event) => event.__resolveType === 'BillRejectEvent',
				) as BillRejectEvent | undefined;
				if (!reject_event) {
					return 'ตกไป';
				}
				const reject_status = getRejectEventStatus(reject_event);
				if (reject_status.includes('ตกไป')) {
					return reject_status;
				}
				return 'ตกไปเนื่องจาก' + reject_status;
			}

			// นำขึ้นทูลเกล้าทูลกระหม่อมถวาย
			if (
				bill_events.some(
					(event) => event.__resolveType === 'BillRoyalAssentEvent',
				)
			) {
				return 'นำขึ้นทูลเกล้าทูลกระหม่อมถวาย';
			}
		}
		return 'กำลังดำเนินการ';
	},
};

export const resolvers = {
	Organization,
	Person,
	Post,
	Vote,
	Bill,
};

function joinFullName(...args: (string | null)[]) {
	const filteredArray: string[] = args.filter((x) => x !== null);
	return filteredArray.length > 0 ? filteredArray.join(' ') : null;
}
