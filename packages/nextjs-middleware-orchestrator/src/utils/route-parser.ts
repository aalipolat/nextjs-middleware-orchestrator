import type { IRoutePattern } from '../interfaces/route-parser'; // Adjust the import path as needed
import type { Middleware } from "../types/middleware";

/**
 * Transforms Next.js-like route patterns (e.g., /users/:id, /blog/:slug?, /files/**)
 * into regular expressions for matching and extracts parameter names.
 *
 * @param pattern - The route pattern string to convert.
 * @param middleware - The middleware associated with this pattern (included for IRoutePattern type compatibility, not logically used here).
 * @returns An IRoutePattern object containing the regex pattern, middleware, and extracted parameter names.
 */
export function parseRoutePattern(
    pattern: string,
    middleware: Middleware | Middleware[]
): IRoutePattern {
    let regexPatternString = pattern;
    const paramNames: string[] = [];

    // Transforms Next.js route patterns into regex:

    // :param? -> optional capture group
    regexPatternString = regexPatternString.replace(/:([a-zA-Z_]+)\?/g, (_, paramName) => {
        paramNames.push(paramName);
        return `(?:(?<${paramName}>[^/]+))?`;
    });

    // * or ** -> catch-all or named catch-all patterns
    regexPatternString = regexPatternString.replace(/\*\*?([a-zA-Z_]*)?/g, (_, paramName) => {
        if (paramName) {
            paramNames.push(paramName);
            return `(?<${paramName}>.*)`;
        }
        return '.*';
    });

    // :param -> mandatory capture group
    regexPatternString = regexPatternString.replace(/:([a-zA-Z_]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return `(?<${paramName}>[^/]+)`;
    });

    return {
        pattern: new RegExp(`^${regexPatternString}$`),
        middleware: Array.isArray(middleware) ? middleware : [middleware],
        paramNames: paramNames
    };
}
