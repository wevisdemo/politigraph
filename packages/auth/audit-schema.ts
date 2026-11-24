import { sql } from 'drizzle-orm';
import {
	bigint,
	check,
	customType,
	index,
	pgTable,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';

// Bun SQL encodes jsonb parameters itself, so Drizzle's `jsonb`, which stringifies first, would store a JSON string.
// Switch back to Drizzle's `jsonb` once its bun-sql driver stops encoding twice.
const jsonb = customType<{ data: unknown }>({ dataType: () => 'jsonb' });

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: bigint('id', { mode: 'number' })
			.primaryKey()
			.generatedAlwaysAsIdentity(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		userId: text('user_id').notNull(),
		via: text('via', { enum: ['session', 'api_key'] }).notNull(),
		credentialId: text('credential_id'),
		operationName: text('operation_name'),
		changes: jsonb('changes').notNull(),
		nodeIds: text('node_ids')
			.array()
			.default(sql`'{}'`)
			.notNull(),
		errors: jsonb('errors'),
	},
	(table) => [
		index('audit_logs_createdAt_idx').on(table.createdAt),
		index('audit_logs_userId_createdAt_idx').on(table.userId, table.createdAt),
		index('audit_logs_nodeIds_idx').using('gin', table.nodeIds),
		check('audit_logs_via_check', sql`${table.via} in ('session', 'api_key')`),
	],
);
