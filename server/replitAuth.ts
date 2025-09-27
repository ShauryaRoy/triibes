
import passport from "passport";
import session from "express-session";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { z } from "zod";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Create table if it doesn't exist
    ttl: sessionTtl,
    tableName: "sessions",
    pruneSessionInterval: false, // Disable automatic pruning to prevent connection errors
    errorLog: console.error, // Log errors for debugging
  });

  // Handle store errors
  sessionStore.on('error', function(error) {
    console.error('Session store error:', error);
  });

  const isProduction = process.env.NODE_ENV === 'production';

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false, // Only save session if it was modified
    saveUninitialized: false, // Only save session when we put something in it
    cookie: {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      maxAge: sessionTtl,
      sameSite: isProduction ? 'none' : 'lax', // Important for cross-site cookies in production
      domain: isProduction ? undefined : undefined // Let browser handle domain
    },
    name: 'tribbe.sid',
    rolling: true,
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  
 
    app.get("/api/login", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
    app.get("/api/callback", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });
    
  }

  // Local strategy for username/password
  passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) return done(null, false, { message: "Incorrect email." });
      if (!user.passwordHash) return done(null, false, { message: "No password set for this user." });
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return done(null, false, { message: "Incorrect password." });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));


export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

export { passport };
export function setupSession() {
  return getSession();
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export function setupAuthRoutes(app: Express) {
  // Setup Google OAuth strategy
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    console.error('Missing required Google OAuth environment variables');
    throw new Error('Missing required Google OAuth environment variables');
  }

  // Register passport serialization only here
  passport.serializeUser((user: any, done) => {
    try {
      console.log('serializeUser called with:', user);
      let userId = null;
      if (typeof user === 'string') {
        userId = user;
      } else if (user) {
        // Try all possible ID fields
        userId = user.id || user.googleId || (user._json && user._json.sub) || user.sub;
      }
      if (!userId) {
        console.error('No valid ID found in user object:', user);
        return done(new Error('No valid ID found in user object for serialization'));
      }
      done(null, userId.toString());
    } catch (err) {
      console.error('Serialization error:', err);
      done(err);
    }
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('Deserializing user ID:', id);
      if (!id) {
        return done(new Error('Invalid user ID'));
      }
      // Try to find user by ID
      let user = await storage.getUser(id);
      // If not found, try by Google ID as fallback
      if (!user) {
        user = await storage.getUserByGoogleId(id);
      }
      if (!user) {
        console.error('No user found for ID:', id);
        return done(null, false);
      }
      // Create a minimal user object with only what's needed
      const minimalUser = {
        id: user.id,
        email: user.email || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null
      };
      console.log('Deserialized user:', minimalUser.id);
      done(null, minimalUser);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    proxy: true // Important for Render deployment
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google auth - Environment:', process.env.NODE_ENV);
      console.log('Google profile ID:', profile.id);
      
      if (!profile.id) {
        console.error('No profile ID from Google');
        return done(new Error('No profile ID from Google'));
      }

      // Create new user data
      const userData = {
        id: profile.id, // Use Google ID as primary ID
        email: profile.emails?.[0]?.value || null,
        firstName: profile.name?.givenName || null,
        lastName: profile.name?.familyName || null,
        profileImageUrl: profile.photos?.[0]?.value || null,
        googleId: profile.id
      };

      console.log('Upserting user with data:', JSON.stringify(userData, null, 2));
      
      try {
        const user = await storage.upsertUser(userData);
        console.log('Upserted user:', user);
        
        if (!user || !user.id) {
          console.error('Failed to create/update user');
          return done(new Error('Failed to create/update user'));
        }

        return done(null, user);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return done(dbError as Error);
      }
    } catch (err) {
      console.error('Google auth error:', err);
      return done(err as Error);
    }
  }));

  // Local auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "Email already registered" });
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.upsertUser({
        id: email,
        email,
        passwordHash,
        firstName,
        lastName,
      });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        res.json({ user });
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });

  app.get("/api/auth/logout", (req, res) => {
    req.logout(() => {
      req.session?.destroy(() => {
        res.redirect("/");
      });
    });
  });

  // Google OAuth endpoints
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  
  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Google auth error:", err);
        return res.redirect("/?error=auth_failed");
      }
      if (!user) {
        console.error("No user from Google:", info);
        return res.redirect("/?error=no_user");
      }
      
      // Ensure user has the required fields
      if (!user.id) {
        console.error("User object missing ID:", user);
        return res.redirect("/?error=invalid_user");
      }
      
      const minimalUser = {
        id: user.id,
        email: user.email || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        googleId: user.googleId || null
      };
      
      console.log("Production auth - Attempting to log in user:", minimalUser.id);
      
      req.logIn(minimalUser, (loginErr: any) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.redirect("/?error=login_failed");
        }
        
        // Verify the session was created
        if (!req.session) {
          console.error("No session after login");
          return res.redirect("/?error=no_session");
        }
        
        console.log("Production auth - Successfully logged in user:", minimalUser.id);
        console.log("Session ID:", req.sessionID);
        
        // Force session save before redirect
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.redirect("/?error=session_save_failed");
          }
          return res.redirect("/?auth=success");
        });
      });
    })(req, res, next);
  });
}
