import type { IMiddlewareContext } from '../interfaces/middleware';
import type { NextResponse, NextRequest } from 'next/server'

/**
 * Type definition for a Next.js middleware function.
 * Each middleware receives a NextRequest and a custom IMiddlewareContext,
 * and can return a NextResponse or null.
 */
export type Middleware = (request: NextRequest, context: IMiddlewareContext) => Promise<NextResponse | null>;
