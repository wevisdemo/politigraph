import type { MembershipProp } from '~/types/membership';

type EditablePost = MembershipProp['post'];

type FetchedPost = Omit<EditablePost, 'organization'> & {
	organization: EditablePost['organization'] | null;
};

const createEmptyOrganization = (): EditablePost['organization'] => ({
	id: '',
	name: '',
	classification: '',
});

export const createEmptyMembershipPost = (): EditablePost => ({
	id: '',
	role: '',
	organization: createEmptyOrganization(),
});

/**
 * Fills a missing post or post organization with empty values, so the membership forms can edit the membership
 * @param membership - membership as fetched, whose post and its organization may be null
 * @returns the membership with a complete post to edit
 */
export const withEditablePost = <T extends { post: FetchedPost | null }>(
	membership: T,
): Omit<T, 'post'> & { post: EditablePost } => ({
	...membership,
	post: membership.post
		? {
				...membership.post,
				organization: membership.post.organization ?? createEmptyOrganization(),
			}
		: createEmptyMembershipPost(),
});
