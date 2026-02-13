import { pgTable, text, varchar, timestamp, jsonb, index, serial, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  bio: text("bio"),
  location: varchar("location"),
  website: varchar("website"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  googleId: varchar("google_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  banned: boolean("banned").default(false),
});

// Groups table (formerly Communities)
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  slug: varchar("slug", { length: 100 }).unique(),
  category: varchar("category").default("general"),
  imageUrl: text("image_url").default("/static/frog butcher.png"), // Default group icon
  coverImageUrl: text("cover_image_url"), // Cover/banner image
  isPublic: boolean("is_public").default(true),
  memberCount: integer("member_count").default(0),
  settings: jsonb("settings"),
  discoverStatus: varchar("discover_status").default("none").notNull(), // 'none' | 'requested' | 'approved' | 'rejected'
  discoverRequestedAt: timestamp("discover_requested_at"),
  discoverReviewedBy: varchar("discover_reviewed_by").references(() => users.id, { onDelete: "set null" }),
  discoverReviewedAt: timestamp("discover_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group members table (formerly Community members)
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").default("member"), // 'owner' | 'host' | 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Announcements table
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).default("general").notNull(), // 'general' | 'urgent' | 'event'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Announcement reads tracking table
export const announcementReads = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate reads
  uniqueRead: index("unique_announcement_read").on(table.announcementId, table.userId),
}));

// Group join requests table
export const groupJoinRequests = pgTable("group_join_requests", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message"), // Optional message from user
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed the request
  reviewedAt: timestamp("reviewed_at"), // When the request was reviewed
}, (table) => ({
  // Unique constraint to prevent duplicate requests
  uniqueRequest: index("unique_group_join_request").on(table.groupId, table.userId),
}));

// Group invite codes table for private group invitations
export const groupInviteCodes = pgTable("group_invite_codes", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 8 }).notNull().unique(), // Short 8-char code like "ABC12345"
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at"), // Optional expiration
  maxUses: integer("max_uses"), // Optional max uses (null = unlimited)
  useCount: integer("use_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).unique(), // URL-friendly slug: "gaming-night-abc123"
  description: text("description"),
  hostId: varchar("host_id").notNull().references(() => users.id),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
  eventType: varchar("event_type").notNull(), // 'offline' | 'online'
  location: text("location"),
  mapLink: text("map_link"), // Navigation link for the location
  datetime: timestamp("datetime", { withTimezone: true }).notNull(),
  endDatetime: timestamp("end_datetime", { withTimezone: true }),
  imageUrl: text("image_url"),
  maxGuests: integer("max_guests"),
  isPublic: boolean("is_public").default(true),
  isClosed: boolean("is_closed").default(false), // Manually close event to prevent new joins
  themeId: varchar("theme_id", { length: 50 }).default("quantum-dark"), // Add theme support
  settings: jsonb("settings"), // For storing various event settings
  posterData: jsonb("poster_data"), // For storing custom poster configuration
  discoverStatus: varchar("discover_status").default("none").notNull(), // 'none' | 'requested' | 'approved' | 'rejected'
  discoverRequestedAt: timestamp("discover_requested_at"),
  discoverRequestedMessage: text("discover_requested_message"),
  discoverReviewedBy: varchar("discover_reviewed_by").references(() => users.id, { onDelete: "set null" }),
  discoverReviewedAt: timestamp("discover_reviewed_at"),
  discoverReviewNote: text("discover_review_note"),
  ticketPrice: integer("ticket_price").default(0), // Cost per person in rupees
  ticketingEnabled: boolean("ticketing_enabled").default(false),
  currency: varchar("currency", { length: 10 }).default("INR"),
  hostUpiId: text("host_upi_id"), // For future UPI integration
  payoutMethod: varchar("payout_method", { length: 10 }), // 'upi' | 'bank'
  accountHolderName: text("account_holder_name"),
  accountNumber: text("account_number"),
  ifscCode: varchar("ifsc_code", { length: 11 }),
  guestListVisibility: varchar("guest_list_visibility", { length: 20 }).default("everyone"), // 'host-only' | 'attendees-only' | 'everyone'
  rsvpMode: varchar("rsvp_mode", { length: 20 }).default("register"), // 'rsvp' (Going/Maybe/Can't Go) | 'register' (single Register button)
  showGuestCount: boolean("show_guest_count").default(true), // Whether to display total attendee count on event page
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  discoverStatusIdx: index("idx_events_discover_status").on(table.discoverStatus),
  slugIdx: index("idx_events_slug").on(table.slug),
}));

// Event invite codes table for private event invitations
export const eventInviteCodes = pgTable("event_invite_codes", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 8 }).notNull().unique(), // Short 8-char code like "ABC12345"
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at"), // Optional expiration
  maxUses: integer("max_uses"), // Optional max uses (null = unlimited)
  useCount: integer("use_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  eventIdIdx: index("idx_event_invite_codes_event_id").on(table.eventId),
  codeIdx: index("idx_event_invite_codes_code").on(table.code),
}));

// Event RSVPs
export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").notNull(), // 'going' | 'maybe' | 'not_going'
  plusOneCount: integer("plus_one_count").default(0),
  dietaryRestrictions: text("dietary_restrictions"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event updates/posts
export const eventPosts = pgTable("event_posts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event polls
export const eventPolls = pgTable("event_polls", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // Array of poll options
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Poll votes
export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => eventPolls.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event expenses
export const eventExpenses = pgTable("event_expenses", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  paidBy: varchar("paid_by").notNull().references(() => users.id),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  splitType: varchar("split_type").notNull().default("equal"), // 'equal' | 'custom_percentage' | 'custom_amount'
  splitDetails: jsonb("split_details").notNull(), // Detailed split information
  category: varchar("category"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expense settlements - track who owes who and settlements
export const expenseSettlements = pgTable("expense_settlements", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"), // Optional description/note
  proofImageUrl: text("proof_image_url"), // Optional payment proof
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin roles table
export const adminRoles = pgTable("admin_roles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("moderator"), // 'superadmin' | 'admin' | 'moderator' | 'reviewer'
  grantedBy: varchar("granted_by").references(() => users.id, { onDelete: "set null" }),
  grantedAt: timestamp("granted_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  userIdIdx: index("idx_admin_roles_user_id").on(table.userId),
  roleIdx: index("idx_admin_roles_role").on(table.role),
}));

// Admin audit logs table
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // 'approve_discover', 'reject_discover', 'delete_event', 'ban_user', etc.
  entityType: varchar("entity_type").notNull(), // 'event', 'group', 'user'
  entityId: integer("entity_id"),
  details: jsonb("details"), // Additional action details
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  adminIdIdx: index("idx_audit_logs_admin_id").on(table.adminId),
  entityIdx: index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  createdAtIdx: index("idx_audit_logs_created_at").on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hostedEvents: many(events),
  rsvps: many(eventRsvps),
  posts: many(eventPosts),
  polls: many(eventPolls),
  votes: many(pollVotes),
  expenses: many(eventExpenses),
  settlementsFrom: many(expenseSettlements, { relationName: "settlementsFrom" }),
  settlementsTo: many(expenseSettlements, { relationName: "settlementsTo" }),
  createdGroups: many(groups),
  groupMemberships: many(groupMembers),
  announcements: many(announcements),
  announcementReads: many(announcementReads),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
  events: many(events),
  announcements: many(announcements),
  joinRequests: many(groupJoinRequests),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(users, {
    fields: [events.hostId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [events.groupId],
    references: [groups.id],
  }),
  rsvps: many(eventRsvps),
  posts: many(eventPosts),
  polls: many(eventPolls),
  expenses: many(eventExpenses),
  settlements: many(expenseSettlements),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));

export const eventPostsRelations = relations(eventPosts, ({ one }) => ({
  event: one(events, {
    fields: [eventPosts.eventId],
    references: [events.id],
  }),
  author: one(users, {
    fields: [eventPosts.authorId],
    references: [users.id],
  }),
}));

export const eventPollsRelations = relations(eventPolls, ({ one, many }) => ({
  event: one(events, {
    fields: [eventPolls.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [eventPolls.createdBy],
    references: [users.id],
  }),
  votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(eventPolls, {
    fields: [pollVotes.pollId],
    references: [eventPolls.id],
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id],
  }),
}));

export const eventExpensesRelations = relations(eventExpenses, ({ one }) => ({
  event: one(events, {
    fields: [eventExpenses.eventId],
    references: [events.id],
  }),
  payer: one(users, {
    fields: [eventExpenses.paidBy],
    references: [users.id],
  }),
}));

export const expenseSettlementsRelations = relations(expenseSettlements, ({ one }) => ({
  event: one(events, {
    fields: [expenseSettlements.eventId],
    references: [events.id],
  }),
  fromUser: one(users, {
    fields: [expenseSettlements.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [expenseSettlements.toUserId],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  group: one(groups, {
    fields: [announcements.groupId],
    references: [groups.id],
  }),
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
  reads: many(announcementReads),
}));

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReads.announcementId],
    references: [announcements.id],
  }),
  user: one(users, {
    fields: [announcementReads.userId],
    references: [users.id],
  }),
}));

export const groupJoinRequestsRelations = relations(groupJoinRequests, ({ one }) => ({
  group: one(groups, {
    fields: [groupJoinRequests.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupJoinRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [groupJoinRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const adminRolesRelations = relations(adminRoles, ({ one }) => ({
  user: one(users, {
    fields: [adminRoles.userId],
    references: [users.id],
  }),
  grantor: one(users, {
    fields: [adminRoles.grantedBy],
    references: [users.id],
  }),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminAuditLogs.adminId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  datetime: z.string().or(z.date()).transform((val) => {
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const insertRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(eventPosts).omit({
  id: true,
  createdAt: true,
});

export const insertPollSchema = createInsertSchema(eventPolls).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(eventExpenses).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.number().or(z.string()).transform((val) => {
    return typeof val === 'number' ? val.toString() : val;
  }),
  splitType: z.enum(['equal', 'custom_percentage', 'custom_amount']).default('equal'),
  splitDetails: z.record(z.object({
    amount: z.number().optional(),
    percentage: z.number().optional(),
  })),
});

export const insertSettlementSchema = createInsertSchema(expenseSettlements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.number().or(z.string()).transform((val) => {
    return typeof val === 'number' ? val.toString() : val;
  }),
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  memberCount: true, // This will be calculated automatically
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementReadSchema = createInsertSchema(announcementReads).omit({
  id: true,
  readAt: true,
});

export const insertGroupJoinRequestSchema = createInsertSchema(groupJoinRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

export const insertGroupInviteCodeSchema = createInsertSchema(groupInviteCodes).omit({
  id: true,
  createdAt: true,
  useCount: true,
});

export const insertEventInviteCodeSchema = createInsertSchema(eventInviteCodes).omit({
  id: true,
  createdAt: true,
  useCount: true,
});

export const insertAdminRoleSchema = createInsertSchema(adminRoles).omit({
  id: true,
  grantedAt: true,
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;
export type EventPost = typeof eventPosts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type EventPoll = typeof eventPolls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type PollVote = typeof pollVotes.$inferSelect;
export type EventExpense = typeof eventExpenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ExpenseSettlement = typeof expenseSettlements.$inferSelect;
export type InsertExpenseSettlement = z.infer<typeof insertSettlementSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type AnnouncementRead = typeof announcementReads.$inferSelect;
export type InsertAnnouncementRead = z.infer<typeof insertAnnouncementReadSchema>;
export type GroupJoinRequest = typeof groupJoinRequests.$inferSelect;
export type InsertGroupJoinRequest = z.infer<typeof insertGroupJoinRequestSchema>;
export type GroupInviteCode = typeof groupInviteCodes.$inferSelect;
export type InsertGroupInviteCode = z.infer<typeof insertGroupInviteCodeSchema>;
export type EventInviteCode = typeof eventInviteCodes.$inferSelect;
export type InsertEventInviteCode = z.infer<typeof insertEventInviteCodeSchema>;
export type AdminRole = typeof adminRoles.$inferSelect;
export type InsertAdminRole = z.infer<typeof insertAdminRoleSchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
