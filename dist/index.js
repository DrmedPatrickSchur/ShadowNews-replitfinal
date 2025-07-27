// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  // Data stores using Maps for O(1) lookups by ID
  users;
  stories;
  comments;
  votes;
  // ID counters to simulate auto-incrementing primary keys
  userIdCounter;
  storyIdCounter;
  commentIdCounter;
  voteIdCounter;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.stories = /* @__PURE__ */ new Map();
    this.comments = /* @__PURE__ */ new Map();
    this.votes = /* @__PURE__ */ new Map();
    this.userIdCounter = 1;
    this.storyIdCounter = 1;
    this.commentIdCounter = 1;
    this.voteIdCounter = 1;
  }
  /**
   * ============================================================================
   * USER METHODS
   * ============================================================================
   */
  /**
   * Retrieve a user by their unique ID
   * 
   * @param id - User ID to lookup
   * @returns User object or undefined if not found
   */
  async getUser(id) {
    return this.users.get(id);
  }
  /**
   * Find a user by their username (used for login)
   * 
   * @param username - Username to search for
   * @returns User object or undefined if not found
   */
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  /**
   * Create a new user account
   * 
   * @param insertUser - User data to insert (without ID, karma, createdAt)
   * @returns Complete user object with generated ID and defaults
   */
  async createUser(insertUser) {
    const id = this.userIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const user = {
      ...insertUser,
      id,
      karma: 0,
      // All users start with 0 karma
      createdAt,
      // Handle optional fields with proper null values
      email: insertUser.email || null,
      about: insertUser.about || null
    };
    this.users.set(id, user);
    return user;
  }
  /**
   * Update a user's karma score
   * 
   * @param userId - ID of user to update
   * @param karma - New karma value
   * @returns Updated user object or undefined if user not found
   */
  async updateUserKarma(userId, karma) {
    const user = await this.getUser(userId);
    if (!user) return void 0;
    const updatedUser = { ...user, karma };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  /**
   * ============================================================================
   * STORY METHODS
   * ============================================================================
   */
  /**
   * Retrieve stories with pagination, filtering, and sorting
   * 
   * @param page - Page number (1-based)
   * @param limit - Number of stories per page
   * @param type - Filter by story type ('story', 'ask', 'show', 'job')
   * @param sortBy - Sort order ('newest', 'top', 'comments')
   * @returns Array of stories matching criteria
   */
  async getStories(page = 1, limit = 30, type, sortBy = "newest") {
    let filteredStories = Array.from(this.stories.values());
    if (type) {
      filteredStories = filteredStories.filter((story) => story.type === type);
    }
    if (sortBy === "newest") {
      filteredStories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sortBy === "top") {
      filteredStories.sort((a, b) => b.points - a.points);
    } else if (sortBy === "comments") {
      filteredStories.sort((a, b) => b.commentCount - a.commentCount);
    }
    const offset = (page - 1) * limit;
    return filteredStories.slice(offset, offset + limit);
  }
  /**
   * Get featured stories for homepage display
   * 
   * Returns the highest-scoring stories to feature prominently.
   * 
   * @param limit - Maximum number of featured stories to return
   * @returns Array of top-scoring stories
   */
  async getFeaturedStories(limit = 2) {
    const allStories = Array.from(this.stories.values());
    return [...allStories].sort((a, b) => b.points - a.points).slice(0, limit);
  }
  /**
   * Retrieve a specific story by ID
   * 
   * @param id - Story ID to lookup
   * @returns Story object or undefined if not found
   */
  async getStory(id) {
    return this.stories.get(id);
  }
  /**
   * Create a new story
   * 
   * @param insertStory - Story data to insert (without ID, points, createdAt, commentCount)
   * @returns Complete story object with generated ID and defaults
   */
  async createStory(insertStory) {
    const id = this.storyIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const story = {
      ...insertStory,
      id,
      points: 0,
      // All stories start with 0 points
      createdAt,
      commentCount: 0,
      // No comments initially
      type: insertStory.type || "story",
      // Default to 'story' type
      // Handle optional fields with proper null values
      text: insertStory.text || null,
      url: insertStory.url || null
    };
    this.stories.set(id, story);
    return story;
  }
  /**
   * Update a story's point score
   * 
   * @param storyId - ID of story to update
   * @param points - New points value
   * @returns Updated story object or undefined if story not found
   */
  async updateStoryPoints(storyId, points) {
    const story = await this.getStory(storyId);
    if (!story) return void 0;
    const updatedStory = { ...story, points };
    this.stories.set(storyId, updatedStory);
    return updatedStory;
  }
  /**
   * Get all stories submitted by a specific user
   * 
   * @param userId - ID of user whose stories to retrieve
   * @returns Array of stories by the user
   */
  async getStoriesByUser(userId) {
    return Array.from(this.stories.values()).filter(
      (story) => story.userId === userId
    );
  }
  /**
   * Get total count of stories (with optional type filter)
   * 
   * @param type - Optional story type to filter by
   * @returns Total number of stories matching criteria
   */
  async getStoryCount(type) {
    if (type) {
      return Array.from(this.stories.values()).filter(
        (story) => story.type === type
      ).length;
    }
    return this.stories.size;
  }
  /**
   * ============================================================================
   * COMMENT METHODS
   * ============================================================================
   */
  /**
   * Get all comments for a specific story
   * 
   * @param storyId - ID of story whose comments to retrieve
   * @returns Array of comments for the story
   */
  async getComments(storyId) {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.storyId === storyId
    );
  }
  /**
   * Retrieve a specific comment by ID
   * 
   * @param id - Comment ID to lookup
   * @returns Comment object or undefined if not found
   */
  async getComment(id) {
    return this.comments.get(id);
  }
  /**
   * Create a new comment
   * 
   * Automatically updates the parent story's comment count.
   * 
   * @param insertComment - Comment data to insert (without ID, points, createdAt)
   * @returns Complete comment object with generated ID and defaults
   */
  async createComment(insertComment) {
    const id = this.commentIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const comment = {
      ...insertComment,
      id,
      points: 0,
      // All comments start with 0 points
      createdAt,
      parentId: insertComment.parentId || null
      // null for top-level comments
    };
    this.comments.set(id, comment);
    const story = await this.getStory(insertComment.storyId);
    if (story) {
      await this.updateStoryCommentCount(story.id, story.commentCount + 1);
    }
    return comment;
  }
  /**
   * Update a comment's point score
   * 
   * @param commentId - ID of comment to update
   * @param points - New points value
   * @returns Updated comment object or undefined if comment not found
   */
  async updateCommentPoints(commentId, points) {
    const comment = await this.getComment(commentId);
    if (!comment) return void 0;
    const updatedComment = { ...comment, points };
    this.comments.set(commentId, updatedComment);
    return updatedComment;
  }
  /**
   * Get all comments made by a specific user
   * 
   * @param userId - ID of user whose comments to retrieve
   * @returns Array of comments by the user
   */
  async getCommentsByUser(userId) {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.userId === userId
    );
  }
  /**
   * Get total count of comments for a specific story
   * 
   * @param storyId - ID of story to count comments for
   * @returns Total number of comments on the story
   */
  async getCommentCount(storyId) {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.storyId === storyId
    ).length;
  }
  /**
   * Private helper to update a story's comment count
   * 
   * @param storyId - ID of story to update
   * @param count - New comment count
   * @returns Updated story object or undefined if story not found
   */
  async updateStoryCommentCount(storyId, count) {
    const story = await this.getStory(storyId);
    if (!story) return void 0;
    const updatedStory = { ...story, commentCount: count };
    this.stories.set(storyId, updatedStory);
    return updatedStory;
  }
  /**
   * ============================================================================
   * VOTE METHODS
   * ============================================================================
   */
  /**
   * Find an existing vote by user and target (story or comment)
   * 
   * Used to prevent duplicate voting and for vote removal.
   * 
   * @param userId - ID of user who cast the vote
   * @param storyId - ID of story voted on (optional)
   * @param commentId - ID of comment voted on (optional)
   * @returns Vote object or undefined if not found
   */
  async getVote(userId, storyId, commentId) {
    return Array.from(this.votes.values()).find(
      (vote) => vote.userId === userId && (storyId !== void 0 ? vote.storyId === storyId : true) && (commentId !== void 0 ? vote.commentId === commentId : true)
    );
  }
  /**
   * Create a new vote (upvote)
   * 
   * Automatically updates related scores:
   * - Increments target's point count (story or comment)
   * - Increases target author's karma (if voting on others' content)
   * 
   * @param insertVote - Vote data to insert (without ID, createdAt)
   * @returns Complete vote object with generated ID
   */
  async createVote(insertVote) {
    const id = this.voteIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const vote = {
      ...insertVote,
      id,
      createdAt,
      // Ensure proper null values for unused target IDs
      storyId: insertVote.storyId || null,
      commentId: insertVote.commentId || null
    };
    this.votes.set(id, vote);
    if (insertVote.storyId) {
      const story = await this.getStory(insertVote.storyId);
      if (story) {
        await this.updateStoryPoints(story.id, story.points + 1);
        const author = await this.getUser(story.userId);
        if (author && author.id !== insertVote.userId) {
          await this.updateUserKarma(author.id, author.karma + 1);
        }
      }
    }
    if (insertVote.commentId) {
      const comment = await this.getComment(insertVote.commentId);
      if (comment) {
        await this.updateCommentPoints(comment.id, comment.points + 1);
        const author = await this.getUser(comment.userId);
        if (author && author.id !== insertVote.userId) {
          await this.updateUserKarma(author.id, author.karma + 1);
        }
      }
    }
    return vote;
  }
  /**
   * Remove a vote (unvote)
   * 
   * Reverses the effects of voting:
   * - Decrements target's point count (with floor of 0)
   * - Decreases target author's karma (with floor of 0)
   * 
   * @param userId - ID of user removing their vote
   * @param storyId - ID of story to unvote (optional)
   * @param commentId - ID of comment to unvote (optional)
   */
  async removeVote(userId, storyId, commentId) {
    const vote = await this.getVote(userId, storyId, commentId);
    if (!vote) return;
    this.votes.delete(vote.id);
    if (vote.storyId) {
      const story = await this.getStory(vote.storyId);
      if (story) {
        await this.updateStoryPoints(story.id, Math.max(0, story.points - 1));
        const author = await this.getUser(story.userId);
        if (author && author.id !== userId) {
          await this.updateUserKarma(author.id, Math.max(0, author.karma - 1));
        }
      }
    }
    if (vote.commentId) {
      const comment = await this.getComment(vote.commentId);
      if (comment) {
        await this.updateCommentPoints(comment.id, Math.max(0, comment.points - 1));
        const author = await this.getUser(comment.userId);
        if (author && author.id !== userId) {
          await this.updateUserKarma(author.id, Math.max(0, author.karma - 1));
        }
      }
    }
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  // Unique username for login
  password: text("password").notNull(),
  // Hashed password (never store plaintext)
  email: text("email").unique(),
  // Optional email (must be unique if provided)
  karma: integer("karma").default(0).notNull(),
  // Points earned from community votes
  about: text("about"),
  // Optional profile description
  createdAt: timestamp("created_at").defaultNow().notNull()
  // Account creation timestamp
});
var stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  // Story headline/title
  url: text("url"),
  // Optional external link (for URL submissions)
  text: text("text"),
  // Optional text content (for text posts)
  points: integer("points").default(0).notNull(),
  // Vote score
  userId: integer("user_id").notNull().references(() => users.id),
  // Author reference
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Submission timestamp
  type: text("type").default("story").notNull(),
  // Content type classification
  commentCount: integer("comment_count").default(0).notNull()
  // Cached comment count
});
var comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  // Comment content
  userId: integer("user_id").notNull().references(() => users.id),
  // Author reference
  storyId: integer("story_id").notNull().references(() => stories.id),
  // Parent story
  parentId: integer("parent_id").references(() => comments.id),
  // Parent comment (null for top-level)
  points: integer("points").default(0).notNull(),
  // Vote score
  createdAt: timestamp("created_at").defaultNow().notNull()
  // Comment timestamp
});
var votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // Voter reference
  storyId: integer("story_id").references(() => stories.id),
  // Target story (optional)
  commentId: integer("comment_id").references(() => comments.id),
  // Target comment (optional)
  createdAt: timestamp("created_at").defaultNow().notNull()
  // Vote timestamp
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  karma: true,
  createdAt: true
});
var insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  points: true,
  createdAt: true,
  commentCount: true
});
var insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  points: true,
  createdAt: true
});
var insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true
});
var loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});
var registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(8, "Password must be at least 8 characters")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
  // Error will be attached to confirmPassword field
});

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
async function registerRoutes(app2) {
  const SessionStore = MemoryStore(session);
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "shadow-news-secret",
      resave: false,
      // Don't save session if unmodified
      saveUninitialized: false,
      // Don't create session until something stored
      cookie: {
        secure: process.env.NODE_ENV === "production",
        // HTTPS only in production
        maxAge: 864e5
        // 24 hours in milliseconds
      },
      store: new SessionStore({
        checkPeriod: 864e5
        // Clean up expired sessions every 24 hours
      })
    })
  );
  const handleError = (res, error) => {
    console.error("API Error:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Unknown error occurred" });
  };
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        username: userData.username,
        password: hashedPassword,
        email: userData.email
      });
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(credentials.username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const passwordMatch = await bcrypt.compare(credentials.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {
        });
        return res.status(401).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      const stories2 = await storage.getStoriesByUser(userId);
      const comments2 = await storage.getCommentsByUser(userId);
      res.json({
        user: userWithoutPassword,
        stories: stories2,
        comments: comments2
      });
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.get("/api/stories", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 30;
      const type = req.query.type;
      const sortBy = req.query.sortBy || "newest";
      const stories2 = await storage.getStories(page, limit, type, sortBy);
      const totalStories = await storage.getStoryCount(type);
      const totalPages = Math.ceil(totalStories / limit);
      res.json({
        stories: stories2,
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
  app2.get("/api/stories/featured", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 2;
      const stories2 = await storage.getFeaturedStories(limit);
      res.json(stories2);
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.get("/api/stories/:id", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      const comments2 = await storage.getComments(storyId);
      const author = await storage.getUser(story.userId);
      let authorName = "unknown";
      if (author) {
        authorName = author.username;
      }
      res.json({
        story,
        comments: comments2,
        author: authorName
      });
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.post("/api/stories", requireAuth, async (req, res) => {
    try {
      const storyData = insertStorySchema.parse(req.body);
      storyData.userId = req.session.userId;
      if (!storyData.url && !storyData.text) {
        return res.status(400).json({ error: "Either URL or text must be provided" });
      }
      const story = await storage.createStory(storyData);
      res.status(201).json(story);
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.get("/api/stories/:storyId/comments", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const comments2 = await storage.getComments(storyId);
      res.json(comments2);
    } catch (error) {
      handleError(res, error);
    }
  });
  app2.post("/api/comments", requireAuth, async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      commentData.userId = req.session.userId;
      const story = await storage.getStory(commentData.storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
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
  app2.post("/api/vote", requireAuth, async (req, res) => {
    try {
      const voteData = insertVoteSchema.parse(req.body);
      voteData.userId = req.session.userId;
      if (!voteData.storyId && !voteData.commentId) {
        return res.status(400).json({ error: "Either storyId or commentId must be provided" });
      }
      const existingVote = await storage.getVote(
        voteData.userId,
        voteData.storyId || void 0,
        voteData.commentId || void 0
      );
      if (existingVote) {
        return res.status(400).json({ error: "Already voted" });
      }
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
  app2.delete("/api/vote", requireAuth, async (req, res) => {
    try {
      const { storyId, commentId } = req.body;
      if (!storyId && !commentId) {
        return res.status(400).json({ error: "Either storyId or commentId must be provided" });
      }
      await storage.removeVote(req.session.userId, storyId || void 0, commentId || void 0);
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    // React plugin with Fast Refresh for instant updates during development
    react(),
    // Runtime error overlay for better debugging experience
    runtimeErrorOverlay(),
    // Conditional development plugins (only in Replit environment)
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      // Cartographer plugin for code exploration in Replit
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      // Path aliases for cleaner imports throughout the application
      "@": path.resolve(import.meta.dirname, "client", "src"),
      // Client source code
      "@shared": path.resolve(import.meta.dirname, "shared"),
      // Shared types/schemas
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
      // Static assets
    }
  },
  // Set client directory as root for Vite operations
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    // Build output directory that Express can serve in production
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
    // Clean the output directory before each build
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    // Let Express handle routing
    hmr: { server },
    // Use existing HTTP server for WebSocket HMR support
    allowedHosts: ["localhost", "127.0.0.1"]
    // Allow specific hosts for development
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    // Use programmatic config instead of file
    customLogger: {
      ...viteLogger,
      // Exit on critical errors to prevent corrupted state
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
    // We handle routing manually
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    // Listen on all network interfaces
    reusePort: true
    // Allow multiple processes to bind to the same port
  }, () => {
    log(`serving on port ${port}`);
  });
})();
