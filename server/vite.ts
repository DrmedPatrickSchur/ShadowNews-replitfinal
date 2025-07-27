import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

/**
 * ShadowNews Development and Production Server Setup
 * 
 * This file handles the integration between the Express API server and
 * the React frontend in both development and production environments.
 * 
 * Development mode: Uses Vite's dev server with HMR for fast development
 * Production mode: Serves pre-built static files from the dist directory
 */

const viteLogger = createLogger();

/**
 * Unified Logging Function
 * 
 * Provides consistent timestamped logging across the application.
 * Used by both Express and Vite to maintain a unified log format.
 * 
 * @param message - Log message to display
 * @param source - Source of the log (default: "express")
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Development Server Setup with Vite
 * 
 * Configures Vite dev server to work with Express in middleware mode.
 * This setup enables:
 * - Hot Module Replacement (HMR) for instant updates
 * - TypeScript compilation on-the-fly
 * - CSS hot reloading
 * - React Fast Refresh
 * 
 * The catch-all route ensures that client-side routing works properly
 * by serving the React app's index.html for all non-API requests.
 * 
 * @param app - Express application instance
 * @param server - HTTP server instance for WebSocket HMR support
 */
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true, // Let Express handle routing
    hmr: { server }, // Use existing HTTP server for WebSocket HMR support
    allowedHosts: ["localhost", "127.0.0.1"], // Allow specific hosts for development
  };

  // Create Vite dev server with custom configuration
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false, // Use programmatic config instead of file
    customLogger: {
      ...viteLogger,
      // Exit on critical errors to prevent corrupted state
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom", // We handle routing manually
  });

  // Add Vite middleware to Express app
  app.use(vite.middlewares);
  
  /**
   * Catch-all route for client-side routing
   * 
   * Serves the React app's index.html for any non-API request.
   * This enables client-side routing to work properly - when users
   * navigate to /story/123, the server serves index.html and React
   * Router handles the actual routing on the client.
   */
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // Always reload index.html from disk for latest changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Add cache busting to prevent stale module loading
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      // Transform the HTML through Vite for HMR and module resolution
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      // Fix stack traces to point to original source files
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Production Static File Serving
 * 
 * Serves pre-built static files in production mode. The client must be
 * built beforehand using `npm run build`.
 * 
 * Features:
 * - Serves static files from the dist/public directory
 * - Falls back to index.html for client-side routing
 * - Validates that build directory exists
 * 
 * @param app - Express application instance
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  // Ensure the build directory exists
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files (JS, CSS, images, etc.)
  app.use(express.static(distPath));

  /**
   * Client-side routing fallback
   * 
   * Any request that doesn't match a static file gets the index.html.
   * This allows React Router to handle routing on the client side.
   */
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
