// Some created_at / updated_at values were stored as ISO strings instead of DateTime. Convert them, then index both fields so the latest timestamp is read from the index instead of scanning every label. Property type constraints would guard the type but are Enterprise-only.

MATCH (n) WHERE n.created_at IS :: STRING NOT NULL
CALL (n) {
	SET n.created_at = datetime(n.created_at)
} IN TRANSACTIONS OF 5000 ROWS;

MATCH (n) WHERE n.updated_at IS :: STRING NOT NULL
CALL (n) {
	SET n.updated_at = datetime(n.updated_at)
} IN TRANSACTIONS OF 5000 ROWS;

CREATE INDEX index_bill_created_at IF NOT EXISTS FOR (n:Bill) ON (n.created_at);
CREATE INDEX index_bill_updated_at IF NOT EXISTS FOR (n:Bill) ON (n.updated_at);

CREATE INDEX index_bill_enact_event_created_at IF NOT EXISTS FOR (n:BillEnactEvent) ON (n.created_at);
CREATE INDEX index_bill_enact_event_updated_at IF NOT EXISTS FOR (n:BillEnactEvent) ON (n.updated_at);

CREATE INDEX index_bill_merge_event_created_at IF NOT EXISTS FOR (n:BillMergeEvent) ON (n.created_at);
CREATE INDEX index_bill_merge_event_updated_at IF NOT EXISTS FOR (n:BillMergeEvent) ON (n.updated_at);

CREATE INDEX index_bill_reject_event_created_at IF NOT EXISTS FOR (n:BillRejectEvent) ON (n.created_at);
CREATE INDEX index_bill_reject_event_updated_at IF NOT EXISTS FOR (n:BillRejectEvent) ON (n.updated_at);

CREATE INDEX index_bill_royal_assent_event_created_at IF NOT EXISTS FOR (n:BillRoyalAssentEvent) ON (n.created_at);
CREATE INDEX index_bill_royal_assent_event_updated_at IF NOT EXISTS FOR (n:BillRoyalAssentEvent) ON (n.updated_at);

CREATE INDEX index_bill_vote_event_created_at IF NOT EXISTS FOR (n:BillVoteEvent) ON (n.created_at);
CREATE INDEX index_bill_vote_event_updated_at IF NOT EXISTS FOR (n:BillVoteEvent) ON (n.updated_at);

CREATE INDEX index_membership_created_at IF NOT EXISTS FOR (n:Membership) ON (n.created_at);
CREATE INDEX index_membership_updated_at IF NOT EXISTS FOR (n:Membership) ON (n.updated_at);

CREATE INDEX index_organization_created_at IF NOT EXISTS FOR (n:Organization) ON (n.created_at);
CREATE INDEX index_organization_updated_at IF NOT EXISTS FOR (n:Organization) ON (n.updated_at);

CREATE INDEX index_post_created_at IF NOT EXISTS FOR (n:Post) ON (n.created_at);
CREATE INDEX index_post_updated_at IF NOT EXISTS FOR (n:Post) ON (n.updated_at);

CREATE INDEX index_alternate_person_name_created_at IF NOT EXISTS FOR (n:AlternatePersonName) ON (n.created_at);
CREATE INDEX index_alternate_person_name_updated_at IF NOT EXISTS FOR (n:AlternatePersonName) ON (n.updated_at);

CREATE INDEX index_person_created_at IF NOT EXISTS FOR (n:Person) ON (n.created_at);
CREATE INDEX index_person_updated_at IF NOT EXISTS FOR (n:Person) ON (n.updated_at);

CREATE INDEX index_alternate_name_created_at IF NOT EXISTS FOR (n:AlternateName) ON (n.created_at);
CREATE INDEX index_alternate_name_updated_at IF NOT EXISTS FOR (n:AlternateName) ON (n.updated_at);

CREATE INDEX index_link_created_at IF NOT EXISTS FOR (n:Link) ON (n.created_at);
CREATE INDEX index_link_updated_at IF NOT EXISTS FOR (n:Link) ON (n.updated_at);

CREATE INDEX index_vote_event_created_at IF NOT EXISTS FOR (n:VoteEvent) ON (n.created_at);
CREATE INDEX index_vote_event_updated_at IF NOT EXISTS FOR (n:VoteEvent) ON (n.updated_at);

CREATE INDEX index_vote_created_at IF NOT EXISTS FOR (n:Vote) ON (n.created_at);
CREATE INDEX index_vote_updated_at IF NOT EXISTS FOR (n:Vote) ON (n.updated_at);
