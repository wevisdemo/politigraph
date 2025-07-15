# Parliament and Assemblies

We model Thai parliament as an **`Organization`** with a `classification` of _PARLIAMENT_. The parliament will have assemblies: organizations with _HOUSE_OF_REPRESENTATIVE_, _HOUSE_OF_SENATE_ and _CABINET_ `classification`, as children organizations.

::query-graph{query="query Query($where: OrganizationWhere) { organizations(where: $where) { id name classification founding_date dissolution_date children { id name classification description founding_date dissolution_date parents { id } } } }" :variables='{ "where": { "classification_EQ": "PARLIAMENT" } }'}
::
