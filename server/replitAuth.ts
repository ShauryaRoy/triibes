
import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { sendFirstLoginEmail } from "./mail";
import pg from 'pg';
const { Pool } = pg;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  let sessionStore: any;
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    
    // Create a dedicated pool for sessions using standard pg
    const sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Dedicated pool for sessions
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    sessionPool.on('error', (err) => {
      console.error('Unexpected error on session pool', err);
    });

    sessionStore = new pgStore({
      pool: sessionPool,
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
    name: 'triibes.sid',
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
      // console.log('Deserializing user ID:', id);  // Disabled - causes massive slowdown
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
      // console.log('Deserialized user:', minimalUser.id);  // Disabled - causes massive slowdown
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
          // Check if user exists BEFORE upsert so we can detect truly new users
          const existingUser = await storage.getUser(profile.id);
          const isNewUser = !existingUser;
          console.log(`[auth] Google callback for profile ${profile.id}, existingUser=${!!existingUser}, isNewUser=${isNewUser}`);

          const user = await storage.upsertUser(userData);
          if (!user || !user.id) {
            console.error('[auth] Failed to create/update user');
            return done(new Error('Failed to create/update user'));
          }

          // Send welcome email only for brand-new users
          if (isNewUser && user.email) {
            console.log(`[auth] ✉️ New user detected: ${user.id} — sending welcome email to ${user.email}`);
            const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
            sendFirstLoginEmail({ userEmail: user.email, userName }).catch(
              (err: any) => console.error('[mail] ❌ Welcome email failed:', err)
            );
          } else if (!isNewUser) {
            console.log(`[auth] Returning user: ${user.id} — welcome email already sent previously`);
          } else {
            console.log(`[auth] New user ${user.id} but no email available — skipping welcome email`);
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

  app.get("/api/auth/logout", (req, res) => {
    req.logout(() => {
      req.session?.destroy(() => {
        res.redirect("/");
      });
    });
  });

  if (hasGoogleEnv) {
    /**
     * Validates if a redirect URL is safe for internal use.
     * Only allows relative paths starting with / and prevents external URLs.
     */
    function isValidRedirectPath(url: string | undefined): boolean {
      if (!url || typeof url !== 'string') return false;
      
      // Must start with /
      if (!url.startsWith('/')) return false;
      
      // Prevent protocol-based URLs (http://, https://, //)
      if (url.includes('://') || url.startsWith('//')) return false;
      
      // Prevent backslash escapes
      if (url.includes('\\')) return false;
      
      // Must be a valid path (no suspicious characters)
      // Allow: alphanumeric, /, -, _, ., ?, &, =, :
      if (!/^[a-zA-Z0-9\-_./?&=:#]+$/.test(url)) return false;
      
      return true;
    }

    app.get("/api/auth/google", (req, res, next) => {
      // Store redirect URL in session only if it's a valid internal path
      const redirectUrl = req.query.redirect as string;
      if (redirectUrl && req.session && isValidRedirectPath(redirectUrl)) {
        req.session.redirectAfterLogin = redirectUrl;
      } else if (redirectUrl) {
          console.warn('[auth] Ignoring invalid redirect URL:', redirectUrl);}
      passport.authenticate("google", {
        scope: ["profile", "email"],
        // Always show Google account chooser (even if only one account is signed in)
        prompt: "select_account",
      })(req, res, next);
    });

    app.get("/api/auth/google/callback", (req, res, next) => {
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err) {
          return res.redirect("/?error=auth_failed");
        }
        if (!user) {
          return res.redirect("/?error=no_user");
        }
        if (!user.id) {
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
            return res.redirect("/?error=login_failed");
          }
          if (!req.session) {
            return res.redirect("/?error=no_session");
          }
          req.session.save((saveErr) => {
            if (saveErr) {
              return res.redirect("/?error=session_save_failed");
            }
            
            // Check if there's a stored redirect URL
            const storedRedirectUrl = req.session!.redirectAfterLogin;
            let finalRedirect = "/?oauth=success";
            
            if (storedRedirectUrl && isValidRedirectPath(storedRedirectUrl)) {
              finalRedirect = storedRedirectUrl + (storedRedirectUrl.includes('?') ? '&' : '?') + "oauth=success";
            } else if (storedRedirectUrl) {
            }
            
            // Always clean up the session value after use
            delete req.session!.redirectAfterLogin;
            req.session!.save((cleanupErr) => {
              if (cleanupErr) {
                // Don't fail the redirect over cleanup error
              }
              return res.redirect(finalRedirect);
            });
          });
        });
      })(req, res, next);
    });
  }
}
