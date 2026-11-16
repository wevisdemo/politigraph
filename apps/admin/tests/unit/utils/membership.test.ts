import {
	createEmptyMembershipPost,
	withEditablePost,
} from '~/utils/membership';
import { describe, expect, test } from 'vitest';

describe('withEditablePost', () => {
	const organization = {
		id: 'org',
		name: 'Org',
		classification: 'POLITICAL_PARTY',
	};
	const post = { id: 'post', role: 'Member', organization };

	test('keeps a complete post and fills a missing post or organization with empty values', () => {
		expect(withEditablePost({ id: 'm1', post })).toEqual({ id: 'm1', post });
		expect(withEditablePost({ id: 'm2', post: null })).toEqual({
			id: 'm2',
			post: createEmptyMembershipPost(),
		});
		expect(
			withEditablePost({ id: 'm3', post: { ...post, organization: null } }),
		).toEqual({
			id: 'm3',
			post: { ...post, organization: createEmptyMembershipPost().organization },
		});
	});
});
