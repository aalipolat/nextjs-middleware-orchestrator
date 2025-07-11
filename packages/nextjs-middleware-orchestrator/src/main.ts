import { NextRequest, NextResponse } from 'next/server';
import type { SerializeOptions } from 'cookie';
import type { IMiddlewareContext, IGlobalMiddlewareConfig } from './interfaces/middleware';
import type { IRoutePattern } from './interfaces/route-parser'; 
import type { Middleware } from './types/middleware';
import { parseRoutePattern } from './utils/route-parser';

/**
 * Creates a middleware orchestrator to manage Next.js middleware functions.
 * It applies middleware based on route patterns and provides global processing capabilities.
 *
 * @param routes - An object mapping route patterns to their associated middleware functions.
 * @param globalConfig - Optional global middleware settings for 'before' and 'after' processing.
 * @returns The main middleware function to be used in Next.js's `middleware.ts` file.
 */
function createMiddlewareOrchestrator(
  routes: Record<string, Middleware | Middleware[]>,
  globalConfig?: IGlobalMiddlewareConfig
) {
  // Converts user-defined route patterns into regular expressions for matching.
  const routePatterns: IRoutePattern[] = Object.entries(routes).map(([pattern, middleware]) =>
    parseRoutePattern(pattern, middleware)
  );

  // The main middleware function that Next.js will call for each request.
  return async function middleware(request: NextRequest) {
    // Stores modifications to the response (headers, cookies) and
    // a direct response (like redirect, rewrite, json) if returned by a middleware.
    const responseModifiers: {
      headers: Map<string, string>;
      cookies: Map<string, { value: string; options?: SerializeOptions }>;
      directResponse: NextResponse | null; // Stores a direct response from any middleware.
    } = {
      headers: new Map(),
      cookies: new Map(),
      directResponse: null,
    };

    // The context object provided to each middleware function.
    // It offers access to request data, shared storage, and response manipulation helpers.
    const context: IMiddlewareContext = {
      params: {}, // Route parameters extracted from the URL.
      storage: new Map(), // General storage for data sharing between middlewares.
      log: (message, ...args) => console.log(`[Middleware] ${message}`, ...args),
      error: (message, error) => console.error(`[Middleware Error] ${message}`, error),
      warn: (message, ...args) => console.warn(`[Middleware Warning] ${message}`, ...args),

      // Helper methods for response manipulation:
      redirect: (destination, type = 307) => {
        const res = NextResponse.redirect(new URL(destination, request.url), type);
        responseModifiers.directResponse = res; // Sets the direct response.
        return res;
      },
      rewrite: (destination) => {
        const res = NextResponse.rewrite(new URL(destination, request.url));
        responseModifiers.directResponse = res; // Sets the direct response.
        return res;
      },
      json: (data, status = 200) => {
        const res = new NextResponse(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
        responseModifiers.directResponse = res; // Sets the direct response.
        return res;
      },
      setResponseHeader: (name, value) => responseModifiers.headers.set(name, value),
      setResponseCookie: (name, value, options) => responseModifiers.cookies.set(name, { value, options }),
      deleteResponseCookie: (name, options) => responseModifiers.cookies.set(name, { value: '', options: { ...options, maxAge: 0 } }),
    };

    // --- Middleware Execution Chain ---

    // 1. Executes global 'before' middlewares.
    // If any of them returns a direct response, further execution is halted.
    if (globalConfig?.before) {
      for (const mw of globalConfig.before) {
        if (responseModifiers.directResponse) break; // Halt if a direct response is set.
        const result = await mw(request, context);
        if (result) responseModifiers.directResponse = result;
      }
    }

    // 2. If no direct response has been returned yet, execute route-matching middlewares.
    if (!responseModifiers.directResponse) {
      const pathname = request.nextUrl.pathname;
      for (const { pattern, middleware: routeMiddleware, paramNames } of routePatterns) {
        // Checks if the current pathname matches the defined route pattern.
        if (pattern instanceof RegExp && pattern.test(pathname)) {
          const matches = pathname.match(pattern);
          if (matches) {
            // Extracts route parameters from regex groups and assigns them to context.params.
            if (matches.groups) {
              context.params = matches.groups as Record<string, string>;
            } else if (paramNames) {
              paramNames.forEach((paramName: string, index: number) => {
                context.params[paramName] = matches[index + 1];
              });
            }
          }

          // Executes the route-specific middlewares in order.
          for (const fn of routeMiddleware) {
            if (responseModifiers.directResponse) break; // Halt if a direct response is set.
            const result = await fn(request, context);
            if (result) responseModifiers.directResponse = result;
          }
        }
        if (responseModifiers.directResponse) break; // If a route middleware returned a direct response, stop checking other routes.
      }
    }

    // 3. Determines the final response: either uses a direct response from a middleware
    // or defaults to `NextResponse.next()` for normal continuation.
    let finalResponse: NextResponse;
    if (responseModifiers.directResponse) {
      finalResponse = responseModifiers.directResponse;
    } else {
      finalResponse = NextResponse.next();
    }

    // 4. Executes global 'after' middlewares.
    // These are typically used for final modifications or logging after main processing.
    // They can also return a direct response, potentially overriding the current finalResponse.
    if (globalConfig?.after) {
      for (const mw of globalConfig.after) {
        const result = await mw(request, context);
        if (result) {
          finalResponse = result;
        }
      }
    }

    // 5. Applies any collected header and cookie modifications from `responseModifiers`
    // to the final response. This only applies if the response is a standard `NextResponse.next()`
    // and not a redirect, rewrite, or JSON response, to avoid conflicts.
    if (finalResponse.status === 200 && finalResponse.statusText === 'OK' && !finalResponse.redirected) {
      responseModifiers.headers.forEach((value, name) => {
        finalResponse.headers.set(name, value);
      });
      responseModifiers.cookies.forEach(({ value, options }, name) => {
        finalResponse.cookies.set(name, value, options);
      });
    }

    return finalResponse; // Returns the finalized response.
  };
}

export default createMiddlewareOrchestrator;