import { describe, expect, test } from 'bun:test';
import { resolvers } from '../custom-resolvers';
import type {
	AlternatePersonName,
	Organization,
	Person,
	Post,
	Vote,
} from '../genql';

describe('Person.name', () => {
	test('joins firstname, middlename, and lastname', () => {
		const result = resolvers.Person.name({
			firstname: 'สมชาย',
			middlename: 'ใจดี',
			lastname: 'สุขสวัสดิ์',
		} as Person);
		expect(result).toBe('สมชาย ใจดี สุขสวัสดิ์');
	});

	test('handles null middlename', () => {
		const result = resolvers.Person.name({
			firstname: 'สมชาย',
			middlename: null,
			lastname: 'สุขสวัสดิ์',
		} as Person);
		expect(result).toBe('สมชาย สุขสวัสดิ์');
	});
});

describe('Person.name_en', () => {
	test('joins English names', () => {
		const result = resolvers.Person.name_en({
			firstname_en: 'Somchai',
			middlename_en: 'Jaidee',
			lastname_en: 'Suksawat',
		} as Person);
		expect(result).toBe('Somchai Jaidee Suksawat');
	});

	test('returns null when all are null', () => {
		const result = resolvers.Person.name_en({
			firstname_en: null,
			middlename_en: null,
			lastname_en: null,
		} as Person);
		expect(result).toBeNull();
	});

	test('handles null middlename_en', () => {
		const result = resolvers.Person.name_en({
			firstname_en: 'Somchai',
			middlename_en: null,
			lastname_en: 'Suksawat',
		} as Person);
		expect(result).toBe('Somchai Suksawat');
	});
});

describe('Organization.abbreviation', () => {
	test('maps CABINET', () => {
		const result = resolvers.Organization.abbreviation({
			classification: 'CABINET',
		} as Organization);
		expect(result).toBe('ครม.');
	});

	test('maps HOUSE_OF_REPRESENTATIVE', () => {
		const result = resolvers.Organization.abbreviation({
			classification: 'HOUSE_OF_REPRESENTATIVE',
		} as Organization);
		expect(result).toBe('สส.');
	});

	test('maps HOUSE_OF_SENATE', () => {
		const result = resolvers.Organization.abbreviation({
			classification: 'HOUSE_OF_SENATE',
		} as Organization);
		expect(result).toBe('สว.');
	});

	test('returns null for default classification', () => {
		const result = resolvers.Organization.abbreviation({
			classification: 'POLITICAL_PARTY',
		} as Organization);
		expect(result).toBeNull();
	});
});

describe('Organization.term', () => {
	test('extracts last word for HOUSE_OF_REPRESENTATIVE', () => {
		const result = resolvers.Organization.term({
			classification: 'HOUSE_OF_REPRESENTATIVE',
			name: 'สภาผู้แทนราษฎร ชุดที่ 26',
		} as Organization);
		expect(result).toBe('26');
	});

	test('extracts last word for CABINET', () => {
		const result = resolvers.Organization.term({
			classification: 'CABINET',
			name: 'คณะรัฐมนตรี คณะที่ 63',
		} as Organization);
		expect(result).toBe('63');
	});

	test('extracts last word for HOUSE_OF_SENATE', () => {
		const result = resolvers.Organization.term({
			classification: 'HOUSE_OF_SENATE',
			name: 'วุฒิสภา ชุดที่ 12',
		} as Organization);
		expect(result).toBe('12');
	});

	test('returns null for POLITICAL_PARTY', () => {
		const result = resolvers.Organization.term({
			classification: 'POLITICAL_PARTY',
			name: 'พรรคก้าวไกล',
		} as Organization);
		expect(result).toBeNull();
	});
});

describe('Post.label', () => {
	test('produces expected label for a house organization', () => {
		const result = resolvers.Post.label({
			role: 'สมาชิกสภาผู้แทนราษฎร',
			organizations: [
				{
					classification: 'HOUSE_OF_REPRESENTATIVE',
					name: 'สภาผู้แทนราษฎร ชุดที่ 26',
				} as Organization,
			],
		} as Post);
		expect(result).toBe('สส. ชุดที่ 26');
	});

	test('produces expected label for a political party organization', () => {
		const result = resolvers.Post.label({
			role: 'หัวหน้าพรรคการเมือง',
			organizations: [
				{
					classification: 'POLITICAL_PARTY',
					name: 'พรรคก้าวไกล',
				} as Organization,
			],
		} as Post);
		expect(result).toBe('หัวหน้าพรรคพรรคก้าวไกล');
	});

	test('returns role when no organization', () => {
		const result = resolvers.Post.label({
			role: 'ประธานสภา',
			organizations: [] as Organization[],
		} as Post);
		expect(result).toBe('ประธานสภา');
	});
});

describe('Vote.option_en', () => {
	test('maps เห็นด้วย to Agree', () => {
		const result = resolvers.Vote.option_en({
			option: 'เห็นด้วย',
		} as Vote);
		expect(result).toBe('Agree');
	});

	test('maps ไม่เห็นด้วย to Disagree', () => {
		const result = resolvers.Vote.option_en({
			option: 'ไม่เห็นด้วย',
		} as Vote);
		expect(result).toBe('Disagree');
	});

	test('maps งดออกเสียง to Abstain', () => {
		const result = resolvers.Vote.option_en({
			option: 'งดออกเสียง',
		} as Vote);
		expect(result).toBe('Abstain');
	});

	test('maps ไม่ลงคะแนนเสียง to No Vote', () => {
		const result = resolvers.Vote.option_en({
			option: 'ไม่ลงคะแนนเสียง',
		} as Vote);
		expect(result).toBe('No Vote');
	});

	test('maps ลา / ขาดลงมติ to Absent', () => {
		const result = resolvers.Vote.option_en({
			option: 'ลา / ขาดลงมติ',
		} as Vote);
		expect(result).toBe('Absent');
	});

	test('returns null for unknown option', () => {
		const result = resolvers.Vote.option_en({
			option: 'unknown',
		} as Vote);
		expect(result).toBeNull();
	});
});

describe('AlternatePersonName.name', () => {
	test('joins names correctly', () => {
		const result = resolvers.AlternatePersonName.name({
			firstname: 'สมชาย',
			middlename: 'ใจดี',
			lastname: 'สุขสวัสดิ์',
		} as AlternatePersonName);
		expect(result).toBe('สมชาย ใจดี สุขสวัสดิ์');
	});

	test('handles null middlename', () => {
		const result = resolvers.AlternatePersonName.name({
			firstname: 'สมชาย',
			middlename: null,
			lastname: 'สุขสวัสดิ์',
		} as AlternatePersonName);
		expect(result).toBe('สมชาย สุขสวัสดิ์');
	});
});
