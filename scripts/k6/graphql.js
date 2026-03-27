import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import http from 'k6/http';

export let options = {
	stages: [
		{ duration: '20s', target: 20 }, // simulate ramp-up of traffic from 1 to 20 virtual
		{ duration: '20s', target: 20 }, // stay at 20 virtual users
		{ duration: '20s', target: 0 }, // ramp-down to 0 virtual users
	],
};

const payloads = new SharedArray('graphql_payloads', () => [
	{
		query: `
 			query Bills($where: BillWhere) {
         bills(where: $where) {
           id
           title
           creators {
             ... on Person {
               id
               name
             }
           }
           status
         }
       }
    `,
		variables: {
			where: {
				OR: [
					{
						creators: {
							single: {
								Person: {
									firstname: {
										eq: 'อนุทิน',
									},
									lastname: {
										eq: 'ชาญวีรกูล',
									},
								},
							},
						},
					},
					{
						co_creators: {
							some: {
								firstname: {
									eq: 'อนุทิน',
								},
								lastname: {
									eq: 'ชาญวีรกูล',
								},
							},
						},
					},
				],
			},
		},
	},
	{
		query: `
 			query Bills($where: BillWhere) {
         bills(where: $where) {
           id
           title
           creators {
             ... on Person {
               id
               name
             }
           }
           status
         }
       }
    `,
		variables: {
			where: {
				OR: [
					{
						creators: {
							single: {
								Person: {
									firstname: {
										eq: 'อนุทิน',
									},
									lastname: {
										eq: 'ชาญวีรกูล',
									},
								},
							},
						},
					},
					{
						co_creators: {
							some: {
								firstname: {
									eq: 'อนุทิน',
								},
								lastname: {
									eq: 'ชาญวีรกูล',
								},
							},
						},
					},
				],
			},
		},
	},
	{
		query: `
  			query Votes($limit: Int, $where: VoteWhere) {
         votes(limit: $limit, where: $where) {
           id
           voter_name_raw
           option
           vote_events {
             id
             title
           }
         }
       }
    `,
		variables: {
			limit: 1000,
			where: {
				voters: {
					single: {
						memberships: {
							some: {
								posts: {
									single: {
										organizations: {
											single: {
												classification: {
													eq: 'POLITICAL_PARTY',
												},
												name: {
													eq: 'เพื่อไทย',
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
	{
		query: `
 			query Votes($where: VoteWhere) {
         votes(where: $where) {
           id
           voter_name_raw
           option
         }
       }
    `,
		variables: {
			where: {
				vote_events: {
					single: {
						id: {
							eq: 'e38ffbce-8a25-482d-a110-49045ee454fd',
						},
					},
				},
				option: {
					eq: 'เห็นด้วย',
				},
			},
		},
	},
	{
		query: `
 			query People($where: PersonWhere) {
         people(where: $where) {
           id
           prefix
           firstname
           middlename
           lastname
         }
       }
    `,
		variables: {
			where: {
				memberships: {
					some: {
						posts: {
							some: {
								organizations: {
									some: {
										classification: {
											eq: 'POLITICAL_PARTY',
										},
										name: {
											eq: 'เพื่อไทย',
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
]);

export default function () {
	const url = 'https://politigraph-test.wevis.info/graphql';
	const headers = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};

	const selectedPayload = payloads[randomIntBetween(0, payloads.length - 1)];
	const payload = JSON.stringify(selectedPayload);

	const res = http.post(url, payload, { headers: headers });

	check(res, {
		'is status 200': (r) => {
			if (r.status !== 200) {
				console.error(`${r.error_code} - ${r.error}`);
			}

			return r.status === 200;
		},
		'body contains data': (r) => r.body.includes('data'),
	});

	sleep(0.5); // Simulate some user think time
}
