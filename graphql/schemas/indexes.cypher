CREATE INDEX index_organization_classification IF NOT EXISTS
FOR (organization:Organization)
ON (organization.classification);

CREATE INDEX index_organization_id IF NOT EXISTS
FOR (organization:Organization)
ON (organization.id);

CREATE INDEX index_person_id IF NOT EXISTS
FOR (person:Person)
ON (person.id);

CREATE INDEX index_person_firstname IF NOT EXISTS
FOR (person:Person)
ON (person.firstname);

CREATE INDEX index_person_lastname IF NOT EXISTS
FOR (person:Person)
ON (person.lastname);

CREATE INDEX index_vote_event_id IF NOT EXISTS
FOR (voteEvent:VoteEvent)
ON (voteEvent.id);

CREATE INDEX index_vote_option IF NOT EXISTS
FOR (vote:Vote)
ON (vote.option);