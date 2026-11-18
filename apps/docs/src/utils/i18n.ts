export type Language = 'th' | 'en';

const th = {
	navDocumentation: 'คู่มือการใช้',
	navExplore: 'สำรวจข้อมูล',
	exploreTitle: 'สำรวจข้อมูล',
	exploreDescription:
		'สำรวจความสัมพันธ์ของนักการเมือง พรรคการเมือง การลงมติ และร่างกฎหมายไทยจาก Politigraph ผ่าน Interactive Graph',
	exploreHint: 'เลือก Node เริ่มต้นเพื่อสำรวจข้อมูลโดยรอบในรูปแบบ Graph',
	exploreNodeNotFound: (label: string) => `ไม่พบข้อมูลของ "${label}"`,
	searchPlaceholder: 'พิมพ์คำค้นหา เช่น ชื่อบุคคล องค์กร หรือกฎหมาย',
	searchNoResults: 'ไม่พบข้อมูลที่ตรงกับคำค้นหา',
	graphPartialSchemaNote:
		'*แสดงเฉพาะ Nodes, Properties และ Relationships ที่อยู่ใน Query',
	graphFullSchemaLink: 'ดู Schema ทั้งหมด',
	graphSelectNodeHint: 'เลือก Node เพื่อดูคำอธิบายและ Properties',
	viewAsMarkdown: 'ดูหน้านี้ในรูปแบบ Markdown',
	openInPlayground: 'ลอง Query ใน GraphQL Playground',
	openInQueryBuilder: 'ลอง Query ใน Query Builder',
	exploreInteractHint:
		'แสดงความสัมพันธ์ของ Node ที่อยู่ใกล้เท่านั้น เลือก Node ใดๆ เพื่อดู Properties และเลือกซ้ำอีกครั้งเพื่อสำรวจความสัมพันธ์ของ Node ถัดๆ ไป',
	datasetCountsOthers: 'และอื่นๆ อีกมากมาย',
	datasetLastUpdated: (date: string) => `อัปเดตล่าสุด ${date}`,
	datasetBills: 'ร่างกฎหมาย',
	datasetVoteEvents: 'การลงมติ',
	datasetOrganizations: 'องค์กร',
	datasetPeople: 'บุคคล',
	builderTitle: 'สร้าง Query',
	builderDescription:
		'สร้าง GraphQL Query ของ Politigraph ด้วยการเลือก Fields จาก Schema และดูโครงสร้างและผลลัพธ์ในรูปแบบ Graph',
	builderRoot: 'Nodes เริ่มต้น',
	builderAddFilter: 'ตัวกรอง',
	builderRemoveFilter: 'ลบตัวกรอง',
	builderListPlaceholder: 'คั่นด้วยจุลภาค',
	builderSort: 'เรียง',
	builderLimit: 'จำนวน',
	builderRun: 'ขอข้อมูล',
	builderRunHint: 'กด "ขอข้อมูล" เพื่อดูผลลัพธ์',
	builderNoResult: 'ไม่พบข้อมูล',
	builderGraph: 'Visualization',
	builderQuery: 'Query',
	builderResponse: 'Response',
	builderCopy: 'คัดลอก',
	builderLink: 'ลิงก์',
	builderCode: 'โค้ด',
	builderInvalidQuery: 'ไม่สามารถโหลด Query จากลิงก์ได้',
	builderDownload: 'ดาวน์โหลด',
	builderLimitation:
		'*หน้านี้รองรับเฉพาะการสร้าง Query พื้นฐานเพื่อให้ใช้งานได้ง่าย หากต้องการใช้งานครบทุกความสามารถ ของ GraphQL เช่น Aggregation, Pagination แบบ Cursor หรือ Variables ใช้',
};

const en: typeof th = {
	navDocumentation: 'Documentation',
	navExplore: 'Explore',
	exploreTitle: 'Explore',
	exploreDescription:
		'Explore the relationships between Thai politicians, political parties, votes and bills from Politigraph in an interactive graph',
	exploreHint: 'Select starting node to explore its surrounding data graph',
	exploreNodeNotFound: (label: string) => `No data found for "${label}"`,
	searchPlaceholder: 'Search by person, organization or bill name',
	searchNoResults: 'No result matches the keyword',
	graphPartialSchemaNote:
		'*Only showing nodes, properties, and relationships from the query',
	graphFullSchemaLink: 'see full schema',
	graphSelectNodeHint: 'Select any node to see the description and properties',
	viewAsMarkdown: 'View this page as Markdown',
	openInPlayground: 'Try this query in GraphQL Playground',
	openInQueryBuilder: 'Try this query in the Query Builder',
	exploreInteractHint:
		'Only showing relationships of nearby nodes. Select any node to see its properties, select it again to explore the further nodes',
	datasetCountsOthers: 'And much more',
	datasetLastUpdated: (date: string) => `Last updated ${date}`,
	datasetBills: 'Bills',
	datasetVoteEvents: 'Vote events',
	datasetOrganizations: 'Organizations',
	datasetPeople: 'People',
	builderTitle: 'Query Builder',
	builderDescription:
		'Build a Politigraph GraphQL query by picking fields from the schema, and see its structure and result as a graph',
	builderRoot: 'Starting nodes',
	builderAddFilter: 'Filter',
	builderRemoveFilter: 'Remove filter',
	builderListPlaceholder: 'Comma separated',
	builderSort: 'Sort',
	builderLimit: 'Limit',
	builderRun: 'Request data',
	builderRunHint: 'Click "Request data" to see the result',
	builderNoResult: 'No data found',
	builderGraph: 'Visualization',
	builderQuery: 'Query',
	builderResponse: 'Response',
	builderCopy: 'Copy',
	builderLink: 'Link',
	builderCode: 'Code',
	builderInvalidQuery: 'Cannot load the query from the link',
	builderDownload: 'Download',
	builderLimitation:
		'*This page only covers building basic queries for simple usage. For the full GraphQL feature set, such as aggregations, cursor pagination and variables, use',
};

const dictionaries: Record<Language, typeof th> = { th, en };

export function useTranslations(lang: Language) {
	return dictionaries[lang];
}

export function getLanguage(locale?: string): Language {
	return locale === 'en' ? 'en' : 'th';
}
