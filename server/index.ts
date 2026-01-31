import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSession, passport } from "./replitAuth";
import { paymentRoutes } from "./payment-routes";
import { startPaymentReconciliationCron } from "./payment-reconciliation-cron";

const app = express();

// Trust proxy for Render (important for sessions and HTTPS)
app.set("trust proxy", 1);

// ✅ Enable gzip compression for all responses
app.use(compression({
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter default
    return compression.filter(req, res);
  }
}));

app.use(express.json());
app.use(setupSession());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Lightweight health endpoint (no dependencies on DB). Placed early so it works even if later init fails.
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV });
});

// Add payment routes BEFORE registerRoutes to ensure proper routing
app.use('/api/payments', paymentRoutes);

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    console.log('[boot] development mode: enabling Vite middleware');
    await setupVite(app, server);
  } else {
    console.log('[boot] production mode: serving pre-built static assets');
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start payment reconciliation cron job
    if (process.env.ENABLE_PAYMENT_RECONCILIATION !== 'false') {
      console.log('🔄 Starting payment reconciliation service...');
      startPaymentReconciliationCron();
    } else {
      console.log('⏭️  Payment reconciliation disabled via env variable');
    }
  });

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received, closing server gracefully...`);
    
    server.close(async () => {
      console.log('HTTP server closed');
      
      // Close database pool
      try {
        const { pool } = await import('./db');
        await pool.end();
        console.log('Database pool closed');
      } catch (err) {
        console.error('Error closing database pool:', err);
      }
      
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
