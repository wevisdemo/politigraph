import type { BillEvent } from '@politigraph/graphql/genql';

export const eventTypeLabels: Record<BillEvent['__typename'], string> = {
	BillEnactEvent: 'ประกาศเป็นกฎหมาย',
	BillMergeEvent: 'รวมร่าง',
	BillRejectEvent: 'ตกไป',
	BillRoyalAssentEvent: 'ทูลเกล้าทูลกระหม่อมถวาย',
	BillVoteEvent: 'ลงมติ',
};
