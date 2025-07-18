# โครงสร้างของข้อมูล

เพื่อให้ฐานข้อมูลเป็นระเบียบ มีมาตราฐาน และเข้าใจง่าย เราได้ออกแบบโครงสร้าง (Schema) ที่ตายตัวไว้ เพื่อกำหนดว่า node กี่ประเภท ในแต่ละประเภทมีข้อมูลอะไร (Fields) และ node เหล่านั้นสามารถเชื่อมต่อกันเพื่อสร้างความสัมพันธ์อย่างไรได้บ้าง

เราออกแบบ Schema ของ Politigraph จาก [Popolo - International open government data specifications](https://www.popoloproject.com/) พร้อมกับการปรับปรุงให้เข้ากับ context ของประเทศไทย ซึ่ง โครงสร้างของข้อมูลประกอบด้วย

1. **Object**: ประเภทของ node ข้อมูลจริง
2. **Interface**: ประเภทที่เป็นข้อกำหนดพื้นฐานให้ประเภทอื่นๆ นำไปใช้ต่อ
3. **Union**: เซ็ตของประเภทที่เป็นไปได้
4. **Relationship**: ความสัมพันธ์ที่เป็นไปได้ระหว่างประเภทต่างๆ

::schema-graph
::

ยกตัวอย่างเช่น เรามีข้อมูลของ _"อนุทิน ชาญวีรกูล", "แพทองธาร ชินวัตร", "พิธา ลิ้มเจริญรัตน์"_ เป็น node ประเภท **`Person`** ดังนั้นทั้งสามคน จะมี fields และ relationships มากกว่าตามที่กำหนดไว้ใน **`Person`** schema ไม่ได้ (บาง field ไม่ได้บังคับว่าต้องมีข้อมูล ในกรณีนั้นจะมีค่าเป็น _null_)

::query-graph{query="query People($where: PersonWhere) { people(where: $where) { id prefix firstname lastname image birth_date educations previous_occupations }}" :variables='{ "where": { "id_IN": ["อนุทิน-ชาญวีรกูล", "แพทองธาร-ชินวัตร", "พิธา-ลิ้มเจริญรัตน์"] }}'}
::
