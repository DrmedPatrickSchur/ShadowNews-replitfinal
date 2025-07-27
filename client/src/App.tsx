import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Home from "@/pages/home";
import NewStories from "@/pages/new";
import StoryView from "@/pages/story-view";
import UserProfile from "@/pages/user-profile";
import Submit from "@/pages/submit";
import NotFound from "@/pages/not-found";

/**
 * ShadowNews Client Application Router
 * 
 * Defines the complete routing structure for the ShadowNews frontend.
 * Uses Wouter for lightweight client-side routing similar to React Router
 * but with a smaller bundle size.
 * 
 * Routes include:
 * - / : Homepage with featured and latest stories
 * - /new : Newest stories chronologically  
 * - /story/:id : Individual story view with comments
 * - /user/:id : User profile pages
 * - /submit : Story submission form
 * - /ask, /show, /jobs : Filtered story views by type
 */
function Router() {
  return (
    <Switch>
      {/* Homepage - Featured and latest stories */}
      <Route path="/">
        <Home />
      </Route>
      
      {/* New stories page - Chronological listing */}
      <Route path="/new">
        <NewStories />
      </Route>
      
      {/* Individual story view with comments */}
      <Route path="/story/:id">
        <StoryView />
      </Route>
      
      {/* User profile pages */}
      <Route path="/user/:id">
        <UserProfile />
      </Route>
      
      {/* Story submission form */}
      <Route path="/submit">
        <Submit />
      </Route>
      
      {/* Filtered story views by type */}
      <Route path="/ask">
        <Home type="ask" />
      </Route>
      <Route path="/show">
        <Home type="show" />
      </Route>
      <Route path="/jobs">
        <Home type="job" />
      </Route>
      
      {/* 404 fallback for unknown routes */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

/**
 * Main ShadowNews Application Component
 * 
 * Sets up the complete application shell including:
 * - TanStack Query for server state management and caching
 * - Tooltip provider for enhanced UI interactions
 * - Global layout structure (header, main content, footer)
 * - Toast notifications for user feedback
 * 
 * The layout uses flexbox to ensure the footer stays at the bottom
 * and the main content area expands to fill available space.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          {/* Global navigation header */}
          <Header />
          
          {/* Main content area - grows to fill available space */}
          <main className="flex-grow pb-8">
            <Router />
          </main>
          
          {/* Site footer - always at bottom */}
          <Footer />
        </div>
        
        {/* Global toast notification system */}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
