import type { Membership } from '@politigraph/graphql/genql';
import { RepresentativeLabel } from '~/types/membership';
import type { MembershipProp } from '~/types/membership';
import type { Ref } from 'vue';

type OriginalMembership = Partial<Membership> &
	Pick<MembershipProp, 'memberType' | 'mode'>;

export function useMembershipMutations(args: {
	memberType: 'Person' | 'Organization';
	memberId: Ref<string | undefined>;
	originalMemberships: Ref<OriginalMembership[] | null>;
}) {
	const graphqlClient = useGraphqlClient();

	const relinkMembership = async (
		action: 'connect' | 'disconnect',
		type: 'Person' | 'Organization' | 'Post',
		id: string | undefined,
		membershipId: string,
	) => {
		if (!id) return;
		const where = { where: { node: { id: { eq: membershipId } } } };
		const __args = {
			where: { id: { eq: id } },
			update: {
				memberships: [
					action === 'connect' ? { connect: [where] } : { disconnect: [where] },
				],
			},
		};
		const info = { relationshipsCreated: true };

		if (type === 'Post') {
			await graphqlClient.mutation({ updatePosts: { __args, info } });
		} else if (type === 'Person') {
			await graphqlClient.mutation({ updatePeople: { __args, info } });
		} else {
			await graphqlClient.mutation({ updateOrganizations: { __args, info } });
		}
	};

	const buildMembershipMutations = (editableMemberships: MembershipProp[]) => {
		const deletedMemberships = editableMemberships.filter(
			(m) => m.mode === 'deleted',
		);

		const activeMemberships = editableMemberships.filter(
			(m) => m.mode !== 'deleted',
		);

		const changedMemberships = activeMemberships
			.filter((m) => {
				const orig = args.originalMemberships.value?.find((o) => o.id === m.id);
				if (!orig) return true;
				return (
					m.start_date !== orig.start_date ||
					m.end_date !== orig.end_date ||
					m.post?.id !== orig.post?.id ||
					m.post?.organization?.id !== orig.post?.organization?.id ||
					JSON.stringify(m.links) !== JSON.stringify(orig.links) ||
					m.member?.id !== orig.member?.id ||
					m.memberType !== orig.memberType
				);
			})
			.map(({ mode: _, ...rest }) => rest);

		const newMemberships = changedMemberships.filter(
			(m) => !args.originalMemberships.value?.find((o) => o.id === m.id),
		);
		const updatedMemberships = changedMemberships.filter((m) =>
			args.originalMemberships.value?.find((o) => o.id === m.id),
		);

		const deleteMemberships = [
			...deletedMemberships,
			...(args.originalMemberships.value ?? []).filter(
				(ol) =>
					!activeMemberships.some((el) => el.id === ol.id) &&
					!deletedMemberships.some((d) => d.id === ol.id),
			),
		];

		return [
			...newMemberships.map(async (membership) => {
				const { createMemberships } = await graphqlClient.mutation({
					createMemberships: {
						__args: {
							input: [
								{
									label: membership.label,
									...(membership.label === RepresentativeLabel.District
										? {
												district_number: membership.district_number,
												province: membership.province,
											}
										: membership.label === RepresentativeLabel.Partylist
											? { list_number: membership.list_number }
											: {}),
									start_date: membership.start_date,
									end_date: membership.end_date,
									links: {
										create: membership.links.map(({ note, url }) => ({
											node: { note, url },
										})),
									},
								},
							],
						},
						memberships: { id: true },
					},
				});
				const membershipId = createMemberships.memberships[0]!.id;
				const member = membership.member?.id
					? {
							type: membership.memberType || 'Person',
							id: membership.member.id,
						}
					: { type: args.memberType, id: args.memberId.value };

				try {
					await Promise.all([
						relinkMembership('connect', member.type, member.id, membershipId),
						relinkMembership(
							'connect',
							'Post',
							membership.post.id,
							membershipId,
						),
					]);
				} catch (error) {
					await graphqlClient.mutation({
						deleteMemberships: {
							__args: {
								where: { id: { eq: membershipId } },
								delete: { links: [{}] },
							},
							nodesDeleted: true,
						},
					});
					throw error;
				}
			}),

			...deleteMemberships.map((membership) =>
				graphqlClient.mutation({
					deleteMemberships: {
						__args: { where: { id: { eq: membership.id } } },
						nodesDeleted: true,
						relationshipsDeleted: true,
					},
				}),
			),

			...updatedMemberships.flatMap((membership) => {
				const originalMembership = args.originalMemberships.value?.find(
					(s) => s.id === membership.id,
				);

				const originalLinkIds = new Set(
					originalMembership?.links?.map((l) => l.id) ?? [],
				);
				const currentLinkIds = new Set(
					membership.links?.map((l) => l.id) ?? [],
				);

				const newLinks =
					membership.links?.filter((l) => !originalLinkIds.has(l.id)) ?? [];
				const deletedLinks =
					originalMembership?.links?.filter((l) => !currentLinkIds.has(l.id)) ??
					[];
				const updatedLinks =
					membership.links?.filter((l) => originalLinkIds.has(l.id)) ?? [];

				const originalPostId = originalMembership?.post?.id;
				const currentPostId = membership.post?.id;
				const postChanged = currentPostId && currentPostId !== originalPostId;

				const originalMemberId = originalMembership?.member?.id;
				const currentMemberId = membership.member?.id;
				const memberChanged =
					currentMemberId && currentMemberId !== originalMemberId;

				return [
					graphqlClient.mutation({
						updateMemberships: {
							__args: {
								where: { id: { eq: membership.id } },
								update: {
									start_date: { set: membership.start_date },
									end_date: { set: membership.end_date },
									label: { set: membership.label },
									province: {
										set:
											membership.label === RepresentativeLabel.District
												? membership.province
												: null,
									},
									district_number: {
										set:
											membership.label === RepresentativeLabel.District
												? membership.district_number
												: null,
									},
									list_number: {
										set:
											membership.label === RepresentativeLabel.Partylist
												? membership.list_number
												: null,
									},
									links: [
										...newLinks.map((link) => ({
											create: [
												{
													node: {
														url: link.url,
														note: link.note,
													},
												},
											],
										})),
										...deletedLinks.map((link) => ({
											delete: [{ where: { node: { id: { eq: link.id } } } }],
										})),
										...updatedLinks.map((link) => ({
											update: {
												where: {
													node: {
														id: {
															eq: link.id,
														},
													},
												},
												node: {
													url: { set: link.url },
													note: { set: link.note },
												},
											},
										})),
									],
								},
							},
							memberships: { id: true },
						},
					}),
					...(postChanged
						? [
								relinkMembership(
									'connect',
									'Post',
									currentPostId,
									membership.id,
								).then(() =>
									relinkMembership(
										'disconnect',
										'Post',
										originalPostId,
										membership.id,
									),
								),
							]
						: []),
					...(memberChanged
						? [
								relinkMembership(
									'connect',
									membership.memberType || args.memberType,
									currentMemberId,
									membership.id,
								).then(() =>
									relinkMembership(
										'disconnect',
										originalMembership?.memberType || args.memberType,
										originalMemberId,
										membership.id,
									),
								),
							]
						: []),
				];
			}),
		];
	};

	return { buildMembershipMutations };
}
