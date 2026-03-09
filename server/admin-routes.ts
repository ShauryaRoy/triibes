import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, desc, sql, or, like, inArray } from "drizzle-orm";
import { 
  adminRoles, 
  adminAuditLogs, 
  events, 
  groups, 
  users,
  eventRsvps,
  groupMembers 
} from "@shared/schema";

// Extend Express Request type to include admin info
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

// Admin authentication middleware
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const userId = (req.user as any).id;
    
    // Check if user has an active admin role
    const adminRole = await db.query.adminRoles.findFirst({
      where: and(
        eq(adminRoles.userId, userId),
        sql`${adminRoles.revokedAt} IS NULL`
      ),
    });

    if (!adminRole) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Attach admin info to request
    req.admin = {
      id: userId,
      role: adminRole.role || 'moderator',
      email: (req.user as any).email
    };

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    res.status(500).json({ message: "Failed to verify admin access" });
  }
}

// Log admin action
async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: number | null,
  details: any,
  req: Request
) {
  try {
    await db.insert(adminAuditLogs).values({
      adminId,
      action,
      entityType,
      entityId,
      details: details || {},
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
}

export function registerAdminRoutes(app: Express) {
  
  // ==================== ADMIN DASHBOARD ====================
  
  // Get admin dashboard stats
  app.get('/api/admin/dashboard/stats', isAdmin, async (req: Request, res: Response) => {
    try {
      // Get counts
      const [totalEvents] = await db.select({ count: sql<number>`count(*)` }).from(events);
      const [totalGroups] = await db.select({ count: sql<number>`count(*)` }).from(groups);
      const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const [pendingDiscoverRequests] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(eq(events.discoverStatus, 'requested'));

      // Get recent events
      const recentEvents = await db
        .select({
          id: events.id,
          title: events.title,
          createdAt: events.createdAt,
          discoverStatus: events.discoverStatus,
        })
        .from(events)
        .orderBy(desc(events.createdAt))
        .limit(10);

      res.json({
        stats: {
          totalEvents: totalEvents.count,
          totalGroups: totalGroups.count,
          totalUsers: totalUsers.count,
          pendingDiscoverRequests: pendingDiscoverRequests.count,
        },
        recentEvents,
      });
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ==================== EVENT MANAGEMENT ====================
  
  // Get all events with filters
  app.get('/api/admin/events', isAdmin, async (req: Request, res: Response) => {
    try {
      const { 
        status, 
        discoverStatus, 
        search, 
        page = '1', 
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc' 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build where conditions
      const conditions = [];
      
      if (discoverStatus && discoverStatus !== 'all') {
        conditions.push(eq(events.discoverStatus, discoverStatus as string));
      }
      
      if (search) {
        conditions.push(
          or(
            like(events.title, `%${search}%`),
            like(events.description, `%${search}%`)
          )
        );
      }

      // Get events with host information
      const eventsList = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          datetime: events.datetime,
          location: events.location,
          isPublic: events.isPublic,
          discoverStatus: events.discoverStatus,
          discoverRequestedAt: events.discoverRequestedAt,
          discoverRequestedMessage: events.discoverRequestedMessage,
          discoverReviewedAt: events.discoverReviewedAt,
          discoverReviewNote: events.discoverReviewNote,
          createdAt: events.createdAt,
          hostId: events.hostId,
          hostEmail: users.email,
          hostFirstName: users.firstName,
          hostLastName: users.lastName,
        })
        .from(events)
        .leftJoin(users, eq(events.hostId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sortOrder === 'asc' ? sql`${events[sortBy as keyof typeof events]} ASC` : desc(events[sortBy as keyof typeof events]))
        .limit(limitNum)
        .offset(offset);

      // Get total count for pagination
      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        events: eventsList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching admin events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get single event details
  app.get('/api/admin/events/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get host details
      const [host] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        })
        .from(users)
        .where(eq(users.id, event.hostId));

      // Get RSVP count
      const [{ count: rsvpCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRsvps)
        .where(eq(eventRsvps.eventId, eventId));

      res.json({
        ...event,
        host,
        rsvpCount,
      });
    } catch (error) {
      console.error("Error fetching event details:", error);
      res.status(500).json({ message: "Failed to fetch event details" });
    }
  });

  // Request discover listing (host endpoint - also available to regular users)
  app.post('/api/events/:id/request-discover', async (req: any, res: Response) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;
      const { message } = req.body;

      // Get event and verify user is the host
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.hostId !== userId) {
        return res.status(403).json({ message: "Only the event host can request discover listing" });
      }

      if (!event.isPublic) {
        return res.status(400).json({ message: "Only public events can be listed in discover" });
      }

      if (event.discoverStatus === 'requested') {
        return res.status(400).json({ message: "Discover listing already requested" });
      }

      if (event.discoverStatus === 'approved') {
        return res.status(400).json({ message: "Event is already listed in discover" });
      }

      // Update event with discover request
      await db
        .update(events)
        .set({
          discoverStatus: 'requested',
          discoverRequestedAt: new Date(),
          discoverRequestedMessage: message || null,
        })
        .where(eq(events.id, eventId));

      res.json({ message: "Discover listing requested successfully" });
    } catch (error) {
      console.error("Error requesting discover listing:", error);
      res.status(500).json({ message: "Failed to request discover listing" });
    }
  });

  // Approve event for discover
  app.post('/api/admin/events/:id/approve-discover', isAdmin, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const { note } = req.body;

      // Get event and host details before updating
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const [host] = await db
        .select()
        .from(users)
        .where(eq(users.id, event.hostId));

      await db
        .update(events)
        .set({
          discoverStatus: 'approved',
          discoverReviewedBy: req.admin!.id,
          discoverReviewedAt: new Date(),
          discoverReviewNote: note || null,
        })
        .where(eq(events.id, eventId));

      // Log action
      await logAdminAction(
        req.admin!.id,
        'approve_discover',
        'event',
        eventId,
        { note },
        req
      );

      res.json({ message: "Event approved for discover" });
    } catch (error) {
      console.error("Error approving event for discover:", error);
      res.status(500).json({ message: "Failed to approve event" });
    }
  });

  // Reject event for discover
  app.post('/api/admin/events/:id/reject-discover', isAdmin, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const { reason } = req.body;

      // Get event and host details before updating
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const [host] = await db
        .select()
        .from(users)
        .where(eq(users.id, event.hostId));

      await db
        .update(events)
        .set({
          discoverStatus: 'rejected',
          discoverReviewedBy: req.admin!.id,
          discoverReviewedAt: new Date(),
          discoverReviewNote: reason || null,
        })
        .where(eq(events.id, eventId));

      // Log action
      await logAdminAction(
        req.admin!.id,
        'reject_discover',
        'event',
        eventId,
        { reason },
        req
      );

      res.json({ message: "Event rejected for discover" });
    } catch (error) {
      console.error("Error rejecting event for discover:", error);
      res.status(500).json({ message: "Failed to reject event" });
    }
  });

  // Delete event (admin action)
  app.delete('/api/admin/events/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const { reason } = req.body;

      await db.delete(events).where(eq(events.id, eventId));

      // Log action
      await logAdminAction(
        req.admin!.id,
        'delete_event',
        'event',
        eventId,
        { reason },
        req
      );

      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ==================== GROUP MANAGEMENT ====================
  
  // Get all groups with filters
  app.get('/api/admin/groups', isAdmin, async (req: Request, res: Response) => {
    try {
      const { 
        discoverStatus, 
        search, 
        page = '1', 
        limit = '20' 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build where conditions
      const conditions = [];
      
      if (discoverStatus && discoverStatus !== 'all') {
        conditions.push(eq(groups.discoverStatus, discoverStatus as string));
      }
      
      if (search) {
        conditions.push(
          or(
            like(groups.name, `%${search}%`),
            like(groups.description, `%${search}%`)
          )
        );
      }

      // Get groups with creator information
      const groupsList = await db
        .select({
          id: groups.id,
          name: groups.name,
          description: groups.description,
          slug: groups.slug,
          category: groups.category,
          isPublic: groups.isPublic,
          memberCount: groups.memberCount,
          discoverStatus: groups.discoverStatus,
          createdAt: groups.createdAt,
          creatorId: groups.createdBy,
          creatorEmail: users.email,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
        })
        .from(groups)
        .leftJoin(users, eq(groups.createdBy, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(groups.createdAt))
        .limit(limitNum)
        .offset(offset);

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(groups)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        groups: groupsList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching admin groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  // Approve group for discover/groups page
  app.post('/api/admin/groups/:id/approve-discover', isAdmin, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      const { note } = req.body;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId));

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      await db
        .update(groups)
        .set({
          discoverStatus: 'approved',
          discoverReviewedBy: req.admin!.id,
          discoverReviewedAt: new Date(),
          discoverReviewNote: note || null,
        })
        .where(eq(groups.id, groupId));

      await logAdminAction(
        req.admin!.id,
        'approve_group_discover',
        'group',
        groupId,
        { note },
        req
      );

      res.json({ message: "Group approved for groups page" });
    } catch (error) {
      console.error("Error approving group:", error);
      res.status(500).json({ message: "Failed to approve group" });
    }
  });

  // Reject group from discover/groups page
  app.post('/api/admin/groups/:id/reject-discover', isAdmin, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      const { reason } = req.body;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId));

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      await db
        .update(groups)
        .set({
          discoverStatus: 'rejected',
          discoverReviewedBy: req.admin!.id,
          discoverReviewedAt: new Date(),
          discoverReviewNote: reason || null,
        })
        .where(eq(groups.id, groupId));

      await logAdminAction(
        req.admin!.id,
        'reject_group_discover',
        'group',
        groupId,
        { reason },
        req
      );

      res.json({ message: "Group rejected from groups page" });
    } catch (error) {
      console.error("Error rejecting group:", error);
      res.status(500).json({ message: "Failed to reject group" });
    }
  });

  // Delete group (admin action)
  app.delete('/api/admin/groups/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      const { reason } = req.body;

      await db.delete(groups).where(eq(groups.id, groupId));

      await logAdminAction(
        req.admin!.id,
        'delete_group',
        'group',
        groupId,
        { reason },
        req
      );

      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // ==================== USER MANAGEMENT ====================
  
  // Get all users
  app.get('/api/admin/users', isAdmin, async (req: Request, res: Response) => {
    try {
      const { search, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(users.email, `%${search}%`),
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`)
          )
        );
      }

      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(limitNum)
        .offset(offset);

      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        users: usersList,
        pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Ban user
app.post('/api/admin/users/:id/ban', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { reason, duration } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Ban reason is required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.banned) {
      return res.status(400).json({ message: "User is already banned" });
    }

    // Update user banned status
    await db
      .update(users)
      .set({ banned: true })
      .where(eq(users.id, userId));

    // Log action
    await logAdminAction(
      req.admin!.id,
      'ban_user',
      'user',
      null,
      { userId, reason, duration },
      req
    );

    res.json({ message: "User banned successfully" });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ message: "Failed to ban user" });
  }
});

// Unban user
app.post('/api/admin/users/:id/unban', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.banned) {
      return res.status(400).json({ message: "User is not banned" });
    }

    // Update user banned status
    await db
      .update(users)
      .set({ banned: false })
      .where(eq(users.id, userId));

    // Log action
    await logAdminAction(
      req.admin!.id,
      'unban_user',
      'user',
      null,
      { userId, reason },
      req
    );

    res.json({ message: "User unbanned successfully" });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ message: "Failed to unban user" });
  }
});  // ==================== AUDIT LOGS ====================
  
  // Get audit logs
  app.get('/api/admin/audit-logs', isAdmin, async (req: Request, res: Response) => {
    try {
      const { 
        entityType, 
        action, 
        page = '1', 
        limit = '50' 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      if (entityType) {
        conditions.push(eq(adminAuditLogs.entityType, entityType as string));
      }
      if (action) {
        conditions.push(eq(adminAuditLogs.action, action as string));
      }

      const logs = await db
        .select({
          id: adminAuditLogs.id,
          action: adminAuditLogs.action,
          entityType: adminAuditLogs.entityType,
          entityId: adminAuditLogs.entityId,
          details: adminAuditLogs.details,
          ipAddress: adminAuditLogs.ipAddress,
          createdAt: adminAuditLogs.createdAt,
          adminId: adminAuditLogs.adminId,
          adminEmail: users.email,
          adminFirstName: users.firstName,
          adminLastName: users.lastName,
        })
        .from(adminAuditLogs)
        .leftJoin(users, eq(adminAuditLogs.adminId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(limitNum)
        .offset(offset);

      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(adminAuditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ==================== ADMIN ROLE MANAGEMENT ====================
  
  // Grant admin role (superadmin only)
  app.post('/api/admin/roles/grant', isAdmin, async (req: Request, res: Response) => {
    try {
      if (req.admin!.role !== 'superadmin') {
        return res.status(403).json({ message: "Only superadmins can grant roles" });
      }

      const { userId, role } = req.body;

      if (!['superadmin', 'admin', 'moderator', 'reviewer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if user already has a role
      const existingRole = await db.query.adminRoles.findFirst({
        where: and(
          eq(adminRoles.userId, userId),
          sql`${adminRoles.revokedAt} IS NULL`
        ),
      });

      if (existingRole) {
        return res.status(400).json({ message: "User already has an admin role" });
      }

      await db.insert(adminRoles).values({
        userId,
        role,
        grantedBy: req.admin!.id,
      });

      // Log action
      await logAdminAction(
        req.admin!.id,
        'grant_admin_role',
        'user',
        null,
        { userId, role },
        req
      );

      res.json({ message: "Admin role granted successfully" });
    } catch (error) {
      console.error("Error granting admin role:", error);
      res.status(500).json({ message: "Failed to grant admin role" });
    }
  });

  // Revoke admin role (superadmin only)
  app.post('/api/admin/roles/revoke', isAdmin, async (req: Request, res: Response) => {
    try {
      if (req.admin!.role !== 'superadmin') {
        return res.status(403).json({ message: "Only superadmins can revoke roles" });
      }

      const { userId } = req.body;

      await db
        .update(adminRoles)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(adminRoles.userId, userId),
          sql`${adminRoles.revokedAt} IS NULL`
        ));

      // Log action
      await logAdminAction(
        req.admin!.id,
        'revoke_admin_role',
        'user',
        null,
        { userId },
        req
      );

      res.json({ message: "Admin role revoked successfully" });
    } catch (error) {
      console.error("Error revoking admin role:", error);
      res.status(500).json({ message: "Failed to revoke admin role" });
    }
  });

  // List all admin users
  app.get('/api/admin/roles', isAdmin, async (req: Request, res: Response) => {
    try {
      const adminUsers = await db
        .select({
          id: adminRoles.id,
          userId: adminRoles.userId,
          role: adminRoles.role,
          grantedAt: adminRoles.grantedAt,
          revokedAt: adminRoles.revokedAt,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(adminRoles)
        .leftJoin(users, eq(adminRoles.userId, users.id))
        .orderBy(desc(adminRoles.grantedAt));

      res.json(adminUsers);
    } catch (error) {
      console.error("Error fetching admin roles:", error);
      res.status(500).json({ message: "Failed to fetch admin roles" });
    }
  });

  // ── Notification Outbox: diagnostics + manual trigger ──────────────────────

  app.get('/api/admin/outbox', isAdmin, async (_req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT id, event_type, status, retry_count,
               created_at, processed_at, payload
        FROM notification_outbox
        ORDER BY created_at DESC
        LIMIT 50
      `);
      const summary = await db.execute(sql`
        SELECT status, COUNT(*) AS count
        FROM notification_outbox
        GROUP BY status
      `);
      res.json({ summary: summary.rows, rows: rows.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Force-process the outbox immediately (resets stuck rows + sends pending emails)
  app.post('/api/admin/outbox/process', isAdmin, async (_req: Request, res: Response) => {
    try {
      const { processNotificationOutbox } = await import('./notification-outbox');

      // Reset ANY row stuck in 'processing' regardless of age, then process
      await db.execute(sql`
        UPDATE notification_outbox
        SET status = 'pending'
        WHERE status = 'processing'
      `);

      // Also reset failed rows so they get one more attempt
      const resetResult = await db.execute(sql`
        UPDATE notification_outbox
        SET status = 'pending', retry_count = 0
        WHERE status = 'failed'
      `);

      await processNotificationOutbox();

      const after = await db.execute(sql`
        SELECT status, COUNT(*) AS count FROM notification_outbox GROUP BY status
      `);
      res.json({
        message: 'Outbox processed',
        resetFailed: (resetResult as any).rowCount ?? 0,
        statuses: after.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check if current user is admin
  app.get('/api/admin/check', async (req: Request, res: Response) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.json({ isAdmin: false });
    }

    try {
      const userId = (req.user as any).id;
      
      const adminRole = await db.query.adminRoles.findFirst({
        where: and(
          eq(adminRoles.userId, userId),
          sql`${adminRoles.revokedAt} IS NULL`
        ),
      });

      res.json({ 
        isAdmin: !!adminRole,
        role: adminRole?.role || null 
      });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.json({ isAdmin: false });
    }
  });
}
