export const standardVoteOptions = [
	'เห็นด้วย',
	'ไม่เห็นด้วย',
	'งดออกเสียง',
	'ไม่ลงคะแนน',
	'ลา / ขาดลงมติ',
];

export const voteCountKeyMap = new Map<
	string,
	'agree_count' | 'disagree_count' | 'novote_count' | 'abstain_count'
>([
	['เห็นด้วย', 'agree_count'],
	['ไม่เห็นด้วย', 'disagree_count'],
	['งดออกเสียง', 'abstain_count'],
	['ไม่ลงคะแนน', 'novote_count'],
]);
