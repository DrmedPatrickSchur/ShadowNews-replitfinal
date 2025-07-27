import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

/**
 * ShadowNews Server Entry Point
 * 
 * This file sets up the main Express.js server for the ShadowNews application.
 * ShadowNews is a Hacker News-like platform where users can:
 * - Submit and vote on stories
 * - Comment on stories and other comments
 * - Browse different types of content (stories, asks, shows, jobs)
 * 
 * The server handles both API routes and serves the React frontend in production.
 */

// Initialize Express application
const app = express();

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Request Logging Middleware
 * 
 * This middleware tracks API request performance and logs detailed information
 * about each API call including:
 * - HTTP method and path
 * - Response status code
 * - Response time in milliseconds
 * - Response body (for debugging)
 * 
 * Only API routes (starting with /api) are logged to reduce noise.
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Intercept the res.json method to capture response data for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log the request details when the response finishes
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log API routes to avoid cluttering logs with static file requests
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Include response body in logs for debugging (truncated if too long)
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncate long log lines to keep logs readable
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Server Initialization and Startup
 * 
 * This IIFE (Immediately Invoked Function Expression) handles the complete server setup:
 * 1. Registers all API routes and middleware
 * 2. Sets up error handling
 * 3. Configures development vs production serving
 * 4. Starts the HTTP server on the designated port
 */
(async () => {
  // Register all API routes and get the HTTP server instance
  const server = await registerRoutes(app);

  /**
   * Global Error Handler
   * 
   * Catches any unhandled errors from route handlers and middleware.
   * Standardizes error responses with appropriate status codes and messages.
   * Also logs the error for debugging purposes.
   */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err; // Re-throw for logging/monitoring systems
  });

  /**
   * Frontend Serving Configuration
   * 
   * In development: Uses Vite dev server for hot module replacement and fast builds
   * In production: Serves pre-built static files from the dist directory
   * 
   * IMPORTANT: Vite setup must come AFTER API routes to prevent the catch-all
   * route from interfering with API endpoints.
   */
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  /**
   * Server Startup
   * 
   * The server ALWAYS runs on port 5000 as it's the only port available
   * in the deployment environment. This single port serves both:
   * - API endpoints (under /api)
   * - Static frontend files
   */
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0", // Listen on all network interfaces
    reusePort: true, // Allow multiple processes to bind to the same port
  }, () => {
    log(`serving on port ${port}`);
  });
})();
