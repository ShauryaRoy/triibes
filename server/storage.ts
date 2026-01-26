import {
  users,
  events,
  eventRsvps,
  eventPosts,
  eventPolls,
  pollVotes,
  eventExpenses,
  expenseSettlements,
  groups,
  groupMembers,
  announcements,
  announcementReads,
  groupJoinRequests,
  groupInviteCodes,
  eventInviteCodes,
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
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type Announcement,
  type InsertAnnouncement,
  type AnnouncementRead,
  type InsertAnnouncementRead,
  type GroupJoinRequest,
  type InsertGroupJoinRequest,
  type GroupInviteCode,
  type InsertGroupInviteCode,
  type EventInviteCode,
  type InsertEventInviteCode,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql, exists, gt, or, isNull } from "drizzle-orm";

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
  getEventBySlug(slug: string): Promise<Event | undefined>;
  getEventWithDetails(id: number): Promise<any>;
  getEventWithDetailsBySlug(slug: string): Promise<any>;
  getUserEvents(userId: string): Promise<Event[]>;
  getPublicEvents(): Promise<any[]>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  
  // RSVP operations
  createRsvp(rsvp: InsertRsvp): Promise<EventRsvp>;
  updateRsvp(
    eventId: number, 
    userId: string, 
    status: string, 
    plusOneCount?: number,
    dietaryRestrictions?: string | null,
    comments?: string | null
  ): Promise<EventRsvp | undefined>;
  deleteRsvp(eventId: number, userId: string): Promise<void>;
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
  createCommunity(community: InsertGroup): Promise<Group>;
  isSlugAvailable(slug: string): Promise<boolean>;
  getCommunityBySlug(slug: string): Promise<any>;
  getCommunity(id: number): Promise<Group | undefined>;
  getCommunityWithDetails(id: number): Promise<any>;
  getCommunityStats(id: number): Promise<{ memberCount: number; eventCount: number }>;
  getPublicGroups(): Promise<Group[]>;
  getUserGroups(userId: string): Promise<Group[]>;
  updateCommunity(id: number, community: Partial<InsertGroup>): Promise<Group>;
  deleteCommunity(id: number): Promise<void>;
  
  // Community membership operations
  joinCommunity(communityId: number, userId: string, role?: string, bypassPrivateCheck?: boolean): Promise<GroupMember>;
  leaveCommunity(communityId: number, userId: string): Promise<void>;
  getCommunityMembers(communityId: number): Promise<any[]>;
  getUserCommunityMembership(communityId: number, userId: string): Promise<GroupMember | undefined>;
  updateCommunityMemberRole(communityId: number, userId: string, role: string): Promise<GroupMember>;
  
  // Community events
  getCommunityEvents(communityId: number): Promise<Event[]>;
  
  // Announcement operations
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getCommunityAnnouncements(communityId: number): Promise<any[]>;
  markAnnouncementAsRead(announcementId: number, userId: string): Promise<AnnouncementRead>;
  getUnreadAnnouncementsCount(communityId: number, userId: string): Promise<number>;
  
  // Community join request operations
  createJoinRequest(request: InsertGroupJoinRequest): Promise<GroupJoinRequest>;
  getgroupJoinRequests(communityId: number): Promise<any[]>;
  getUserJoinRequest(communityId: number, userId: string): Promise<GroupJoinRequest | undefined>;
  updateJoinRequest(requestId: number, status: string, reviewedBy: string): Promise<GroupJoinRequest>;
  deleteJoinRequest(requestId: number): Promise<void>;
  
  // Group invite code operations
  createInviteCode(data: InsertGroupInviteCode): Promise<GroupInviteCode>;
  getInviteCodeByCode(code: string): Promise<GroupInviteCode | undefined>;
  getGroupInviteCodes(groupId: number): Promise<GroupInviteCode[]>;
  incrementInviteCodeUseCount(codeId: number): Promise<void>;
  deactivateInviteCode(codeId: number): Promise<void>;
  deleteInviteCode(codeId: number): Promise<void>;
  
  // Event invite code operations
  createEventInviteCode(data: InsertEventInviteCode): Promise<EventInviteCode>;
  getEventInviteCodeByCode(code: string): Promise<EventInviteCode | undefined>;
  getEventInviteCodes(eventId: number): Promise<EventInviteCode[]>;
  incrementEventInviteCodeUseCount(codeId: number): Promise<void>;
  deleteEventInviteCode(codeId: number): Promise<void>;
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
    if (event) {
      console.log(`📖 [getEvent] Fetched event ${id}. Datetime:`, event.datetime, `Type:`, typeof event.datetime);
    }
    return event;
  }

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.slug, slug));
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

  async getEventWithDetailsBySlug(slug: string): Promise<any> {
    const event = await db.query.events.findFirst({
      where: eq(events.slug, slug),
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
    // ✅ Optimized: Single query with OR condition instead of 2 separate queries
    const allEvents = await db
      .selectDistinct({
        id: events.id,
        title: events.title,
        slug: events.slug,
        description: events.description,
        hostId: events.hostId,
        groupId: events.groupId,
        eventType: events.eventType,
        location: events.location,
        mapLink: events.mapLink,
        datetime: events.datetime,
        imageUrl: events.imageUrl,
        maxGuests: events.maxGuests,
        isPublic: events.isPublic,
        themeId: events.themeId,
        settings: events.settings,
        posterData: events.posterData,
        discoverStatus: events.discoverStatus,
        discoverRequestedAt: events.discoverRequestedAt,
        discoverRequestedMessage: events.discoverRequestedMessage,
        discoverReviewedBy: events.discoverReviewedBy,
        discoverReviewedAt: events.discoverReviewedAt,
        discoverReviewNote: events.discoverReviewNote,
        ticketPrice: events.ticketPrice,
        ticketingEnabled: events.ticketingEnabled,
        currency: events.currency,
        hostUpiId: events.hostUpiId,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        hostFirstName: users.firstName,
        hostLastName: users.lastName,
        hostEmail: users.email,
        hostProfileImageUrl: users.profileImageUrl,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .leftJoin(eventRsvps, and(
        eq(eventRsvps.eventId, events.id),
        eq(eventRsvps.userId, userId)
      ))
      .where(
        sql`${events.hostId} = ${userId} OR (${eventRsvps.userId} = ${userId} AND ${eventRsvps.status} IN ('going', 'maybe'))`
      )
      .orderBy(desc(events.datetime));

    return allEvents.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      hostId: row.hostId,
      groupId: row.groupId,
      eventType: row.eventType,
      location: row.location,
      mapLink: row.mapLink,
      datetime: row.datetime,
      imageUrl: row.imageUrl,
      maxGuests: row.maxGuests,
      isPublic: row.isPublic,
      themeId: row.themeId,
      settings: row.settings,
      posterData: row.posterData,
      discoverStatus: row.discoverStatus,
      discoverRequestedAt: row.discoverRequestedAt,
      discoverRequestedMessage: row.discoverRequestedMessage,
      discoverReviewedBy: row.discoverReviewedBy,
      discoverReviewedAt: row.discoverReviewedAt,
      discoverReviewNote: row.discoverReviewNote,
      ticketPrice: row.ticketPrice,
      ticketingEnabled: row.ticketingEnabled,
      currency: row.currency,
      hostUpiId: row.hostUpiId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      host: row.hostFirstName || row.hostLastName || row.hostEmail ? {
        id: row.hostId,
        firstName: row.hostFirstName,
        lastName: row.hostLastName,
        email: row.hostEmail,
        profileImageUrl: row.hostProfileImageUrl,
      } : undefined,
    })) as Event[];
  }

  async getPublicEvents(): Promise<any[]> {
    // Get all public events with host information that are approved for discover page
    const publicEvents = await db.query.events.findMany({
      where: and(
        eq(events.isPublic, true),
        eq(events.discoverStatus, 'approved'),
        or(
          isNull(events.endDatetime),
          gt(events.endDatetime, new Date())
        )
      ),
      with: {
        host: true,
      },
      orderBy: asc(events.datetime),
    });
    
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
    console.log(`🔄 [updateEvent] Updating event ${id} with data:`, JSON.stringify(eventData, null, 2));
    const [updatedEvent] = await db
      .update(events)
      .set({ ...eventData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    console.log(`✅ [updateEvent] Event ${id} updated. Datetime field:`, updatedEvent.datetime);
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

  async updateRsvp(
    eventId: number, 
    userId: string, 
    status: string, 
    plusOneCount = 0, 
    dietaryRestrictions?: string | null,
    comments?: string | null
  ): Promise<EventRsvp | undefined> {
    const updateData: any = { 
      status,
      plusOneCount,
      updatedAt: new Date(),
    };
    
    // Only include optional fields if they're provided
    if (dietaryRestrictions !== undefined) {
      updateData.dietaryRestrictions = dietaryRestrictions;
    }
    if (comments !== undefined) {
      updateData.comments = comments;
    }
    
    const [updatedRsvp] = await db
      .update(eventRsvps)
      .set(updateData)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
      .returning();
    return updatedRsvp;
  }

  async deleteRsvp(eventId: number, userId: string): Promise<void> {
    await db
      .delete(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
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
  async createCommunity(community: InsertGroup): Promise<Group> {
    console.log('💾 Storage: Creating community with slug:', community.slug);
    const [newCommunity] = await db.insert(groups).values(community).returning();
    console.log('📦 Storage: Community inserted:', { id: newCommunity.id, slug: newCommunity.slug, name: newCommunity.name });
    
    // Automatically add the creator as an admin member
    await db.insert(groupMembers).values({
      groupId: newCommunity.id,
      userId: community.createdBy,
      role: 'admin',
    });
    
    // Update member count
    await db.update(groups)
      .set({ memberCount: 1 })
      .where(eq(groups.id, newCommunity.id));
    
    // Fetch the updated community to return
    const [updatedCommunity] = await db.select().from(groups).where(eq(groups.id, newCommunity.id));
    console.log('✅ Storage: Returning community:', { id: updatedCommunity.id, slug: updatedCommunity.slug, name: updatedCommunity.name });
    
    return updatedCommunity;
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
    return existing.length === 0;
  }

  async getCommunityBySlug(slug: string): Promise<any> {
    const community = await db.query.groups.findFirst({
      where: eq(groups.slug, slug),
      with: {
        creator: true,
        members: {
          with: {
            user: true,
          },
        },
      },
    });
    return community;
  }

  async getCommunity(id: number): Promise<Group | undefined> {
    const [community] = await db.select().from(groups).where(eq(groups.id, id));
    return community;
  }

  async getCommunityWithDetails(id: number): Promise<any> {
    const community = await db.query.groups.findFirst({
      where: eq(groups.id, id),
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
      db.select({ count: sql<number>`count(*)` }).from(groupMembers).where(eq(groupMembers.groupId, id)),
      db.select({ count: sql<number>`count(*)` }).from(events).where(eq(events.groupId, id))
    ]);

    return {
      memberCount: memberCount[0]?.count || 0,
      eventCount: eventCount[0]?.count || 0
    };
  }

  async getPublicGroups(): Promise<Group[]> {
    return await db.select().from(groups)
      .where(eq(groups.isPublic, true))
      .orderBy(desc(groups.memberCount), desc(groups.createdAt));
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const userGroups = await db
      .select()
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId));
    
    return userGroups.map(row => row.groups);
  }

  async updateCommunity(id: number, communityData: Partial<InsertGroup>): Promise<Group> {
    const [updatedCommunity] = await db.update(groups)
      .set({ ...communityData, updatedAt: new Date() })
      .where(eq(groups.id, id))
      .returning();
    return updatedCommunity;
  }

  async deleteCommunity(id: number): Promise<void> {
    // Set all community events to have null community_id
    await db.update(events)
      .set({ groupId: null })
      .where(eq(events.groupId, id));
    
    // Delete the community (members will be cascade deleted)
    await db.delete(groups).where(eq(groups.id, id));
  }

  // Community membership operations
  async joinCommunity(communityId: number, userId: string, role: string = 'member', bypassPrivateCheck: boolean = false): Promise<GroupMember> {
    // Check if community is private
    const community = await this.getCommunity(communityId);
    if (!community) {
      throw new Error('Community not found');
    }

    // If community is private, this method should only be called after approval
    // For public communities, join directly
    // bypassPrivateCheck is true when using invite codes
    if (community.isPublic === false && !bypassPrivateCheck) {
      // Check if there's an approved join request
      const existingRequest = await this.getUserJoinRequest(communityId, userId);
      if (!existingRequest || existingRequest.status !== 'approved') {
        throw new Error('Join request required for private community');
      }
    }

    const [membership] = await db.insert(groupMembers).values({
      groupId: communityId,
      userId,
      role,
    }).returning();
    
    // Update community member count
    await db.update(groups)
      .set({ 
        memberCount: sql`${groups.memberCount} + 1` 
      })
      .where(eq(groups.id, communityId));

    // If there was an approved join request, remove it
    if (community.isPublic === false) {
      const request = await this.getUserJoinRequest(communityId, userId);
      if (request) {
        await this.deleteJoinRequest(request.id);
      }
    }
    
    return membership;
  }

  // Method for direct joining (used internally for approved requests)
  async addCommunityMember(communityId: number, userId: string, role: string = 'member'): Promise<GroupMember> {
    const [membership] = await db.insert(groupMembers).values({
      groupId: communityId,
      userId,
      role,
    }).returning();
    
    // Update community member count
    await db.update(groups)
      .set({ 
        memberCount: sql`${groups.memberCount} + 1` 
      })
      .where(eq(groups.id, communityId));
    
    return membership;
  }

  async leaveCommunity(communityId: number, userId: string): Promise<void> {
    await db.delete(groupMembers)
      .where(and(
        eq(groupMembers.groupId, communityId),
        eq(groupMembers.userId, userId)
      ));
    
    // Update community member count
    await db.update(groups)
      .set({ 
        memberCount: sql`${groups.memberCount} - 1` 
      })
      .where(eq(groups.id, communityId));
  }

  async getCommunityMembers(communityId: number): Promise<any[]> {
    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, communityId),
      with: {
        user: true,
      },
      orderBy: [asc(groupMembers.role), asc(groupMembers.joinedAt)],
    });
    console.log(`[DEBUG] getCommunityMembers for group ${communityId}:`, JSON.stringify(members, null, 2));
    return members;
  }

  async getUserCommunityMembership(communityId: number, userId: string): Promise<GroupMember | undefined> {
    const [membership] = await db.select().from(groupMembers)
      .where(and(
        eq(groupMembers.groupId, communityId),
        eq(groupMembers.userId, userId)
      ));
    return membership;
  }

  async updateCommunityMemberRole(communityId: number, userId: string, role: string): Promise<GroupMember> {
    const [updatedMember] = await db.update(groupMembers)
      .set({ role })
      .where(and(
        eq(groupMembers.groupId, communityId),
        eq(groupMembers.userId, userId)
      ))
      .returning();
    return updatedMember;
  }

  // Community events
  async getCommunityEvents(communityId: number): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.groupId, communityId))
      .orderBy(desc(events.datetime));
  }

  // Announcement operations
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async getCommunityAnnouncements(communityId: number): Promise<any[]> {
    return await db.query.announcements.findMany({
      where: eq(announcements.groupId, communityId),
      with: {
        author: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reads: true,
      },
      orderBy: desc(announcements.createdAt),
    });
  }

  async markAnnouncementAsRead(announcementId: number, userId: string): Promise<AnnouncementRead> {
    // Use upsert to avoid duplicate read records
    const [readRecord] = await db.insert(announcementReads)
      .values({ announcementId, userId })
      .onConflictDoNothing()
      .returning();
    
    // If no record was inserted (already existed), fetch the existing one
    if (!readRecord) {
      const existing = await db.select().from(announcementReads)
        .where(and(
          eq(announcementReads.announcementId, announcementId),
          eq(announcementReads.userId, userId)
        ))
        .limit(1);
      return existing[0];
    }
    
    return readRecord;
  }

  async getUnreadAnnouncementsCount(communityId: number, userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(announcements)
      .leftJoin(announcementReads, and(
        eq(announcements.id, announcementReads.announcementId),
        eq(announcementReads.userId, userId)
      ))
      .where(and(
        eq(announcements.groupId, communityId),
        sql`${announcementReads.id} IS NULL`
      ));
    
    return result[0]?.count || 0;
  }

  // Community join request operations
  async createJoinRequest(request: InsertGroupJoinRequest): Promise<GroupJoinRequest> {
    const [joinRequest] = await db.insert(groupJoinRequests).values(request).returning();
    return joinRequest;
  }

  async getgroupJoinRequests(communityId: number): Promise<any[]> {
    return await db.select({
      id: groupJoinRequests.id,
      communityId: groupJoinRequests.groupId,
      userId: groupJoinRequests.userId,
      message: groupJoinRequests.message,
      status: groupJoinRequests.status,
      createdAt: groupJoinRequests.createdAt,
      updatedAt: groupJoinRequests.updatedAt,
      reviewedBy: groupJoinRequests.reviewedBy,
      reviewedAt: groupJoinRequests.reviewedAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      },
    })
    .from(groupJoinRequests)
    .leftJoin(users, eq(groupJoinRequests.userId, users.id))
    .where(eq(groupJoinRequests.groupId, communityId))
    .orderBy(desc(groupJoinRequests.createdAt));
  }

  async getUserJoinRequest(communityId: number, userId: string): Promise<GroupJoinRequest | undefined> {
    const [request] = await db.select()
      .from(groupJoinRequests)
      .where(and(
        eq(groupJoinRequests.groupId, communityId),
        eq(groupJoinRequests.userId, userId)
      ));
    return request;
  }

  async updateJoinRequest(requestId: number, status: string, reviewedBy: string): Promise<GroupJoinRequest> {
    const [request] = await db.update(groupJoinRequests)
      .set({ 
        status, 
        reviewedBy, 
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(groupJoinRequests.id, requestId))
      .returning();
    return request;
  }

  async deleteJoinRequest(requestId: number): Promise<void> {
    await db.delete(groupJoinRequests).where(eq(groupJoinRequests.id, requestId));
  }

  // Group invite code operations
  async createInviteCode(data: InsertGroupInviteCode): Promise<GroupInviteCode> {
    const [inviteCode] = await db.insert(groupInviteCodes).values(data).returning();
    return inviteCode;
  }

  async getInviteCodeByCode(code: string): Promise<GroupInviteCode | undefined> {
    const [inviteCode] = await db.select()
      .from(groupInviteCodes)
      .where(eq(groupInviteCodes.code, code));
    return inviteCode;
  }

  async getGroupInviteCodes(groupId: number): Promise<GroupInviteCode[]> {
    return await db.select()
      .from(groupInviteCodes)
      .where(eq(groupInviteCodes.groupId, groupId))
      .orderBy(desc(groupInviteCodes.createdAt));
  }

  async incrementInviteCodeUseCount(codeId: number): Promise<void> {
    await db.update(groupInviteCodes)
      .set({ useCount: sql`${groupInviteCodes.useCount} + 1` })
      .where(eq(groupInviteCodes.id, codeId));
  }

  async deactivateInviteCode(codeId: number): Promise<void> {
    await db.update(groupInviteCodes)
      .set({ isActive: false })
      .where(eq(groupInviteCodes.id, codeId));
  }

  async deleteInviteCode(codeId: number): Promise<void> {
    await db.delete(groupInviteCodes).where(eq(groupInviteCodes.id, codeId));
  }

  // Event invite code operations
  async createEventInviteCode(data: InsertEventInviteCode): Promise<EventInviteCode> {
    const [inviteCode] = await db.insert(eventInviteCodes).values(data).returning();
    return inviteCode;
  }

  async getEventInviteCodeByCode(code: string): Promise<EventInviteCode | undefined> {
    const [inviteCode] = await db.select()
      .from(eventInviteCodes)
      .where(eq(eventInviteCodes.code, code));
    return inviteCode;
  }

  async getEventInviteCodes(eventId: number): Promise<EventInviteCode[]> {
    return await db.select()
      .from(eventInviteCodes)
      .where(eq(eventInviteCodes.eventId, eventId))
      .orderBy(desc(eventInviteCodes.createdAt));
  }

  async incrementEventInviteCodeUseCount(codeId: number): Promise<void> {
    await db.update(eventInviteCodes)
      .set({ useCount: sql`${eventInviteCodes.useCount} + 1` })
      .where(eq(eventInviteCodes.id, codeId));
  }

  async deleteEventInviteCode(codeId: number): Promise<void> {
    await db.delete(eventInviteCodes).where(eq(eventInviteCodes.id, codeId));
  }
}

export const storage = new DatabaseStorage();
