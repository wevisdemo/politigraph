export type MembershipProp = {
	id: string;
	start_date: string | null;
	end_date: string | null;
	label: string | null;
	district_number: number | null;
	list_number: number | null;
	province: string | null;
	links: Array<{
		id: string;
		url: string;
		note: string | null;
	}>;
	posts: Array<{
		id: string;
		role: string;
		organizations: Array<{
			id: string;
			name: string;
			classification: string;
		}>;
	}>;
	mode?: string;
};
