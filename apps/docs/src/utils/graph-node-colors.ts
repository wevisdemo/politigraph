import type { GraphqlObject } from './schema';

const voteColors = new Map([
	['เห็นด้วย', '#00A1AB'],
	['Agree', '#00A1AB'],
	['ไม่เห็นด้วย', '#E52900'],
	['Disagree', '#E52900'],
	['งดออกเสียง', '#393939'],
	['Abstain', '#393939'],
	['ไม่ลงคะแนนเสียง', '#8D8D8D'],
	['No Vote', '#8D8D8D'],
	['ลา / ขาดลงมติ', '#E0E0E0'],
	['Absent', '#E0E0E0'],
]);

const billColors = new Map([
	['ENACTED', '#0EE2E2'],
	['REJECTED', '#FCA08C'],
]);

export function getGraphNodeColor(node: GraphqlObject, fallback: string) {
	if (node.__typename === 'Vote') {
		const option = node.option || node.option_en;
		return typeof option === 'string'
			? (voteColors.get(option) ?? '#6929C4')
			: fallback;
	}

	if (node.__typename === 'Bill' && typeof node.status === 'string') {
		return billColors.get(node.status) ?? fallback;
	}

	return fallback;
}

const pictogramColors = new Map([
	['#00A1AB', '#000000'],
	['#E52900', '#000000'],
	['#393939', '#ffffff'],
	['#8D8D8D', '#000000'],
	['#E0E0E0', '#000000'],
	['#6929C4', '#ffffff'],
	['#0EE2E2', '#000000'],
	['#FCA08C', '#000000'],
]);

export function getNodePictogramColor(color: string, fallback: string) {
	return pictogramColors.get(color) ?? fallback;
}
