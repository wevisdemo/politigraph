// Bill.lis_id (Int) -> Bill.lis_ids ([Int]). Range indexes do not serve `x IN lis_ids`, so no replacement index.

MATCH (bill:Bill)
WHERE bill.lis_id IS NOT NULL AND bill.lis_ids IS NULL
SET bill.lis_ids = [bill.lis_id];

MATCH (bill:Bill)
WHERE bill.lis_id IS NOT NULL
REMOVE bill.lis_id;

DROP INDEX index_bill_lis_id IF EXISTS;
