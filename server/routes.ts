import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes, isAuthenticated } from "./replitAuth";
import { insertEventSchema, insertRsvpSchema, insertPostSchema, insertPollSchema, insertExpenseSchema, insertSettlementSchema, insertGroupSchema, insertGroupMemberSchema, events } from "@shared/schema";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import path from "path";
import express from "express";
import multer from "multer";
import fs from "fs";
import uploadRoutes from "./routes/upload";
import { 
  NotificationService, 
  createAccessRequestNotification, 
  createRSVPNotification, 
  createAccessResponseNotification,
  createEventUpdateNotification 
} from "./notifications";
import { generateRandomSlug, getSlugValidationError } from "@shared/slug-utils";
import { generateEventSlug } from "@shared/event-slug-utils";
import { registerAdminRoutes } from "./admin-routes";
import { handleEventSSR, handleGroupSSR, handleHomeSSR } from "./ssr";
import { generateSitemap, generateRobotsTxt } from "./seo";

// ES module __dirname workaround
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, "../uploads");
console.log('Uploads directory:', uploadsDir);
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created successfully');
} else {
  console.log('Uploads directory already exists');
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize notification service
  const notificationService = new NotificationService();

  // ============================================
  // SSR Routes (for SEO) - Must be before API routes
  // ============================================
  // Check if request is from a bot/crawler for SSR
  const isBotRequest = (userAgent: string | undefined): boolean => {
    if (!userAgent) return false;
    const botPatterns = [
      'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
      'yandexbot', 'facebookexternalhit', 'twitterbot', 'whatsapp',
      'telegrambot', 'linkedinbot', 'slackbot', 'discordbot'
    ];
    return botPatterns.some(bot => userAgent.toLowerCase().includes(bot));
  };

  // SSR for event pages (for SEO and social sharing)
  app.get('/events/:id', (req, res, next) => {
    const userAgent = req.get('user-agent');
    // Only use SSR for bots/crawlers, let React handle normal users
    if (isBotRequest(userAgent)) {
      return handleEventSSR(req, res);
    }
    next(); // Pass to Vite for React app
  });

  // SSR for group pages
  app.get('/groups/:id', (req, res, next) => {
    const userAgent = req.get('user-agent');
    if (isBotRequest(userAgent)) {
      return handleGroupSSR(req, res);
    }
    next();
  });

  // SSR for home/discover page
  app.get('/', (req, res, next) => {
    const userAgent = req.get('user-agent');
    if (isBotRequest(userAgent)) {
      return handleHomeSSR(req, res);
    }
    next();
  });

  // Only set up auth routes here
  setupAuthRoutes(app);

  // Register admin routes
  registerAdminRoutes(app);

  // SEO: Generate sitemap and robots.txt
  generateSitemap(app);
  generateRobotsTxt(app);

  // Register upload routes for Cloudflare Images
  app.use('/api/upload', uploadRoutes);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Image upload route
  app.post('/api/upload', (req: any, res) => {
    console.log('=== UPLOAD REQUEST RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('Files:', req.files);
    console.log('Body:', req.body);
    
    upload.single('image')(req, res, (err) => {
      console.log('=== MULTER CALLBACK ===');
      if (err) {
        console.error('Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        if (err.message === 'Only image files are allowed') {
          return res.status(400).json({ error: 'Only image files are allowed (jpeg, jpg, png, gif, webp)' });
        }
        return res.status(500).json({ error: 'Upload failed' });
      }
      
      if (!req.file) {
        console.log('No file found in request after multer processing');
        console.log('req.files:', req.files);
        console.log('req.file:', req.file);
        console.log('req.body after multer:', req.body);
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      console.log('File uploaded successfully:', imageUrl);
      console.log('File details:', req.file);
      res.json({ url: imageUrl });
    });
  });

  // Get current user
  app.get('/api/auth/user', (req, res) => {
    console.log("[DEBUG] 🔵 /api/auth/user called");
    console.log("[DEBUG] 🔵 Cookies:", req.headers.cookie);
    console.log("[DEBUG] 🔵 req.isAuthenticated():", req.isAuthenticated());
    console.log("[DEBUG] 🔵 req.user:", req.user);
    console.log("[DEBUG] 🔵 req.session:", req.session);
    console.log("[DEBUG] 🔵 req.sessionID:", req.sessionID);
    
    if (!req.isAuthenticated() || !req.user) {
      console.log("[DEBUG] ❌ User not authenticated, returning 401");
      return res.status(401).json(null);
    }
    console.log("[DEBUG] ✅ User authenticated, returning user data");
    res.json(req.user);
  });

  // Profile routes
  app.get('/api/profile', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/profile', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const { firstName, lastName, bio, location } = req.body;
      
      const updatedProfile = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        bio,
        location
      });
      
      res.json(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/profile/stats', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/profile/events', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching user events:', error);
      res.status(500).json({ message: "Failed to fetch user events" });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================
  
  // Get user notifications
  app.get('/api/notifications', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const notifications = await notificationService.getUserNotifications(userId);
      const unreadCount = await notificationService.getUnreadCount(userId);
      
      // Enhance notifications with user data for fromUserId
      const enhancedNotifications = await Promise.all(
        notifications.map(async (notification) => {
          if (notification.fromUserId) {
            const fromUser = await storage.getUser(notification.fromUserId);
            return {
              ...notification,
              fromUser: fromUser ? {
                id: fromUser.id,
                firstName: fromUser.firstName || 'Unknown',
                lastName: fromUser.lastName || 'User',
                profileImageUrl: fromUser.profileImageUrl
              } : null
            };
          }
          return notification;
        })
      );
      
      res.json({
        notifications: enhancedNotifications,
        unreadCount
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await notificationService.markAsRead(notificationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.patch('/api/notifications/read-all', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      await notificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await notificationService.deleteNotification(notificationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const unreadCount = await notificationService.getUnreadCount(userId);
      res.json({ unreadCount });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Event routes
  app.post('/api/events', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create an event." });
    }
    try {
      const userId = req.user.id;
      // Manually create event data with proper date handling
      const eventData = {
        title: req.body.title,
        slug: generateEventSlug(req.body.title), // Generate unique slug
        description: req.body.description,
        hostId: userId,
        groupId: req.body.groupId || null, // Add community support
        eventType: req.body.eventType,
        location: req.body.location,
        mapLink: req.body.mapLink, // Add map link support
        datetime: new Date(req.body.datetime),
        imageUrl: req.body.imageUrl,
        maxGuests: req.body.maxGuests,
        isPublic: req.body.isPrivate ? false : true, // Convert isPrivate to isPublic
        themeId: req.body.themeId || 'quantum-dark', // Add theme support
        settings: req.body.settings,
        posterData: req.body.posterData,
      };
      console.log("[Create Event] Incoming request body:", req.body);
      console.log("[Create Event] Parsed eventData (with slug):", eventData);
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof Error) {
        console.error("[Create Event] Error stack:", error.stack);
        res.status(500).json({ message: "Failed to create event", error: error.message });
      } else {
        res.status(500).json({ message: "Failed to create event", error: String(error) });
      }
    }
  });

  // Health check route
  app.get('/api/health', async (req, res) => {
    try {
      // Simple database connectivity test
      const result = await db.execute(sql`SELECT 1 as test`);
      res.json({ 
        status: 'ok', 
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        status: 'error', 
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/events/discover', async (req: any, res) => {
    try {
      const events = await storage.getPublicEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching public events:", error);
      res.status(500).json({ message: "Failed to fetch public events" });
    }
  });

  app.get('/api/events', async (req: any, res) => {
    try {
      const userId = req.user?.id
      // console.log(`[DEBUG] Fetching events for user: ${userId}`);  // Disabled
      const events = await storage.getUserEvents(userId);
      // console.log(`[DEBUG] Found ${events?.length || 0} events for user ${userId}`);
      // if (events && events.length > 0) {
      //   console.log(`[DEBUG] Event IDs:`, events.map((e: any) => e.id));
      // }
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:idOrSlug', async (req, res) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      console.log(`[DEBUG] Fetching event with ID or slug: ${idOrSlug}`);
      
      // Try to parse as number first (ID), otherwise treat as slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        // It's a numeric ID
        const eventId = parseInt(idOrSlug);
        event = await storage.getEventWithDetails(eventId);
      } else {
        // It's a slug
        event = await storage.getEventWithDetailsBySlug(idOrSlug);
      }
      
      console.log(`[DEBUG] Event found:`, event ? 'YES' : 'NO');
      if (!event) {
        console.log(`[DEBUG] Event ${idOrSlug} not found in database`);
        return res.status(404).json({ message: "Event not found" });
      }
      console.log(`[DEBUG] Returning event data for ${idOrSlug}:`, {
        title: event.title,
        id: event.id,
        slug: event.slug,
        hostId: event.hostId,
        location: event.location,
        mapLink: event.mapLink
      });
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Add share route for events
  app.get('/api/events/:id/share', async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEventWithDetails(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get RSVP counts
      const rsvpCounts = await storage.getEventRsvpCounts(eventId);
      
      // Get user's RSVP status and access request status if authenticated
      let userRsvpStatus = null;
      let hasRequestedAccess = false;
      if (req.isAuthenticated?.() && req.user) {
        const userRsvp = await storage.getUserRsvp(eventId, req.user.id);
        userRsvpStatus = userRsvp?.status || null;
        hasRequestedAccess = userRsvpStatus === 'pending_access';
      }

      // Get host information
      const host = await storage.getUser(event.hostId);

      const eventWithDetails = {
        ...event,
        ...rsvpCounts,
        userRsvpStatus,
        hasRequestedAccess,
        hostName: host ? `${host.firstName || ''} ${host.lastName || ''}`.trim() || host.email : "Unknown Host"
      };

      res.json(eventWithDetails);
    } catch (error) {
      console.error("Error fetching event for sharing:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

app.put('/api/events/:idOrSlug', async (req: any, res) => {
  try {
    const idOrSlug = req.params.idOrSlug;
    const userId = req.user?.id; // ← Use actual logged-in user ID

    console.log("🔄 PUT /api/events/:idOrSlug called with:", {
      idOrSlug,
      userId,
      body: req.body,
      posterData: req.body.posterData
    });

    if (!userId) {
      console.log("❌ No user ID found in request");
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Get event by ID or slug
    let event;
    if (/^\d+$/.test(idOrSlug)) {
      // It's a numeric ID
      event = await storage.getEvent(parseInt(idOrSlug));
    } else {
      // It's a slug
      event = await storage.getEventBySlug(idOrSlug);
    }
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.hostId !== userId) {
      console.log("❌ User not authorized:", { eventHostId: event?.hostId, userId });
      return res.status(403).json({ message: "Not authorized to update this event" });
    }

    const eventData = insertEventSchema.partial().parse(req.body);
    console.log("📝 Parsed event data:", eventData);
    const updatedEvent = await storage.updateEvent(event.id, eventData);
    console.log("✅ Event updated successfully:", updatedEvent);
    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
});


  app.delete('/api/events/:idOrSlug', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to delete an event." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id; // Use actual authenticated user ID
      
      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEvent(parseInt(idOrSlug));
      } else {
        event = await storage.getEventBySlug(idOrSlug);
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.hostId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }
      
      await storage.deleteEvent(event.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Request discover page access
  app.post('/api/events/:idOrSlug/request-discover', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: "You must be logged in to request discover access." });
      }

      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      const { message } = req.body;
      
      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEvent(parseInt(idOrSlug));
      } else {
        event = await storage.getEventBySlug(idOrSlug);
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.hostId !== userId) {
        return res.status(403).json({ message: "Only the event host can request discover access" });
      }

      if (event.discoverStatus === 'requested') {
        return res.status(400).json({ message: "Discover access already requested" });
      }

      if (event.discoverStatus === 'approved') {
        return res.status(400).json({ message: "Event is already on the discover page" });
      }
      
      // Update event discover status
      await db.update(events).set({
        discoverStatus: 'requested',
        discoverRequestedAt: new Date(),
        discoverRequestedMessage: message || null,
      }).where(eq(events.id, event.id));
      
      res.json({ message: "Discover access requested successfully" });
    } catch (error) {
      console.error("Error requesting discover access:", error);
      res.status(500).json({ message: "Failed to request discover access" });
    }
  });

  // Cancel discover request
  app.post('/api/events/:idOrSlug/cancel-discover-request', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: "You must be logged in." });
      }

      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      
      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEvent(parseInt(idOrSlug));
      } else {
        event = await storage.getEventBySlug(idOrSlug);
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.hostId !== userId) {
        return res.status(403).json({ message: "Only the event host can cancel discover request" });
      }

      if (event.discoverStatus !== 'requested') {
        return res.status(400).json({ message: "No pending discover request to cancel" });
      }
      
      // Reset discover status
      await db.update(events).set({
        discoverStatus: 'none',
        discoverRequestedAt: null,
        discoverRequestedMessage: null,
      }).where(eq(events.id, event.id));
      
      res.json({ message: "Discover request cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling discover request:", error);
      res.status(500).json({ message: "Failed to cancel discover request" });
    }
  });

  // RSVP routes
  app.post('/api/events/:idOrSlug/rsvp', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: "You must be logged in to RSVP." });
      }
      
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id; // Use the actual authenticated user ID
      const { status, plusOneCount = 0, dietaryRestrictions, comments } = req.body;
      
      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        const eventId = parseInt(idOrSlug);
        event = await storage.getEventWithDetails(eventId);
      } else {
        event = await storage.getEventWithDetailsBySlug(idOrSlug);
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const eventId = event.id;
      
      // Check if RSVP already exists
      const existingRsvp = await storage.getUserRsvp(eventId, userId);
      
      if (existingRsvp) {
        const updatedRsvp = await storage.updateRsvp(
          eventId, 
          userId, 
          status, 
          plusOneCount,
          dietaryRestrictions,
          comments
        );
        
        if (!updatedRsvp) {
          return res.status(500).json({ message: "Failed to update RSVP in database" });
        }
        
        // Create RSVP update notification for host (if status is meaningful and user is not the host)
        if (String(event.hostId) !== String(userId) && ['going', 'maybe', 'not_going'].includes(status)) {
          await createRSVPNotification(
            notificationService,
            String(event.hostId),
            {
              id: userId,
              firstName: req.user.firstName || 'Unknown',
              lastName: req.user.lastName || 'User'
            },
            {
              id: eventId,
              title: event.title
            },
            status
          );
        }
        
        res.json(updatedRsvp);
      } else {
        const rsvpData = insertRsvpSchema.parse({
          eventId,
          userId,
          status,
          plusOneCount,
          dietaryRestrictions,
          comments,
        });
        const rsvp = await storage.createRsvp(rsvpData);
        
        // Create RSVP notification for host (if status is meaningful and user is not the host)
        if (String(event.hostId) !== String(userId) && ['going', 'maybe', 'not_going'].includes(status)) {
          await createRSVPNotification(
            notificationService,
            String(event.hostId),
            {
              id: userId,
              firstName: req.user.firstName || 'Unknown',
              lastName: req.user.lastName || 'User'
            },
            {
              id: eventId,
              title: event.title
            },
            status
          );
        }
        
        res.json(rsvp);
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
      res.status(500).json({ message: "Failed to update RSVP" });
    }
  });

  app.get('/api/events/:idOrSlug/rsvps', async (req, res) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      
      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        const eventId = parseInt(idOrSlug);
        event = await storage.getEventWithDetails(eventId);
      } else {
        event = await storage.getEventWithDetailsBySlug(idOrSlug);
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const rsvps = await storage.getEventRsvps(event.id);
      
      // Get detailed user information for each RSVP
      const detailedRsvps = await Promise.all(
        rsvps.map(async (rsvp: any) => {
          const user = await storage.getUser(rsvp.userId);
          return { ...rsvp, user };
        })
      );
      
      res.json(detailedRsvps);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ message: "Failed to fetch RSVPs" });
    }
  });

  // Request access to private event
  app.post('/api/events/:idOrSlug/request-access', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: "You must be logged in to request access." });
      }

      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;

      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        const eventId = parseInt(idOrSlug);
        event = await storage.getEventWithDetails(eventId);
      } else {
        event = await storage.getEventWithDetailsBySlug(idOrSlug);
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const eventId = event.id;

      // Check if event is private
      if (event.isPublic !== false) {
        return res.status(400).json({ message: "This event is already public" });
      }

      // Check if user is already the host
      if (String(event.hostId) === String(userId)) {
        return res.status(400).json({ message: "You are the host of this event" });
      }

      // Check if user already has access (has RSVP)
      const existingRsvp = await storage.getUserRsvp(eventId, userId);
      if (existingRsvp) {
        return res.status(400).json({ message: "You already have access to this event" });
      }

      // For now, we'll create a pending RSVP as a form of access request
      // In a more complete implementation, you might want a separate access_requests table
      try {
        const rsvpData = insertRsvpSchema.parse({
          eventId,
          userId,
          status: 'pending_access', // Custom status for access requests
          plusOneCount: 0,
          dietaryRestrictions: null,
          comments: 'Access request pending approval',
        });
        
        const accessRequest = await storage.createRsvp(rsvpData);
        
        // Create notification for the host
        await createAccessRequestNotification(
          notificationService,
          String(event.hostId),
          { 
            id: userId, 
            firstName: req.user.firstName || 'Unknown',
            lastName: req.user.lastName || 'User'
          },
          { 
            id: eventId, 
            title: event.title 
          }
        );
        
        res.json({ 
          message: "Access request sent successfully", 
          hasRequestedAccess: true,
          request: accessRequest 
        });
      } catch (error) {
        // If RSVP already exists, update the existing one to mark as access request
        await storage.updateRsvp(eventId, userId, 'pending_access', 0);
        
        // Create notification for the host (in case of update)
        await createAccessRequestNotification(
          notificationService,
          String(event.hostId),
          { 
            id: userId, 
            firstName: req.user.firstName || 'Unknown',
            lastName: req.user.lastName || 'User'
          },
          { 
            id: eventId, 
            title: event.title 
          }
        );
        
        res.json({ 
          message: "Access request updated successfully", 
          hasRequestedAccess: true 
        });
      }
    } catch (error) {
      console.error("Error requesting access:", error);
      res.status(500).json({ message: "Failed to request access" });
    }
  });

  // Respond to access request (approve/deny)
  app.post('/api/events/:idOrSlug/access-requests/respond', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: "You must be logged in." });
      }

      const idOrSlug = req.params.idOrSlug;
      const hostId = req.user.id;
      const { userId, action } = req.body;

      if (!userId || !action || !['approve', 'deny'].includes(action)) {
        return res.status(400).json({ message: "Invalid request parameters" });
      }

      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        const eventId = parseInt(idOrSlug);
        event = await storage.getEventWithDetails(eventId);
      } else {
        event = await storage.getEventWithDetailsBySlug(idOrSlug);
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const eventId = event.id;

      if (String(event.hostId) !== String(hostId)) {
        return res.status(403).json({ message: "Only the event host can respond to access requests" });
      }

      // Check if there's a pending access request
      const existingRequest = await storage.getUserRsvp(eventId, userId);
      if (!existingRequest || existingRequest.status !== 'pending_access') {
        return res.status(404).json({ message: "No pending access request found" });
      }

      if (action === 'approve') {
        // Convert pending access to accepted invitation
        await storage.updateRsvp(eventId, userId, 'maybe', 0);
        
        // Create approval notification for the requester
        await createAccessResponseNotification(
          notificationService,
          userId,
          { 
            id: eventId, 
            title: event.title 
          },
          true
        );
        
        res.json({ 
          message: "Access request approved", 
          action: 'approved' 
        });
      } else {
        // Remove the access request entirely
        await storage.deleteRsvp(eventId, userId);
        
        // Create denial notification for the requester
        await createAccessResponseNotification(
          notificationService,
          userId,
          { 
            id: eventId, 
            title: event.title 
          },
          false
        );
        
        res.json({ 
          message: "Access request denied", 
          action: 'denied' 
        });
      }
    } catch (error) {
      console.error("Error responding to access request:", error);
      res.status(500).json({ message: "Failed to respond to access request" });
    }
  });

  // Post routes
  app.post('/api/events/:id/posts', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create a post." });
    }
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id; // Use actual authenticated user ID
      const postData = insertPostSchema.parse({
        ...req.body,
        eventId,
        authorId: userId,
      });
      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get('/api/events/:id/posts', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const posts = await storage.getEventPosts(eventId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Poll routes
  app.post('/api/events/:id/polls', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create a poll." });
    }
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id; // Use actual authenticated user ID
      console.log("[Create Poll] User ID from session:", userId);
      console.log("[Create Poll] Request body:", req.body);
      const pollData = insertPollSchema.parse({
        ...req.body,
        eventId,
        createdBy: userId,
      });
      console.log("[Create Poll] Final poll data:", pollData);
      const poll = await storage.createPoll(pollData);
      res.json(poll);
    } catch (error) {
      console.error("Error creating poll:", error);
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  app.get('/api/events/:id/polls', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const polls = await storage.getEventPolls(eventId);
      res.json(polls);
    } catch (error) {
      console.error("Error fetching polls:", error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.post('/api/polls/:id/vote', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to vote in a poll." });
    }
    try {
      const pollId = parseInt(req.params.id);
      const userId = req.user.id; // Use actual authenticated user ID
      const { optionIndex } = req.body;
      
      const vote = await storage.voteInPoll(pollId, userId, optionIndex);
      res.json(vote);
    } catch (error) {
      console.error("Error voting in poll:", error);
      res.status(500).json({ message: "Failed to vote in poll" });
    }
  });

  // Expense routes
  app.post('/api/events/:id/expenses', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create an expense." });
    }
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id; // Use actual authenticated user ID
      
      console.log("[Create Expense] Raw request body:", JSON.stringify(req.body, null, 2));
      
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        eventId,
        paidBy: userId,
      });
      
      console.log("[Create Expense] Parsed expense data:", JSON.stringify(expenseData, null, 2));
      
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.get('/api/events/:id/expenses', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const expenses = await storage.getEventExpenses(eventId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  // Settlement routes
  app.post('/api/events/:eventId/settlements', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to record a settlement." });
    }
    try {
      const eventId = parseInt(req.params.eventId);
      const settlementData = insertSettlementSchema.parse({
        ...req.body,
        eventId,
      });
      const settlement = await storage.createSettlement(settlementData);
      res.json(settlement);
    } catch (error) {
      console.error("Error creating settlement:", error);
      res.status(500).json({ message: "Failed to record settlement" });
    }
  });

  app.get('/api/events/:eventId/settlements', async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const settlements = await storage.getEventSettlements(eventId);
      res.json(settlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  // Request discover listing (host only)
  app.post('/api/events/:id/request-discover', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const eventId = parseInt(req.params.id);
      
      // Verify user is the host
      const [eventResult] = await db.execute(sql`
        SELECT host_id FROM events WHERE id = ${eventId}
      `);
      const event = eventResult.rows[0];
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.host_id !== req.user.id) {
        return res.status(403).json({ message: "Only the event host can request discover listing" });
      }

      // Update event to requested state (also save optional message)
      const { message } = req.body;
      await db.execute(sql`
        UPDATE events
        SET discover_status = 'requested',
            discover_requested_at = NOW(),
            discover_requested_message = ${message || null}
        WHERE id = ${eventId}
      `);

      res.json({ 
        success: true, 
        message: "Discover listing request submitted. Admins will review your event." 
      });
    } catch (error) {
      console.error("Error requesting discover listing:", error);
      res.status(500).json({ message: "Failed to submit discover request" });
    }
  });

  // Get discover events (approved only)
  app.get('/api/events/discover', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT e.*, u.first_name, u.last_name, u.profile_image_url
        FROM events e
        JOIN users u ON e.host_id = u.id
        WHERE e.discover_status = 'approved'
        AND e.datetime > NOW()
        AND e.is_public = true
        ORDER BY e.discover_reviewed_at DESC
        LIMIT 50
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching discover events:", error);
      res.status(500).json({ message: "Failed to fetch discover events" });
    }
  });

  // ===== REMINDER ROUTES =====
  app.post('/api/events/:id/reminders', async (req: any, res) => {
    try {
      const { id: eventId } = req.params;
      const { remindAt, message, offsetMinutes } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!remindAt) {
        return res.status(400).json({ message: "remindAt is required" });
      }

      // Verify user is event host or RSVP'd
      const eventResult = await db.execute(sql`
        SELECT id, host_id FROM events WHERE id = ${Number(eventId)}
      `);

      const event = eventResult.rows[0] as any;
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Import here to avoid circular dependency
      const { createReminder } = await import('./reminderScheduler');

      // Create reminder
      const remindAtDate = new Date(remindAt);
      await createReminder(
        Number(eventId),
        req.user.id,
        remindAtDate,
        message
      );

      res.json({
        success: true,
        message: "Reminder created successfully",
        remindAt: remindAtDate.toISOString()
      });
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.get('/api/events/:id/reminders', async (req: any, res) => {
    try {
      const { id: eventId } = req.params;

      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user's reminders for this event
      const remindersResult = await db.execute(sql`
        SELECT id, event_id, user_id, remind_at, channel, message, sent, created_at
        FROM reminders
        WHERE event_id = ${Number(eventId)} AND user_id = ${req.user.id}
        ORDER BY remind_at DESC
      `);

      res.json(remindersResult.rows);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  app.delete('/api/reminders/:id', async (req: any, res) => {
    try {
      const { id: reminderId } = req.params;

      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify the reminder belongs to the user
      const reminderResult = await db.execute(sql`
        SELECT id, user_id FROM reminders WHERE id = ${Number(reminderId)}
      `);

      const reminder = reminderResult.rows[0] as any;
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      if (reminder.user_id !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Delete reminder
      await db.execute(sql`
        DELETE FROM reminders WHERE id = ${Number(reminderId)}
      `);

      res.json({ success: true, message: "Reminder deleted" });
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  // Group routes
  app.get('/api/groups', async (req: any, res) => {
    try {
      const groups = await storage.getPublicGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.get('/api/groups/discovery', async (req: any, res) => {
    try {
      const groups = await storage.getPublicGroups();
      
      // Add stats to each group
      const groupsWithStats = await Promise.all(
        groups.map(async (group) => {
          const stats = await storage.getCommunityStats(group.id);
          return {
            ...group,
            memberCount: stats.memberCount,
            eventCount: stats.eventCount
          };
        })
      );
      
      res.json(groupsWithStats);
    } catch (error) {
      console.error("Error fetching groups for discovery:", error);
      res.status(500).json({ message: "Failed to fetch groups for discovery" });
    }
  });

  // Check if slug is available
  app.get('/api/groups/check-slug', async (req, res) => {
    try {
      const { slug } = req.query;
      
      if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ message: "Slug is required" });
      }
      
      const isAvailable = await storage.isSlugAvailable(slug);
      res.json({ available: isAvailable, slug });
    } catch (error) {
      console.error("Error checking slug:", error);
      res.status(500).json({ message: "Failed to check slug availability" });
    }
  });

  app.post('/api/groups', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create a group." });
    }
    try {
      const userId = req.user.id;
      
      console.log('📥 Creating group with data:', {
        name: req.body.name,
        slug: req.body.slug || '(empty)',
        category: req.body.category,
      });
      
      // Generate or validate slug
      let slug = req.body.slug;
      if (!slug) {
        // Auto-generate slug if not provided
        slug = generateRandomSlug();
        console.log('🎲 Auto-generated slug:', slug);
        // Ensure uniqueness
        while (!(await storage.isSlugAvailable(slug))) {
          slug = generateRandomSlug();
          console.log('🔄 Slug taken, trying:', slug);
        }
      } else {
        console.log('✏️  User provided slug:', slug);
        // Validate slug format
        const validationError = getSlugValidationError(slug);
        if (validationError) {
          console.log('❌ Slug validation error:', validationError);
          return res.status(400).json({ message: validationError });
        }
        
        // Check if slug is already taken
        const isAvailable = await storage.isSlugAvailable(slug);
        if (!isAvailable) {
          console.log('❌ Slug already taken:', slug);
          return res.status(400).json({ message: "This slug is already taken" });
        }
      }
      
      console.log('✅ Final slug to use:', slug);
      
      const groupData = insertGroupSchema.parse({
        ...req.body,
        slug,
        createdBy: userId,
      });
      
      console.log('💾 Saving group with data:', { ...groupData, slug });
      const group = await storage.createCommunity(groupData);
      console.log('✅ Group created successfully:', { id: group.id, slug: group.slug, name: group.name });
      res.json(group);
    } catch (error) {
      console.error("❌ Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.get('/api/groups/:id', async (req, res) => {
    try {
      const idOrSlug = req.params.id;
      
      // Try to get by slug first, then by ID
      let community;
      if (isNaN(Number(idOrSlug))) {
        // It's a slug
        community = await storage.getCommunityBySlug(idOrSlug);
      } else {
        // It's an ID
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunityWithDetails(communityId);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      res.json(community);
    } catch (error) {
      console.error("Error fetching community:", error);
      res.status(500).json({ message: "Failed to fetch community" });
    }
  });

  app.put('/api/groups/:idOrSlug', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to update a community." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      
      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        community = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const communityId = community.id;
      
      // Check if user is admin of the community
      const membership = await storage.getUserCommunityMembership(communityId, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: "You must be an admin to update this community" });
      }
      
      const communityData = insertGroupSchema.partial().parse(req.body);
      const updatedCommunity = await storage.updateCommunity(communityId, communityData);
      res.json(updatedCommunity);
    } catch (error) {
      console.error("Error updating community:", error);
      res.status(500).json({ message: "Failed to update community" });
    }
  });

  app.delete('/api/groups/:idOrSlug', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to delete a community." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      
      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        community = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const communityId = community.id;
      
      // Check if user is admin of the community
      const membership = await storage.getUserCommunityMembership(communityId, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: "You must be an admin to delete this community" });
      }
      
      await storage.deleteCommunity(communityId);
      res.json({ message: "Community deleted successfully" });
    } catch (error) {
      console.error("Error deleting community:", error);
      res.status(500).json({ message: "Failed to delete community" });
    }
  });

  // Community membership routes
  app.post('/api/groups/:idOrSlug/join', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to join a community." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      const { message } = req.body; // Optional message for join request
      
      // Get community to check if it exists and if it's private
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        // It's a numeric ID
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        // It's a slug
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const communityId = community.id;
      
      // Check if user is already a member
      const existingMembership = await storage.getUserCommunityMembership(communityId, userId);
      if (existingMembership) {
        return res.status(400).json({ message: "You are already a member of this community" });
      }

      // If community is public, join directly
      if (community.isPublic) {
        const membership = await storage.joinCommunity(communityId, userId);
        return res.json({ type: 'joined', membership });
      }

      // If community is private, check for existing join request
      const existingRequest = await storage.getUserJoinRequest(communityId, userId);
      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return res.status(400).json({ message: "You already have a pending join request for this community" });
        }
        if (existingRequest.status === 'approved') {
          // If approved, complete the join
          const membership = await storage.joinCommunity(communityId, userId);
          return res.json({ type: 'joined', membership });
        }
        if (existingRequest.status === 'rejected') {
          return res.status(400).json({ message: "Your join request was rejected. You cannot request to join again." });
        }
      }

      // Create join request for private community
      const joinRequest = await storage.createJoinRequest({
        groupId: communityId,
        userId,
        message: message || null,
        status: 'pending'
      });
      
      res.json({ type: 'request_created', joinRequest });
    } catch (error) {
      console.error("Error joining community:", error);
      res.status(500).json({ message: "Failed to join community" });
    }
  });

  app.post('/api/groups/:idOrSlug/leave', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to leave a community." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      
      // Determine if it's an ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        // It's a numeric ID
        community = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        // It's a slug
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      await storage.leaveCommunity(community.id, userId);
      res.json({ message: "Left community successfully" });
    } catch (error) {
      console.error("Error leaving community:", error);
      res.status(500).json({ message: "Failed to leave community" });
    }
  });

  // Remove member from community (admin only)
  app.delete('/api/groups/:idOrSlug/members/:userId', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to remove members." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userIdToRemove = req.params.userId;
      const requestingUserId = req.user.id;
      
      // Determine if it's an ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        // It's a numeric ID
        community = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        // It's a slug
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const communityId = community.id;
      
      // Check if requesting user is admin of the community
      const members = await storage.getCommunityMembers(communityId);
      const requestingUserMembership = members.find(m => m.userId === requestingUserId);
      
      if (!requestingUserMembership || requestingUserMembership.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can remove members." });
      }
      
      // Don't allow removing other admins
      const targetMembership = members.find(m => m.userId === userIdToRemove);
      if (targetMembership && targetMembership.role === 'admin') {
        return res.status(403).json({ message: "Cannot remove admin members." });
      }
      
      await storage.leaveCommunity(communityId, userIdToRemove);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing community member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  app.get('/api/groups/:idOrSlug/members', async (req, res) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      
      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const members = await storage.getCommunityMembers(community.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching community members:", error);
      res.status(500).json({ message: "Failed to fetch community members" });
    }
  });

  app.get('/api/groups/:idOrSlug/events', async (req, res) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      
      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const events = await storage.getCommunityEvents(community.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching community events:", error);
      res.status(500).json({ message: "Failed to fetch community events" });
    }
  });

  // Send newsletter to community members
  app.post('/api/groups/:id/newsletter', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to send newsletters." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const { subject, content } = req.body;
      const userId = req.user.id;
      
      // Check if user is admin of the community
      const members = await storage.getCommunityMembers(communityId);
      const userMembership = members.find(m => m.userId === userId);
      
      if (!userMembership || userMembership.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can send newsletters." });
      }
      
      // In a real app, you would integrate with an email service here
      // For now, we'll just simulate sending the newsletter
      console.log(`Newsletter sent to ${members.length} members of community ${communityId}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${content}`);
      
      res.json({ 
        message: "Newsletter sent successfully", 
        recipients: members.length,
        sentAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending newsletter:", error);
      res.status(500).json({ message: "Failed to send newsletter" });
    }
  });

  // Update member role (promote/demote)
  app.put('/api/groups/:idOrSlug/members/:userId/role', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to update member roles." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const targetUserId = req.params.userId;
      const { role } = req.body;
      const currentUserId = req.user.id;
      
      // Determine if it's an ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        // It's a numeric ID
        community = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        // It's a slug
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const communityId = community.id;
      
      // Validate role
      if (!['admin', 'moderator', 'member'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin', 'moderator', or 'member'." });
      }
      
      // Check if current user is admin of the community
      const currentUserMembership = await storage.getUserCommunityMembership(communityId, currentUserId);
      if (!currentUserMembership || currentUserMembership.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update member roles." });
      }
      
      // Check if target user is a member of the community
      const targetUserMembership = await storage.getUserCommunityMembership(communityId, targetUserId);
      if (!targetUserMembership) {
        return res.status(404).json({ message: "User is not a member of this community." });
      }
      
      // Prevent self-demotion from admin role (to avoid orphaned communities)
      if (currentUserId === targetUserId && currentUserMembership.role === 'admin' && role !== 'admin') {
        return res.status(400).json({ message: "You cannot demote yourself from admin role." });
      }
      
      const updatedMember = await storage.updateCommunityMemberRole(communityId, targetUserId, role);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // Community announcements endpoints
  app.post('/api/groups/:id/announcements', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create announcements." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const { title, content, type = 'general' } = req.body;
      const userId = req.user.id;
      
      // Check if user is admin or moderator of the community
      const userMembership = await storage.getUserCommunityMembership(communityId, userId);
      if (!userMembership || !userMembership.role || !['admin', 'moderator'].includes(userMembership.role)) {
        return res.status(403).json({ message: "Only admins and moderators can create announcements." });
      }
      
      const announcement = await storage.createAnnouncement({
        groupId: communityId,
        authorId: userId,
        title,
        content,
        type,
      });
      
      res.json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.get('/api/groups/:id/announcements', async (req: any, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const announcements = await storage.getCommunityAnnouncements(communityId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/announcements/:id/read', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to mark announcements as read." });
    }
    try {
      const announcementId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const readRecord = await storage.markAnnouncementAsRead(announcementId, userId);
      res.json(readRecord);
    } catch (error) {
      console.error("Error marking announcement as read:", error);
      res.status(500).json({ message: "Failed to mark announcement as read" });
    }
  });

  app.get('/api/groups/:id/announcements/unread-count', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to get unread count." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const count = await storage.getUnreadAnnouncementsCount(communityId, userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread announcements count:", error);
      res.status(500).json({ message: "Failed to get unread announcements count" });
    }
  });

  // Community join request endpoints
  app.get('/api/groups/:idOrSlug/join-requests', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to view join requests." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;

      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }

      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      // Check if user is admin of the community
      const membership = await storage.getUserCommunityMembership(community.id, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can view join requests." });
      }

      const requests = await storage.getgroupJoinRequests(community.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching join requests:", error);
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });

  app.post('/api/groups/:idOrSlug/join-requests/:requestId/approve', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to approve join requests." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const requestId = parseInt(req.params.requestId);
      const adminId = req.user.id;

      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }

      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      // Check if user is admin of the community
      const membership = await storage.getUserCommunityMembership(community.id, adminId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can approve join requests." });
      }

      // Get the join request
      const requests = await storage.getgroupJoinRequests(community.id);
      const request = requests.find(r => r.id === requestId);
      if (!request || request.status !== 'pending') {
        return res.status(404).json({ message: "Join request not found or already processed." });
      }

      // Approve the request
      await storage.updateJoinRequest(requestId, 'approved', adminId);
      
      // Add user to community
      await storage.addCommunityMember(community.id, request.userId);

      res.json({ message: "Join request approved successfully" });
    } catch (error) {
      console.error("Error approving join request:", error);
      res.status(500).json({ message: "Failed to approve join request" });
    }
  });

  app.post('/api/groups/:idOrSlug/join-requests/:requestId/reject', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to reject join requests." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const requestId = parseInt(req.params.requestId);
      const adminId = req.user.id;

      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }

      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      // Check if user is admin of the community
      const membership = await storage.getUserCommunityMembership(community.id, adminId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can reject join requests." });
      }

      // Get the join request
      const requests = await storage.getgroupJoinRequests(community.id);
      const request = requests.find(r => r.id === requestId);
      if (!request || request.status !== 'pending') {
        return res.status(404).json({ message: "Join request not found or already processed." });
      }

      // Reject the request
      await storage.updateJoinRequest(requestId, 'rejected', adminId);

      res.json({ message: "Join request rejected successfully" });
    } catch (error) {
      console.error("Error rejecting join request:", error);
      res.status(500).json({ message: "Failed to reject join request" });
    }
  });

  // User's groups
  app.get('/api/profile/groups', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  // Group routes (mirroring community routes but using new endpoint names)
  app.get('/api/groups/discovery', async (req: any, res) => {
    try {
      const communities = await storage.getPublicGroups();
      res.json(communities);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/groups', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const community = await storage.createCommunity({ ...req.body, createdBy: req.user.id });
      res.json(community);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.get('/api/groups/:id', async (req, res) => {
    try {
      const community = await storage.getCommunity(parseInt(req.params.id));
      if (!community) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(community);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.get('/api/groups/:idOrSlug/events', async (req, res) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      
      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const events = await storage.getCommunityEvents(community.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching group events:", error);
      res.status(500).json({ message: "Failed to fetch group events" });
    }
  });

  app.get('/api/groups/:idOrSlug/members', async (req, res) => {
    try {
      // Disable caching for debugging
      res.setHeader('Cache-Control', 'no-store');
      
      const idOrSlug = req.params.idOrSlug;
      
      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const members = await storage.getCommunityMembers(community.id);
      // Add displayName to user objects
      const membersWithDisplayName = members.map(member => ({
        ...member,
        user: member.user ? {
          ...member.user,
          displayName: member.user.firstName && member.user.lastName 
            ? `${member.user.firstName} ${member.user.lastName}`
            : member.user.firstName || member.user.lastName || member.user.email || 'Unknown User',
          profilePicture: member.user.profileImageUrl
        } : null
      }));
      console.log("Members with displayName:", JSON.stringify(membersWithDisplayName, null, 2));
      res.json(membersWithDisplayName);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  app.post('/api/groups/:idOrSlug/join', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      const { message } = req.body;

      // Get community by ID or slug
      let community;
      if (/^\d+$/.test(idOrSlug)) {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      } else {
        community = await storage.getCommunityBySlug(idOrSlug);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const communityId = community.id;

      if (community.isPublic) {
        await storage.joinCommunity(communityId, userId, 'member');
        res.json({ message: "Successfully joined group" });
      } else {
        await storage.createJoinRequest({
          groupId: communityId,
          userId,
          message: message || null,
          status: 'pending'
        });
        res.json({ message: "Join request sent" });
      }
    } catch (error) {
      console.error("Error joining group:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.get('/api/profile/groups', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const communities = await storage.getUserGroups(userId);
      res.json(communities);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  // Only serve static files in production mode
  // In development, Vite handles this
  if (process.env.NODE_ENV !== "development") {
    // Serve static files from the client directory
    app.use(express.static(path.join(__dirname, "../client/dist")));

    // Catch-all route to serve index.html for SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../client/dist/index.html"));
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
