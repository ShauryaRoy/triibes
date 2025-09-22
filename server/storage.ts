import {
  users,
  events,
  eventRsvps,
  eventPosts,
  eventPolls,
  pollVotes,
  eventExpenses,
  expenseSettlements,
  communities,
  communityMembers,
  type User,
  type UpsertUser,
  type Event,
  type InsertEvent,
  type EventRsvp,
  type InsertRsvp,
  type EventPost,
  type InsertPost,
  type EventPoll,
  type InsertPoll,
  type PollVote,
  type EventExpense,
  type InsertExpense,
  type ExpenseSettlement,
  type InsertExpenseSettlement,
  type Community,
  type InsertCommunity,
  type CommunityMember,
  type InsertCommunityMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserProfile(userId: string): Promise<any>;
  updateUserProfile(userId: string, data: any): Promise<any>;
  getUserStats(userId: string): Promise<any>;
  
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventWithDetails(id: number): Promise<any>;
  getUserEvents(userId: string): Promise<Event[]>;
  getPublicEvents(): Promise<any[]>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  
  // RSVP operations
  createRsvp(rsvp: InsertRsvp): Promise<EventRsvp>;
  updateRsvp(eventId: number, userId: string, status: string, plusOneCount?: number): Promise<EventRsvp>;
  getEventRsvps(eventId: number): Promise<EventRsvp[]>;
  getUserRsvp(eventId: number, userId: string): Promise<EventRsvp | undefined>;
  getEventRsvpCounts(eventId: number): Promise<any>;
  
  // Post operations
  createPost(post: InsertPost): Promise<EventPost>;
  getEventPosts(eventId: number): Promise<any[]>;
  
  // Poll operations
  createPoll(poll: InsertPoll): Promise<EventPoll>;
  getEventPolls(eventId: number): Promise<any[]>;
  voteInPoll(pollId: number, userId: string, optionIndex: number): Promise<PollVote>;
  getPollVotes(pollId: number): Promise<PollVote[]>;
  
  // Expense operations
  createExpense(expense: InsertExpense): Promise<EventExpense>;
  getEventExpenses(eventId: number): Promise<any[]>;

  // Settlement operations
  createSettlement(settlement: InsertExpenseSettlement): Promise<ExpenseSettlement>;
  getEventSettlements(eventId: number): Promise<any[]>;
  
  // Community operations
  createCommunity(community: InsertCommunity): Promise<Community>;
  getCommunity(id: number): Promise<Community | undefined>;
  getCommunityWithDetails(id: number): Promise<any>;
  getCommunityStats(id: number): Promise<{ memberCount: number; eventCount: number }>;
  getPublicCommunities(): Promise<Community[]>;
  getUserCommunities(userId: string): Promise<Community[]>;
  updateCommunity(id: number, community: Partial<InsertCommunity>): Promise<Community>;
  deleteCommunity(id: number): Promise<void>;
  
  // Community membership operations
  joinCommunity(communityId: number, userId: string, role?: string): Promise<CommunityMember>;
  leaveCommunity(communityId: number, userId: string): Promise<void>;
  getCommunityMembers(communityId: number): Promise<any[]>;
  getUserCommunityMembership(communityId: number, userId: string): Promise<CommunityMember | undefined>;
  updateCommunityMemberRole(communityId: number, userId: string, role: string): Promise<CommunityMember>;
  
  // Community events
  getCommunityEvents(communityId: number): Promise<Event[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string) {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async upsertUser(userData: any): Promise<User> {
    console.log('Upserting user with data:', userData);
    
    // Ensure we have required fields
    if (!userData.id) {
      throw new Error('User ID is required');
    }

    const insertData = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      passwordHash: userData.passwordHash || null,
      googleId: userData.googleId || null,
      updatedAt: new Date(),
    };

    try {
      const [user] = await db
        .insert(users)
        .values(insertData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: insertData.email,
            firstName: insertData.firstName,
            lastName: insertData.lastName,
            profileImageUrl: insertData.profileImageUrl,
            googleId: insertData.googleId,
            updatedAt: insertData.updatedAt,
          },
        })
        .returning();

      console.log('Upserted user result:', user);
      return user;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user stats
    const stats = await this.getUserStats(userId);
    
    return {
      ...user,
      stats
    };
  }

  async updateUserProfile(userId: string, data: any): Promise<any> {
    const updateData = {
      firstName: data.firstName,
      lastName: data.lastName,
      bio: data.bio,
      location: data.location,
      updatedAt: new Date()
    };

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async getUserStats(userId: string): Promise<any> {
    // Count hosted events
    const hostedEventsResult = await db
      .select({ count: count() })
      .from(events)
      .where(eq(events.hostId, userId));
    
    // Count attended events (RSVPs with 'going' status, excluding hosted events)
    const attendedEventsResult = await db
      .select({ count: count() })
      .from(eventRsvps)
      .innerJoin(events, eq(eventRsvps.eventId, events.id))
      .where(
        and(
          eq(eventRsvps.userId, userId),
          eq(eventRsvps.status, 'going'),
          sql`${events.hostId} != ${userId}` // Exclude events they're hosting
        )
      );

    // Count total RSVPs
    const totalRsvpsResult = await db
      .select({ count: count() })
      .from(eventRsvps)
      .where(eq(eventRsvps.userId, userId));

    // Count upcoming events (either hosting or attending)
    const now = new Date();
    const upcomingHostedResult = await db
      .select({ count: count() })
      .from(events)
      .where(
        and(
          eq(events.hostId, userId),
          sql`${events.datetime} > ${now}`
        )
      );
    
    const upcomingAttendingResult = await db
      .select({ count: count() })
      .from(eventRsvps)
      .innerJoin(events, eq(eventRsvps.eventId, events.id))
      .where(
        and(
          eq(eventRsvps.userId, userId),
          eq(eventRsvps.status, 'going'),
          sql`${events.hostId} != ${userId}`,
          sql`${events.datetime} > ${now}`
        )
      );

    return {
      eventsHosted: hostedEventsResult[0]?.count || 0,
      eventsAttended: attendedEventsResult[0]?.count || 0,
      totalRsvps: totalRsvpsResult[0]?.count || 0,
      upcomingEvents: (upcomingHostedResult[0]?.count || 0) + (upcomingAttendingResult[0]?.count || 0)
    };
  }

  // Event operations
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventWithDetails(id: number): Promise<any> {
    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
      with: {
        host: true,
        rsvps: {
          with: {
            user: true,
          },
        },
        posts: {
          with: {
            author: true,
          },
          orderBy: desc(eventPosts.createdAt),
        },
        polls: {
          where: eq(eventPolls.isActive, true),
          with: {
            votes: true,
          },
        },
        expenses: {
          with: {
            payer: true,
          },
        },
      },
    });
    return event;
  }

  async getUserEvents(userId: string): Promise<Event[]> {
    const hostedEvents = await db.select().from(events).where(eq(events.hostId, userId));
    
    const rsvpedEvents = await db
      .select({ event: events })
      .from(events)
      .innerJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(and(eq(eventRsvps.userId, userId), eq(eventRsvps.status, 'going')));
    
    const allEvents = [...hostedEvents, ...rsvpedEvents.map(r => r.event)];
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );
    
    return uniqueEvents.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }

  async getPublicEvents(): Promise<any[]> {
    // First get all public events
    const publicEvents = await db
      .select()
      .from(events)
      .where(eq(events.isPublic, true))
      .orderBy(asc(events.datetime));
    
    // Then get RSVP counts for each event
    const eventsWithCounts = await Promise.all(
      publicEvents.map(async (event) => {
        const [totalRsvps] = await db
          .select({ count: count() })
          .from(eventRsvps)
          .where(eq(eventRsvps.eventId, event.id));
          
        const [goingRsvps] = await db
          .select({ count: count() })
          .from(eventRsvps)
          .where(and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.status, 'going')
          ));

        return {
          ...event,
          rsvpCount: totalRsvps.count,
          goingCount: goingRsvps.count,
        };
      })
    );
    
    return eventsWithCounts;
  }

  async updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...eventData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // RSVP operations
  async createRsvp(rsvp: InsertRsvp): Promise<EventRsvp> {
    const [newRsvp] = await db.insert(eventRsvps).values(rsvp).returning();
    return newRsvp;
  }

  async updateRsvp(eventId: number, userId: string, status: string, plusOneCount = 0): Promise<EventRsvp> {
    const [updatedRsvp] = await db
      .update(eventRsvps)
      .set({ 
        status,
        plusOneCount,
        updatedAt: new Date(),
      })
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
      .returning();
    return updatedRsvp;
  }

  async getEventRsvps(eventId: number): Promise<EventRsvp[]> {
    return await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId));
  }

  async getUserRsvp(eventId: number, userId: string): Promise<EventRsvp | undefined> {
    const [rsvp] = await db
      .select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
    return rsvp;
  }

  async getEventRsvpCounts(eventId: number): Promise<any> {
    const counts = await db
      .select({
        status: eventRsvps.status,
        count: sql<number>`count(*)`
      })
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId))
      .groupBy(eventRsvps.status);

    const result = {
      rsvpCount: 0,
      goingCount: 0,
      maybeCount: 0,
      notGoingCount: 0
    };

    counts.forEach(({ status, count }) => {
      result.rsvpCount += count;
      if (status === 'going') result.goingCount = count;
      if (status === 'maybe') result.maybeCount = count;
      if (status === 'not_going') result.notGoingCount = count;
    });

    return result;
  }

  // Post operations
  async createPost(post: InsertPost): Promise<EventPost> {
    const [newPost] = await db.insert(eventPosts).values(post).returning();
    return newPost;
  }

  async getEventPosts(eventId: number): Promise<any[]> {
    return await db.query.eventPosts.findMany({
      where: eq(eventPosts.eventId, eventId),
      with: {
        author: true,
      },
      orderBy: desc(eventPosts.createdAt),
    });
  }

  // Poll operations
  async createPoll(poll: InsertPoll): Promise<EventPoll> {
    const [newPoll] = await db.insert(eventPolls).values(poll).returning();
    return newPoll;
  }

  async getEventPolls(eventId: number): Promise<any[]> {
    return await db.query.eventPolls.findMany({
      where: eq(eventPolls.eventId, eventId),
      with: {
        votes: {
          with: {
            user: true,
          },
        },
      },
    });
  }

  async voteInPoll(pollId: number, userId: string, optionIndex: number): Promise<PollVote> {
    // First, remove any existing vote from this user for this poll
    await db.delete(pollVotes).where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
    
    // Then insert the new vote
    const [vote] = await db.insert(pollVotes).values({
      pollId,
      userId,
      optionIndex,
    }).returning();
    return vote;
  }

  async getPollVotes(pollId: number): Promise<PollVote[]> {
    return await db.select().from(pollVotes).where(eq(pollVotes.pollId, pollId));
  }

  // Expense operations
  async createExpense(expense: InsertExpense): Promise<EventExpense> {
    const [newExpense] = await db.insert(eventExpenses).values(expense).returning();
    return newExpense;
  }

  async getEventExpenses(eventId: number): Promise<any[]> {
    return await db.query.eventExpenses.findMany({
      where: eq(eventExpenses.eventId, eventId),
      with: {
        payer: true,
      },
    });
  }

  // Settlement operations
  async createSettlement(settlement: InsertExpenseSettlement): Promise<ExpenseSettlement> {
    const [newSettlement] = await db.insert(expenseSettlements).values(settlement).returning();
    return newSettlement;
  }

  async getEventSettlements(eventId: number): Promise<any[]> {
    return await db.query.expenseSettlements.findMany({
      where: eq(expenseSettlements.eventId, eventId),
      with: {
        fromUser: true,
        toUser: true,
      },
      orderBy: desc(expenseSettlements.createdAt),
    });
  }

  // Community operations
  async createCommunity(community: InsertCommunity): Promise<Community> {
    const [newCommunity] = await db.insert(communities).values(community).returning();
    
    // Automatically add the creator as an admin member
    await db.insert(communityMembers).values({
      communityId: newCommunity.id,
      userId: community.createdBy,
      role: 'admin',
    });
    
    // Update member count
    await db.update(communities)
      .set({ memberCount: 1 })
      .where(eq(communities.id, newCommunity.id));
    
    return newCommunity;
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.id, id));
    return community;
  }

  async getCommunityWithDetails(id: number): Promise<any> {
    const community = await db.query.communities.findFirst({
      where: eq(communities.id, id),
      with: {
        creator: true,
        members: {
          with: {
            user: true,
          },
        },
        events: {
          orderBy: desc(events.datetime),
          with: {
            host: true,
          },
        },
      },
    });
    return community;
  }

  async getCommunityStats(id: number): Promise<{ memberCount: number; eventCount: number }> {
    const [memberCount, eventCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(communityMembers).where(eq(communityMembers.communityId, id)),
      db.select({ count: sql<number>`count(*)` }).from(events).where(eq(events.communityId, id))
    ]);

    return {
      memberCount: memberCount[0]?.count || 0,
      eventCount: eventCount[0]?.count || 0
    };
  }

  async getPublicCommunities(): Promise<Community[]> {
    return await db.select().from(communities)
      .where(eq(communities.isPublic, true))
      .orderBy(desc(communities.memberCount), desc(communities.createdAt));
  }

  async getUserCommunities(userId: string): Promise<Community[]> {
    const memberCommunities = await db.query.communityMembers.findMany({
      where: eq(communityMembers.userId, userId),
      with: {
        community: true,
      },
    });
    
    return memberCommunities.map(member => member.community);
  }

  async updateCommunity(id: number, communityData: Partial<InsertCommunity>): Promise<Community> {
    const [updatedCommunity] = await db.update(communities)
      .set({ ...communityData, updatedAt: new Date() })
      .where(eq(communities.id, id))
      .returning();
    return updatedCommunity;
  }

  async deleteCommunity(id: number): Promise<void> {
    // Set all community events to have null community_id
    await db.update(events)
      .set({ communityId: null })
      .where(eq(events.communityId, id));
    
    // Delete the community (members will be cascade deleted)
    await db.delete(communities).where(eq(communities.id, id));
  }

  // Community membership operations
  async joinCommunity(communityId: number, userId: string, role: string = 'member'): Promise<CommunityMember> {
    const [membership] = await db.insert(communityMembers).values({
      communityId,
      userId,
      role,
    }).returning();
    
    // Update community member count
    await db.update(communities)
      .set({ 
        memberCount: sql`${communities.memberCount} + 1` 
      })
      .where(eq(communities.id, communityId));
    
    return membership;
  }

  async leaveCommunity(communityId: number, userId: string): Promise<void> {
    await db.delete(communityMembers)
      .where(and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId)
      ));
    
    // Update community member count
    await db.update(communities)
      .set({ 
        memberCount: sql`${communities.memberCount} - 1` 
      })
      .where(eq(communities.id, communityId));
  }

  async getCommunityMembers(communityId: number): Promise<any[]> {
    return await db.query.communityMembers.findMany({
      where: eq(communityMembers.communityId, communityId),
      with: {
        user: true,
      },
      orderBy: [asc(communityMembers.role), asc(communityMembers.joinedAt)],
    });
  }

  async getUserCommunityMembership(communityId: number, userId: string): Promise<CommunityMember | undefined> {
    const [membership] = await db.select().from(communityMembers)
      .where(and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId)
      ));
    return membership;
  }

  async updateCommunityMemberRole(communityId: number, userId: string, role: string): Promise<CommunityMember> {
    const [updatedMember] = await db.update(communityMembers)
      .set({ role })
      .where(and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId)
      ))
      .returning();
    return updatedMember;
  }

  // Community events
  async getCommunityEvents(communityId: number): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.communityId, communityId))
      .orderBy(desc(events.datetime));
  }
}

export const storage = new DatabaseStorage();
