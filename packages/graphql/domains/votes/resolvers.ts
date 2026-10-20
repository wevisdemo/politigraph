import type { Vote } from '../../genql';

export const voteResolvers = {
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
