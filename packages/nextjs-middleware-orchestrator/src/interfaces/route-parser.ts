import type { Middleware } from "../types/middleware";

/**
 * Interface for a route pattern matcher.
 * Defines a route pattern, its associated middlewares, and extracted parameter names.
 */
export interface IRoutePattern {
  pattern: string | RegExp; // The route pattern (Regex or string) used for matching.
  middleware: Middleware[]; // An array of middlewares to apply for this pattern.
  paramNames?: string[]; // Names of parameters extracted from the pattern (e.g., ['id', 'slug']).
}
