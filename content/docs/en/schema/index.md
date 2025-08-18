---
lang: en
---

# Schema

To ensure the database is organized, standardized, and easy to understand, we have designed a **schema** to define how many types of nodes exist, what properties each type has, and how these nodes can be connected to create relationships.

We designed the Politigraph schema based on [Popolo - International open government data specifications](https://www.popoloproject.com/) with adaptations for the context of Thailand. The **schema** consists of:

1. **Object**: Types of actual data nodes, specifying the properties present in each node type.
2. **Interface**: Basic requirements for object to extend.
3. **Union**: Sets of possible types.
4. **Relationship**: Possible relationships between different node types.

Feel free to select entities to read the descriptions.

<SchemaGraph></SchemaGraph>

## Node

For example, we have these people with first-name starting with _"Nat"_ represented with nodes type of **`Person`**. These nodes will only have property and relationship that satisfied **`Person`** **schema** (they don't need to have optional properties, so querying those will have value of _null_)

<QueryGraph query="query People($where: PersonWhere) { people(where: $where) { id prefix name_en image birth_date educations previous_occupations }}" :variables='{ "where": { "firstname_en_STARTS_WITH": "Nat" }}'></QueryGraph>

## Relationship

Relationship in **schema** will have a name with arrow direction for human interpretation such as `Post--IN--> Organization` meaning **`Post`** is "in" an **`Organization`** But in the query process, either nodes at the both end can be queried from each other. For example, **`Post`** has property `organizations` and **`Organization`** has property `posts` that refer to reach other node of this relationship.

<QueryGraph query="query Organizations($where: OrganizationWhere, $postsWhere2: PostWhere) { organizations(where: $where) { id name_en posts(where: $postsWhere2) { id role organizations { id name } } } }" :variables='{ "where": { "id_EQ": "คณะรัฐมนตรี-64" }, "postsWhere2": { "role_EQ": "นายกรัฐมนตรี" } }'></QueryGraph>
