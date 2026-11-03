// BillMergeEvent.main_bill_id becomes a HAS_MAIN_BILL relationship. Ids pointing to no bill are dropped.

MATCH (event:BillMergeEvent), (bill:Bill {id: event.main_bill_id})
MERGE (event)-[relation:HAS_MAIN_BILL]->(bill)
ON CREATE SET relation.id = randomUUID(), relation.created_at = datetime();

MATCH (event:BillMergeEvent) WHERE event.main_bill_id IS NOT NULL
REMOVE event.main_bill_id;
