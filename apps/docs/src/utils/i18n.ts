export type Language = 'th' | 'en';

const th = {
	navDocumentation: 'คู่มือการใช้',
	navExplore: 'สำรวจข้อมูล',
	navPlayground: 'GraphQL Playground',
	exploreTitle: 'สำรวจข้อมูล',
	exploreHint: 'เลือก Node เริ่มต้นเพื่อสำรวจข้อมูลโดยรอบในรูปแบบ Graph',
	exploreNodeNotFound: (label: string) => `ไม่พบข้อมูลของ "${label}"`,
	searchPlaceholder: 'พิมพ์คำค้นหา เช่น ชื่อบุคคล องค์กร หรือกฎหมาย',
	searchNoResults: 'ไม่พบข้อมูลที่ตรงกับคำค้นหา',
	graphPartialSchemaNote:
		'*แสดงเฉพาะ Nodes, Properties และ Relationships ที่อยู่ใน Query',
	graphFullSchemaLink: 'ดูสคีมาทั้งหมด',
	graphSelectNodeHint: 'เลือก Node เพื่อดูคำอธิบายและ Properties',
	exploreInteractHint:
		'แสดงความสัมพันธ์ของ Node ที่อยู่ใกล้เท่านั้น เลือก Node ใดๆ เพื่อดู Properties และเลือกซ้ำอีกครั้งเพื่อสำรวจความสัมพันธ์ของ Node ถัดๆ ไป',
};

const en: typeof th = {
	navDocumentation: 'Documentation',
	navExplore: 'Explore',
	navPlayground: 'GraphQL Playground',
	exploreTitle: 'Explore',
	exploreHint: 'Select starting node to explore its surrounding data graph',
	exploreNodeNotFound: (label: string) => `No data found for "${label}"`,
	searchPlaceholder: 'Search by person, organization or bill name',
	searchNoResults: 'No result matches the keyword',
	graphPartialSchemaNote:
		'*Only showing nodes, properties, and relationships from the query',
	graphFullSchemaLink: 'see full schema',
	graphSelectNodeHint: 'Select any node to see the description and properties',
	exploreInteractHint:
		'Only showing relationships of nearby nodes. Select any node to see its properties, select it again to explore the further nodes',
};

const dictionaries: Record<Language, typeof th> = { th, en };

export function useTranslations(lang: Language) {
	return dictionaries[lang];
}

export function getLanguage(locale?: string): Language {
	return locale === 'en' ? 'en' : 'th';
}
