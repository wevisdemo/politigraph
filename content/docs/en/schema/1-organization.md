---
lang: en
---

# Organization

An organization is a formal grouping of people formed to carry out certain activities together. In Politigraph, organizations are stored as nodes of type **`Organization`**. Since organizations can be of various types, we use the `classification` property to specify those types.

## Parliament, MPs, Senators, and Cabinet

The Thai Parliament (รัฐสภาไทย) has a `classification` of _PARLIAMENT_ and will have child organizations in the `children` property with different `classification` values such as:

- **House of Representatives** (สภาผู้แทนราษฎร): _HOUSE_OF_REPRESENTATIVE_
- **House of Senate** (วุฒิสภา): _HOUSE_OF_SENATE_
- **Cabinet** (คณะรัฐมนตรี): _CABINET_

<QueryGraph  query="query Query($where: OrganizationWhere) { organizations(where: $where) { id name classification founding_date dissolution_date children { id name classification description founding_date dissolution_date } } }" :variables='{ "where": { "classification_EQ": "PARLIAMENT" } }'></QueryGraph>

## Political Parties

Political parties are also classified as **`Organization`** with a `classification` of _POLIITICAL_PARTY_. Here are all the political parties we have in the database.

<QueryGraph query="query Organizations($where: OrganizationWhere) { organizations(where: $where) { id name color } }" :variables='{ "where": { "classification_EQ": "POLITICAL_PARTY" } }'></QueryGraph>
