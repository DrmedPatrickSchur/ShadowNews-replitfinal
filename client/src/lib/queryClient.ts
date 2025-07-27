import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * ShadowNews API Client Configuration
 * 
 * This file sets up the TanStack Query client and provides utility functions
 * for making API requests throughout the application. It handles:
 * 
 * 1. HTTP error handling with proper error propagation
 * 2. Authentication state management via cookies
 * 3. Request/response serialization
 * 4. Query configuration with appropriate defaults
 */

/**
 * HTTP Response Error Handler
 * 
 * Checks if a fetch response is successful and throws an error if not.
 * Attempts to extract meaningful error messages from the response body.
 * 
 * @param res - Fetch response object
 * @throws Error with status code and message if response is not ok
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Generic API Request Function
 * 
 * Wrapper around fetch with standardized error handling, JSON serialization,
 * and credential management. Used for all API communications.
 * 
 * Features:
 * - Automatic JSON serialization for request bodies
 * - Cookie-based authentication (credentials: "include")
 * - Consistent error handling across all requests
 * - TypeScript type safety for responses
 * 
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url - API endpoint URL
 * @param data - Request body data (will be JSON stringified)
 * @returns Parsed JSON response
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies for session management
  });

  await throwIfResNotOk(res);
  return res.json();
}

/**
 * Unauthorized Response Behavior Options
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Query Function Factory
 * 
 * Creates a query function for TanStack Query with configurable 401 handling.
 * This is used as the default query function for all queries.
 * 
 * Behavior options:
 * - "throw": Throw error on 401 (default) - triggers error boundary
 * - "returnNull": Return null on 401 - useful for optional auth checks
 * 
 * @param options - Configuration object with 401 behavior
 * @returns Query function compatible with TanStack Query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include", // Include session cookies
    });

    // Handle authentication failures based on configuration
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Global Query Client Configuration
 * 
 * Sets up TanStack Query with optimized defaults for the ShadowNews application:
 * 
 * Query defaults:
 * - Custom query function with error handling
 * - Disabled automatic refetching (manual control for better UX)
 * - Infinite stale time (cache invalidation is explicit)
 * - No retries (failures should be handled immediately)
 * 
 * Mutation defaults:
 * - No retries (user actions should be explicit)
 * 
 * This configuration prioritizes predictable behavior and explicit cache
 * management over automatic background updates.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // Default to throwing on auth errors
      refetchInterval: false, // No automatic background refetching
      refetchOnWindowFocus: false, // No refetch when window regains focus
      staleTime: Infinity, // Data never becomes stale automatically
      retry: false, // No automatic retries on failure
    },
    mutations: {
      retry: false, // No automatic retries for user actions
    },
  },
});
