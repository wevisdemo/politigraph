import {
	organizationResolvers,
	postResolvers,
} from './organizations/resolvers';
import {
	alternatePersonNameResolvers,
	personResolvers,
} from './people/resolvers';
import { queryResolvers, timestampsResolvers } from './timestamps/resolvers';
import { voteResolvers } from './votes/resolvers';

export const resolvers = {
	Query: queryResolvers,
	Timestamps: timestampsResolvers,
	Organization: organizationResolvers,
	Person: personResolvers,
	Post: postResolvers,
	Vote: voteResolvers,
	AlternatePersonName: alternatePersonNameResolvers,
};
