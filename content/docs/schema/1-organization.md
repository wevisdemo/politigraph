# องค์กร

องค์กรคือการรวมตัวของกลุ่มคนที่ถูกจัดตั้งอย่างเป็นทางการเพื่อดำเนินกิจกรรมบางอย่างร่วมกัน ใน Politigraph องค์กรจะถูกเก็บข้อมูลใน node ประเภท **`Organization`** เนื่องจากองก์กรมีได้หลายประเภท เราใช้ field `classification` ในการระบุประเภทเหล่านั้น

## รัฐสภา สส. สว. และครม.

รัฐสภาไทย มี `classification` เป็น _PARLIAMENT_ และจะมีองค์กรย่อยใน ตาม `classification` ต่างๆ ดังนี้

- **สภาผู้แทนราษฎร (สส.)**: _HOUSE_OF_REPRESENTATIVE_
- **วุฒิสภา (สว.)**: _HOUSE_OF_SENATE_
- **คณะรัฐมนตรี (ครม.)**: _CABINET_

<QueryGraph  query="query Query($where: OrganizationWhere) { organizations(where: $where) { id name classification founding_date dissolution_date children { id name classification description founding_date dissolution_date parents { id name } } } }" :variables='{ "where": { "classification_EQ": "PARLIAMENT" } }'></QueryGraph>

## พรรคการเมือง

พรรคการเมืองก็ถูกจัดเป็น **`Organization`** ที่มี `classification` เป็น _POLITICAL_PARTY_

<QueryGraph query="query Organizations($where: OrganizationWhere) { organizations(where: $where) { id name color } }" :variables='{ "where": { "classification_EQ": "POLITICAL_PARTY" } }'></QueryGraph>
