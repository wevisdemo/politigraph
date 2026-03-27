import { useGraphqlClient } from '~/utils/graphql/client';

export type PeopleOption = {
	label: string;
	name: string;
	value: string;
};

export function usePeopleOptions() {
	const graphqlClient = useGraphqlClient();

	return useLazyAsyncData('peopleOptions', async () => {
		const peopleOptions: PeopleOption[] = [];
		let after: string | undefined;
		let hasNextPage = true;

		while (hasNextPage) {
			const { peopleConnection } = await graphqlClient.query({
				peopleConnection: {
					__args: {
						first: 100,
						after,
						sort: [{ firstname: 'ASC' }, { lastname: 'ASC' }],
					},
					edges: {
						cursor: true,
						node: {
							id: true,
							name: true,
						},
					},
					pageInfo: {
						hasNextPage: true,
						endCursor: true,
					},
				},
			});

			peopleOptions.push(
				...(peopleConnection.edges?.map(({ node }) => ({
					value: node.id,
					name: node.name,
					label: node.name,
				})) ?? []),
			);

			hasNextPage = peopleConnection.pageInfo.hasNextPage;
			after = peopleConnection.pageInfo.endCursor ?? undefined;
		}

		return peopleOptions;
	});
}
