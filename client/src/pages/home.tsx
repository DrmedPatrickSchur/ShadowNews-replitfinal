import { useState } from "react";
import { StoryList } from "@/components/story/story-list";
import { FeaturedStories } from "@/components/common/featured-stories";
import { Button } from "@/components/ui/button";
import { SubmitStoryModal } from "@/components/story/submit-story-modal";
import { useAuth } from "@/hooks/use-auth";

/**
 * Home Page Component Props
 */
interface HomeProps {
  type?: string; // Optional story type filter ('ask', 'show', 'job')
}

/**
 * ShadowNews Home Page Component
 * 
 * The main landing page that displays stories with optional filtering by type.
 * This page serves multiple purposes:
 * 
 * 1. Default homepage (/): Shows "Top Stories" without type filter
 * 2. Ask page (/ask): Shows filtered stories of type "ask"
 * 3. Show page (/show): Shows filtered stories of type "show" 
 * 4. Jobs page (/jobs): Shows filtered stories of type "job"
 * 
 * Features:
 * - Dynamic page title based on story type
 * - Story submission call-to-action banner
 * - Featured stories section (homepage only)
 * - Modal-based story submission for authenticated users
 * 
 * @param type - Optional story type to filter by
 */
export default function Home({ type }: HomeProps) {
  const { user } = useAuth();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  
  // Determine page title based on story type filter
  let pageTitle = "Top Stories";
  if (type === "ask") pageTitle = "Ask ShadowNews";
  if (type === "show") pageTitle = "Show ShadowNews";
  if (type === "job") pageTitle = "Jobs";
  
  return (
    <div className="container mx-auto px-4">
      {/* Main story listing with optional type filter */}
      <StoryList title={pageTitle} type={type} />
      
      {/* Submission Call-to-Action Banner */}
      {/* Encourages user engagement and content submission */}
      <div className="bg-gradient-to-r from-primary to-accent text-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold mb-2">Have something interesting to share?</h2>
            <p className="text-white text-opacity-90">Submit your story and join the conversation.</p>
          </div>
          <Button 
            variant="secondary"
            onClick={() => setSubmitModalOpen(true)}
          >
            Submit a Story
          </Button>
        </div>
      </div>
      
      {/* Featured Stories Section */}
      {/* Only shown on homepage (no type filter) to highlight quality content */}
      <FeaturedStories />
      
      {/* Story Submission Modal */}
      {/* Provides convenient access to submission form without page navigation */}
      <SubmitStoryModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
      />
    </div>
  );
}
