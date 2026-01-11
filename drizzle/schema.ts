import { pgTable, unique, varchar, timestamp, foreignKey, serial, integer, text, jsonb, boolean, index, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: varchar().primaryKey().notNull(),
	email: varchar(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	passwordHash: varchar("password_hash"),
	googleId: varchar("google_id"),
	banned: boolean().default(false),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const groups = pgTable("groups", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdBy: varchar("created_by").notNull(),
	imageUrl: text("image_url").default("/static/frog butcher.png"),
	coverImageUrl: text("cover_image_url"),
	isPublic: boolean("is_public").default(true),
	memberCount: integer("member_count").default(0),
	category: varchar().default("general"),
	slug: varchar({ length: 100 }),
	settings: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("groups_slug_unique").on(table.slug),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "groups_created_by_users_id_fk"
		}),
]);

export const groupMembers = pgTable("group_members", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	userId: varchar("user_id").notNull(),
	role: varchar().default("member").notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique().on(table.groupId, table.userId),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_members_group_id_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_members_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const announcements = pgTable("announcements", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	authorId: varchar("author_id").notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	content: text().notNull(),
	type: varchar("type", { length: 20 }).default("general").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.groupId],
		foreignColumns: [groups.id],
		name: "announcements_group_id_groups_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.authorId],
		foreignColumns: [users.id],
		name: "announcements_author_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const announcementReads = pgTable("announcement_reads", {
	id: serial().primaryKey().notNull(),
	announcementId: integer("announcement_id").notNull(),
	userId: varchar("user_id").notNull(),
	readAt: timestamp("read_at").defaultNow(),
}, (table) => [
	unique().on(table.announcementId, table.userId),
	foreignKey({
		columns: [table.announcementId],
		foreignColumns: [announcements.id],
		name: "announcement_reads_announcement_id_announcements_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "announcement_reads_user_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const eventPosts = pgTable("event_posts", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	authorId: varchar("author_id").notNull(),
	content: text().notNull(),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_posts_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "event_posts_author_id_users_id_fk"
		}),
]);

export const eventRsvps = pgTable("event_rsvps", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	userId: varchar("user_id").notNull(),
	status: varchar().notNull(),
	plusOneCount: integer("plus_one_count").default(0),
	dietaryRestrictions: text("dietary_restrictions"),
	comments: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_rsvps_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "event_rsvps_user_id_users_id_fk"
		}),
]);

export const pollVotes = pgTable("poll_votes", {
	id: serial().primaryKey().notNull(),
	pollId: integer("poll_id").notNull(),
	userId: varchar("user_id").notNull(),
	optionIndex: integer("option_index").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.pollId],
			foreignColumns: [eventPolls.id],
			name: "poll_votes_poll_id_event_polls_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "poll_votes_user_id_users_id_fk"
		}),
]);

export const eventPolls = pgTable("event_polls", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	createdBy: varchar("created_by").notNull(),
	question: text().notNull(),
	options: jsonb().notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_polls_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "event_polls_created_by_users_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const eventExpenses = pgTable("event_expenses", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	paidBy: varchar("paid_by").notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	splitType: varchar("split_type").default('equal').notNull(),
	category: varchar(),
	receiptUrl: text("receipt_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	splitDetails: jsonb("split_details").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_expenses_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paidBy],
			foreignColumns: [users.id],
			name: "event_expenses_paid_by_users_id_fk"
		}),
]);

export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	hostId: varchar("host_id").notNull(),
	eventType: varchar("event_type").notNull(),
	location: text(),
	mapLink: text("map_link"),
	datetime: timestamp({ mode: 'string' }).notNull(),
	imageUrl: text("image_url"),
	maxGuests: integer("max_guests"),
	isPublic: boolean("is_public").default(true),
	isClosed: boolean("is_closed").default(false),
	settings: jsonb(),
	posterData: jsonb("poster_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	themeId: varchar("theme_id", { length: 50 }).default('quantum-dark'),
	groupId: integer("group_id"),
	slug: varchar({ length: 255 }),
	discoverStatus: varchar("discover_status").default('none').notNull(),
	discoverRequestedAt: timestamp("discover_requested_at", { mode: 'string' }),
	discoverRequestedMessage: text("discover_requested_message"),
	discoverReviewedBy: varchar("discover_reviewed_by"),
	discoverReviewedAt: timestamp("discover_reviewed_at", { mode: 'string' }),
	discoverReviewNote: text("discover_review_note"),
	ticketPrice: integer("ticket_price").default(0),
	ticketingEnabled: boolean("ticketing_enabled").default(false),
	currency: varchar({ length: 10 }).default('INR'),
	hostUpiId: text("host_upi_id"),
	payoutMethod: varchar("payout_method", { length: 10 }),
	accountHolderName: text("account_holder_name"),
	accountNumber: text("account_number"),
	ifscCode: varchar("ifsc_code", { length: 11 }),
	guestListVisibility: varchar("guest_list_visibility", { length: 20 }).default('everyone'),
}, (table) => [
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [users.id],
			name: "events_host_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "events_group_id_groups_id_fk"
		}).onDelete("set null"),
]);

export const expenseSettlements = pgTable("expense_settlements", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	fromUserId: varchar("from_user_id").notNull(),
	toUserId: varchar("to_user_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	description: text(),
	proofImageUrl: text("proof_image_url"),
	settledAt: timestamp("settled_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "expense_settlements_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "expense_settlements_from_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.toUserId],
			foreignColumns: [users.id],
			name: "expense_settlements_to_user_id_users_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	type: varchar().notNull(), // 'access_request', 'rsvp_update', 'event_update', 'access_response'
	title: text().notNull(),
	message: text().notNull(),
	eventId: integer("event_id"),
	eventTitle: text("event_title"),
	fromUserId: varchar("from_user_id"),
	actionRequired: boolean("action_required").default(false),
	read: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "notifications_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "notifications_from_user_id_users_id_fk"
		}).onDelete("set null"),
		index("idx_notifications_user_id").on(table.userId),
	index("idx_notifications_read").on(table.read),
]);

export const paymentTransactions = pgTable("payment_transactions", {
	id: serial().primaryKey().notNull(),
	razorpayOrderId: varchar("razorpay_order_id", { length: 255 }).notNull().unique(),
	razorpayPaymentId: varchar("razorpay_payment_id", { length: 255 }),
	razorpaySignature: text("razorpay_signature"),
	eventId: integer("event_id").notNull(),
	userId: varchar("user_id").notNull(),
	amount: integer().notNull(), // amount in smallest currency unit (paise for INR)
	currency: varchar({ length: 10 }).default('INR'),
	status: varchar({ length: 50 }).default('created'), // created, authorized, captured, failed, refunded
	paymentMethod: varchar("payment_method", { length: 50 }),
	email: varchar({ length: 255 }),
	contact: varchar({ length: 20 }),
	notes: jsonb(),
	platformFee: integer("platform_fee").default(0),
	hostShare: integer("host_share").default(0),
	refundedAt: timestamp("refunded_at", { mode: 'string' }),
	refundId: varchar("refund_id", { length: 255 }),
	refundAmount: integer("refund_amount"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "payment_transactions_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payment_transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
	index("payment_transactions_event_id_idx").on(table.eventId),
	index("payment_transactions_user_id_idx").on(table.userId),
	index("payment_transactions_status_idx").on(table.status),
	index("payment_transactions_refunded_at_idx").on(table.refundedAt),
]);

export const payouts = pgTable("payouts", {
	id: serial().primaryKey().notNull(),
	hostId: varchar("host_id").notNull(),
	amount: integer().notNull(),
	status: varchar({ length: 50 }).default('pending'),
	paymentReference: text("payment_reference"),
	upiId: text("upi_id"),
	bankDetails: jsonb("bank_details"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	createdBy: varchar("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [users.id],
			name: "payouts_host_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "payouts_created_by_users_id_fk"
		}),
	index("payouts_host_id_idx").on(table.hostId),
	index("payouts_status_idx").on(table.status),
]);

export const payoutTransactions = pgTable("payout_transactions", {
	id: serial().primaryKey().notNull(),
	payoutId: integer("payout_id").notNull(),
	transactionId: integer("transaction_id").notNull(),
	hostShareAmount: integer("host_share_amount").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.payoutId],
			foreignColumns: [payouts.id],
			name: "payout_transactions_payout_id_payouts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [paymentTransactions.id],
			name: "payout_transactions_transaction_id_payment_transactions_id_fk"
		}).onDelete("cascade"),
	index("payout_transactions_payout_id_idx").on(table.payoutId),
	index("payout_transactions_transaction_id_idx").on(table.transactionId),
]);
