import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at')
		.$onUpdate(() => new Date())
		.notNull(),
	role: text('role').default('user').notNull(),
	banned: boolean('banned').default(false),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires'),
});

export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		impersonatedBy: text('impersonated_by'),
	},
	(table) => [index('sessions_userId_idx').on(table.userId)],
);

export const accounts = pgTable(
	'accounts',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index('accounts_userId_idx').on(table.userId)],
);

export const verifications = pgTable(
	'verifications',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index('verifications_identifier_idx').on(table.identifier)],
);

export const apikeys = pgTable(
	'apikeys',
	{
		id: text('id').primaryKey(),
		name: text('name'),
		start: text('start'),
		prefix: text('prefix'),
		key: text('key').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		refillInterval: integer('refill_interval'),
		refillAmount: integer('refill_amount'),
		lastRefillAt: timestamp('last_refill_at'),
		enabled: boolean('enabled').default(true),
		rateLimitEnabled: boolean('rate_limit_enabled').default(true),
		rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
		rateLimitMax: integer('rate_limit_max').default(10),
		requestCount: integer('request_count').default(0),
		remaining: integer('remaining'),
		lastRequest: timestamp('last_request'),
		expiresAt: timestamp('expires_at'),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at').notNull(),
		permissions: text('permissions'),
		metadata: text('metadata'),
	},
	(table) => [
		index('apikeys_key_idx').on(table.key),
		index('apikeys_userId_idx').on(table.userId),
	],
);

export const jwkss = pgTable('jwkss', {
	id: text('id').primaryKey(),
	publicKey: text('public_key').notNull(),
	privateKey: text('private_key').notNull(),
	createdAt: timestamp('created_at').notNull(),
	expiresAt: timestamp('expires_at'),
});

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	apikeys: many(apikeys),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	users: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	users: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const apikeysRelations = relations(apikeys, ({ one }) => ({
	users: one(users, {
		fields: [apikeys.userId],
		references: [users.id],
	}),
}));
