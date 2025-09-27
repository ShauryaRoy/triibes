
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
  let sessionStore: any;
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
      pruneSessionInterval: false,
      errorLog: console.error,
    });
    sessionStore.on('error', function(error: any) {
      console.error('Session store error:', error);
    });
  } else {
    console.warn('[session] DATABASE_URL not set; using MemoryStore (NOT for production)');
    sessionStore = new session.MemoryStore();
  }

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
  // Setup Google OAuth strategy (graceful if env missing)
  const hasGoogleEnv = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);
  if (!hasGoogleEnv) {
    console.warn('[auth] Google OAuth disabled: missing GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL');
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

  if (hasGoogleEnv) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      proxy: true // Important for Render deployment
    }, async (_accessToken, _refreshToken, profile, done) => {
      try {
        if (!profile.id) {
          console.error('[auth] No profile ID from Google');
          return done(new Error('No profile ID from Google'));
        }

        const userData = {
          id: profile.id,
          email: profile.emails?.[0]?.value || null,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
          googleId: profile.id
        };

        try {
          const user = await storage.upsertUser(userData);
          if (!user || !user.id) {
            console.error('[auth] Failed to create/update user');
            return done(new Error('Failed to create/update user'));
          }
          return done(null, user);
        } catch (dbError) {
          console.error('[auth] Database error:', dbError);
          return done(dbError as Error);
        }
      } catch (err) {
        console.error('[auth] Google auth error:', err);
        return done(err as Error);
      }
    }));
  }

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

  if (hasGoogleEnv) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get("/api/auth/google/callback", (req, res, next) => {
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err) {
          console.error("[auth] Google auth error:", err);
          return res.redirect("/?error=auth_failed");
        }
        if (!user) {
          console.error("[auth] No user from Google:", info);
          return res.redirect("/?error=no_user");
        }
        if (!user.id) {
          console.error("[auth] User object missing ID:", user);
          return res.redirect("/?error=invalid_user");
        }
        const minimalUser = {
          id: user.id,
          email: user.email || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          googleId: user.googleId || null
        };
        req.logIn(minimalUser, (loginErr: any) => {
          if (loginErr) {
            console.error("[auth] Login error:", loginErr);
            return res.redirect("/?error=login_failed");
          }
          if (!req.session) {
            console.error("[auth] No session after login");
            return res.redirect("/?error=no_session");
          }
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error("[auth] Session save error:", saveErr);
                return res.redirect("/?error=session_save_failed");
              }
              return res.redirect("/?auth=success");
            });
        });
      })(req, res, next);
    });
  }
}
