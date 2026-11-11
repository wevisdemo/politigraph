import { describe, expect, test } from 'bun:test';
import {
	getGraphNodeColor,
	getNodePictogramColor,
} from '../../src/utils/graph-node-colors';
import type { GraphqlObject } from '../../src/utils/schema';

const fallback = '#4466cc';

describe('graph node colors', () => {
	test.each([
		['เห็นด้วย', 'Agree', '#00A1AB'],
		['ไม่เห็นด้วย', 'Disagree', '#E52900'],
		['งดออกเสียง', 'Abstain', '#393939'],
		['ไม่ลงคะแนนเสียง', 'No Vote', '#8D8D8D'],
		['ลา / ขาดลงมติ', 'Absent', '#E0E0E0'],
		['นายกรัฐมนตรี', null, '#6929C4'],
	])('colors vote option %s', (option, option_en, expected) => {
		expect(
			getGraphNodeColor(
				{ __typename: 'Vote', id: 'vote', option, option_en },
				fallback,
			),
		).toBe(expected);
		if (option_en) {
			expect(
				getGraphNodeColor(
					{ __typename: 'Vote', id: 'vote', option_en },
					fallback,
				),
			).toBe(expected);
		}
	});

	test('prefers the Thai option', () => {
		expect(
			getGraphNodeColor(
				{
					__typename: 'Vote',
					id: 'vote',
					option: 'เห็นด้วย',
					option_en: 'Disagree',
				},
				fallback,
			),
		).toBe('#00A1AB');
		expect(
			getGraphNodeColor(
				{ __typename: 'Vote', id: 'vote', option_en: 'Other candidate' },
				fallback,
			),
		).toBe('#6929C4');
	});

	test.each([
		['ENACTED', '#0EE2E2'],
		['REJECTED', '#FCA08C'],
		['IN_PROGRESS', fallback],
		['MERGED', fallback],
	])('colors bill status %s', (status, expected) => {
		expect(
			getGraphNodeColor({ __typename: 'Bill', id: 'bill', status }, fallback),
		).toBe(expected);
	});

	test('keeps the default color for other nodes', () => {
		const nodes: GraphqlObject[] = [
			{ __typename: 'Person', id: 'person', option: 'เห็นด้วย' },
			{ __typename: 'VoteEvent', id: 'event', result: 'ผ่าน' },
			{ __typename: 'Vote', id: 'vote', option: null },
			{ __typename: 'Bill', id: 'bill' },
		];
		for (const node of nodes) {
			expect(getGraphNodeColor(node, '#f59e0b')).toBe('#f59e0b');
		}
	});

	test('keeps the theme pictogram color for other nodes', () => {
		expect(getNodePictogramColor('#4466cc', '#ffffff')).toBe('#ffffff');
		expect(getNodePictogramColor('#7f9bec', '#181818')).toBe('#181818');
	});

	test.each([
		['#00A1AB', '#000000'],
		['#E52900', '#000000'],
		['#393939', '#ffffff'],
		['#8D8D8D', '#000000'],
		['#E0E0E0', '#000000'],
		['#6929C4', '#ffffff'],
		['#0EE2E2', '#000000'],
		['#FCA08C', '#000000'],
	])('colors the pictogram on %s', (color, expected) => {
		expect(getNodePictogramColor(color, '#181818')).toBe(expected);
	});
});
