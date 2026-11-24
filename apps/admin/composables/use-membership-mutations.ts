import type {
	Membership,
	MembershipUpdateInput,
} from '@politigraph/graphql/genql';
import { RepresentativeLabel } from '~/types/membership';
import type { MembershipProp } from '~/types/membership';
import type { UpdateFields } from '~/utils/update-input';
import type { Ref } from 'vue';

const membershipFields = [
	'start_date',
	'end_date',
	'label',
	'province',
	'district_number',
	'list_number',
] as const satisfies UpdateFields<MembershipUpdateInput>;

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
						__args: {
							where: { id: { eq: membership.id } },
							delete: { links: [{}] },
						},
						nodesDeleted: true,
						relationshipsDeleted: true,
					},
				}),
			),

			...updatedMemberships.flatMap((membership) => {
				const originalMembership = args.originalMemberships.value?.find(
					(s) => s.id === membership.id,
				);

				const links = diffLinks(
					originalMembership?.links ?? [],
					membership.links ?? [],
				);
				const linkOperations = [
					...(links.create.length ? [{ create: links.create }] : []),
					...(links.deleteIds.length
						? [{ delete: nodeIdsWhere(links.deleteIds) }]
						: []),
					...links.updates.map(({ id, update: node }) => ({
						update: { where: { node: { id: { eq: id } } }, node },
					})),
				];
				const isDistrict = membership.label === RepresentativeLabel.District;
				const update = {
					...changedSets(
						originalMembership,
						{
							...membership,
							province: isDistrict ? membership.province : null,
							district_number: isDistrict ? membership.district_number : null,
							list_number:
								membership.label === RepresentativeLabel.Partylist
									? membership.list_number
									: null,
						},
						membershipFields,
					),
					links: linkOperations.length ? linkOperations : undefined,
				};

				const originalPostId = originalMembership?.post?.id;
				const currentPostId = membership.post?.id;
				const postChanged = currentPostId && currentPostId !== originalPostId;

				const originalMemberId = originalMembership?.member?.id;
				const currentMemberId = membership.member?.id;
				const memberChanged =
					currentMemberId && currentMemberId !== originalMemberId;

				return [
					...(hasChanges(update)
						? [
								graphqlClient.mutation({
									updateMemberships: {
										__args: { where: { id: { eq: membership.id } }, update },
										memberships: { id: true },
									},
								}),
							]
						: []),
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
