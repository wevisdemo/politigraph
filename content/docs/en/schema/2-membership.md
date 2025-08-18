---
lang: en
---

# Membership

A person **`Person`** or an organization **`Organization`** can be a member (**`Member`** union) of any organization.

## People with positions in an organization

The relationship between a person and an organization is described by nodes in the following order:

- **`Person`** is a person.
- **`Membership`** is membership information, such as the format or period.
- **`Post`** is a position in that organization.
- **`Organization`** is an organization.

For example, if we want to know what positions _Chuan Leekpai_ has held in which organizations.

<QueryGraph query="query People($where: PersonWhere) { people(where: $where) { id name_en memberships { id label start_date end_date posts { id role organizations { id name_en name classification } } } } }" :variables='{ "where": { "firstname_en_EQ": "Chuan", "lastname_en_EQ": "Leekpai" } }'></QueryGraph>

Because the graph database connects all nodes, we can start a query from any node. For example, if we want to know who has ever held the position of _leader_ of the _Pheu Thai Party_, we can start the query from **`Post`**.

<QueryGraph query="query Posts($where: PostWhere) { posts(where: $where) { id role organizations { id name_en name } memberships { id start_date end_date members { ... on Person { id name_en } } } } }
" :variables='{ "where": { "role_EQ": "หัวหน้าพรรคการเมือง", "organizations_SOME": { "id_EQ": "พรรคเพื่อไทย" } } }'></QueryGraph>

## Government and Opposition parties

We model "Government parties (พรรคฝ่ายรัฐบาล)" and "Opposition parties (พรรคฝ่ายค้าน)" as a **`Post`** in the cabinet organization.

<QueryGraph query="query Organizations($where: OrganizationWhere, $postsWhere2: PostWhere) { organizations(where: $where) { id name_en posts(where: $postsWhere2) { id role memberships { id start_date end_date members { ... on Organization { id name } } } } } }" :variables='{ "where": { "id_EQ": "คณะรัฐมนตรี-63" }, "postsWhere2": { "role_STARTS_WITH": "พรรคฝ่าย" } }'></QueryGraph>
