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
});

// Communities table
export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  imageUrl: text("image_url"),
  isPublic: boolean("is_public").default(true),
  memberCount: integer("member_count").default(0),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community members table
export const communityMembers = pgTable("community_members", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").default("member"), // 'admin' | 'moderator' | 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  hostId: varchar("host_id").notNull().references(() => users.id),
  communityId: integer("community_id").references(() => communities.id, { onDelete: "set null" }),
  eventType: varchar("event_type").notNull(), // 'offline' | 'online'
  location: text("location"),
  mapLink: text("map_link"), // Navigation link for the location
  datetime: timestamp("datetime").notNull(),
  imageUrl: text("image_url"),
  maxGuests: integer("max_guests"),
  isPublic: boolean("is_public").default(true),
  themeId: varchar("theme_id", { length: 50 }).default("quantum-dark"), // Add theme support
  settings: jsonb("settings"), // For storing various event settings
  posterData: jsonb("poster_data"), // For storing custom poster configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  createdCommunities: many(communities),
  communityMemberships: many(communityMembers),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, {
    fields: [communities.createdBy],
    references: [users.id],
  }),
  members: many(communityMembers),
  events: many(events),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
  user: one(users, {
    fields: [communityMembers.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(users, {
    fields: [events.hostId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [events.communityId],
    references: [communities.id],
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

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  memberCount: true, // This will be calculated automatically
});

export const insertCommunityMemberSchema = createInsertSchema(communityMembers).omit({
  id: true,
  joinedAt: true,
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
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
