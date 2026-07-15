export type OrganizationWithPostsOption = {
	label: string;
	value: string;
	classification: string;
	posts: Array<{ label: string; value: string }>;
};

export function useOrganizationsWithPostsOptions() {
	const graphqlClient = useGraphqlClient();

	return useAsyncData(
		'organizations-with-posts',
		async () => {
			const { organizations } = await graphqlClient.query({
				organizations: {
					id: true,
					name: true,
					classification: true,
					posts: {
						id: true,
						role: true,
					},
				},
			});

			return organizations.map((org) => ({
				label: org.name,
				value: org.id,
				classification: org.classification,
				posts:
					org.posts?.map((p) => ({
						label: p.role,
						value: p.id,
					})) ?? [],
			}));
		},
		{ lazy: true },
	);
}
