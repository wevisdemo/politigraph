export const typeDefs = `#graphql
  type Person @node {
    id: ID! @id
    name: String!
    email: String
    gender: Gender
    birth_date: Date
    image: String
    national_identity: String
    posts: [Post!]! @relationship(type: "HELD", properties: "RelationWithPeriod", direction: OUT)
    created_at: DateTime! @timestamp(operations: [CREATE])
    updated_at: DateTime @timestamp(operations: [UPDATE])
  }

  type Organization @node {
    id: ID! @id
    name: String!
    classification: OrganizationType!
    founding_date: Date
    dissolution_date: Date
    image: String
    parents: [Organization!]! @relationship(type: "UNDER", properties: "Relation", direction: OUT)
    children: [Organization!]! @relationship(type: "UNDER", properties: "Relation", direction: IN)
    posts: [Post!]! @relationship(type: "IN", properties: "Relation", direction: IN)
    created_at: DateTime! @timestamp(operations: [CREATE])
    updated_at: DateTime @timestamp(operations: [UPDATE])
  }

  type Post @node {
    id: ID! @id
    label: String!
    role: String
    start_date: Date
    end_date: Date
    organizations: [Organization!]! @relationship(type: "IN", properties: "Relation", direction: OUT)
    people: [Person!]! @relationship(type: "HELD", properties: "RelationWithPeriod", direction: IN)
    created_at: DateTime! @timestamp(operations: [CREATE])
    updated_at: DateTime @timestamp(operations: [UPDATE])
  }

  type Relation @relationshipProperties {
    id: ID! @id
    created_at: DateTime! @timestamp(operations: [CREATE])
    updated_at: DateTime @timestamp(operations: [UPDATE])
  }

  type RelationWithPeriod @relationshipProperties {
    id: ID! @id
    start_date: Date
    end_date: Date
    created_at: DateTime! @timestamp(operations: [CREATE])
    updated_at: DateTime @timestamp(operations: [UPDATE])
  }

  enum Gender {
    MALE
    FEMALE
  }

  enum OrganizationType {
    PARLIAMENT
    HOUSE_OF_REPRESENTATIVE
    HOUSE_OF_SENATE
    CABINET
    POLITICAL_PARTY
  }
`;