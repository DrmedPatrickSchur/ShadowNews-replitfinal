import { 
  users, type User, type InsertUser,
  stories, type Story, type InsertStory,
  comments, type Comment, type InsertComment,
  votes, type Vote, type InsertVote
} from "@shared/schema";

/**
 * ShadowNews Storage Layer
 * 
 * This file defines the storage abstraction for the ShadowNews application.
 * It provides a clean interface for data operations that can be implemented
 * with different backends (in-memory, PostgreSQL, etc.).
 * 
 * The current implementation uses in-memory storage for simplicity, but this
 * can easily be swapped out for a database implementation in production.
 */

/**
 * Storage Interface Definition
 * 
 * Defines all CRUD operations needed by the ShadowNews application.
 * This interface allows us to swap storage implementations without
 * changing the rest of the application code.
 * 
 * All methods are async to support future database implementations.
 */
export interface IStorage {
  // User methods - Handle user accounts and profiles
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserKarma(userId: number, karma: number): Promise<User | undefined>;

  // Story methods - Handle story submission, retrieval, and management
  getStories(page: number, limit: number, type?: string, sortBy?: string): Promise<Story[]>;
  getFeaturedStories(limit: number): Promise<Story[]>;
  getStory(id: number): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStoryPoints(storyId: number, points: number): Promise<Story | undefined>;
  getStoriesByUser(userId: number): Promise<Story[]>;
  getStoryCount(type?: string): Promise<number>;

  // Comment methods - Handle threaded comment system
  getComments(storyId: number): Promise<Comment[]>;
  getComment(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateCommentPoints(commentId: number, points: number): Promise<Comment | undefined>;
  getCommentsByUser(userId: number): Promise<Comment[]>;
  getCommentCount(storyId: number): Promise<number>;

  // Vote methods - Handle upvoting system for stories and comments
  getVote(userId: number, storyId?: number, commentId?: number): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  removeVote(userId: number, storyId?: number, commentId?: number): Promise<void>;
}

/**
 * In-Memory Storage Implementation
 * 
 * Provides a complete storage implementation using JavaScript Maps.
 * This is suitable for development and small deployments but should
 * be replaced with a persistent database for production use.
 * 
 * Features:
 * - Auto-incrementing IDs for all entities
 * - Full CRUD operations for all data types
 * - Filtering and sorting capabilities
 * - Referential integrity checks
 */
export class MemStorage implements IStorage {
  // Data stores using Maps for O(1) lookups by ID
  private users: Map<number, User>;
  private stories: Map<number, Story>;
  private comments: Map<number, Comment>;
  private votes: Map<number, Vote>;
  
  // ID counters to simulate auto-incrementing primary keys
  private userIdCounter: number;
  private storyIdCounter: number;
  private commentIdCounter: number;
  private voteIdCounter: number;

  constructor() {
    // Initialize empty data stores
    this.users = new Map();
    this.stories = new Map();
    this.comments = new Map();
    this.votes = new Map();
    
    // Start ID counters at 1 (like most databases)
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
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  /**
   * Find a user by their username (used for login)
   * 
   * @param username - Username to search for
   * @returns User object or undefined if not found
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  /**
   * Create a new user account
   * 
   * @param insertUser - User data to insert (without ID, karma, createdAt)
   * @returns Complete user object with generated ID and defaults
   */
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    
    // Create complete user object with defaults
    const user: User = { 
      ...insertUser, 
      id, 
      karma: 0, // All users start with 0 karma
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
  async updateUserKarma(userId: number, karma: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
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
  async getStories(page: number = 1, limit: number = 30, type?: string, sortBy: string = 'newest'): Promise<Story[]> {
    let filteredStories = Array.from(this.stories.values());
    
    // Apply type filter if specified
    if (type) {
      filteredStories = filteredStories.filter(story => story.type === type);
    }
    
    // Apply sorting based on requested criteria
    if (sortBy === 'newest') {
      // Sort by creation date (newest first)
      filteredStories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sortBy === 'top') {
      // Sort by points (highest first)
      filteredStories.sort((a, b) => b.points - a.points);
    } else if (sortBy === 'comments') {
      // Sort by comment count (most discussed first)
      filteredStories.sort((a, b) => b.commentCount - a.commentCount);
    }
    
    // Apply pagination
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
  async getFeaturedStories(limit: number = 2): Promise<Story[]> {
    const allStories = Array.from(this.stories.values());
    return [...allStories]
      .sort((a, b) => b.points - a.points) // Sort by points descending
      .slice(0, limit);
  }

  /**
   * Retrieve a specific story by ID
   * 
   * @param id - Story ID to lookup
   * @returns Story object or undefined if not found
   */
  async getStory(id: number): Promise<Story | undefined> {
    return this.stories.get(id);
  }

  /**
   * Create a new story
   * 
   * @param insertStory - Story data to insert (without ID, points, createdAt, commentCount)
   * @returns Complete story object with generated ID and defaults
   */
  async createStory(insertStory: InsertStory): Promise<Story> {
    const id = this.storyIdCounter++;
    const createdAt = new Date();
    
    // Create complete story object with defaults
    const story: Story = { 
      ...insertStory, 
      id, 
      points: 0, // All stories start with 0 points
      createdAt,
      commentCount: 0, // No comments initially
      type: insertStory.type || 'story', // Default to 'story' type
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
  async updateStoryPoints(storyId: number, points: number): Promise<Story | undefined> {
    const story = await this.getStory(storyId);
    if (!story) return undefined;
    
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
  async getStoriesByUser(userId: number): Promise<Story[]> {
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
  async getStoryCount(type?: string): Promise<number> {
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
  async getComments(storyId: number): Promise<Comment[]> {
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
  async getComment(id: number): Promise<Comment | undefined> {
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
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const createdAt = new Date();
    
    // Create complete comment object with defaults
    const comment: Comment = { 
      ...insertComment, 
      id, 
      points: 0, // All comments start with 0 points
      createdAt,
      parentId: insertComment.parentId || null // null for top-level comments
    };
    
    this.comments.set(id, comment);

    // Update the story's comment count to keep it accurate
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
  async updateCommentPoints(commentId: number, points: number): Promise<Comment | undefined> {
    const comment = await this.getComment(commentId);
    if (!comment) return undefined;
    
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
  async getCommentsByUser(userId: number): Promise<Comment[]> {
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
  async getCommentCount(storyId: number): Promise<number> {
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
  private async updateStoryCommentCount(storyId: number, count: number): Promise<Story | undefined> {
    const story = await this.getStory(storyId);
    if (!story) return undefined;
    
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
  async getVote(userId: number, storyId?: number, commentId?: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(
      (vote) => vote.userId === userId && 
                (storyId !== undefined ? vote.storyId === storyId : true) &&
                (commentId !== undefined ? vote.commentId === commentId : true)
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
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.voteIdCounter++;
    const createdAt = new Date();
    
    // Create complete vote object
    const vote: Vote = { 
      ...insertVote, 
      id, 
      createdAt,
      // Ensure proper null values for unused target IDs
      storyId: insertVote.storyId || null,
      commentId: insertVote.commentId || null
    };
    
    this.votes.set(id, vote);

    // Update target points and author karma
    if (insertVote.storyId) {
      // Voting on a story
      const story = await this.getStory(insertVote.storyId);
      if (story) {
        // Increment story points
        await this.updateStoryPoints(story.id, story.points + 1);
        
        // Increase story author's karma (but not if voting on own content)
        const author = await this.getUser(story.userId);
        if (author && author.id !== insertVote.userId) {
          await this.updateUserKarma(author.id, author.karma + 1);
        }
      }
    }

    if (insertVote.commentId) {
      // Voting on a comment
      const comment = await this.getComment(insertVote.commentId);
      if (comment) {
        // Increment comment points
        await this.updateCommentPoints(comment.id, comment.points + 1);
        
        // Increase comment author's karma (but not if voting on own content)
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
  async removeVote(userId: number, storyId?: number, commentId?: number): Promise<void> {
    const vote = await this.getVote(userId, storyId, commentId);
    if (!vote) return; // No vote to remove

    this.votes.delete(vote.id);

    // Reverse the point and karma changes from when vote was created
    if (vote.storyId) {
      // Removing vote from a story
      const story = await this.getStory(vote.storyId);
      if (story) {
        // Decrement story points (minimum 0)
        await this.updateStoryPoints(story.id, Math.max(0, story.points - 1));
        
        // Decrease story author's karma (minimum 0, skip if own content)
        const author = await this.getUser(story.userId);
        if (author && author.id !== userId) {
          await this.updateUserKarma(author.id, Math.max(0, author.karma - 1));
        }
      }
    }

    if (vote.commentId) {
      // Removing vote from a comment
      const comment = await this.getComment(vote.commentId);
      if (comment) {
        // Decrement comment points (minimum 0)
        await this.updateCommentPoints(comment.id, Math.max(0, comment.points - 1));
        
        // Decrease comment author's karma (minimum 0, skip if own content)
        const author = await this.getUser(comment.userId);
        if (author && author.id !== userId) {
          await this.updateUserKarma(author.id, Math.max(0, author.karma - 1));
        }
      }
    }
  }
}

/**
 * Global Storage Instance
 * 
 * Singleton instance of the storage layer used throughout the application.
 * In production, this could be replaced with a database-backed implementation.
 */
export const storage = new MemStorage();
