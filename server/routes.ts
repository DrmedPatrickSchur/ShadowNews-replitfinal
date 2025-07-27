import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertStorySchema, 
  insertCommentSchema, 
  insertVoteSchema,
  loginSchema,
  registerSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";

/**
 * ShadowNews API Routes
 * 
 * This file defines all the API endpoints for the ShadowNews application.
 * The API provides a complete RESTful interface for:
 * 
 * - User authentication (register, login, logout)
 * - User management and profiles
 * - Story submission and retrieval
 * - Comment system with threading
 * - Voting system for stories and comments
 * 
 * All routes use Zod schemas for request validation and provide
 * comprehensive error handling with appropriate HTTP status codes.
 */

// Extend the Express session interface to include our custom userId field
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

/**
 * Register All API Routes
 * 
 * Sets up the complete API for the ShadowNews application including:
 * - Session management
 * - Authentication endpoints
 * - Content management (stories, comments)
 * - User interactions (voting)
 * 
 * @param app - Express application instance
 * @returns HTTP server instance for WebSocket support
 */
export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * Session Configuration
   * 
   * Uses in-memory session store for simplicity. In production, this should
   * be replaced with Redis or another persistent store for scalability.
   * 
   * Session settings:
   * - 24-hour expiration
   * - Secure cookies in production
   * - No session creation for unauthenticated requests
   */
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "shadow-news-secret",
      resave: false, // Don't save session if unmodified
      saveUninitialized: false, // Don't create session until something stored
      cookie: { 
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        maxAge: 86400000 // 24 hours in milliseconds
      },
      store: new SessionStore({
        checkPeriod: 86400000, // Clean up expired sessions every 24 hours
      }),
    })
  );
  
  /**
   * Centralized Error Handler
   * 
   * Standardizes error responses across all routes:
   * - Zod validation errors → 400 with detailed message
   * - Known errors → 500 with error message
   * - Unknown errors → 500 with generic message
   * 
   * @param res - Express response object
   * @param error - Error to handle
   */
  const handleError = (res: Response, error: unknown) => {
    console.error("API Error:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Unknown error occurred" });
  };

  /**
   * Authentication Middleware
   * 
   * Verifies that the user is logged in by checking for a valid session.
   * Returns 401 Unauthorized if no valid session exists.
   * 
   * @param req - Express request object
   * @param res - Express response object  
   * @param next - Next middleware function
   */
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  /**
   * ============================================================================
   * AUTHENTICATION ROUTES
   * ============================================================================
   * 
   * These routes handle user registration, login, logout, and session management.
   * All passwords are hashed using bcrypt for security.
   */

  /**
   * POST /api/auth/register
   * 
   * Creates a new user account with the following validations:
   * - Username must be unique
   * - Password confirmation must match
   * - Email is optional but must be unique if provided
   * 
   * On success:
   * - Hashes the password with bcrypt
   * - Creates user record in storage
   * - Establishes authenticated session
   * - Returns user data (without password)
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists to prevent duplicates
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Hash password with salt rounds of 10 (recommended for security)
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user record in storage
      const user = await storage.createUser({
        username: userData.username,
        password: hashedPassword,
        email: userData.email
      });
      
      // Establish authenticated session
      req.session.userId = user.id;
      
      // Return user data without sensitive information
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /api/auth/login
   * 
   * Authenticates a user with username and password.
   * 
   * Security features:
   * - Uses constant-time password comparison via bcrypt
   * - Returns generic error message to prevent username enumeration
   * - Establishes session on successful authentication
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      // Find user by username
      const user = await storage.getUserByUsername(credentials.username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Verify password using bcrypt's constant-time comparison
      const passwordMatch = await bcrypt.compare(credentials.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Establish authenticated session
      req.session.userId = user.id;
      
      // Return user data without sensitive information
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /api/auth/logout
   * 
   * Terminates the user's session and clears authentication state.
   * Always returns success, even if no session exists.
   */
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  /**
   * GET /api/auth/me
   * 
   * Returns the current authenticated user's information.
   * Used by frontend to check authentication status and get user data.
   * 
   * - Returns 401 if not authenticated
   * - Cleans up invalid sessions (user deleted)
   * - Returns user data without password
   */
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        // Clean up invalid session (user was deleted)
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }
      
      // Return user data without sensitive information
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * ============================================================================
   * USER ROUTES
   * ============================================================================
   * 
   * Routes for accessing user profiles and their associated content.
   */

  /**
   * GET /api/users/:id
   * 
   * Retrieves a user's public profile information including:
   * - Basic user details (username, karma, about, join date)
   * - All stories submitted by the user
   * - All comments made by the user
   * 
   * This creates a comprehensive user profile page similar to Hacker News.
   */
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user data without sensitive information (password)
      const { password, ...userWithoutPassword } = user;
      
      // Fetch user's content for profile completeness
      const stories = await storage.getStoriesByUser(userId);
      const comments = await storage.getCommentsByUser(userId);
      
      res.json({
        user: userWithoutPassword,
        stories,
        comments
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * ============================================================================
   * STORY ROUTES
   * ============================================================================
   * 
   * Routes for story submission, retrieval, and browsing. Stories are the main
   * content type in ShadowNews and can be either URLs or text posts.
   */

  /**
   * GET /api/stories
   * 
   * Retrieves a paginated list of stories with filtering and sorting options.
   * 
   * Query parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 30)
   * - type: Filter by story type ('story', 'ask', 'show', 'job')
   * - sortBy: Sort order ('newest', 'popular', etc.)
   * 
   * Returns stories with pagination metadata for frontend navigation.
   */
  app.get("/api/stories", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const type = req.query.type as string | undefined;
      const sortBy = req.query.sortBy as string || 'newest';
      
      // Fetch stories with applied filters and pagination
      const stories = await storage.getStories(page, limit, type, sortBy);
      const totalStories = await storage.getStoryCount(type);
      const totalPages = Math.ceil(totalStories / limit);
      
      res.json({
        stories,
        pagination: {
          page,
          limit,
          totalPages,
          totalItems: totalStories
        }
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * GET /api/stories/featured
   * 
   * Retrieves featured stories for the homepage. These are typically
   * high-scoring or editor-picked stories to highlight quality content.
   * 
   * Query parameters:
   * - limit: Number of featured stories to return (default: 2)
   */
  app.get("/api/stories/featured", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 2;
      const stories = await storage.getFeaturedStories(limit);
      res.json(stories);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * GET /api/stories/:id
   * 
   * Retrieves a specific story with its complete details including:
   * - Story content and metadata
   * - All comments (with threading structure)
   * - Author information
   * 
   * This endpoint powers the story detail page where users read and discuss content.
   */
  app.get("/api/stories/:id", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const story = await storage.getStory(storyId);
      
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      
      // Fetch related data for complete story view
      const comments = await storage.getComments(storyId);
      
      // Get author information for attribution
      const author = await storage.getUser(story.userId);
      let authorName = "unknown"; // Fallback for deleted users
      if (author) {
        authorName = author.username;
      }
      
      res.json({
        story,
        comments,
        author: authorName
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /api/stories
   * 
   * Creates a new story submission. Requires authentication.
   * 
   * Stories can be one of two types:
   * - URL stories: Links to external content
   * - Text stories: Self-contained text posts (Ask HN, Show HN, etc.)
   * 
   * At least one of URL or text must be provided.
   */
  app.post("/api/stories", requireAuth, async (req, res) => {
    try {
      const storyData = insertStorySchema.parse(req.body);
      
      // Associate story with authenticated user
      storyData.userId = req.session.userId!;
      
      // Validation: Either URL or text must be provided (but not necessarily both)
      if (!storyData.url && !storyData.text) {
        return res.status(400).json({ error: "Either URL or text must be provided" });
      }
      
      const story = await storage.createStory(storyData);
      res.status(201).json(story);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * ============================================================================
   * COMMENT ROUTES
   * ============================================================================
   * 
   * Routes for the comment system supporting threaded discussions.
   * Comments can be replies to stories or replies to other comments.
   */

  /**
   * GET /api/stories/:storyId/comments
   * 
   * Retrieves all comments for a specific story.
   * Comments are returned with threading information (parentId) but
   * the frontend is responsible for organizing them into a tree structure.
   */
  app.get("/api/stories/:storyId/comments", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const comments = await storage.getComments(storyId);
      res.json(comments);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /api/comments
   * 
   * Creates a new comment. Requires authentication.
   * 
   * Comments can be:
   * - Top-level replies to a story (parentId = null)
   * - Replies to other comments (parentId = comment.id)
   * 
   * Validates that the target story and parent comment (if any) exist.
   */
  app.post("/api/comments", requireAuth, async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      
      // Associate comment with authenticated user
      commentData.userId = req.session.userId!;
      
      // Validate that the target story exists
      const story = await storage.getStory(commentData.storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      
      // If this is a reply to another comment, validate the parent exists
      if (commentData.parentId) {
        const parentComment = await storage.getComment(commentData.parentId);
        if (!parentComment) {
          return res.status(404).json({ error: "Parent comment not found" });
        }
      }
      
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * ============================================================================
   * VOTING ROUTES
   * ============================================================================
   * 
   * Routes for the voting system. Users can upvote stories and comments.
   * Each user can only vote once per item (story or comment).
   */

  /**
   * POST /api/vote
   * 
   * Creates an upvote for a story or comment. Requires authentication.
   * 
   * Vote targets:
   * - Stories: Provide storyId
   * - Comments: Provide commentId
   * 
   * Prevents duplicate voting by checking for existing votes.
   * Validates that the target story/comment exists before creating vote.
   */
  app.post("/api/vote", requireAuth, async (req, res) => {
    try {
      const voteData = insertVoteSchema.parse(req.body);
      
      // Associate vote with authenticated user
      voteData.userId = req.session.userId!;
      
      // Validation: Must specify either story or comment to vote on
      if (!voteData.storyId && !voteData.commentId) {
        return res.status(400).json({ error: "Either storyId or commentId must be provided" });
      }
      
      // Check for duplicate voting (one vote per user per item)
      const existingVote = await storage.getVote(
        voteData.userId, 
        voteData.storyId || undefined, 
        voteData.commentId || undefined
      );
      
      if (existingVote) {
        return res.status(400).json({ error: "Already voted" });
      }
      
      // Validate that the target exists before allowing vote
      if (voteData.storyId) {
        const story = await storage.getStory(voteData.storyId);
        if (!story) {
          return res.status(404).json({ error: "Story not found" });
        }
      } else if (voteData.commentId) {
        const comment = await storage.getComment(voteData.commentId);
        if (!comment) {
          return res.status(404).json({ error: "Comment not found" });
        }
      }
      
      const vote = await storage.createVote(voteData);
      res.status(201).json(vote);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * DELETE /api/vote
   * 
   * Removes a user's vote from a story or comment. Requires authentication.
   * Allows users to "unvote" items they previously voted on.
   * 
   * Request body should contain either storyId or commentId to identify
   * which vote to remove.
   */
  app.delete("/api/vote", requireAuth, async (req, res) => {
    try {
      const { storyId, commentId } = req.body;
      
      // Validation: Must specify which vote to remove
      if (!storyId && !commentId) {
        return res.status(400).json({ error: "Either storyId or commentId must be provided" });
      }
      
      await storage.removeVote(req.session.userId!, storyId || undefined, commentId || undefined);
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * Create and return HTTP server instance
   * 
   * The HTTP server is returned to allow WebSocket upgrades or other
   * server-level configurations in the main application.
   */
  const httpServer = createServer(app);
  return httpServer;
}
