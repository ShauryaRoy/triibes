import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes, isAuthenticated } from "./replitAuth";
import { insertEventSchema, insertRsvpSchema, insertPostSchema, insertPollSchema, insertExpenseSchema, insertSettlementSchema, insertGroupSchema, insertGroupMemberSchema, insertApplicationSchema, events, eventRsvps, groups, applications } from "@shared/schema";
import { paymentTransactions } from "../drizzle/schema";
import { db } from "./db";
import { sql, eq, and, desc } from "drizzle-orm";
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
  createEventUpdateNotification,
  createGroupJoinRequestNotification,
} from "./notifications";
import { generateRandomSlug, getSlugValidationError } from "@shared/slug-utils";
import { generateEventSlug } from "@shared/event-slug-utils";
import { registerAdminRoutes } from "./admin-routes";
import { handleEventSSR, handleGroupSSR, handleHomeSSR } from "./ssr";
import { generateSitemap, generateRobotsTxt } from "./seo";
import { sendEmail, sendRegistrationConfirmationEmail, sendFirstLoginEmail, sendHostReminderEmail } from "./mail";

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

  // -----------------------------------------------------------------------
  // Test email endpoints — remove after confirming emails work
  // POST /api/test-email           { "to": "any@email.com" }
  // POST /api/test-email/welcome   { "to": "any@email.com", "name": "John" }
  // POST /api/test-email/payment   { "to": "any@email.com", "name": "John", "event": "Tribbe Meetup" }
  // -----------------------------------------------------------------------
  app.post('/api/test-email', async (req: any, res) => {
    const to: string = req.body?.to || 'triibesin@gmail.com';
    try {
      const result = await sendEmail({
        from: 'Tribbe <onboarding@mail.triibes.in>',
        to,
        subject: 'Tribbe email test',
        html: '<p>If you received this, Resend + mail.triibes.in is working correctly. ✅</p>',
      });
      console.log('[test-email] sent to', to);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error('[test-email] exception:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/test-email/welcome', async (req: any, res) => {
    const to: string = req.body?.to || 'triibesin@gmail.com';
    const name: string = req.body?.name || 'Test User';
    try {
      await sendFirstLoginEmail({ userEmail: to, userName: name });
      console.log('[test-email] welcome sent to', to);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error('[test-email/welcome] exception:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/test-email/payment', async (req: any, res) => {
    const to: string = req.body?.to || 'triibesin@gmail.com';
    const name: string = req.body?.name || 'Test User';
    const eventName: string = req.body?.event || 'Tribbe Meetup';
    try {
      await sendRegistrationConfirmationEmail({
        userEmail: to,
        userName: name,
        eventName,
        eventDate: new Date(),
        price: 50000,        // ₹500 in paise
      });
      console.log('[test-email] registration confirmation sent to', to);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error('[test-email/payment] exception:', err);
      return res.status(500).json({ error: err.message });
    }
  });

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

    
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json(null);
    }
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
  const parseIncomingEventDateTime = (value: any, source = 'unknown'): Date | undefined => {
    if (value === null || value === undefined || value === '') return undefined;

    if (value instanceof Date) {
      const parsed = Number.isNaN(value.getTime()) ? undefined : value;
      console.log('[TZ][Parser]', { source, input: value, branch: 'date-instance', output: parsed?.toISOString() });
      return parsed;
    }

    if (typeof value !== 'string') {
      const dt = new Date(value);
      const parsed = Number.isNaN(dt.getTime()) ? undefined : dt;
      console.log('[TZ][Parser]', { source, input: value, branch: 'non-string', output: parsed?.toISOString() });
      return parsed;
    }

    const raw = value.trim();
    if (!raw) return undefined;

    // If timezone is present (Z or +hh:mm), parse as absolute instant.
    if (raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)) {
      const zoned = new Date(raw);
      const parsed = Number.isNaN(zoned.getTime()) ? undefined : zoned;
      console.log('[TZ][Parser]', { source, input: raw, branch: 'zoned-string', output: parsed?.toISOString() });
      return parsed;
    }

    // For timezone-less strings from datetime-local inputs, treat as IST wall-clock.
    const normalized = raw.replace(' ', 'T');
    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : normalized;
    const istDate = new Date(`${withSeconds}+05:30`);
    if (!Number.isNaN(istDate.getTime())) {
      console.log('[TZ][Parser]', { source, input: raw, branch: 'timezone-less-ist', output: istDate.toISOString() });
      return istDate;
    }

    const fallback = new Date(withSeconds);
    const parsed = Number.isNaN(fallback.getTime()) ? undefined : fallback;
    console.log('[TZ][Parser]', { source, input: raw, branch: 'fallback', output: parsed?.toISOString() });
    return parsed;
  };

  const normalizeEntryMode = (value: any): 'open' | 'approval' | 'invite_only' => {
    if (value === 'approval' || value === 'invite_only') return value;
    return 'open';
  };

  const normalizeFormSchema = (value: any): any[] | null => {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) {
      throw new Error('form_schema must be an array');
    }

    const normalized = parsed.map((q: any, index: number) => {
      const type = q?.type;
      if (!['text', 'textarea', 'select'].includes(type)) {
        throw new Error(`Invalid question type at index ${index}`);
      }
      const question = {
        id: String(q?.id || `q${index + 1}`),
        label: String(q?.label || '').trim(),
        type,
        required: Boolean(q?.required),
        options: Array.isArray(q?.options) ? q.options.map((opt: any) => String(opt).trim()).filter(Boolean) : undefined,
      };
      if (!question.label) {
        throw new Error(`Question label is required at index ${index}`);
      }
      if (question.type === 'select' && (!question.options || question.options.length === 0)) {
        throw new Error(`Select question options are required at index ${index}`);
      }
      return question;
    });

    return normalized;
  };

  const validateApplicationResponses = (formSchema: any[] | null, responses: Record<string, any>) => {
    if (!formSchema || formSchema.length === 0) return;

    for (const question of formSchema) {
      const value = responses?.[question.id];
      const isBlank = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

      if (question.required && isBlank) {
        throw new Error(`Required field missing: ${question.label}`);
      }

      if (question.type === 'select' && !isBlank) {
        const asString = String(value);
        if (!Array.isArray(question.options) || !question.options.includes(asString)) {
          throw new Error(`Invalid selection for: ${question.label}`);
        }
      }
    }
  };

  app.post('/api/events', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create an event." });
    }
    try {
      const userId = req.user.id;
      const ticketPrice = req.body.ticketPrice || 0;
      const payoutDetails = req.body.settings?.payoutDetails;

      // If creating event in a group, check if user is owner or host
      if (req.body.groupId) {
        const membership = await storage.getUserCommunityMembership(req.body.groupId, userId);
        if (!membership || !['owner', 'host'].includes(membership.role || '')) {
          return res.status(403).json({ message: "Only group owners and hosts can create events in this group." });
        }
      }

      // If host enabled payouts (paid event flow), require a positive ticket price.
      if (payoutDetails && (!ticketPrice || ticketPrice <= 0)) {
        return res.status(400).json({ message: "Ticket price is required for paid events" });
      }
      
      
      const parsedDatetime = parseIncomingEventDateTime(req.body.datetime, 'create.datetime');
      const parsedEndDatetime = parseIncomingEventDateTime(req.body.endDatetime, 'create.endDatetime');

      if (!parsedDatetime) {
        return res.status(400).json({ message: "Invalid datetime" });
      }

      if (req.body.endDatetime && !parsedEndDatetime) {
        return res.status(400).json({ message: "Invalid endDatetime" });
      }

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
        datetime: parsedDatetime,
        endDatetime: req.body.endDatetime ? parsedEndDatetime || null : null,
        imageUrl: req.body.imageUrl,
        maxGuests: req.body.maxGuests,
        maxCapacity: req.body.maxCapacity ?? req.body.maxGuests,
        isPublic: req.body.isPrivate ? false : true, // Convert isPrivate to isPublic
        entryMode: normalizeEntryMode(req.body.entryMode),
        formSchema: normalizeEntryMode(req.body.entryMode) === 'approval' ? normalizeFormSchema(req.body.formSchema || []) : null,
        themeId: req.body.themeId || 'quantum-dark', // Add theme support
        settings: req.body.settings,
        posterData: req.body.posterData,
        ticketPrice: ticketPrice, // Cost per person in rupees
        ticketingEnabled: ticketPrice > 0, // Auto-enable ticketing if price is set
        currency: 'INR', // Default currency
        rsvpMode: req.body.rsvpMode || 'register', // RSVP mode: 'rsvp' or 'register'
        showGuestCount: req.body.showGuestCount,
        guestListVisibility: req.body.guestListVisibility,
        isClosed: req.body.isClosed,
        // Payout details
        payoutMethod: payoutDetails?.payoutMethod,
        hostUpiId: payoutDetails?.payoutMethod === 'upi' ? payoutDetails.upiId : null,
        accountHolderName: payoutDetails?.payoutMethod === 'bank' ? payoutDetails.accountHolderName : null,
        accountNumber: payoutDetails?.payoutMethod === 'bank' ? payoutDetails.accountNumber : null,
        ifscCode: payoutDetails?.payoutMethod === 'bank' ? payoutDetails.ifscCode : null,
      };
      console.log('[TZ][Create] About to save event datetimes:', {
        rawDatetime: req.body.datetime,
        rawEndDatetime: req.body.endDatetime,
        parsedDatetimeIso: eventData.datetime?.toISOString?.(),
        parsedEndDatetimeIso: eventData.endDatetime?.toISOString?.(),
      });
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
      const events = await storage.getUserEvents(userId);
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:idOrSlug', async (req, res) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      
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
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Ensure payment fields have defaults
      const eventWithDefaults = {
        ...event,
        ticketPrice: event.ticketPrice ?? 0,
        ticketingEnabled: event.ticketingEnabled ?? false,
        currency: event.currency ?? 'INR',
      };
      
      res.json(eventWithDefaults);
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

    // Get the body data
    const bodyData = req.body || {};

    const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

    // ----------------------------------------------------------------
    // Popup-only settings update path (single ownership enforcement).
    // Only this exact payload shape may update popup-managed fields.
    // ----------------------------------------------------------------
    const popupOwnedFields = ['guestListVisibility', 'isClosed', 'rsvpMode', 'showGuestCount', 'entryMode', 'formSchema'];
    const bodyKeys = Object.keys(bodyData);
    const isPopupOnlyUpdate = bodyKeys.length > 0 && bodyKeys.every((k) => popupOwnedFields.includes(k));

    if (isPopupOnlyUpdate) {
      const allowedGuestListVisibility = ['host-only', 'attendees-only', 'everyone'];
      const allowedRsvpMode = ['rsvp', 'register'];
      const allowedEntryModes = ['open', 'approval', 'invite_only'];

      const popupEventData: any = {};

      if (hasOwn(bodyData, 'guestListVisibility')) {
        if (!allowedGuestListVisibility.includes(bodyData.guestListVisibility)) {
          return res.status(400).json({ message: 'Invalid guestListVisibility value' });
        }
        popupEventData.guestListVisibility = bodyData.guestListVisibility;
      }

      if (hasOwn(bodyData, 'rsvpMode')) {
        if (!allowedRsvpMode.includes(bodyData.rsvpMode)) {
          return res.status(400).json({ message: 'Invalid rsvpMode value' });
        }
        popupEventData.rsvpMode = bodyData.rsvpMode;
      }

      if (hasOwn(bodyData, 'isClosed')) {
        popupEventData.isClosed = Boolean(bodyData.isClosed);
      }

      if (hasOwn(bodyData, 'showGuestCount')) {
        popupEventData.showGuestCount = Boolean(bodyData.showGuestCount);
      }

      if (hasOwn(bodyData, 'entryMode')) {
        if (!allowedEntryModes.includes(bodyData.entryMode)) {
          return res.status(400).json({ message: 'Invalid entryMode value' });
        }
        popupEventData.entryMode = bodyData.entryMode;
      }

      if (hasOwn(bodyData, 'formSchema')) {
        const existingApplications = await storage.getEventApplications(event.id);
        if (existingApplications.length > 0) {
          return res.status(400).json({
            message: 'Application form cannot be updated after users have applied',
            formLocked: true,
          });
        }
        popupEventData.formSchema = normalizeFormSchema(bodyData.formSchema);
      }

      if (popupEventData.entryMode !== 'approval') {
        popupEventData.formSchema = null;
      }

      const updatedPopupSettings = await storage.updateEvent(event.id, popupEventData);
      return res.json(updatedPopupSettings);
    }

    // ------------------------------------------------------------
    // Immutable fields guard (anti-tampering)
    // After an event is created, these should never change via Edit.
    // ------------------------------------------------------------
    const normalizeNullableNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    const normalizeCurrency = (value: any): string | null => {
      if (value === null || value === undefined || value === '') return null;
      return String(value).toUpperCase();
    };

    const immutableViolations: string[] = [];

    // Privacy
    if (hasOwn(bodyData, 'isPublic') && bodyData.isPublic !== undefined && bodyData.isPublic !== event.isPublic) {
      immutableViolations.push('isPublic');
    }
    if (hasOwn(bodyData, 'isPrivate') && bodyData.isPrivate !== undefined) {
      const incomingIsPublic = bodyData.isPrivate ? false : true;
      if (incomingIsPublic !== event.isPublic) immutableViolations.push('isPublic');
    }

    // Community / group
    if (hasOwn(bodyData, 'groupId') && bodyData.groupId !== undefined) {
      const incoming = normalizeNullableNumber(bodyData.groupId);
      const current = normalizeNullableNumber((event as any).groupId);
      if (incoming !== current) immutableViolations.push('groupId');
    }
    if (hasOwn(bodyData, 'communityId') && bodyData.communityId !== undefined) {
      const incoming = normalizeNullableNumber(bodyData.communityId);
      const current = normalizeNullableNumber((event as any).groupId);
      if (incoming !== current) immutableViolations.push('groupId');
    }

    // Payments / price / currency
    if (hasOwn(bodyData, 'ticketPrice') && bodyData.ticketPrice !== undefined) {
      const incoming = Number(bodyData.ticketPrice) || 0;
      const current = Number((event as any).ticketPrice) || 0;
      if (incoming !== current) immutableViolations.push('ticketPrice');
    }
    if (hasOwn(bodyData, 'ticketingEnabled') && bodyData.ticketingEnabled !== undefined) {
      const incoming = Boolean(bodyData.ticketingEnabled);
      const current = Boolean((event as any).ticketingEnabled);
      if (incoming !== current) immutableViolations.push('ticketingEnabled');
    }
    if (hasOwn(bodyData, 'currency') && bodyData.currency !== undefined) {
      const incoming = normalizeCurrency(bodyData.currency);
      const current = normalizeCurrency((event as any).currency);
      if (incoming !== current) immutableViolations.push('currency');
    }

    // Settings-level immutables (payments/currency)
    if (bodyData.settings !== undefined) {
      const incomingSettings = typeof bodyData.settings === 'string'
        ? JSON.parse(bodyData.settings)
        : bodyData.settings;

      const existingSettings = typeof event.settings === 'string'
        ? JSON.parse(event.settings)
        : event.settings;

      // Only flag as violation if the values are actually being changed
      if (incomingSettings && Object.prototype.hasOwnProperty.call(incomingSettings, 'payoutDetails')) {
        const incomingPayoutDetails = JSON.stringify(incomingSettings.payoutDetails);
        const existingPayoutDetails = JSON.stringify(existingSettings?.payoutDetails);
        if (incomingPayoutDetails !== existingPayoutDetails) {
          immutableViolations.push('settings.payoutDetails');
        }
      }
      if (incomingSettings && Object.prototype.hasOwnProperty.call(incomingSettings, 'currency')) {
        if (incomingSettings.currency !== existingSettings?.currency) {
          immutableViolations.push('settings.currency');
        }
      }
    }

    if (immutableViolations.length > 0) {
      return res.status(400).json({
        message: "Some event fields cannot be changed after creation.",
        fields: Array.from(new Set(immutableViolations)),
      });
    }

    // Strip immutable fields even if unchanged (defense in depth)
    const sanitizedBodyData = { ...bodyData };
    delete (sanitizedBodyData as any).ticketPrice;
    delete (sanitizedBodyData as any).ticketingEnabled;
    delete (sanitizedBodyData as any).currency;
    delete (sanitizedBodyData as any).isPublic;
    delete (sanitizedBodyData as any).isPrivate;
    delete (sanitizedBodyData as any).groupId;
    delete (sanitizedBodyData as any).communityId;
    delete (sanitizedBodyData as any).guestListVisibility;
    delete (sanitizedBodyData as any).isClosed;
    delete (sanitizedBodyData as any).rsvpMode;
    delete (sanitizedBodyData as any).showGuestCount;
    
    console.log("🧹 sanitizedBodyData before date coercion:", JSON.stringify(sanitizedBodyData, null, 2));

    if ((sanitizedBodyData as any).datetime !== undefined) {
      const dt = parseIncomingEventDateTime((sanitizedBodyData as any).datetime, 'update.datetime');
      if (!dt) {
        return res.status(400).json({ message: 'Invalid datetime' });
      }
      (sanitizedBodyData as any).datetime = dt;
    }
    if ((sanitizedBodyData as any).endDatetime !== undefined) {
      const dt = parseIncomingEventDateTime((sanitizedBodyData as any).endDatetime, 'update.endDatetime');
      if (!dt) {
        return res.status(400).json({ message: 'Invalid endDatetime' });
      }
      (sanitizedBodyData as any).endDatetime = dt;
    }
    if ((sanitizedBodyData as any).entryMode !== undefined) {
      (sanitizedBodyData as any).entryMode = normalizeEntryMode((sanitizedBodyData as any).entryMode);
    }
    
    if ((sanitizedBodyData as any).formSchema !== undefined) {
      if ((sanitizedBodyData as any).entryMode === 'approval') {
        const existingApplications = await storage.getEventApplications(event.id);
        if (existingApplications.length > 0) {
          // If trying to CHANGE the schema when applications exist, block it
          const incomingSchema = JSON.stringify(normalizeFormSchema((sanitizedBodyData as any).formSchema));
          const existingSchema = JSON.stringify(event.formSchema);
          if (incomingSchema !== existingSchema) {
            return res.status(400).json({ 
              message: 'Application form cannot be updated after users have applied',
              formLocked: true 
            });
          }
        }
        (sanitizedBodyData as any).formSchema = normalizeFormSchema((sanitizedBodyData as any).formSchema);
      } else {
        (sanitizedBodyData as any).formSchema = null;
      }
    } else if ((sanitizedBodyData as any).entryMode !== undefined && (sanitizedBodyData as any).entryMode !== 'approval') {
      (sanitizedBodyData as any).formSchema = null;
    }
    
    // If settings are being updated, merge them with existing settings
    let eventData: any = insertEventSchema.partial().parse(sanitizedBodyData);
    
    console.log("📊 eventData after parsing:", JSON.stringify(eventData, null, 2));
    console.log("📊 Has datetime in eventData:", 'datetime' in eventData);
    console.log("📊 Has endDatetime in eventData:", 'endDatetime' in eventData);
    
    if (sanitizedBodyData.settings && event.settings) {
      const existingSettings = typeof event.settings === 'string' 
        ? JSON.parse(event.settings) 
        : event.settings;
      const newSettings = typeof sanitizedBodyData.settings === 'string'
        ? JSON.parse(sanitizedBodyData.settings)
        : sanitizedBodyData.settings;
      
      // Preserve immutable settings fields
      eventData.settings = {
        ...existingSettings,
        ...newSettings,
        // Force preserve immutable fields from existing settings
        payoutDetails: existingSettings?.payoutDetails,
        currency: existingSettings?.currency,
      };
    }
    
    // Preserve posterData if not included in the update
    if (!hasOwn(sanitizedBodyData, 'posterData') && event.posterData) {
      eventData.posterData = event.posterData;
    }
    
    // IMPORTANT: Remove any undefined fields to prevent accidental overwrites
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === undefined) {
        delete eventData[key];
      }
    });
    
    // CRITICAL: Explicitly prevent datetime/endDatetime updates unless explicitly sent
    // This protects against accidental timezone conversions or parsing issues
    if (!hasOwn(bodyData, 'datetime')) {
      delete eventData.datetime;
    }
    if (!hasOwn(bodyData, 'endDatetime')) {
      delete eventData.endDatetime;
    }
    
    console.log("📊 Final eventData being sent to update:", JSON.stringify(eventData, null, 2));
    console.log("📊 Fields in final eventData:", Object.keys(eventData));
    
    console.log('[TZ][Update] About to save event datetimes:', {
      eventId: event.id,
      rawDatetime: bodyData.datetime,
      rawEndDatetime: bodyData.endDatetime,
      parsedDatetimeIso: eventData.datetime?.toISOString?.(),
      parsedEndDatetimeIso: eventData.endDatetime?.toISOString?.(),
    });

    const updatedEvent = await storage.updateEvent(event.id, eventData);
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

  // Check event capacity endpoint
  app.get('/api/events/:idOrSlug/check-capacity', async (req: any, res) => {
    try {
      const { idOrSlug } = req.params;
      
      // Find event by ID or slug
      const isNumeric = /^\d+$/.test(idOrSlug);
      const event = isNumeric
        ? (await db.select().from(events).where(eq(events.id, parseInt(idOrSlug))).limit(1))[0]
        : (await db.select().from(events).where(eq(events.slug, idOrSlug)).limit(1))[0];

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const capacityLimit = event.maxCapacity ?? event.maxGuests;

      // If no capacity limit, event is available
      if (!capacityLimit || capacityLimit <= 0) {
        return res.json({ available: true });
      }

      // Count current RSVPs with status 'going'
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.status, 'going')
          )
        );

      const currentCapacity = result?.count || 0;
      const available = currentCapacity < capacityLimit;

      res.json({
        available,
        currentCapacity,
        maxCapacity: capacityLimit,
        message: available 
          ? 'Space available' 
          : 'Event capacity has been reached'
      });
    } catch (error) {
      console.error("Error checking capacity:", error);
      res.status(500).json({ message: "Failed to check capacity" });
    }
  });

  // RSVP routes
  app.post('/api/events/:idOrSlug/rsvp', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: "You must be logged in to RSVP." });
      }
      
      const idOrSlug = req.params.idOrSlug;
      // Ensure userId is always a string for consistent database queries
      const userId = String(req.user.id);
      const { status, plusOneCount = 0, dietaryRestrictions, comments } = req.body;
      
      console.log(`📝 RSVP request: event=${idOrSlug}, user=${userId}, status=${status}`);
      
      // Get event by ID or slug
      let event;
      if (/^\d+$/.test(idOrSlug)) {
        const eventId = parseInt(idOrSlug);
        event = await storage.getEventWithDetails(eventId);
      } else {
        event = await storage.getEventWithDetailsBySlug(idOrSlug);
      }
      
      if (!event) {
        console.log(`❌ RSVP: Event not found: ${idOrSlug}`);
        return res.status(404).json({ message: "Event not found" });
      }

      // Manual close: prevent new joins when host closes the event.
      // Allow existing attendees to keep their status; block switching into "going".
      if (event.isClosed) {
        const existingRsvpForCloseCheck = await storage.getUserRsvp(event.id, userId).catch(() => undefined);
        const alreadyGoing = existingRsvpForCloseCheck?.status === 'going';
        if (status === 'going' && !alreadyGoing) {
          return res.status(403).json({
            message: "Event is closed by the host",
            eventClosed: true,
          });
        }
      }
      
      const eventId = event.id;

      // Paid events are webhook-driven for attendee creation.
      // Frontend cannot create first-time "going" attendee rows.
      if (status === 'going' && event.ticketPrice && event.ticketPrice > 0 && String(event.hostId) !== String(userId)) {
        const existingPaidRsvp = await storage.getUserRsvp(eventId, userId).catch(() => undefined);
        if (!existingPaidRsvp || existingPaidRsvp.status !== 'going') {
          return res.status(409).json({
            message: 'Payment is being confirmed by webhook. Please wait for confirmation and retry.',
            webhookDriven: true,
          });
        }
      }

      // Approval-mode events require approved application before any RSVP action.
      if (event.entryMode === 'approval' && String(event.hostId) !== String(userId)) {
        const userApplication = await storage.getUserApplication(eventId, userId);
        if (!userApplication || userApplication.status !== 'approved') {
          return res.status(403).json({
            message: 'Application approval required before responding to this event',
            requiresApproval: true,
          });
        }
      }

      const capacityLimit = event.maxCapacity ?? event.maxGuests;
      
      // CHECK CAPACITY: Before allowing "going" RSVP, check if event is at capacity using current_capacity
      if (status === 'going' && capacityLimit && capacityLimit > 0) {
        // Use current_capacity column for accurate, atomic capacity checking
        if (event.currentCapacity >= capacityLimit) {
          // Check if user already has a "going" RSVP (in which case they're just re-confirming)
          const [existingGoingRsvp] = await db
            .select()
            .from(eventRsvps)
            .where(
              and(
                eq(eventRsvps.eventId, eventId),
                eq(eventRsvps.userId, userId),
                eq(eventRsvps.status, 'going')
              )
            )
            .limit(1);
          
          // Only reject if user doesn't already have a "going" RSVP
          if (!existingGoingRsvp) {
            console.log(`📊 RSVP: Event ${eventId} is at capacity (${event.currentCapacity}/${capacityLimit})`);
            return res.status(403).json({ 
              message: 'Event capacity has been reached',
              eventFull: true,
              currentCapacity: event.currentCapacity,
              maxCapacity: capacityLimit
            });
          }
        }
      }
      
      // SECURITY NOTE:
      // For paid events, first-time attendee creation is now webhook-driven only.
      
      // Check if RSVP already exists
      let existingRsvp;
      try {
        existingRsvp = await storage.getUserRsvp(eventId, userId);
      } catch (dbError) {
        throw dbError;
      }
      
      if (existingRsvp) {
        let updatedRsvp;
        try {
          updatedRsvp = await storage.updateRsvp(
            eventId, 
            userId, 
            status, 
            plusOneCount,
            dietaryRestrictions,
            comments
          );
        } catch (updateError) {
          throw updateError;
        }
        
        if (!updatedRsvp) {
          return res.status(500).json({ message: "Failed to update RSVP in database" });
        }

        // ── Paid-event patch: ensure payment columns + outbox when going ──
        if (status === 'going' && event.ticketPrice && event.ticketPrice > 0) {
          try {
            const [capturedPmt] = await db
              .select()
              .from(paymentTransactions)
              .where(
                and(
                  eq(paymentTransactions.eventId, eventId),
                  eq(paymentTransactions.userId, userId),
                  eq(paymentTransactions.status, 'captured')
                )
              )
              .limit(1);
            if (capturedPmt && updatedRsvp.paymentStatus !== 'captured') {
              const now = new Date().toISOString();
              await db
                .update(eventRsvps)
                .set({
                  paymentStatus: 'captured',
                  confirmedAt: sql`COALESCE(${eventRsvps.confirmedAt}, ${now}::timestamptz)`,
                  price: capturedPmt.amount ?? 0,
                  updatedAt: new Date(),
                })
                .where(eq(eventRsvps.id, updatedRsvp.id));
              console.log(`[rsvp] Patched RSVP#${updatedRsvp.id} paymentStatus → captured`);
            }
            if (capturedPmt) {
              const { emitRegistrationConfirmed } = await import('./notification-outbox');
              emitRegistrationConfirmed(updatedRsvp.id).catch(err =>
                console.error('[rsvp] outbox emit failed for RSVP', updatedRsvp.id, err)
              );
            }
          } catch (patchErr) {
            console.error('[rsvp] Paid-event RSVP patch failed:', patchErr);
          }
        }
        
        
        // Create RSVP update notification for host (if status is meaningful and user is not the host)
        if (String(event.hostId) !== String(userId) && ['going', 'maybe', 'not_going'].includes(status)) {
          try {
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
          } catch (notifError) {
            // Don't fail the RSVP if notification fails
            console.error(`RSVP: Notification error (non-fatal):`, notifError);}
        }
        
        res.json(updatedRsvp);
      } else {
        console.log(`RSVP: Creating new RSVP with status ${status}`);
        let rsvp;
        try {
          const rsvpData = insertRsvpSchema.parse({
            eventId,
            userId,
            status,
            plusOneCount,
            dietaryRestrictions,
            comments,
          });
          rsvp = await storage.createRsvp(rsvpData);
        } catch (createError) {
          throw createError;
        }
        
        
        // Create RSVP notification for host (if status is meaningful and user is not the host)
        if (String(event.hostId) !== String(userId) && ['going', 'maybe', 'not_going'].includes(status)) {
          try {
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
          } catch (notifError) {
            // Don't fail the RSVP if notification fails
            console.error(`RSVP: Notification error (non-fatal):`, notifError);
          }
        }
        
        res.json(rsvp);
      }
    } catch (error: any) {
      console.error("RSVP Error:", error?.message || error);
      console.error("Stack:", error?.stack);
      if (String(error?.message || '').toLowerCase().includes('capacity')) {
        return res.status(403).json({
          message: 'Event capacity has been reached',
          eventFull: true,
        });
      }
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

  // Submit application for approval-mode event
  app.post('/api/events/:idOrSlug/applications', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: 'You must be logged in to apply.' });
      }

      const idOrSlug = req.params.idOrSlug;
      const userId = String(req.user.id);

      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEventWithDetails(parseInt(idOrSlug));
      } else {
        event = await storage.getEventWithDetailsBySlug(idOrSlug);
      }

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      if (event.entryMode !== 'approval') {
        return res.status(400).json({ message: 'Applications are not enabled for this event' });
      }
      if (String(event.hostId) === userId) {
        return res.status(400).json({ message: 'Host cannot apply to own event' });
      }
      if (event.isClosed) {
        return res.status(403).json({ message: 'Event is closed by the host', eventClosed: true });
      }

      const existingApplication = await storage.getUserApplication(event.id, userId);
      if (existingApplication) {
        return res.status(400).json({
          message: 'You have already applied to this event',
          application: existingApplication,
        });
      }

      const responses = req.body?.responses && typeof req.body.responses === 'object' ? req.body.responses : {};
      const formSchema = normalizeFormSchema(event.formSchema || []);
      validateApplicationResponses(formSchema, responses);

      const payload = insertApplicationSchema.parse({
        eventId: event.id,
        userId,
        status: 'pending',
        responses,
      });

      const application = await storage.createApplication(payload);
      return res.json(application);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      return res.status(500).json({ message: error?.message || 'Failed to submit application' });
    }
  });

  // Current user's application for an event
  app.get('/api/events/:idOrSlug/my-application', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const idOrSlug = req.params.idOrSlug;
      const userId = String(req.user.id);

      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEvent(parseInt(idOrSlug));
      } else {
        event = await storage.getEventBySlug(idOrSlug);
      }

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const application = await storage.getUserApplication(event.id, userId);
      return res.json(application || null);
    } catch (error) {
      console.error('Error fetching user application:', error);
      return res.status(500).json({ message: 'Failed to fetch application' });
    }
  });

  // Host: list all applications for an event
  app.get('/api/events/:idOrSlug/applications', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const idOrSlug = req.params.idOrSlug;
      const userId = String(req.user.id);

      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEvent(parseInt(idOrSlug));
      } else {
        event = await storage.getEventBySlug(idOrSlug);
      }

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      if (String(event.hostId) !== userId) {
        return res.status(403).json({ message: 'Only host can view applications' });
      }

      const applications = await storage.getEventApplications(event.id);
      return res.json(applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  // Host: approve/reject application
  app.post('/api/events/:idOrSlug/applications/:applicationId/respond', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const idOrSlug = req.params.idOrSlug;
      const applicationId = parseInt(req.params.applicationId);
      const hostId = String(req.user.id);
      const action = req.body?.action;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
      }

      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEvent(parseInt(idOrSlug));
      } else {
        event = await storage.getEventBySlug(idOrSlug);
      }

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      if (String(event.hostId) !== hostId) {
        return res.status(403).json({ message: 'Only host can review applications' });
      }

      const eventApplications = await storage.getEventApplications(event.id);
      const application = eventApplications.find((item: any) => item.id === applicationId);

      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      if (action === 'approve') {
        // Approval only grants permission to register.
        // Capacity is enforced when user actually registers/RSVPs as going.
        const updated = await storage.updateApplicationStatus(application.id, 'approved');
        return res.json(updated);
      }

      // Registration safety:
      // once user has already registered (going), host cannot reject approval.
      const existingRsvp = await storage.getUserRsvp(event.id, application.userId);
      if (existingRsvp?.status === 'going') {
        return res.status(409).json({
          message: 'Cannot reject application after user has registered',
          approvalLocked: true,
          rsvpStatus: existingRsvp.status,
        });
      }

      // Money-state safety:
      // once payment intent exists, host cannot reject this application.
      const [latestPaymentIntent] = await db
        .select({
          id: paymentTransactions.id,
          status: paymentTransactions.status,
        })
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.eventId, event.id),
            eq(paymentTransactions.userId, application.userId)
          )
        )
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(1);

      if (latestPaymentIntent) {
        return res.status(409).json({
          message: 'Cannot reject application after payment has been initiated',
          approvalLocked: true,
          paymentStatus: latestPaymentIntent.status,
        });
      }

      const updated = await storage.updateApplicationStatus(application.id, 'rejected');
      return res.json(updated);
    } catch (error: any) {
      console.error('Error responding to application:', error);
      if (String(error?.message || '').includes('capacity')) {
        return res.status(403).json({ message: 'Event capacity has been reached', eventFull: true });
      }
      return res.status(500).json({ message: error?.message || 'Failed to respond to application' });
    }
  });

  // Host: send reminder email to approved applicant
  app.post('/api/events/:idOrSlug/applications/:applicationId/send-reminder', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const idOrSlug = req.params.idOrSlug;
      const applicationId = parseInt(req.params.applicationId);
      const hostId = String(req.user.id);
      const customMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : undefined;

      let event;
      if (/^\d+$/.test(idOrSlug)) {
        event = await storage.getEvent(parseInt(idOrSlug));
      } else {
        event = await storage.getEventBySlug(idOrSlug);
      }

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      if (String(event.hostId) !== hostId) {
        return res.status(403).json({ message: 'Only host can send reminder emails' });
      }

      const eventApplications = await storage.getEventApplications(event.id);
      const application = eventApplications.find((item: any) => item.id === applicationId);

      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      if (application.status !== 'approved') {
        return res.status(400).json({ message: 'Reminders can only be sent to approved applicants' });
      }

      if (application.hostReminderSentAt) {
        return res.status(409).json({
          message: 'Reminder email can only be sent once',
          reminderLocked: true,
          reminderSentAt: application.hostReminderSentAt,
        });
      }

      const targetEmail = application.user?.email;
      if (!targetEmail) {
        return res.status(400).json({ message: 'Applicant email is missing' });
      }

      const hostName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.email || 'Host';

      await sendHostReminderEmail(
        targetEmail,
        hostName,
        event.title,
        customMessage || 'You are approved for this event. Please complete your RSVP to confirm your spot.'
      );

      await db
        .update(applications)
        .set({
          hostReminderSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, application.id));

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending reminder email:', error);
      return res.status(500).json({ message: error?.message || 'Failed to send reminder email' });
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

      // Manual close: prevent any new join/access requests when host closes the event.
      if (event.isClosed) {
        return res.status(403).json({
          message: "Event is closed by the host",
          eventClosed: true,
        });
      }

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

  // ============= EVENT INVITE CODES =============
  
  // Create an invite code for an event (host only)
  app.post('/api/events/:idOrSlug/invite-codes', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in." });
    }
    try {
      const { idOrSlug } = req.params;
      const userId = req.user.id;
      const { expiresInHours, maxUses } = req.body;

      // Get event by ID or slug
      let event;
      const numericId = parseInt(idOrSlug);
      if (!isNaN(numericId)) {
        event = await storage.getEvent(numericId);
      }
      if (!event) {
        event = await storage.getEventBySlug(idOrSlug);
      }
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user is the host
      if (String(event.hostId) !== String(userId)) {
        return res.status(403).json({ message: "Only the host can create invite codes" });
      }

      // Generate a random 8-character code
      const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Calculate expiration
      let expiresAt = null;
      if (expiresInHours && expiresInHours > 0) {
        expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      }

      const inviteCode = await storage.createEventInviteCode({
        eventId: event.id,
        code: generateCode(),
        createdBy: userId,
        expiresAt,
        maxUses: maxUses || null,
        isActive: true,
      });

      res.json(inviteCode);
    } catch (error) {
      console.error("Error creating event invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  // Get invite codes for an event (host only)
  app.get('/api/events/:idOrSlug/invite-codes', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in." });
    }
    try {
      const { idOrSlug } = req.params;
      const userId = req.user.id;

      // Get event by ID or slug
      let event;
      const numericId = parseInt(idOrSlug);
      if (!isNaN(numericId)) {
        event = await storage.getEvent(numericId);
      }
      if (!event) {
        event = await storage.getEventBySlug(idOrSlug);
      }
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user is the host
      if (String(event.hostId) !== String(userId)) {
        return res.status(403).json({ message: "Only the host can view invite codes" });
      }

      const codes = await storage.getEventInviteCodes(event.id);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching event invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  // Delete an invite code (host only)
  app.delete('/api/events/:idOrSlug/invite-codes/:codeId', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in." });
    }
    try {
      const { idOrSlug, codeId } = req.params;
      const userId = req.user.id;

      // Get event by ID or slug
      let event;
      const numericId = parseInt(idOrSlug);
      if (!isNaN(numericId)) {
        event = await storage.getEvent(numericId);
      }
      if (!event) {
        event = await storage.getEventBySlug(idOrSlug);
      }
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user is the host
      if (String(event.hostId) !== String(userId)) {
        return res.status(403).json({ message: "Only the host can delete invite codes" });
      }

      await storage.deleteEventInviteCode(parseInt(codeId));
      res.json({ message: "Invite code deleted" });
    } catch (error) {
      console.error("Error deleting event invite code:", error);
      res.status(500).json({ message: "Failed to delete invite code" });
    }
  });

  // Join event using invite code (public endpoint)
  app.post('/api/events/join-by-code', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to join an event." });
    }
    try {
      const { code } = req.body;
      const userId = req.user.id;

      if (!code) {
        return res.status(400).json({ message: "Invite code is required" });
      }

      // Find the invite code
      const inviteCode = await storage.getEventInviteCodeByCode(code.toUpperCase());
      if (!inviteCode) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      // Check if code is active
      if (!inviteCode.isActive) {
        return res.status(400).json({ message: "This invite code is no longer active" });
      }

      // Check if code has expired
      if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invite code has expired" });
      }

      // Check if max uses reached
      if (inviteCode.maxUses && inviteCode.useCount >= inviteCode.maxUses) {
        return res.status(400).json({ message: "This invite code has reached its maximum uses" });
      }

      // Get the event
      const event = await storage.getEvent(inviteCode.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Manual close: prevent new joins when host closes the event
      if (event.isClosed) {
        return res.status(403).json({ message: "Event is closed by the host", eventClosed: true });
      }

      // Check if user already has access or a RSVP record
      const existingRsvp = await storage.getUserRsvp(event.id, userId);
      if (existingRsvp) {
        if (existingRsvp.status === 'pending_access') {
          await storage.updateRsvp(event.id, userId, 'access_granted', 0);
          await storage.incrementEventInviteCodeUseCount(inviteCode.id);
        }

        return res.json({
          message: "Access already granted",
          accessGranted: true,
          event: {
            id: event.id,
            title: event.title,
            slug: event.slug,
          }
        });
      }

      // Grant access without automatically RSVP'ing
      const accessRsvp = await storage.createRsvp({
        eventId: event.id,
        userId,
        status: 'access_granted',
      });

      // Increment the use count
      await storage.incrementEventInviteCodeUseCount(inviteCode.id);

      res.json({
        message: "Access granted",
        accessGranted: true,
        rsvp: accessRsvp,
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
        }
      });
    } catch (error) {
      console.error("Error joining event by code:", error);
      res.status(500).json({ message: "Failed to join event" });
    }
  });

  // Validate invite code (public endpoint for previewing)
  app.get('/api/events/invite/:code', async (req: any, res) => {
    try {
      const code = req.params.code.toUpperCase();

      const inviteCode = await storage.getEventInviteCodeByCode(code);
      if (!inviteCode) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      // Check validity
      if (!inviteCode.isActive) {
        return res.status(400).json({ message: "This invite code is no longer active" });
      }

      if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invite code has expired" });
      }

      if (inviteCode.maxUses && inviteCode.useCount >= inviteCode.maxUses) {
        return res.status(400).json({ message: "This invite code has reached its maximum uses" });
      }

      // Get the event
      const event = await storage.getEvent(inviteCode.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get host info
      const host = await storage.getUser(event.hostId);

      // Parse date and time from datetime
      const eventDate = event.datetime ? new Date(event.datetime) : null;
      const dateStr = eventDate ? eventDate.toISOString().split('T')[0] : '';
      const timeStr = eventDate ? eventDate.toTimeString().slice(0, 5) : '';

      // Return limited event info for preview
      res.json({
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          imageUrl: event.imageUrl,
          datetime: event.datetime,
          date: dateStr,
          time: timeStr,
          location: event.location,
          isPublic: event.isPublic,
          isClosed: event.isClosed,
          slug: event.slug,
          hostName: host?.firstName ? `${host.firstName}${host.lastName ? ' ' + host.lastName : ''}` : host?.email?.split('@')[0] || 'Unknown',
        }
      });
    } catch (error) {
      console.error("Error validating event invite code:", error);
      res.status(500).json({ message: "Failed to validate invite code" });
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
      const eventResult = await db.execute(sql`
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
      const { createReminder } = await import('./reminderScheduler.ts');

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

  // Request discover page listing for a group (owner only)
  app.post('/api/groups/:idOrSlug/request-discover', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to request discover access." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      const { message } = req.body;

      // Support both numeric ID and slug
      let group;
      if (/^\d+$/.test(idOrSlug)) {
        group = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        group = await storage.getCommunityBySlug(idOrSlug);
      }

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      if (group.createdBy !== userId) {
        return res.status(403).json({ message: "Only the group owner can request discover listing" });
      }

      if (!group.isPublic) {
        return res.status(400).json({ message: "Only public groups can be listed in discover" });
      }

      if (group.discoverStatus === 'requested') {
        return res.status(400).json({ message: "Discover listing already requested" });
      }

      if (group.discoverStatus === 'approved') {
        return res.status(400).json({ message: "Group is already listed in discover" });
      }

      await db.update(groups).set({
        discoverStatus: 'requested',
        discoverRequestedAt: new Date(),
        discoverRequestedMessage: message || null,
      }).where(eq(groups.id, group.id));

      res.json({ message: "Discover listing requested successfully" });
    } catch (error) {
      console.error("Error requesting group discover listing:", error);
      res.status(500).json({ message: "Failed to request discover listing" });
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
      if (!membership || membership.role !== 'owner') {
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
      if (!membership || membership.role !== 'owner') {
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

      // Notify community owners/hosts about the new private join request
      try {
        const members = await storage.getCommunityMembers(communityId);
        const adminIds = (members || [])
          .filter((m: any) => m.role === 'owner' || m.role === 'host')
          .map((m: any) => String(m.userId));

        await createGroupJoinRequestNotification(
          notificationService,
          adminIds,
          {
            id: String(userId),
            firstName: req.user.firstName || 'Unknown',
            lastName: req.user.lastName || 'User',
          },
          {
            id: communityId,
            name: community.name,
          }
        );
      } catch (notifyError) {
        // Do not fail join request flow if notification delivery fails
        console.error('Failed to create group join request notification:', notifyError);
      }
      
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
      
      if (!requestingUserMembership || requestingUserMembership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can remove members." });
      }
      
      // Don't allow removing other admins
      const targetMembership = members.find(m => m.userId === userIdToRemove);
      if (targetMembership && targetMembership.role === 'owner') {
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
      
      // Get RSVP counts for each event
      const eventsWithRsvps = await Promise.all(
        events.map(async (event) => {
          const rsvpCounts = await storage.getEventRsvpCounts(event.id);
          return {
            ...event,
            goingCount: rsvpCounts.goingCount || 0,
            maybeCount: rsvpCounts.maybeCount || 0,
            rsvpCount: rsvpCounts.rsvpCount || 0
          };
        })
      );
      
      res.json(eventsWithRsvps);
    } catch (error) {
      console.error("Error fetching community events:", error);
      res.status(500).json({ message: "Failed to fetch community events" });
    }
  });

  // Dashboard analytics for group admins
  app.get('/api/groups/:idOrSlug/dashboard-analytics', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to view dashboard analytics." });
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
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can view dashboard analytics." });
      }
      
      // Get all events for this group
      const events = await storage.getCommunityEvents(community.id);
      
      // Get RSVP data for events
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Calculate event funnel data for last 30 days
      const recentEvents = events.filter(e => {
        const eventDate = new Date(e.datetime);
        return eventDate >= thirtyDaysAgo;
      });
      
      let totalRsvps = 0;
      let totalGoing = 0;
      
      for (const event of recentEvents) {
        const rsvpCounts = await storage.getEventRsvpCounts(event.id);
        totalRsvps += rsvpCounts.rsvpCount || 0;
        totalGoing += rsvpCounts.goingCount || 0;
      }
      
      // For now, we'll estimate views as 5x RSVPs (typical conversion rate)
      // In a real system, you'd track actual page views
      const estimatedViews = totalRsvps * 5;
      
      // Attendance is approximated by going count (could be enhanced with check-in feature)
      const attendance = totalGoing;
      
      res.json({
        eventFunnel: {
          views: estimatedViews,
          rsvps: totalRsvps,
          attendance: attendance
        },
        recentEventsCount: recentEvents.length,
        totalRsvps,
        totalGoing
      });
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  // Financial Intelligence analytics for group admins
  app.get('/api/groups/:idOrSlug/financial-analytics', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to view financial analytics." });
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
      
      // Check if user is admin
      const membership = await storage.getUserCommunityMembership(community.id, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can view financial analytics." });
      }
      
      // Get all events for this group
      const events = await storage.getCommunityEvents(community.id);
      const eventIds = events.map(e => e.id);
      
      // Get payment transactions for group events
      const allPayments = eventIds.length > 0 
        ? await db.select().from(paymentTransactions).where(
            sql`${paymentTransactions.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`
          )
        : [];
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      // Calculate revenue metrics
      const capturedPayments = allPayments.filter(p => p.status === 'captured');
      const totalRevenue = capturedPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100; // Convert paise to rupees
      const platformFees = capturedPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0) / 100;
      const hostEarnings = capturedPayments.reduce((sum, p) => sum + (p.hostShare || 0), 0) / 100;
      
      // Recent revenue (last 30 days)
      const recentPayments = capturedPayments.filter(p => new Date(p.createdAt!) >= thirtyDaysAgo);
      const recentRevenue = recentPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
      
      // Previous period revenue (30-60 days ago)
      const previousPayments = capturedPayments.filter(p => {
        const date = new Date(p.createdAt!);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      });
      const previousRevenue = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
      
      // Revenue trend
      const revenueTrend = previousRevenue > 0 
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
        : recentRevenue > 0 ? 100 : 0;
      
      // Payment success rate
      const totalPaymentAttempts = allPayments.length;
      const successfulPayments = capturedPayments.length;
      const failedPayments = allPayments.filter(p => p.status === 'failed').length;
      const paymentSuccessRate = totalPaymentAttempts > 0 
        ? (successfulPayments / totalPaymentAttempts) * 100 
        : 0;
      
      // Stuck payments (created or authorized for more than 10 minutes)
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const stuckPayments = allPayments.filter(p => 
        (p.status === 'created' || p.status === 'authorized') && 
        new Date(p.createdAt!) < tenMinutesAgo
      );
      
      // Refund metrics
      const refundedPayments = allPayments.filter(p => p.refundedAt);
      const totalRefunds = refundedPayments.reduce((sum, p) => sum + (p.refundAmount || 0), 0) / 100;
      const refundRate = successfulPayments > 0 
        ? (refundedPayments.length / successfulPayments) * 100 
        : 0;
      
      // Payment method breakdown
      const paymentMethods: Record<string, number> = {};
      capturedPayments.forEach(p => {
        const method = p.paymentMethod || 'unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });
      
      // Revenue per event
      const ticketedEvents = events.filter(e => e.ticketingEnabled);
      const revenuePerEvent: Array<{ eventId: number; title: string; revenue: number; ticketsSold: number }> = [];
      for (const event of ticketedEvents) {
        const eventPayments = capturedPayments.filter(p => p.eventId === event.id);
        const eventRevenue = eventPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
        revenuePerEvent.push({
          eventId: event.id,
          title: event.title,
          revenue: eventRevenue,
          ticketsSold: eventPayments.length
        });
      }
      revenuePerEvent.sort((a, b) => b.revenue - a.revenue);
      
      // Projected revenue from upcoming paid events
      const upcomingPaidEvents = events.filter(e => 
        e.ticketingEnabled && 
        new Date(e.datetime) > now
      );
      let projectedRevenue = 0;
      for (const event of upcomingPaidEvents) {
        const rsvpCounts = await storage.getEventRsvpCounts(event.id);
        // Project based on current RSVPs + estimate based on historical conversion
        const avgTicketsPerEvent = ticketedEvents.length > 0 
          ? capturedPayments.length / ticketedEvents.length 
          : 5;
        const estimatedAttendees = Math.max(rsvpCounts.goingCount || 0, avgTicketsPerEvent);
        projectedRevenue += estimatedAttendees * (event.ticketPrice || 0) / 100;
      }
      
      res.json({
        revenue: {
          total: totalRevenue,
          recent: recentRevenue,
          previous: previousRevenue,
          trend: revenueTrend,
          platformFees,
          hostEarnings,
          projected: projectedRevenue
        },
        payments: {
          total: totalPaymentAttempts,
          successful: successfulPayments,
          failed: failedPayments,
          stuck: stuckPayments.length,
          successRate: paymentSuccessRate,
          methods: paymentMethods
        },
        refunds: {
          count: refundedPayments.length,
          total: totalRefunds,
          rate: refundRate
        },
        ticketedEvents: {
          count: ticketedEvents.length,
          upcomingPaid: upcomingPaidEvents.length,
          revenueByEvent: revenuePerEvent.slice(0, 10) // Top 10
        }
      });
    } catch (error) {
      console.error("Error fetching financial analytics:", error);
      res.status(500).json({ message: "Failed to fetch financial analytics" });
    }
  });

  // Event Quality Metrics for group admins
  app.get('/api/groups/:idOrSlug/event-quality-metrics', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to view event quality metrics." });
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
      
      // Check if user is admin
      const membership = await storage.getUserCommunityMembership(community.id, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can view event quality metrics." });
      }
      
      // Get all past events
      const now = new Date();
      const events = await storage.getCommunityEvents(community.id);
      const pastEvents = events.filter(e => new Date(e.datetime) <= now);
      
      // Calculate metrics for each event
      const eventMetrics: Array<{
        eventId: number;
        title: string;
        datetime: string;
        successScore: number;
        rsvpCount: number;
        goingCount: number;
        noShowRate: number;
        capacityUtilization: number;
      }> = [];
      
      // Aggregate data for analysis
      const dayOfWeekStats: Record<number, { events: number; totalAttendees: number }> = {};
      const hourStats: Record<number, { events: number; totalAttendees: number }> = {};
      const capacityData: Array<{ maxGuests: number; attendance: number; utilization: number }> = [];
      
      for (const event of pastEvents) {
        const rsvpCounts = await storage.getEventRsvpCounts(event.id);
        const goingCount = rsvpCounts.goingCount || 0;
        const totalRsvps = rsvpCounts.rsvpCount || 0;
        
        // Calculate no-show rate (estimate: RSVPs who said going but didn't show)
        // For now, we assume 20% no-show rate as baseline since we don't have check-in data
        const estimatedNoShowRate = 20; // This would be calculated from actual check-in data
        
        // Capacity utilization
        const capacityUtilization = event.maxGuests 
          ? (goingCount / event.maxGuests) * 100 
          : 0;
        
        // Event success score (0-100)
        // Factors: attendance vs capacity, RSVP conversion, event completion
        let successScore = 50; // Base score
        
        // Attendance factor (+/- 25)
        if (event.maxGuests) {
          if (capacityUtilization >= 80) successScore += 25;
          else if (capacityUtilization >= 60) successScore += 15;
          else if (capacityUtilization >= 40) successScore += 5;
          else successScore -= 10;
        } else if (goingCount >= 10) {
          successScore += 20;
        } else if (goingCount >= 5) {
          successScore += 10;
        }
        
        // RSVP engagement factor (+/- 15)
        if (totalRsvps >= 20) successScore += 15;
        else if (totalRsvps >= 10) successScore += 10;
        else if (totalRsvps >= 5) successScore += 5;
        
        // Paid event factor (+10 if ticketed and sold)
        if (event.ticketingEnabled && goingCount > 0) {
          successScore += 10;
        }
        
        successScore = Math.max(0, Math.min(100, successScore));
        
        eventMetrics.push({
          eventId: event.id,
          title: event.title,
          datetime: typeof event.datetime === 'string' ? event.datetime : event.datetime.toISOString(),
          successScore,
          rsvpCount: totalRsvps,
          goingCount,
          noShowRate: estimatedNoShowRate,
          capacityUtilization
        });
        
        // Day of week analysis
        const eventDate = new Date(event.datetime);
        const dayOfWeek = eventDate.getDay();
        const hour = eventDate.getHours();
        
        if (!dayOfWeekStats[dayOfWeek]) {
          dayOfWeekStats[dayOfWeek] = { events: 0, totalAttendees: 0 };
        }
        dayOfWeekStats[dayOfWeek].events++;
        dayOfWeekStats[dayOfWeek].totalAttendees += goingCount;
        
        if (!hourStats[hour]) {
          hourStats[hour] = { events: 0, totalAttendees: 0 };
        }
        hourStats[hour].events++;
        hourStats[hour].totalAttendees += goingCount;
        
        // Capacity analysis
        if (event.maxGuests) {
          capacityData.push({
            maxGuests: event.maxGuests,
            attendance: goingCount,
            utilization: capacityUtilization
          });
        }
      }
      
      // Sort by success score
      eventMetrics.sort((a, b) => b.successScore - a.successScore);
      
      // Find optimal timing
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const optimalDays = Object.entries(dayOfWeekStats)
        .map(([day, stats]) => ({
          day: dayNames[parseInt(day)],
          dayIndex: parseInt(day),
          avgAttendance: stats.events > 0 ? stats.totalAttendees / stats.events : 0,
          eventCount: stats.events
        }))
        .sort((a, b) => b.avgAttendance - a.avgAttendance);
      
      const optimalHours = Object.entries(hourStats)
        .map(([hour, stats]) => ({
          hour: parseInt(hour),
          hourLabel: `${parseInt(hour)}:00`,
          avgAttendance: stats.events > 0 ? stats.totalAttendees / stats.events : 0,
          eventCount: stats.events
        }))
        .sort((a, b) => b.avgAttendance - a.avgAttendance);
      
      // Capacity optimization
      const avgCapacityUtilization = capacityData.length > 0
        ? capacityData.reduce((sum, d) => sum + d.utilization, 0) / capacityData.length
        : 0;
      
      // Find sweet spot capacity (highest utilization)
      const capacityBuckets: Record<string, { count: number; avgUtilization: number }> = {
        'small (1-10)': { count: 0, avgUtilization: 0 },
        'medium (11-30)': { count: 0, avgUtilization: 0 },
        'large (31-100)': { count: 0, avgUtilization: 0 },
        'xlarge (100+)': { count: 0, avgUtilization: 0 }
      };
      
      capacityData.forEach(d => {
        let bucket = 'small (1-10)';
        if (d.maxGuests > 100) bucket = 'xlarge (100+)';
        else if (d.maxGuests > 30) bucket = 'large (31-100)';
        else if (d.maxGuests > 10) bucket = 'medium (11-30)';
        
        capacityBuckets[bucket].count++;
        capacityBuckets[bucket].avgUtilization = 
          (capacityBuckets[bucket].avgUtilization * (capacityBuckets[bucket].count - 1) + d.utilization) / 
          capacityBuckets[bucket].count;
      });
      
      // Average success score
      const avgSuccessScore = eventMetrics.length > 0
        ? eventMetrics.reduce((sum, e) => sum + e.successScore, 0) / eventMetrics.length
        : 0;
      
      res.json({
        summary: {
          totalPastEvents: pastEvents.length,
          avgSuccessScore: Math.round(avgSuccessScore),
          avgCapacityUtilization: Math.round(avgCapacityUtilization)
        },
        eventScores: eventMetrics.slice(0, 10), // Top/bottom events
        timing: {
          optimalDays: optimalDays.slice(0, 3),
          optimalHours: optimalHours.slice(0, 5),
          recommendation: optimalDays.length > 0 && optimalHours.length > 0
            ? `Best performance on ${optimalDays[0]?.day}s around ${optimalHours[0]?.hourLabel}`
            : 'Not enough data for recommendations'
        },
        capacity: {
          avgUtilization: Math.round(avgCapacityUtilization),
          buckets: capacityBuckets,
          recommendation: avgCapacityUtilization < 50 
            ? 'Consider smaller venue sizes to improve fill rates'
            : avgCapacityUtilization > 90 
              ? 'Events are filling up! Consider larger capacities'
              : 'Capacity sizing is well optimized'
        },
        noShow: {
          avgRate: 20, // Placeholder - would need check-in data
          recommendation: 'Enable check-in feature to track actual no-show rates'
        }
      });
    } catch (error) {
      console.error("Error fetching event quality metrics:", error);
      res.status(500).json({ message: "Failed to fetch event quality metrics" });
    }
  });

  // Community Health Diagnostics for group admins
  app.get('/api/groups/:idOrSlug/community-health', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to view community insights." });
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
      
      // Check if user is admin
      const membership = await storage.getUserCommunityMembership(community.id, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can view community insights." });
      }

      const members = await storage.getCommunityMembers(community.id);
      const events = await storage.getCommunityEvents(community.id);
      
      // ==========================================
      // Event Timing Patterns (REAL DATA)
      // ==========================================
      const dayOfWeekCounts: Record<number, number> = {};
      const monthCounts: Record<number, number> = {};
      let totalRsvps = 0;
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (const event of events) {
        const eventDate = new Date(event.datetime);
        const dayOfWeek = eventDate.getDay();
        const month = eventDate.getMonth();
        
        dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
        
        // Get RSVP count for this event
        const rsvpCounts = await storage.getEventRsvpCounts(event.id);
        totalRsvps += rsvpCounts.goingCount || 0;
      }
      
      // Format day of week data
      const byDay = dayNames.map((name, index) => ({
        name,
        count: dayOfWeekCounts[index] || 0
      }));
      
      // Format month data
      const byMonth = monthNames.map((name, index) => ({
        name,
        count: monthCounts[index] || 0
      }));
      
      // ==========================================
      // Event Type Stats (REAL DATA)
      // ==========================================
      const eventTypeMap: Record<string, { count: number; totalRsvps: number }> = {};
      
      for (const event of events) {
        const eventType = event.eventType || 'General';
        if (!eventTypeMap[eventType]) {
          eventTypeMap[eventType] = { count: 0, totalRsvps: 0 };
        }
        eventTypeMap[eventType].count++;
        
        const rsvpCounts = await storage.getEventRsvpCounts(event.id);
        eventTypeMap[eventType].totalRsvps += rsvpCounts.goingCount || 0;
      }
      
      const eventTypeStats = Object.entries(eventTypeMap)
        .map(([type, data]) => ({
          type,
          count: data.count,
          totalRsvps: data.totalRsvps,
          avgRsvps: data.count > 0 ? Math.round(data.totalRsvps / data.count) : 0
        }))
        .sort((a, b) => b.avgRsvps - a.avgRsvps);
      
      // ==========================================
      // Member Join Patterns (REAL DATA)
      // ==========================================
      const joinsByMonth: Record<string, number> = {};
      
      for (const member of members) {
        const joinDate = new Date(member.joinedAt);
        const monthKey = `${monthNames[joinDate.getMonth()]} ${joinDate.getFullYear()}`;
        joinsByMonth[monthKey] = (joinsByMonth[monthKey] || 0) + 1;
      }
      
      // Get last 6 months of joins
      const memberJoinPatterns = Object.entries(joinsByMonth)
        .map(([month, count]) => ({ month, count }))
        .slice(-6);
      
      res.json({
        eventPatterns: {
          byDay,
          byMonth,
          totalEvents: events.length,
          totalRsvps,
          avgRsvpsPerEvent: events.length > 0 ? Math.round(totalRsvps / events.length) : 0
        },
        eventTypeStats,
        memberJoinPatterns
      });
    } catch (error) {
      console.error("Error fetching community insights:", error);
      res.status(500).json({ message: "Failed to fetch community insights" });
    }
  });

  // Member Intelligence for group admins
  app.get('/api/groups/:idOrSlug/member-intelligence', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to view member intelligence." });
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
      
      // Check if user is admin
      const membership = await storage.getUserCommunityMembership(community.id, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can view member intelligence." });
      }
      
      const now = new Date();
      const members = await storage.getCommunityMembers(community.id);
      const events = await storage.getCommunityEvents(community.id);
      
      // Time periods
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      // ==========================================
      // Member Journey Analytics
      // ==========================================
      
      // New joins by period
      const joinsLast30Days = members.filter(m => new Date(m.joinedAt) >= thirtyDaysAgo).length;
      const joins30to60Days = members.filter(m => {
        const joinDate = new Date(m.joinedAt);
        return joinDate >= sixtyDaysAgo && joinDate < thirtyDaysAgo;
      }).length;
      const joins60to90Days = members.filter(m => {
        const joinDate = new Date(m.joinedAt);
        return joinDate >= ninetyDaysAgo && joinDate < sixtyDaysAgo;
      }).length;
      
      // Calculate retention (members who joined 60+ days ago and are still active)
      const oldMembers = members.filter(m => new Date(m.joinedAt) < sixtyDaysAgo);
      
      // Build member activity map
      const memberActivity: Record<string, { 
        rsvpCount: number; 
        goingCount: number;
        lastActivity: Date | null;
        eventsAttended: number;
        joinDate: Date;
        user: any;
      }> = {};
      
      for (const member of members) {
        memberActivity[member.userId] = { 
          rsvpCount: 0, 
          goingCount: 0,
          lastActivity: null,
          eventsAttended: 0,
          joinDate: new Date(member.joinedAt),
          user: member.user
        };
      }
      
      // Analyze RSVPs
      for (const event of events) {
        const rsvps = await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, event.id));
        for (const rsvp of rsvps) {
          if (memberActivity[rsvp.userId]) {
            memberActivity[rsvp.userId].rsvpCount++;
            if (rsvp.status === 'going') {
              memberActivity[rsvp.userId].goingCount++;
              // Count past events attended
              if (new Date(event.datetime) <= now) {
                memberActivity[rsvp.userId].eventsAttended++;
              }
            }
            const rsvpDate = new Date(rsvp.createdAt!);
            if (!memberActivity[rsvp.userId].lastActivity || rsvpDate > memberActivity[rsvp.userId].lastActivity!) {
              memberActivity[rsvp.userId].lastActivity = rsvpDate;
            }
          }
        }
      }
      
      // Retention rate (old members with recent activity)
      const retainedMembers = oldMembers.filter(m => {
        const activity = memberActivity[m.userId];
        return activity && activity.lastActivity && activity.lastActivity >= sixtyDaysAgo;
      }).length;
      const retentionRate = oldMembers.length > 0 ? (retainedMembers / oldMembers.length) * 100 : 0;
      
      // Churn analysis (members who left or became inactive)
      const churnedMembers = oldMembers.filter(m => {
        const activity = memberActivity[m.userId];
        return !activity.lastActivity || activity.lastActivity < ninetyDaysAgo;
      }).length;
      const churnRate = oldMembers.length > 0 ? (churnedMembers / oldMembers.length) * 100 : 0;
      
      // ==========================================
      // Engagement Scoring
      // ==========================================
      const engagementScores: Array<{
        userId: string;
        displayName: string;
        profileImage: string | null;
        score: number;
        eventsAttended: number;
        lastActive: string | null;
        segment: 'champion' | 'active' | 'casual' | 'at-risk' | 'dormant';
      }> = [];
      
      for (const [memberId, activity] of Object.entries(memberActivity)) {
        // Calculate engagement score (0-100)
        let score = 0;
        
        // Events attended factor (max 40 points)
        score += Math.min(activity.eventsAttended * 10, 40);
        
        // Recency factor (max 30 points)
        if (activity.lastActivity) {
          const daysSinceActive = (now.getTime() - activity.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActive <= 7) score += 30;
          else if (daysSinceActive <= 30) score += 20;
          else if (daysSinceActive <= 60) score += 10;
        }
        
        // Tenure factor (max 20 points)
        const tenureDays = (now.getTime() - activity.joinDate.getTime()) / (1000 * 60 * 60 * 24);
        if (tenureDays >= 180) score += 20;
        else if (tenureDays >= 90) score += 15;
        else if (tenureDays >= 30) score += 10;
        else score += 5;
        
        // RSVP consistency factor (max 10 points)
        if (activity.rsvpCount > 0) {
          const rsvpToGoingRatio = activity.goingCount / activity.rsvpCount;
          score += Math.round(rsvpToGoingRatio * 10);
        }
        
        // Determine segment
        let segment: 'champion' | 'active' | 'casual' | 'at-risk' | 'dormant';
        if (score >= 70) segment = 'champion';
        else if (score >= 50) segment = 'active';
        else if (score >= 30) segment = 'casual';
        else if (activity.lastActivity && activity.lastActivity >= ninetyDaysAgo) segment = 'at-risk';
        else segment = 'dormant';
        
        const user = activity.user;
        engagementScores.push({
          userId: memberId,
          displayName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
          profileImage: user?.profileImageUrl || null,
          score,
          eventsAttended: activity.eventsAttended,
          lastActive: activity.lastActivity?.toISOString() || null,
          segment
        });
      }
      
      // Sort by score
      engagementScores.sort((a, b) => b.score - a.score);
      
      // ==========================================
      // Member Segmentation
      // ==========================================
      const segmentation = {
        champions: engagementScores.filter(m => m.segment === 'champion').length,
        active: engagementScores.filter(m => m.segment === 'active').length,
        casual: engagementScores.filter(m => m.segment === 'casual').length,
        atRisk: engagementScores.filter(m => m.segment === 'at-risk').length,
        dormant: engagementScores.filter(m => m.segment === 'dormant').length
      };
      
      // ==========================================
      // Growth Attribution
      // ==========================================
      // Note: In a real system, you'd track referral sources. For now, we'll analyze join patterns.
      const growthAttribution = {
        organic: 0,        // Direct joins (no referral tracking)
        eventDriven: 0,    // Joined around event dates
        inviteCode: 0,     // Joined via invite codes (if tracked)
        unknown: 0
      };
      
      // Analyze join patterns relative to events
      for (const member of members) {
        const joinDate = new Date(member.joinedAt);
        
        // Check if joined within 3 days of an event
        const nearEvent = events.some(event => {
          const eventDate = new Date(event.datetime);
          const diffDays = Math.abs((eventDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 3;
        });
        
        if (nearEvent) {
          growthAttribution.eventDriven++;
        } else {
          growthAttribution.organic++;
        }
      }
      
      // Join trends over time (last 6 months)
      const joinTrends: Array<{ month: string; count: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthJoins = members.filter(m => {
          const joinDate = new Date(m.joinedAt);
          return joinDate >= startOfMonth && joinDate <= endOfMonth;
        }).length;
        joinTrends.push({
          month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          count: monthJoins
        });
      }
      
      res.json({
        memberStats: {
          newThisMonth: joinsLast30Days,
          previousMonth: joins30to60Days,
          total: members.length,
          avgTenureDays: members.length > 0 
            ? Math.round(members.reduce((sum, m) => {
                const tenure = (now.getTime() - new Date(m.joinedAt).getTime()) / (1000 * 60 * 60 * 24);
                return sum + tenure;
              }, 0) / members.length)
            : 0
        },
        topRsvpers: engagementScores.slice(0, 10).map(m => ({
          name: m.displayName,
          email: memberActivity[m.userId]?.user?.email,
          rsvpCount: memberActivity[m.userId]?.rsvpCount || 0,
          joinedAgo: (() => {
            const days = Math.floor((now.getTime() - memberActivity[m.userId]?.joinDate.getTime()) / (1000 * 60 * 60 * 24));
            if (days < 30) return `${days}d ago`;
            if (days < 365) return `${Math.floor(days / 30)}mo ago`;
            return `${Math.floor(days / 365)}y ago`;
          })()
        })),
        recentMembers: members
          .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
          .slice(0, 10)
          .map(m => ({
            name: m.user ? `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim() || m.user.email : 'Unknown',
            email: m.user?.email,
            rsvpCount: memberActivity[m.userId]?.rsvpCount || 0,
            joinedAgo: (() => {
              const days = Math.floor((now.getTime() - new Date(m.joinedAt).getTime()) / (1000 * 60 * 60 * 24));
              if (days < 1) return 'Today';
              if (days === 1) return 'Yesterday';
              if (days < 30) return `${days}d ago`;
              if (days < 365) return `${Math.floor(days / 30)}mo ago`;
              return `${Math.floor(days / 365)}y ago`;
            })()
          })),
        memberGrowth: joinTrends
      });
    } catch (error) {
      console.error("Error fetching member intelligence:", error);
      res.status(500).json({ message: "Failed to fetch member intelligence" });
    }
  });

  // Send newsletter to community members
  app.post('/api/groups/:idOrSlug/newsletter', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to send newsletters." });
    }
    try {
      const { idOrSlug } = req.params;
      let communityForLookup = /^\d+$/.test(idOrSlug)
        ? await storage.getCommunity(parseInt(idOrSlug))
        : await storage.getCommunityBySlug(idOrSlug);
      if (!communityForLookup) {
        return res.status(404).json({ message: "Group not found." });
      }
      const communityId = communityForLookup.id;
      const { subject, content } = req.body;
      const userId = req.user.id;

      if (!subject?.trim() || !content?.trim()) {
        return res.status(400).json({ message: "Subject and content are required." });
      }

      // Check if user is owner of the community
      const members = await storage.getCommunityMembers(communityId);
      const userMembership = members.find((m: any) => m.userId === userId);

      if (!userMembership || userMembership.role !== 'owner') {
        return res.status(403).json({ message: "Only the group owner can send newsletters." });
      }

      const community = communityForLookup;
      const sender = await storage.getUser(userId);
      const senderName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Group Owner' : 'Group Owner';

      // Collect member emails (skip members without an email)
      const recipientMembers = members.filter((m: any) => m.user?.email);

      if (recipientMembers.length === 0) {
        return res.status(400).json({ message: "No members with email addresses found." });
      }

      // Import sendGroupNewsletterEmail here to avoid circular issues
      const { sendGroupNewsletterEmail } = await import('./mail');

      // Send emails concurrently (Resend handles rate limiting)
      const results = await Promise.allSettled(
        recipientMembers.map((m: any) => {
          const firstName = m.user.firstName || '';
          const lastName = m.user.lastName || '';
          const memberName = `${firstName} ${lastName}`.trim() || m.user.email;
          return sendGroupNewsletterEmail({
            memberEmail: m.user.email,
            memberName,
            groupName: community.name,
            groupSlug: community.slug || undefined,
            senderName,
            subject,
            content,
          });
        })
      );

      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`[newsletter] Sent ${sent}/${recipientMembers.length} emails for group ${communityId}`);
      if (failed > 0) {
        console.error(`[newsletter] ${failed} emails failed`);
      }

      // Save newsletter record to DB
      if (sent > 0) {
        await storage.saveGroupNewsletter({
          groupId: communityId,
          sentBy: userId,
          subject,
          content,
          recipientCount: sent,
        });
      }

      res.json({
        message: `Newsletter sent to ${sent} member${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}.`,
        sent,
        failed,
        sentAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error sending newsletter:", error);
      res.status(500).json({ message: "Failed to send newsletter" });
    }
  });

  // List past newsletters for a group
  app.get('/api/groups/:idOrSlug/newsletters', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { idOrSlug } = req.params;
      const community = /^\d+$/.test(idOrSlug)
        ? await storage.getCommunity(parseInt(idOrSlug))
        : await storage.getCommunityBySlug(idOrSlug);
      if (!community) return res.status(404).json({ message: "Group not found." });

      // Only owner can view newsletters
      const members = await storage.getCommunityMembers(community.id);
      const membership = members.find((m: any) => m.userId === req.user.id);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only the group owner can view newsletters." });
      }

      const newsletters = await storage.getGroupNewsletters(community.id);
      res.json(newsletters);
    } catch (error) {
      console.error("Error fetching newsletters:", error);
      res.status(500).json({ message: "Failed to fetch newsletters" });
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
      if (!['owner', 'host', 'member'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'owner', 'host', or 'member'." });
      }
      
      // Check if current user is owner of the community
      const currentUserMembership = await storage.getUserCommunityMembership(communityId, currentUserId);
      if (!currentUserMembership || currentUserMembership.role !== 'owner') {
        return res.status(403).json({ message: "Only owners can update member roles." });
      }
      
      // Check if target user is a member of the community
      const targetUserMembership = await storage.getUserCommunityMembership(communityId, targetUserId);
      if (!targetUserMembership) {
        return res.status(404).json({ message: "User is not a member of this community." });
      }
      
      // Prevent self-demotion from owner role (to avoid orphaned communities)
      if (currentUserId === targetUserId && currentUserMembership.role === 'owner' && role !== 'owner') {
        return res.status(400).json({ message: "You cannot demote yourself from owner role." });
      }
      
      const updatedMember = await storage.updateCommunityMemberRole(communityId, targetUserId, role);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // Transfer ownership to another member (2-step confirmation on frontend)
  app.post('/api/groups/:idOrSlug/transfer-ownership', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to transfer ownership." });
    }
    try {
      const { newOwnerId, confirmTransfer } = req.body;
      const currentUserId = req.user.id;
      const idOrSlug = req.params.idOrSlug;
      
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
      
      // Check if current user is owner
      const currentUserMembership = await storage.getUserCommunityMembership(communityId, currentUserId);
      if (!currentUserMembership || currentUserMembership.role !== 'owner') {
        return res.status(403).json({ message: "Only owners can transfer ownership." });
      }
      
      // Check if target user is a member
      const targetUserMembership = await storage.getUserCommunityMembership(communityId, newOwnerId);
      if (!targetUserMembership) {
        return res.status(404).json({ message: "Target user is not a member of this group." });
      }
      
      // Require explicit confirmation
      if (confirmTransfer !== true) {
        return res.status(400).json({ 
          message: "Confirmation required", 
          requiresConfirmation: true,
          targetUser: newOwnerId
        });
      }
      
      // Transfer ownership: make target user owner, demote current user to host
      await storage.updateCommunityMemberRole(communityId, newOwnerId, 'owner');
      await storage.updateCommunityMemberRole(communityId, currentUserId, 'host');
      
      res.json({ 
        success: true, 
        message: "Ownership transferred successfully. You are now a host." 
      });
    } catch (error) {
      console.error("Error transferring ownership:", error);
      res.status(500).json({ message: "Failed to transfer ownership" });
    }
  });

  // Emergency revoke host powers (owner-only)
  app.post('/api/groups/:idOrSlug/revoke-host', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to revoke host powers." });
    }
    try {
      const { hostUserId } = req.body;
      const currentUserId = req.user.id;
      const idOrSlug = req.params.idOrSlug;
      
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
      
      // Check if current user is owner
      const currentUserMembership = await storage.getUserCommunityMembership(communityId, currentUserId);
      if (!currentUserMembership || currentUserMembership.role !== 'owner') {
        return res.status(403).json({ message: "Only owners can revoke host powers." });
      }
      
      // Check if target user is a host
      const targetUserMembership = await storage.getUserCommunityMembership(communityId, hostUserId);
      if (!targetUserMembership) {
        return res.status(404).json({ message: "User is not a member of this group." });
      }
      
      if (targetUserMembership.role !== 'host') {
        return res.status(400).json({ message: "User is not a host." });
      }
      
      // Demote host to member
      await storage.updateCommunityMemberRole(communityId, hostUserId, 'member');
      
      res.json({ 
        success: true, 
        message: "Host powers revoked. User is now a member." 
      });
    } catch (error) {
      console.error("Error revoking host powers:", error);
      res.status(500).json({ message: "Failed to revoke host powers" });
    }
  });

  // Community announcements endpoints
  app.post('/api/groups/:id/announcements', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create announcements." });
    }
    try {
      const idOrSlug = req.params.id;
      const { title, content, type = 'general' } = req.body;
      const userId = req.user.id;
      
      // Get community by ID or slug
      let community;
      if (isNaN(Number(idOrSlug))) {
        community = await storage.getCommunityBySlug(idOrSlug);
      } else {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const communityId = community.id;
      
      // Check if user is owner or host of the community
      const userMembership = await storage.getUserCommunityMembership(communityId, userId);
      if (!userMembership || !userMembership.role || !['owner', 'host'].includes(userMembership.role)) {
        return res.status(403).json({ message: "Only owners and hosts can create announcements." });
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
      const idOrSlug = req.params.id;
      
      // Get community by ID or slug
      let community;
      if (isNaN(Number(idOrSlug))) {
        community = await storage.getCommunityBySlug(idOrSlug);
      } else {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const announcements = await storage.getCommunityAnnouncements(community.id);
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
      const idOrSlug = req.params.id;
      const userId = req.user.id;
      
      // Get community by ID or slug
      let community;
      if (isNaN(Number(idOrSlug))) {
        community = await storage.getCommunityBySlug(idOrSlug);
      } else {
        const communityId = parseInt(idOrSlug);
        community = await storage.getCommunity(communityId);
      }
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      const count = await storage.getUnreadAnnouncementsCount(community.id, userId);
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
      if (!membership || membership.role !== 'owner') {
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
      if (!membership || membership.role !== 'owner') {
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
      if (!membership || membership.role !== 'owner') {
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

  // =====================================================
  // GROUP INVITE CODE ROUTES
  // =====================================================

  // Generate a random 8-character invite code
  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0,O,1,I
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create invite code for a group
  app.post('/api/groups/:idOrSlug/invite-codes', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create invite codes." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;
      const { expiresInHours, maxUses } = req.body;

      // Get group by ID or slug
      let group;
      if (/^\d+$/.test(idOrSlug)) {
        group = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        group = await storage.getCommunityBySlug(idOrSlug);
      }

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user is admin of the group
      const membership = await storage.getUserCommunityMembership(group.id, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can create invite codes." });
      }

      // Generate unique code
      let code = generateInviteCode();
      let existingCode = await storage.getInviteCodeByCode(code);
      while (existingCode) {
        code = generateInviteCode();
        existingCode = await storage.getInviteCodeByCode(code);
      }

      // Calculate expiration
      let expiresAt = null;
      if (expiresInHours && expiresInHours > 0) {
        expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      }

      const inviteCode = await storage.createInviteCode({
        groupId: group.id,
        code,
        createdBy: userId,
        expiresAt,
        maxUses: maxUses || null,
        isActive: true,
      });

      res.json(inviteCode);
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  // Get all invite codes for a group
  app.get('/api/groups/:idOrSlug/invite-codes', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to view invite codes." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const userId = req.user.id;

      // Get group by ID or slug
      let group;
      if (/^\d+$/.test(idOrSlug)) {
        group = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        group = await storage.getCommunityBySlug(idOrSlug);
      }

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user is admin of the group
      const membership = await storage.getUserCommunityMembership(group.id, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can view invite codes." });
      }

      const inviteCodes = await storage.getGroupInviteCodes(group.id);
      res.json(inviteCodes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  // Delete an invite code
  app.delete('/api/groups/:idOrSlug/invite-codes/:codeId', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to delete invite codes." });
    }
    try {
      const idOrSlug = req.params.idOrSlug;
      const codeId = parseInt(req.params.codeId);
      const userId = req.user.id;

      // Get group by ID or slug
      let group;
      if (/^\d+$/.test(idOrSlug)) {
        group = await storage.getCommunity(parseInt(idOrSlug));
      } else {
        group = await storage.getCommunityBySlug(idOrSlug);
      }

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user is admin of the group
      const membership = await storage.getUserCommunityMembership(group.id, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only admins can delete invite codes." });
      }

      await storage.deleteInviteCode(codeId);
      res.json({ message: "Invite code deleted successfully" });
    } catch (error) {
      console.error("Error deleting invite code:", error);
      res.status(500).json({ message: "Failed to delete invite code" });
    }
  });

  // Join a group using invite code
  app.post('/api/groups/join-by-code', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to join a group." });
    }
    try {
      const { code } = req.body;
      const userId = req.user.id;

      if (!code) {
        return res.status(400).json({ message: "Invite code is required" });
      }

      // Find the invite code
      const inviteCode = await storage.getInviteCodeByCode(code.toUpperCase());
      if (!inviteCode) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      // Check if code is active
      if (!inviteCode.isActive) {
        return res.status(400).json({ message: "This invite code is no longer active" });
      }

      // Check if code has expired
      if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invite code has expired" });
      }

      // Check if max uses reached
      if (inviteCode.maxUses && inviteCode.useCount >= inviteCode.maxUses) {
        return res.status(400).json({ message: "This invite code has reached its maximum uses" });
      }

      // Get the group
      const group = await storage.getCommunity(inviteCode.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if already a member
      const existingMembership = await storage.getUserCommunityMembership(group.id, userId);
      if (existingMembership) {
        return res.status(400).json({ message: "You are already a member of this group" });
      }

      // Join the group - bypass private check since we have a valid invite code
      const membership = await storage.joinCommunity(group.id, userId, 'member', true);

      // Increment the use count
      await storage.incrementInviteCodeUseCount(inviteCode.id);

      res.json({ 
        message: "Successfully joined the group",
        membership,
        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
        }
      });
    } catch (error) {
      console.error("Error joining group by code:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  // Get invite code details (public endpoint for previewing before login)
  app.get('/api/invite/:code', async (req: any, res) => {
    try {
      const code = req.params.code.toUpperCase();

      const inviteCode = await storage.getInviteCodeByCode(code);
      if (!inviteCode) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      // Check validity
      if (!inviteCode.isActive) {
        return res.status(400).json({ message: "This invite code is no longer active" });
      }

      if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invite code has expired" });
      }

      if (inviteCode.maxUses && inviteCode.useCount >= inviteCode.maxUses) {
        return res.status(400).json({ message: "This invite code has reached its maximum uses" });
      }

      // Get the group
      const group = await storage.getCommunity(inviteCode.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Return limited group info for preview
      res.json({
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          imageUrl: group.imageUrl,
          memberCount: group.memberCount,
          isPublic: group.isPublic,
        },
        expiresAt: inviteCode.expiresAt,
        usesRemaining: inviteCode.maxUses ? inviteCode.maxUses - inviteCode.useCount : null,
      });
    } catch (error) {
      console.error("Error fetching invite code details:", error);
      res.status(500).json({ message: "Failed to fetch invite details" });
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
      
      // Get RSVP counts for each event
      const eventsWithRsvps = await Promise.all(
        events.map(async (event) => {
          const rsvpCounts = await storage.getEventRsvpCounts(event.id);
          return {
            ...event,
            goingCount: rsvpCounts.goingCount || 0,
            maybeCount: rsvpCounts.maybeCount || 0,
            rsvpCount: rsvpCounts.rsvpCount || 0
          };
        })
      );
      
      res.json(eventsWithRsvps);
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

        try {
          const members = await storage.getCommunityMembers(communityId);
          const adminIds = (members || [])
            .filter((m: any) => m.role === 'owner' || m.role === 'host')
            .map((m: any) => String(m.userId));

          await createGroupJoinRequestNotification(
            notificationService,
            adminIds,
            {
              id: String(userId),
              firstName: req.user.firstName || 'Unknown',
              lastName: req.user.lastName || 'User',
            },
            {
              id: communityId,
              name: community.name,
            }
          );
        } catch (notifyError) {
          console.error('Failed to create group join request notification:', notifyError);
        }

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


