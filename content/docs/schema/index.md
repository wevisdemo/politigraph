# โครงสร้างของข้อมูล

เพื่อให้ฐานข้อมูลเป็นระเบียบ มีมาตรฐาน และเข้าใจง่าย เราได้ออกแบบ **โครงสร้างของข้อมูล (schema)** เพื่อกำหนดว่า node กี่ประเภท ในแต่ละประเภทมี property อะไร และ node เหล่านั้นสามารถเชื่อมต่อกันเพื่อสร้างความสัมพันธ์อย่างไรได้บ้าง

เราออกแบบ schema ของ Politigraph จาก [Popolo - International open government data specifications](https://www.popoloproject.com/) พร้อมกับการปรับปรุงให้เข้ากับ context ของประเทศไทย ซึ่ง **schema** จะประกอบด้วย

1. **Object**: ประเภทของ node ข้อมูลจริง พร้อมระบุ property ที่มีใน node ประเภทนั้นๆ
2. **Interface**: ประเภทที่เป็นข้อกำหนดพื้นฐานให้ประเภทอื่นๆ นำไปใช้ต่อ
3. **Union**: เซ็ตของประเภทที่เป็นไปได้
4. **Relationship**: ความสัมพันธ์ที่เป็นไปได้ระหว่าง node ประเภทต่างๆ

ลองเลือก entity ต่างๆ เพื่ออ่านคำอธิบาย

<SchemaGraph></SchemaGraph>

## Node

ยกตัวอย่างเช่น เรามีข้อมูลของ _"อนุทิน ชาญวีรกูล", "แพทองธาร ชินวัตร", "พิธา ลิ้มเจริญรัตน์"_ เป็น node ประเภท **`Person`** ดังนั้นทั้งสามคน จะมี property และ relationship มากกว่าตามที่กำหนดไว้ใน **`Person`** **schema** ไม่ได้ (แต่มีข้อมูลน้อยกว่า property ที่ถูกกำหนดไว้ได้ ในกรณีนี้ property นั้นๆ จะมีค่าเป็น _null_)

<QueryGraph query="query People($where: PersonWhere) { people(where: $where) { id prefix firstname lastname image birth_date educations previous_occupations }}" :variables='{ "where": { "id_IN": ["อนุทิน-ชาญวีรกูล", "แพทองธาร-ชินวัตร", "พิธา-ลิ้มเจริญรัตน์"] }}'></QueryGraph>

## Relationship

Relationship ใน **schema** จะมีชื่อเรียกพร้อมกับทิศทางตามหัวลูกศรเพื่อให้เราเข้าใจความสัมพันธ์ เช่น `Post--IN--> Organization` ทำให้เราเข้าใจว่า **`Post`** "อยู่ใน" **`Organization`** แต่ในกระบวนการ query ข้อมูล เราสามารถเข้าถึง relationship ได้ทั้งสองฝั่งของลูกศร ยกตัวอย่างเช่น **`Post`** มี property `organizations` และ **`Organization`** มี property `posts` ที่อ้างอิง node ซึ่งอยู่อีกฝั่งของ relationship นี้

<QueryGraph query="query Organizations($where: OrganizationWhere, $postsWhere2: PostWhere) { organizations(where: $where) { id name posts(where: $postsWhere2) { id role organizations { id name } } } }" :variables='{ "where": { "id_EQ": "คณะรัฐมนตรี-64" }, "postsWhere2": { "role_EQ": "นายกรัฐมนตรี" } }'></QueryGraph>
