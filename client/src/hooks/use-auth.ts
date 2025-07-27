import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, LoginCredentials, RegisterData } from "@shared/schema";
import { useToast } from "./use-toast";

/**
 * Authentication Hook
 * 
 * Provides comprehensive authentication functionality for the ShadowNews application.
 * This hook manages user authentication state and operations using TanStack Query
 * for efficient server state management and caching.
 * 
 * Features:
 * 1. Current user state with automatic caching and background refetching
 * 2. Login/logout/register operations with optimistic updates
 * 3. Integrated toast notifications for user feedback
 * 4. Type-safe authentication state management
 * 
 * The hook uses React Query's mutation system to handle authentication API calls
 * with proper error handling and cache invalidation for consistent state.
 * 
 * @returns Authentication state and methods
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  /**
   * Current User Query
   * 
   * Fetches and caches the current authenticated user's information.
   * - retry: false - Don't retry on 401 errors (not authenticated)
   * - staleTime: 5 minutes - Consider data fresh for 5 minutes
   * - Automatically refetches on window focus and reconnect
   */
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false, // Don't retry failed auth requests
    staleTime: 300000, // 5 minutes - user data doesn't change frequently
  });

  /**
   * Login Mutation
   * 
   * Handles user login with credential validation and session establishment.
   * On success: Invalidates user query to refetch current user data
   * On error: Shows error toast with specific error message
   */
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      // Refetch current user data after successful login
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Login successful",
        description: "Welcome back to ShadowNews!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
      });
    }
  });

  /**
   * Registration Mutation
   * 
   * Handles new user account creation with validation.
   * Automatically logs the user in after successful registration.
   */
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      // Refetch current user data after successful registration
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Could not create account",
      });
    }
  });

  /**
   * Logout Mutation
   * 
   * Handles user logout and session termination.
   * Clears cached user data and invalidates related queries.
   */
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive", 
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Could not log out",
      });
    }
  });

  /**
   * Convenience method for triggering login
   */
  const login = (credentials: LoginCredentials) => {
    loginMutation.mutate(credentials);
  };

  /**
   * Convenience method for triggering registration
   */
  const register = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  /**
   * Convenience method for triggering logout
   */
  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    // Authentication state
    user, // Current user object or undefined
    isLoading, // True while fetching user data
    isError, // True if user fetch failed
    isAuthenticated: !!user, // Computed boolean for convenience
    
    // Authentication actions
    login,
    register,
    logout,
    
    // Mutation objects for advanced usage (loading states, etc.)
    loginMutation,
    registerMutation,
    logoutMutation
  };
}
