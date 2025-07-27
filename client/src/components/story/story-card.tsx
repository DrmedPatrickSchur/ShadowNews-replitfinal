import { useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ChevronUp } from "lucide-react";
import { Story, User } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/**
 * Story Card Component Props
 */
interface StoryCardProps {
  story: Story;   // Complete story object with metadata
  author: string; // Author username for display
}

/**
 * Individual Story Card Component
 * 
 * Displays a single story in the list format similar to Hacker News.
 * This is the primary way users interact with story content.
 * 
 * Features:
 * - Story title with external link handling
 * - Author attribution and submission timestamp
 * - Points display with upvote functionality
 * - Comment count and navigation
 * - URL hostname extraction for external links
 * - Responsive design for mobile and desktop
 * 
 * Voting system:
 * - Optimistic updates for immediate UI feedback
 * - Authenticated users only
 * - One vote per user per story
 * - Cache invalidation for consistency
 * 
 * @param story - Story object containing all story data
 * @param author - Username of the story submitter
 */
export function StoryCard({ story, author }: StoryCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Local state for optimistic UI updates
  const [pointCount, setPointCount] = useState(story.points);
  const [hasVoted, setHasVoted] = useState(false);
  
  /**
   * Extract hostname from URL for display
   * 
   * Shows users the source domain for external links (e.g., "github.com").
   * Removes "www." prefix for cleaner display.
   * 
   * @param url - Full URL string or null
   * @returns Clean hostname or null if invalid/missing URL
   */
  const getHostname = (url: string | null) => {
    if (!url) return null;
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, ""); // Remove www prefix
    } catch (e) {
      return null; // Invalid URL
    }
  };

  const hostname = getHostname(story.url || null);
  
  /**
   * Upvote Mutation
   * 
   * Handles story upvoting with optimistic updates and error handling.
   * Updates local state immediately for responsive UI, then syncs with server.
   */
  const upvoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/vote", { storyId: story.id });
    },
    onSuccess: () => {
      // Optimistic update: increment points and mark as voted
      setPointCount(prev => prev + 1);
      setHasVoted(true);
      // Invalidate story queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upvote",
      });
    }
  });

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to vote on stories",
        variant: "default",
      });
      return;
    }
    
    if (hasVoted) {
      toast({
        description: "You've already voted on this story",
        variant: "default",
      });
      return;
    }
    
    upvoteMutation.mutate();
  };

  const timeAgo = formatDistanceToNow(new Date(story.createdAt), { addSuffix: true });

  return (
    <div className="bg-white dark:bg-secondary rounded-lg shadow-sm p-4 transition-dark">
      <div className="flex">
        {/* Upvote button */}
        <div className="mr-4 flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "text-gray-400 hover:text-primary transition-dark",
              hasVoted && "text-primary"
            )} 
            onClick={handleUpvote}
            disabled={upvoteMutation.isPending || hasVoted}
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-darkText dark:text-lightText my-1 transition-dark">
            {pointCount}
          </span>
        </div>
        
        {/* Story content */}
        <div className="flex-1">
          <div className="flex flex-col">
            <h2 className="text-lg font-medium mb-1">
              <Link 
                href={`/story/${story.id}`}
                className="text-darkText dark:text-lightText hover:text-primary dark:hover:text-primary transition-dark"
              >
                {story.title}
              </Link>
              {hostname && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 transition-dark">
                  ({hostname})
                </span>
              )}
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 transition-dark">
              Posted by{" "}
              <Link 
                href={`/user/${story.userId}`}
                className="hover:text-primary transition-dark"
              >
                {author}
              </Link>{" "}
              {timeAgo} |{" "}
              <Link 
                href={`/story/${story.id}`}
                className="hover:text-primary transition-dark"
              >
                {story.commentCount} {story.commentCount === 1 ? "comment" : "comments"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
