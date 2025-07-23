# การลงมติ

เราทำการเก็บข้อมูลการลงมติของทั้งสองสภาคือ สส. และ สว. โดยมี **`VoteEvent`** แทนเหตุการการลงมติ และ **`Vote`** แทนการออกเสียงของแต่ละ **`Person`**

ตัวเลือกการออกเสียง (property `option` ใน **`Vote`**) ของการลงมติในสภาโดยทั่วไปจะมี 5 รูปแบบ

1. เห็นด้วย
2. ไม่เห็นด้วย
3. งดออกเสียง
4. ไม่ลงคะแนนเสียง
5. ลา / ขาดลงมติ

ยกตัวอย่างเช่น ร่าง พ.ร.บ. งบประมาณ 2564 (วาระ 3) และการออกเสียงของผู้มีสิทธ์เข้าร่วมลงมติ 20 คนแรก

<QueryGraph query="query VoteEvents($where: VoteEventWhere, $limit: Int, $votesLimit2: Int) { voteEvents(where: $where, limit: $limit) { id title nickname publish_status start_date result votes(limit: $votesLimit2) { id option voters { id firstname lastname } } } }" :variables='{ "where": { "id_EQ": "fd854f98-a9c0-4ef2-b007-58821da695dc" }, "limit": 1, "votesLimit2": 20 }'></QueryGraph>

## การอัพเดตข้อมูลและสถานะการเผยแพร่

การลงมติของสส. จะถูก [ระบบ automation](https://github.com/wevisdemo/politigraph-automation) ดึงข้อมูลมาจากเว็บไซต์ [ระบบฐานข้อมูลรายงานและบันทึกการประชุม](https://msbis.parliament.go.th) ของสำนักงานเลขาธิการสภาผู้แทนราษฏรรายสัปดาห์เข้ามาในระบบ

- ข้อมูลจะถูก scrape, OCR และตรวจสอบว่ามีข้อมูลที่ไม่ตรงกันหรือไม่ หากผ่านการตรวจสอบ การลงมตินั้นจะมี `publish_status` เป็น _PUBLISHED_ พร้อมเผยแพร่สู้สาธารณะ
- แต่หากพบข้อผิดพลาด จะมี `publish_status` เป็น _ERROR_ จะไม่ถูกแสดงให้คนทั่วไปได้เห็นจนกว่าทีมงานจะเข้ามาแก้ไขและปรับสถาณะกลับไปเป็น _PUBLISHED_

ส่วนการลงมติของ สว. นั้นยังไม่มีการเปิดเผยในช่องทางออนไลน์ เราจึงจะอัพเดตข้อมูลได้ไม่สม่ำเสมอมากนัก
