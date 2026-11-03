export type AffiliationOption = {
	label: string;
	value: string;
};

export function useAffiliationOptions() {
	const graphqlClient = useGraphqlClient();

	return useAsyncData(
		'affiliationOptions',
		async () => {
			const { organizations } = await graphqlClient.query({
				organizations: {
					__args: {
						where: {
							classification: { in: ['POLITICAL_PARTY', 'HOUSE_OF_SENATE'] },
						},
						sort: [{ name: 'ASC' }],
					},
					id: true,
					name: true,
				},
			});

			return organizations.map((org) => ({
				value: org.id,
				label: org.name,
			}));
		},
		{ lazy: true },
	);
}
