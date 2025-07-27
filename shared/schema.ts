import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * ShadowNews Database Schema
 * 
 * This file defines the complete database schema for the ShadowNews application
 * using Drizzle ORM. It includes table definitions, relationships, validation
 * schemas, and TypeScript types.
 * 
 * The schema follows Hacker News conventions with the following entities:
 * - Users: Account information and karma scores
 * - Stories: Submitted content (URLs or text posts)
 * - Comments: Threaded discussions on stories
 * - Votes: Upvoting system for stories and comments
 */

/**
 * Users Table
 * 
 * Stores user account information including authentication credentials
 * and profile data. Each user accumulates karma based on community voting.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // Unique username for login
  password: text("password").notNull(), // Hashed password (never store plaintext)
  email: text("email").unique(), // Optional email (must be unique if provided)
  karma: integer("karma").default(0).notNull(), // Points earned from community votes
  about: text("about"), // Optional profile description
  createdAt: timestamp("created_at").defaultNow().notNull(), // Account creation timestamp
});

/**
 * Stories Table
 * 
 * Stores submitted content including both URL links and text posts.
 * Stories can be different types (stories, asks, shows, jobs) and accumulate
 * points through voting and discussion metrics.
 */
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Story headline/title
  url: text("url"), // Optional external link (for URL submissions)
  text: text("text"), // Optional text content (for text posts)
  points: integer("points").default(0).notNull(), // Vote score
  userId: integer("user_id").notNull().references(() => users.id), // Author reference
  createdAt: timestamp("created_at").defaultNow().notNull(), // Submission timestamp
  type: text("type").default("story").notNull(), // Content type classification
  commentCount: integer("comment_count").default(0).notNull(), // Cached comment count
});

/**
 * Comments Table
 * 
 * Stores threaded comments on stories. Comments can reply to stories
 * (parentId = null) or to other comments (parentId = comment.id) to
 * create nested discussion threads.
 */
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(), // Comment content
  userId: integer("user_id").notNull().references(() => users.id), // Author reference
  storyId: integer("story_id").notNull().references(() => stories.id), // Parent story
  parentId: integer("parent_id").references((): any => comments.id), // Parent comment (null for top-level)
  points: integer("points").default(0).notNull(), // Vote score
  createdAt: timestamp("created_at").defaultNow().notNull(), // Comment timestamp
});

/**
 * Votes Table
 * 
 * Tracks user voting behavior on stories and comments. Each user can
 * vote once per item. Votes are always upvotes (no downvoting in this system).
 */
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Voter reference
  storyId: integer("story_id").references(() => stories.id), // Target story (optional)
  commentId: integer("comment_id").references(() => comments.id), // Target comment (optional)
  createdAt: timestamp("created_at").defaultNow().notNull(), // Vote timestamp
});

/**
 * ============================================================================
 * VALIDATION SCHEMAS
 * ============================================================================
 * 
 * These schemas are automatically generated from the table definitions and
 * used for validating API request data. They exclude auto-generated fields
 * like IDs, timestamps, and computed values.
 */

/**
 * User insertion schema
 * Excludes: id (auto-generated), karma (starts at 0), createdAt (auto-set)
 */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  karma: true,
  createdAt: true,
});

/**
 * Story insertion schema
 * Excludes: id (auto-generated), points (starts at 0), createdAt (auto-set), commentCount (starts at 0)
 */
export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  points: true,
  createdAt: true,
  commentCount: true,
});

/**
 * Comment insertion schema
 * Excludes: id (auto-generated), points (starts at 0), createdAt (auto-set)
 */
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  points: true,
  createdAt: true,
});

/**
 * Vote insertion schema
 * Excludes: id (auto-generated), createdAt (auto-set)
 */
export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

/**
 * ============================================================================
 * TYPESCRIPT TYPES
 * ============================================================================
 * 
 * Type definitions inferred from the database schema for use throughout
 * the application. These ensure type safety between frontend and backend.
 */

// Complete entity types (as stored in database)
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

/**
 * ============================================================================
 * AUTHENTICATION SCHEMAS
 * ============================================================================
 * 
 * Specialized validation schemas for authentication endpoints with
 * additional business logic validation.
 */

/**
 * Login credentials schema
 * Simple username/password validation for authentication
 */
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * User registration schema
 * Extends the base user schema with password confirmation validation
 */
export const registerSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Error will be attached to confirmPassword field
  });

// Authentication-specific types
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
