import type { Membership } from '@politigraph/graphql/genql';
import { RepresentativeLabel } from '~/types/membership';
import type { MembershipProp } from '~/types/membership';
import type { Ref } from 'vue';

type OriginalMembership = Partial<Membership> &
	Pick<MembershipProp, 'members' | 'memberType' | 'mode'>;

export function useMembershipMutations(args: {
	memberType: 'Person' | 'Organization';
	memberId: Ref<string | undefined>;
	originalMemberships: Ref<OriginalMembership[] | null>;
}) {
	const graphqlClient = useGraphqlClient();

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
					m.posts?.[0]?.id !== orig.posts?.[0]?.id ||
					m.posts?.[0]?.organizations?.[0]?.id !==
						orig.posts?.[0]?.organizations?.[0]?.id ||
					JSON.stringify(m.links) !== JSON.stringify(orig.links) ||
					m.members?.[0]?.id !== orig.members?.[0]?.id ||
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
			...newMemberships.map((membership) =>
				graphqlClient.mutation({
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
									members: {
										...(membership.members?.[0]?.id
											? {
													[membership.memberType ?? 'Person']: {
														connect: [
															{
																where: {
																	node: {
																		id: { eq: membership.members[0].id },
																	},
																},
															},
														],
													},
												}
											: {
													[args.memberType]: {
														connect: [
															{
																where: {
																	node: { id: { eq: args.memberId.value } },
																},
															},
														],
													},
												}),
									},
									posts: {
										connect: [
											{
												where: {
													node: { id: { eq: membership.posts[0]?.id } },
												},
											},
										],
									},
								},
							],
						},
						memberships: { id: true },
					},
				}),
			),

			...deleteMemberships.map((membership) =>
				graphqlClient.mutation({
					deleteMemberships: {
						__args: { where: { id: { eq: membership.id } } },
						nodesDeleted: true,
						relationshipsDeleted: true,
					},
				}),
			),

			...updatedMemberships.map((membership) => {
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

				const originalPostId = originalMembership?.posts?.[0]?.id;
				const currentPostId = membership.posts?.[0]?.id;
				const postChanged = currentPostId && currentPostId !== originalPostId;

				const originalMemberId = originalMembership?.members?.[0]?.id;
				const currentMemberId = membership.members?.[0]?.id;
				const memberType = membership.memberType || args.memberType;
				const memberChanged =
					currentMemberId && currentMemberId !== originalMemberId;

				return graphqlClient.mutation({
					updateMemberships: {
						__args: {
							where: { id: { eq: membership.id } },
							update: {
								start_date: { set: membership.start_date },
								end_date: { set: membership.end_date },
								posts: postChanged
									? [
											{
												disconnect: [
													{
														where: {
															node: { id: { eq: originalPostId } },
														},
													},
												],
												connect: [
													{
														where: {
															node: { id: { eq: currentPostId } },
														},
													},
												],
											},
										]
									: currentPostId
										? [
												{
													update: {
														node: {
															role: { set: membership.posts[0]?.role },
														},
													},
												},
											]
										: [],
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
								members: memberChanged
									? {
											[memberType]: [
												{
													disconnect: originalMemberId
														? [
																{
																	where: {
																		node: {
																			id: { eq: originalMemberId },
																		},
																	},
																},
															]
														: [],
													connect: [
														{
															where: {
																node: {
																	id: { eq: currentMemberId },
																},
															},
														},
													],
												},
											],
										}
									: {},
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
				});
			}),
		];
	};

	return { buildMembershipMutations };
}
