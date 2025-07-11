# Parliament and Assemblies

We model Thai parliament as an **`Organization`** with a `classification` of _PARLIAMENT_. The parliament will have assemblies: organizations with _HOUSE_OF_REPRESENTATIVE_, _HOUSE_OF_SENATE_ and _CABINET_ `classification`, as children organizations.

::query-graph{query="query Query($where: OrganizationWhere) { organizations(where: $where) { id name classification children { id name classification } } }" :variables='{ "where": { "classification_EQ": "PARLIAMENT" } }'}
::
