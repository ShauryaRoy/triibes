import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes, isAuthenticated } from "./replitAuth";
import { insertEventSchema, insertRsvpSchema, insertPostSchema, insertPollSchema, insertExpenseSchema, insertSettlementSchema, insertCommunitySchema, insertCommunityMemberSchema } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import path from "path";
import express from "express";
import multer from "multer";
import fs from "fs";

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
  // Only set up auth routes here
  setupAuthRoutes(app);

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
        description: req.body.description,
        hostId: userId,
        communityId: req.body.communityId || null, // Add community support
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
      console.log("[Create Event] Parsed eventData:", eventData);
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
      console.log(`[DEBUG] Fetching events for user: ${userId}`);
      const events = await storage.getUserEvents(userId);
      console.log(`[DEBUG] Found ${events?.length || 0} events for user ${userId}`);
      if (events && events.length > 0) {
        console.log(`[DEBUG] Event IDs:`, events.map((e: any) => e.id));
      }
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      console.log(`[DEBUG] Fetching event with ID: ${eventId}`);
      const event = await storage.getEventWithDetails(eventId);
      console.log(`[DEBUG] Event found:`, event ? 'YES' : 'NO');
      if (!event) {
        console.log(`[DEBUG] Event ${eventId} not found in database`);
        return res.status(404).json({ message: "Event not found" });
      }
      console.log(`[DEBUG] Returning event data for ID ${eventId}:`, {
        title: event.title,
        id: event.id,
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
      
      // Get user's RSVP status if authenticated
      let userRsvpStatus = null;
      if (req.isAuthenticated?.() && req.user) {
        const userRsvp = await storage.getUserRsvp(eventId, req.user.id);
        userRsvpStatus = userRsvp?.status || null;
      }

      // Get host information
      const host = await storage.getUser(event.hostId);

      const eventWithDetails = {
        ...event,
        ...rsvpCounts,
        userRsvpStatus,
        hostName: host ? `${host.firstName || ''} ${host.lastName || ''}`.trim() || host.email : "Unknown Host"
      };

      res.json(eventWithDetails);
    } catch (error) {
      console.error("Error fetching event for sharing:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

app.put('/api/events/:id', async (req: any, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.user?.id; // ← Use actual logged-in user ID

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const event = await storage.getEvent(eventId);

    if (!event || event.hostId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this event" });
    }

    const eventData = insertEventSchema.partial().parse(req.body);
    const updatedEvent = await storage.updateEvent(eventId, eventData);
    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
});


  app.delete('/api/events/:id', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to delete an event." });
    }
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id; // Use actual authenticated user ID
      
      const event = await storage.getEvent(eventId);
      if (!event || event.hostId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }
      
      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // RSVP routes
  app.post('/api/events/:id/rsvp', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ message: "You must be logged in to RSVP." });
      }
      const eventId = parseInt(req.params.id);
      const userId = req.user.id; // Use the actual authenticated user ID
      const { status, plusOneCount = 0, dietaryRestrictions, comments } = req.body;
      
      // Check if RSVP already exists
      const existingRsvp = await storage.getUserRsvp(eventId, userId);
      
      if (existingRsvp) {
        const updatedRsvp = await storage.updateRsvp(eventId, userId, status, plusOneCount);
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
        res.json(rsvp);
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
      res.status(500).json({ message: "Failed to update RSVP" });
    }
  });

  app.get('/api/events/:id/rsvps', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const rsvps = await storage.getEventRsvps(eventId);
      
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

  // Community routes
  app.get('/api/communities', async (req: any, res) => {
    try {
      const communities = await storage.getPublicCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Error fetching communities:", error);
      res.status(500).json({ message: "Failed to fetch communities" });
    }
  });

  app.get('/api/communities/discovery', async (req: any, res) => {
    try {
      const communities = await storage.getPublicCommunities();
      
      // Add stats to each community
      const communitiesWithStats = await Promise.all(
        communities.map(async (community) => {
          const stats = await storage.getCommunityStats(community.id);
          return {
            ...community,
            memberCount: stats.memberCount,
            eventCount: stats.eventCount
          };
        })
      );
      
      res.json(communitiesWithStats);
    } catch (error) {
      console.error("Error fetching communities for discovery:", error);
      res.status(500).json({ message: "Failed to fetch communities for discovery" });
    }
  });

  app.post('/api/communities', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to create a community." });
    }
    try {
      const userId = req.user.id;
      const communityData = insertCommunitySchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const community = await storage.createCommunity(communityData);
      res.json(community);
    } catch (error) {
      console.error("Error creating community:", error);
      res.status(500).json({ message: "Failed to create community" });
    }
  });

  app.get('/api/communities/:id', async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const community = await storage.getCommunityWithDetails(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      res.json(community);
    } catch (error) {
      console.error("Error fetching community:", error);
      res.status(500).json({ message: "Failed to fetch community" });
    }
  });

  app.put('/api/communities/:id', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to update a community." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user is admin of the community
      const membership = await storage.getUserCommunityMembership(communityId, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: "You must be an admin to update this community" });
      }
      
      const communityData = insertCommunitySchema.partial().parse(req.body);
      const updatedCommunity = await storage.updateCommunity(communityId, communityData);
      res.json(updatedCommunity);
    } catch (error) {
      console.error("Error updating community:", error);
      res.status(500).json({ message: "Failed to update community" });
    }
  });

  app.delete('/api/communities/:id', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to delete a community." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const userId = req.user.id;
      
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
  app.post('/api/communities/:id/join', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to join a community." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user is already a member
      const existingMembership = await storage.getUserCommunityMembership(communityId, userId);
      if (existingMembership) {
        return res.status(400).json({ message: "You are already a member of this community" });
      }
      
      const membership = await storage.joinCommunity(communityId, userId);
      res.json(membership);
    } catch (error) {
      console.error("Error joining community:", error);
      res.status(500).json({ message: "Failed to join community" });
    }
  });

  app.post('/api/communities/:id/leave', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to leave a community." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await storage.leaveCommunity(communityId, userId);
      res.json({ message: "Left community successfully" });
    } catch (error) {
      console.error("Error leaving community:", error);
      res.status(500).json({ message: "Failed to leave community" });
    }
  });

  // Remove member from community (admin only)
  app.delete('/api/communities/:id/members/:userId', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "You must be logged in to remove members." });
    }
    try {
      const communityId = parseInt(req.params.id);
      const userIdToRemove = req.params.userId;
      const requestingUserId = req.user.id;
      
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

  app.get('/api/communities/:id/members', async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const members = await storage.getCommunityMembers(communityId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching community members:", error);
      res.status(500).json({ message: "Failed to fetch community members" });
    }
  });

  app.get('/api/communities/:id/events', async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      const events = await storage.getCommunityEvents(communityId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching community events:", error);
      res.status(500).json({ message: "Failed to fetch community events" });
    }
  });

  // Send newsletter to community members
  app.post('/api/communities/:id/newsletter', async (req: any, res) => {
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

  // User's communities
  app.get('/api/profile/communities', async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const communities = await storage.getUserCommunities(userId);
      res.json(communities);
    } catch (error) {
      console.error("Error fetching user communities:", error);
      res.status(500).json({ message: "Failed to fetch user communities" });
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
