# เกริ่นนำ

**"Politigraph"** คือฐานข้อมูลการเมืองไทย พัฒนาโดย [WeVis](https://wevis.info) กลุ่มเทคโนโลยีเพื่อประชาสังคม code ทั้งหมดของโปรเจคนี้เป็นสาธารณะ สามารถเข้าถึงได้ที่ [GitHub](https://github.com/wevisdemo/politigraph/)

<cv-inline-notification kind="warning" title="เราไม่สามารถรับผิดชอบข้อผิดพลาดหรือผลกระทบใดๆ จากการนำข้อมูลบน Politigraph ไปใช้">
  <template #subtitle>ข้อมูลสาธารณะเหล่านี้ถูกรวบรวม แปลงรูปแบบ และตรวจสอบโดยทีม WeVis ซึ่งเป็นทีมภาคประชาสังคมเพื่อยกระดับมาตราฐาน Open API ของประเทศไทย เราไม่ใช่หน่วยงานภาครัฐที่เป็นเจ้าของและรับผิดชอบการเผยแพร่ข้อมูลเหล่านี้โดยตรง หากมีข้อแนะนำหรือข้อเสนอแนะประการใด โปรดส่งอีเมล์มาที่ team@wevis.info หรือสร้าง Issue ใหม่บน GitHub ของโปรเจค</template>
</cv-inline-notification>

<cv-inline-notification lowContrast kind="info" title="สำหรับผู้ใช้ทั่วไปที่สนใจข้อมูลเกี่ยวกับการทำงานของรัฐสภาไทย">
  <template #subtitle>
    เราแนะนำให้ใช้ <a href="https://parliamentwatch.wevis.info" target="_blank">Parliament Watch</a> ซึ่งเป็นเว็บไซต์ที่นำข้อมูลจาก Politigraph ไปแสดงในรูปแบบที่เข้าใจง่าย
  </template>
</cv-inline-notification>

Politigraph เก็บข้อมูลในรูปแบบของ **"กราฟ (Graph)"** ซึ่งประกอบด้วย

1. **"Node"** แทน entity ต่างๆ ในฐานข้อมูล (มีสัญลักษณ์เป็นวงกลม) ซึ่งในแต่ละ node จะมีข้อมูลของตัวเองเรียกว่า **"property"** เช่น node ที่แทนข้อมูลบุคคลอาจจะมี property ได้แก่ ชื่อ นามสกุล วันเกิด ฯลฯ

2. **"Relationship"** หรือบางครั้งก็ถูกเรียกว่า edge (มีสัญลักษณ์เป็นลูกศร) ที่แสดงถึงความสัมพันธ์ระหว่าง node เหล่านั้น

![Graph data structure](https://neo4j.com/docs/getting-started/_images/graph_concept_three_nodes-arr.svg)

เนื่องจาก node และ relationship ใน Politigraph มีจำนวนเยอะมาก เราจึงต้องดึงข้อมูลออกมาในแต่ละประเด็นที่สนใจ เราจะเรียกการเขียน code เพื่อเลือก node และ relationship ที่สนใจว่า **"query"** และเรียกข้อมูลที่ได้คืนกลับมาว่า **"response"** ซึ่งอยู่ในรูปแบบ JSON ที่เป็น machine-readable สะดวกต่อการนำไปใช้ต่อ อย่างไรก็ตามเพื่อให้เห็นภาพได้ง่าย เราจะนำ response ดังกล่าวมา visualize ให้เห็นในรูปแบบกราฟ

ยกตัวอย่างเช่น ถ้าเราสงสัยว่า _"อนุทิน ชาญวีรกูล ได้เห็นด้วยกับการลงมติอะไรบ้าง?"_ เราก็สามารถดึง node ของอนุทิน และ relationships ที่เชื่อมไปถึงการโหวตเห็นด้วยจนถึงการลงมตินั้นๆ ได้

<QueryGraph query="query People($where: PersonWhere, $votesWhere2: VoteWhere) { people(where: $where) { id name image votes(where: $votesWhere2) { id option vote_events { id title nickname result start_date end_date } } } }" :variables='{ "where": { "firstname_EQ": "อนุทิน", "lastname_EQ": "ชาญวีรกูล" }, "votesWhere2": { "option_EQ": "เห็นด้วย" } }'></QueryGraph>
