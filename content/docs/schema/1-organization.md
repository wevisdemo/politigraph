# องค์กร

องค์กรคือการรวมตัวของกลุ่มคนที่ถูกจัดตั้งอย่างเป็นทางการเพื่อดำเนินกิจกรรมบางอย่างร่วมกัน ใน Politigraph องค์กรจะถูกเก็บข้อมูลใน node ประเภท **`Organization`** เนื่องจากองก์กรมีได้หลายประเภท เราใช้ field `classification` ในการระบุประเภทเหล่านั้น

## รัฐสภา สส. สว. และครม.

รัฐสภาไทย มี `classification` เป็น _PARLIAMENT_. และจะมีองค์กรย่อยใน ตาม `classification` ต่างๆ ดังนี้

- **สส.** _HOUSE_OF_REPRESENTATIVE_
- **สว.** _HOUSE_OF_SENATE_
- **ครม.** _CABINET_

::query-graph{query="query Query($where: OrganizationWhere) { organizations(where: $where) { id name classification founding_date dissolution_date children { id name classification description founding_date dissolution_date parents { id name } } } }" :variables='{ "where": { "classification_EQ": "PARLIAMENT" } }'}
::
