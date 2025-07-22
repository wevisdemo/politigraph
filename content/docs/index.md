# เกริ่นนำ

**"Politigraph"** คือฐานข้อมูลการเมืองไทย พัฒนาโดย [WeVis](https://wevis.info) กลุ่มเทคโนโลยีเพื่อประชาสังคม source code ทั้งหมดของโปรเจคเป็นสาธารณะ สามารถเข้าถึงได้ที่ [GitHub](https://github.com/wevisdemo/politigraph/)

Politigraph เก็บข้อมูลในรูปแบบของ **"กราฟ (Graph)"** ซึ่งประกอบด้วย

1. **Node** แทน entity ต่างๆ ในฐานข้อมูล (มีสัญลักษณ์เป็นวงกลม) ซึ่งในแต่ละ Node จะมีข้อมูลของตัวเองเรียกว่า **Properties** เช่น node ที่แทนข้อมูลบุคคลอาจจะมี property ได้แก่ ชื่อ นามสกุล วันเกิด ฯลฯ

2. **Relationship** หรือบางครั้งก็ถูกเรียกว่า edge (มีสัญลักษณ์เป็นลูกศร) ที่แสดงถึงความสัมพันธ์ระหว่าง node เหล่านั้น

![Graph data structure](https://neo4j.com/docs/getting-started/_images/graph_concept_three_nodes-arr.svg)

เนื่องจาก node และ relationship ใน Politigraph มีจำนวนเยอะมากกว่าที่จะแสดงให้เห็นทั้งหมดได้ เราจึงต้องดึงข้อมูล (Query) ออกมาในแต่ละประเด็นที่สนใจ ยกตัวอย่างเช่น ถ้าเราสงสัยว่า _"อนุทิน ชาญวีรกูล ได้เห็นด้วยกับการลงมติอะไรบ้าง?"_ เราก็สามารถดึง node ของอนุทิน และ edges ที่เชื่อมไปถึงการโหวตเห็นด้วยและการลงมตินั้นๆ ได้

<QueryGraph query="query People($where: PersonWhere, $votesWhere2: VoteWhere) { people(where: $where) { id firstname lastname image votes(where: $votesWhere2) { id option vote_events { id title nickname result start_date end_date } } } }" :variables='{ "where": { "id_EQ": "อนุทิน-ชาญวีรกูล" }, "votesWhere2": { "vote_events_ALL": { "publish_status_EQ": "PUBLISHED" }, "option_EQ": "เห็นด้วย" } }'></QueryGraph>

เราใช้ [Neo4jGraphQL](https://neo4j.com/docs/graphql/) เป็นเครื่องมือหลักในการจัดการข้อมูล API ของเราอยู่ในมาตราฐาน GraphQL ซึ่งสามารถเรียกใช้หรือเข้าไปทดลองเล่นกับฐานข้อมูลได้ที่ https://politigraph.wevis.info/graphql
