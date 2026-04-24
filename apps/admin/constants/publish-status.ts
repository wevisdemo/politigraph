import {
	enumPublishStatus,
	type PublishStatus,
} from '@politigraph/graphql/genql';

export const publishStatusOptions: { label: string; value: PublishStatus }[] = [
	{ label: 'เผยแพร่', value: enumPublishStatus.PUBLISHED },
	{ label: 'ไม่เผยแพร่', value: enumPublishStatus.UNPUBLISHED },
];
