CREATE CONSTRAINT constraint_person_id IF NOT EXISTS
FOR (person:Person)
REQUIRE person.id IS UNIQUE;

CREATE CONSTRAINT constraint_organization_id IF NOT EXISTS
FOR (organization:Organization)
REQUIRE organization.id IS UNIQUE;

CREATE CONSTRAINT constraint_membership_id IF NOT EXISTS
FOR (membership:Membership)
REQUIRE membership.id IS UNIQUE;

CREATE CONSTRAINT constraint_post_id IF NOT EXISTS
FOR (post:Post)
REQUIRE post.id IS UNIQUE;

CREATE CONSTRAINT constraint_bill_id IF NOT EXISTS
FOR (bill:Bill)
REQUIRE bill.id IS UNIQUE;

CREATE CONSTRAINT constraint_vote_event_id IF NOT EXISTS
FOR (voteEvent:VoteEvent)
REQUIRE voteEvent.id IS UNIQUE;

CREATE CONSTRAINT constraint_bill_vote_event_id IF NOT EXISTS
FOR (billVoteEvent:BillVoteEvent)
REQUIRE billVoteEvent.id IS UNIQUE;

CREATE CONSTRAINT constraint_vote_id IF NOT EXISTS
FOR (vote:Vote)
REQUIRE vote.id IS UNIQUE;

CREATE CONSTRAINT constraint_link_id IF NOT EXISTS
FOR (link:Link)
REQUIRE link.id IS UNIQUE;

CREATE INDEX index_bill_lis_id IF NOT EXISTS
FOR (bill:Bill)
ON (bill.lis_id);

CREATE INDEX index_vote_event_msbis_id IF NOT EXISTS
FOR (voteEvent:VoteEvent)
ON (voteEvent.msbis_id);

CREATE INDEX index_bill_vote_event_msbis_id IF NOT EXISTS
FOR (billVoteEvent:BillVoteEvent)
ON (billVoteEvent.msbis_id);

CREATE INDEX index_vote_event_start_date IF NOT EXISTS
FOR (voteEvent:VoteEvent)
ON (voteEvent.start_date);

CREATE INDEX index_vote_option IF NOT EXISTS
FOR (vote:Vote)
ON (vote.option);
