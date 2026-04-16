import { enumOrganizationType } from '@politigraph/graphql/genql';

export const organizationTypeLabel: Record<string, string> = {
	[enumOrganizationType.PARLIAMENT]: 'รัฐสภา',
	[enumOrganizationType.HOUSE_OF_REPRESENTATIVE]: 'สภาผู้แทนราษฎร (สส.)',
	[enumOrganizationType.HOUSE_OF_SENATE]: 'วุฒิสภา (สว.)',
	[enumOrganizationType.CABINET]: 'คณะรัฐมนตรี (ครม.)',
	[enumOrganizationType.POLITICAL_PARTY]: 'พรรคการเมือง',
	[enumOrganizationType.PRIVATE_ORGANIZATION]: 'หน่วยงานเอกชน',
};
