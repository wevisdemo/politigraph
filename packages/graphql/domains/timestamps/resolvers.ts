import {
	getLastBillScrapedAt,
	getLastNodeUpdatedAt,
	getLastVoteEventScrapedAt,
} from './freshness';

export const queryResolvers = {
	lastUpdatedAt: () => getLastNodeUpdatedAt(),
	timestamps: () => ({}),
};

export const timestampsResolvers = {
	lastNodeUpdatedAt: () => getLastNodeUpdatedAt(),
	lastVoteEventScrapedAt: () => getLastVoteEventScrapedAt(),
	lastBillScrapedAt: () => getLastBillScrapedAt(),
};
