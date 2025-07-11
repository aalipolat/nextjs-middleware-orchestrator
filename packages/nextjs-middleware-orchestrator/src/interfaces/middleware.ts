import type { NextResponse } from "next/server";
import type { Middleware } from "../types/middleware";
import type { SerializeOptions } from 'cookie';

/**
 * Interface for the context object provided to middleware functions.
 * It offers access to request information, shared storage, and response manipulation capabilities.
 */
export interface IMiddlewareContext {
    params: Record<string, string>; // Route parameters extracted from the URL.
    storage: Map<string, any>; // Key-value storage for data sharing between middlewares.
    log: (message: string, ...args: any[]) => void; // For informative logging.
    error: (message: string, error: any) => void; // For error logging.
    warn: (message: string, ...args: any[]) => void; // For warning logging.
    redirect: (destination: string, type?: 301 | 302 | 303 | 307 | 308) => NextResponse; // Redirects the user to another URL.
    rewrite: (destination: string) => NextResponse; // Internally rewrites the request to another URL.
    json: (data: object, status?: number) => NextResponse; // Returns a JSON response.
    setResponseHeader: (name: string, value: string) => void; // Adds/updates an HTTP header in the response.
    setResponseCookie: (name: string, value: string, options?: SerializeOptions) => void; // Adds/updates a cookie in the response.
    deleteResponseCookie: (name: string, options?: SerializeOptions) => void; // Deletes a cookie from the response.
}

/**
 * Interface for global middleware configuration.
 * Defines general "before" and "after" middlewares for all requests.
 */
export interface IGlobalMiddlewareConfig {
    before?: Middleware[]; // Global middlewares to run before any route-specific middlewares.
    after?: Middleware[]; // Global middlewares to run after all other processing is complete.
}
