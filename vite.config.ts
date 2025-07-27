import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/**
 * ShadowNews Vite Configuration
 * 
 * This configuration file sets up Vite for the ShadowNews React frontend build.
 * It handles both development and production builds with the following features:
 * 
 * 1. React support with Fast Refresh for development
 * 2. Path aliases for clean imports
 * 3. Development-specific plugins for debugging
 * 4. Build output configuration for Express integration
 */

export default defineConfig({
  plugins: [
    // React plugin with Fast Refresh for instant updates during development
    react(),
    
    // Runtime error overlay for better debugging experience
    runtimeErrorOverlay(),
    
    // Conditional development plugins (only in Replit environment)
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          // Cartographer plugin for code exploration in Replit
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  
  resolve: {
    alias: {
      // Path aliases for cleaner imports throughout the application
      "@": path.resolve(import.meta.dirname, "client", "src"),        // Client source code
      "@shared": path.resolve(import.meta.dirname, "shared"),          // Shared types/schemas
      "@assets": path.resolve(import.meta.dirname, "attached_assets"), // Static assets
    },
  },
  
  // Set client directory as root for Vite operations
  root: path.resolve(import.meta.dirname, "client"),
  
  build: {
    // Build output directory that Express can serve in production
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true, // Clean the output directory before each build
  },
});
