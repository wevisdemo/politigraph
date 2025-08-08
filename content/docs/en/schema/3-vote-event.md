---
lang: en
---

# Voting

We collect voting data from both the House of Representatives and the Senate using **`VoteEvent`** to represent voting events and **`Vote`** to represent the casting of votes by each **`Person`**.

The voting options (property `option` in **`Vote`**) in parliamentary votes generally have 5 formats:

1. Agree (ไม่เห็นด้วย)
2. Disagree (ไม่เห็นด้วย)
3. Abstain (งดออกเสียง)
4. No Vote (ไม่ลงคะแนนเสียง)
5. Absent (ลา / ขาดลงมติ)

For example, the draft Budget Act 2021 (Section 3) and the voting of the first 20 eligible participants.

<QueryGraph query="query VoteEvents($where: VoteEventWhere, $limit: Int, $votesLimit2: Int) { voteEvents(where: $where, limit: $limit) { id title nickname publish_status start_date result votes(limit: $votesLimit2) { id option voters { id firstname lastname } } } }" :variables='{ "where": { "id_EQ": "fd854f98-a9c0-4ef2-b007-58821da695dc" }, "limit": 1, "votesLimit2": 20 }'></QueryGraph>

## Data Updates and Publish Status

The House Representatives' votes are automatically retrieved from the [Parliament Secretariat Database and Records System](https://msbis.parliament.go.th) every week by the [automation system](https://github.com/wevisdemo/politigraph-automation).

- The data is scraped, OCR'd, and checked for inconsistencies. If it passes verification, the vote will have a `publish_status` of _PUBLISHED_ and will be made publicly available.
- However, if errors are found, the `publish_status` will be _ERROR_, and it will not be displayed to the public until the team fixes it and changes the status back to _PUBLISHED_.

The Senate's votes are not yet publicly available online, so we will not be able to update the data consistently.
