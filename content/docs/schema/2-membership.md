# การเป็นสมาชิก

บุลคล **`Person`** หรือ องก์กร **`Organization`** สามารถเป็นสมาชิก (**`Member`** union) ขององค์กรใดๆ ได้

## บุคคลที่มีตำแหน่งในองค์กร

ความสัมพันธ์ระหว่างบุคคลและองค์กรจะถูกอธิบายด้วย node ตามลำดับดังนี้

- **`Person`** คือ บุคคล
- **`Membership`** คือข้อมูลการเป็นสมาชิก เช่นรูปแบบ หรือช่วงเวลา
- **`Post`** คือตำแหน่งขององค์กรนั้นๆ
- **`Organization`** คือองค์กร

ยกตัวอย่างเช่น ถ้าเราอยากทราบว่า _ชวน หลีกภัย_ เคยเป็นสมาชิกขององก์กรใดบ้าง

<QueryGraph query="query People($where: PersonWhere) { people(where: $where) { id firstname lastname memberships { id label start_date end_date posts { id role organizations { id name classification } } } } }" :variables='{ "where": { "id_EQ": "ชวน-หลีกภัย" } }'></QueryGraph>

เนื่องจากฐานข้อมูลแบบ graph ที่แต่ละ node เชื่อมถึงกันทั้งหมด เราจะเริ่มต้น query ที่ node ใดก็ได้ เช่น ถ้าเราอยากทราบว่าเคยมีใครได้รับตำแหน่ง _หัวหน้าพรรคการเมือง_ ของ _พรรคเพื่อไทย_ บ้าง

<QueryGraph query="query Posts($where: PostWhere) { posts(where: $where) { id role organizations { id name } memberships { id start_date end_date members { ... on Person { id firstname lastname } } } } }
" :variables='{ "where": { "role_EQ": "หัวหน้าพรรคการเมือง", "organizations_SOME": { "id_EQ": "พรรคเพื่อไทย" } } }'></QueryGraph>

## พรรคฝ่ายรัฐบาลและฝ่ายค้าน

เรามองว่ามี "พรรคฝ่ายรัฐบาล" และ "พรรคฝ่ายค้าน" ก็คือตำแหน่ง **`Post`** ใน ครม. ที่มีพรรคการเมืองเป็นสมาชิก เนื่องฝ่ายของพรรคจะยึดโยงกับสมัยของ ครม. เสมอ

<QueryGraph query="query Organizations($where: OrganizationWhere, $postsWhere2: PostWhere) { organizations(where: $where) { id name posts(where: $postsWhere2) { id role memberships { id start_date end_date members { ... on Organization { id name } } } } } }" :variables='{ "where": { "id_EQ": "คณะรัฐมนตรี-63" }, "postsWhere2": { "role_STARTS_WITH": "พรรคฝ่าย" } }'></QueryGraph>
