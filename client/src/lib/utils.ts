import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * ShadowNews Utility Functions
 * 
 * Collection of utility functions used throughout the application.
 */

/**
 * Class Name Utility Function
 * 
 * Combines and deduplicates Tailwind CSS class names intelligently.
 * Uses clsx for conditional class handling and tailwind-merge for
 * conflict resolution when multiple Tailwind classes target the same CSS property.
 * 
 * This is essential for component libraries where you need to:
 * 1. Conditionally apply classes based on props/state
 * 2. Allow component consumers to override default styles
 * 3. Prevent conflicting Tailwind classes from both being applied
 * 
 * Example usage:
 * ```ts
 * cn("px-4 py-2", "bg-blue-500", condition && "bg-red-500") 
 * // Result: "px-4 py-2 bg-red-500" (if condition is true)
 * ```
 * 
 * @param inputs - Array of class values (strings, objects, arrays)
 * @returns Merged and deduplicated class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
