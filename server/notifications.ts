import { db } from "./db";
import { notifications } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export interface CreateNotificationData {
  userId: string;
  type: 'access_request' | 'rsvp_update' | 'event_update' | 'access_response';
  title: string;
  message: string;
  eventId?: number;
  eventTitle?: string;
  fromUserId?: string;
  actionRequired?: boolean;
}

export interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  eventId?: number;
  eventTitle?: string;
  fromUserId?: string;
  actionRequired: boolean;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  fromUser?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export class NotificationService {
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      eventId: data.eventId || null,
      eventTitle: data.eventTitle || null,
      fromUserId: data.fromUserId || null,
      actionRequired: data.actionRequired || false,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    return notification as Notification;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const userNotifications = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        eventId: notifications.eventId,
        eventTitle: notifications.eventTitle,
        fromUserId: notifications.fromUserId,
        actionRequired: notifications.actionRequired,
        read: notifications.read,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return userNotifications as Notification[];
  }

  async getUserNotificationsWithUserData(userId: string, limit: number = 50): Promise<Notification[]> {
    // This would be more complex with joins - for now, let's get notifications first
    // and then fetch user data separately to keep it simple
    const userNotifications = await this.getUserNotifications(userId, limit);
    
    // For each notification with fromUserId, fetch the user data
    for (const notification of userNotifications) {
      if (notification.fromUserId) {
        try {
          // We'll need to import and use the storage service to get user data
          // For now, let's add a placeholder structure
          notification.fromUser = {
            id: notification.fromUserId,
            firstName: "User", // This will be filled by the API route
            lastName: "",
            profileImageUrl: undefined
          };
        } catch (error) {
          console.error(`Failed to fetch user data for notification ${notification.id}:`, error);
        }
      }
    }

    return userNotifications;
  }

  async markAsRead(notificationId: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        read: true, 
        updatedAt: new Date().toISOString() 
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        read: true, 
        updatedAt: new Date().toISOString() 
      })
      .where(eq(notifications.userId, userId));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));

    return result.length;
  }

  async deleteNotification(notificationId: number, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async deleteAllUserNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
  }
}

// Helper functions to create specific notification types
export const createAccessRequestNotification = async (
  notificationService: NotificationService,
  hostId: string,
  requesterData: { id: string; firstName: string; lastName: string },
  eventData: { id: number; title: string }
): Promise<void> => {
  await notificationService.createNotification({
    userId: hostId,
    type: 'access_request',
    title: 'New Access Request',
    message: `${requesterData.firstName} ${requesterData.lastName} requested access to your private event "${eventData.title}"`,
    eventId: eventData.id,
    eventTitle: eventData.title,
    fromUserId: requesterData.id,
    actionRequired: true
  });
};

export const createRSVPNotification = async (
  notificationService: NotificationService,
  hostId: string,
  userData: { id: string; firstName: string; lastName: string },
  eventData: { id: number; title: string },
  status: string
): Promise<void> => {
  const statusText = status === 'going' ? 'is attending' : 
                   status === 'maybe' ? 'might attend' : 'cannot attend';
  
  await notificationService.createNotification({
    userId: hostId,
    type: 'rsvp_update',
    title: 'RSVP Update',
    message: `${userData.firstName} ${userData.lastName} ${statusText} "${eventData.title}"`,
    eventId: eventData.id,
    eventTitle: eventData.title,
    fromUserId: userData.id,
    actionRequired: false
  });
};

export const createAccessResponseNotification = async (
  notificationService: NotificationService,
  requesterId: string,
  eventData: { id: number; title: string },
  approved: boolean
): Promise<void> => {
  await notificationService.createNotification({
    userId: requesterId,
    type: 'access_response',
    title: approved ? 'Access Approved' : 'Access Denied',
    message: approved 
      ? `Your access request for "${eventData.title}" has been approved!`
      : `Your access request for "${eventData.title}" was denied.`,
    eventId: eventData.id,
    eventTitle: eventData.title,
    actionRequired: false
  });
};

export const createEventUpdateNotification = async (
  notificationService: NotificationService,
  attendeeIds: string[],
  eventData: { id: number; title: string },
  updateType: string
): Promise<void> => {
  const message = updateType === 'time' 
    ? `Event "${eventData.title}" time has been updated`
    : updateType === 'location'
    ? `Event "${eventData.title}" location has been updated`
    : `Event "${eventData.title}" has been updated`;

  for (const attendeeId of attendeeIds) {
    await notificationService.createNotification({
      userId: attendeeId,
      type: 'event_update',
      title: 'Event Updated',
      message,
      eventId: eventData.id,
      eventTitle: eventData.title,
      actionRequired: false
    });
  }
};

export const createGroupJoinRequestNotification = async (
  notificationService: NotificationService,
  adminUserIds: string[],
  requesterData: { id: string; firstName: string; lastName: string },
  groupData: { id: number; name: string }
): Promise<void> => {
  const uniqueAdminIds = [...new Set(adminUserIds)].filter(id => id && id !== requesterData.id);

  for (const adminId of uniqueAdminIds) {
    await notificationService.createNotification({
      userId: adminId,
      type: 'rsvp_update',
      title: 'New Group Join Request',
      message: `${requesterData.firstName} ${requesterData.lastName} requested to join your private group "${groupData.name}"`,
      fromUserId: requesterData.id,
      actionRequired: true,
    });
  }
};