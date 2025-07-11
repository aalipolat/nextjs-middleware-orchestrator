import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import createMiddlewareOrchestrator from '../../src/main';
import type { Middleware } from '../../src/types/middleware';

describe('Middleware Orchestrator Integration Tests', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/users/123');
  });

  describe('Authentication Flow', () => {
    it('should handle authentication middleware flow', async () => {
      // Mock authentication middleware
      const authMiddleware: Middleware = vi.fn(async (request, context) => {
        const token = request.headers.get('authorization');
        if (!token) {
          return context.redirect('/login');
        }
        context.storage.set('user', { id: '123', token });
        return null;
      });

      // Mock authorization middleware
      const authzMiddleware: Middleware = vi.fn(async (request, context) => {
        const user = context.storage.get('user');
        if (!user) {
          return context.json({ error: 'Unauthorized' }, 401);
        }
        return null;
      });

      // Mock logging middleware
      const loggingMiddleware: Middleware = vi.fn(async (request, context) => {
        context.log(`Request to ${request.nextUrl.pathname}`);
        return null;
      });

      const routes = {
        '/users/:id': [authMiddleware, authzMiddleware, loggingMiddleware]
      };

      const orchestrator = createMiddlewareOrchestrator(routes);

      // Test without authorization header
      const requestWithoutAuth = new NextRequest('http://localhost:3000/users/123');
      const response1 = await orchestrator(requestWithoutAuth);

      expect(authMiddleware).toHaveBeenCalled();
      expect(authzMiddleware).not.toHaveBeenCalled();
      expect(loggingMiddleware).not.toHaveBeenCalled();
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', requestWithoutAuth.url),
        307
      );

      // Test with authorization header
      const requestWithAuth = new NextRequest('http://localhost:3000/users/123');
      requestWithAuth.headers.set('authorization', 'Bearer token123');
      const response2 = await orchestrator(requestWithAuth);

      expect(authMiddleware).toHaveBeenCalled();
      expect(authzMiddleware).toHaveBeenCalled();
      expect(loggingMiddleware).toHaveBeenCalled();
    });
  });

  describe('API Rate Limiting Flow', () => {
    it('should handle rate limiting middleware flow', async () => {
      const rateLimitMap = new Map<string, number>();

      const rateLimitMiddleware: Middleware = vi.fn(async (request, context) => {
        const clientId = request.headers.get('x-client-id') || 'default';
        const currentCount = rateLimitMap.get(clientId) || 0;
        
        if (currentCount >= 10) {
          return context.json({ error: 'Rate limit exceeded' }, 429);
        }
        
        rateLimitMap.set(clientId, currentCount + 1);
        context.storage.set('rateLimitCount', currentCount + 1);
        return null;
      });

      const apiMiddleware: Middleware = vi.fn(async (request, context) => {
        const count = context.storage.get('rateLimitCount');
        context.log(`Request count: ${count}`);
        return context.json({ data: 'success', count });
      });

      const routes = {
        '/api/*': [rateLimitMiddleware, apiMiddleware]
      };

      const orchestrator = createMiddlewareOrchestrator(routes);

      // Test rate limiting
      for (let i = 0; i < 12; i++) {
        const request = new NextRequest('http://localhost:3000/api/users');
        request.headers.set('x-client-id', 'test-client');
        const response = await orchestrator(request);

        if (i < 10) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });
  });

  describe('Multi-Route Application Flow', () => {
    it('should handle complex multi-route application', async () => {
      // Global logging middleware
      const globalLogging: Middleware = vi.fn(async (request, context) => {
        context.log(`Global: ${request.method} ${request.nextUrl.pathname}`);
        return null;
      });

      // Authentication middleware
      const authMiddleware: Middleware = vi.fn(async (request, context) => {
        const token = request.headers.get('authorization');
        if (!token && request.nextUrl.pathname.startsWith('/admin')) {
          return context.redirect('/login');
        }
        if (token) {
          context.storage.set('user', { token });
        }
        return null;
      });

      // Admin middleware
      const adminMiddleware: Middleware = vi.fn(async (request, context) => {
        const user = context.storage.get('user');
        if (!user) {
          return context.json({ error: 'Admin access required' }, 403);
        }
        return null;
      });

      // User middleware
      const userMiddleware: Middleware = vi.fn(async (request, context) => {
        const user = context.storage.get('user');
        if (!user) {
          return context.json({ error: 'Authentication required' }, 401);
        }
        return null;
      });

      // API response middleware
      const apiResponseMiddleware: Middleware = vi.fn(async (request, context) => {
        return context.json({ 
          path: request.nextUrl.pathname,
          user: context.storage.get('user') ? 'authenticated' : 'anonymous'
        });
      });

      const routes = {
        '/admin/*': [authMiddleware, adminMiddleware, apiResponseMiddleware],
        '/api/users/*': [authMiddleware, userMiddleware, apiResponseMiddleware],
        '/public/*': [apiResponseMiddleware]
      };

      const globalConfig = {
        before: [globalLogging]
      };

      const orchestrator = createMiddlewareOrchestrator(routes, globalConfig);

      // Test admin route without auth
      const adminRequest = new NextRequest('http://localhost:3000/admin/dashboard');
      const adminResponse = await orchestrator(adminRequest);
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', adminRequest.url),
        307
      );

      // Test admin route with auth
      const adminRequestWithAuth = new NextRequest('http://localhost:3000/admin/dashboard');
      adminRequestWithAuth.headers.set('authorization', 'Bearer admin-token');
      const adminResponseWithAuth = await orchestrator(adminRequestWithAuth);
      expect(adminResponseWithAuth.status).toBe(200);

      // Test API route without auth
      const apiRequest = new NextRequest('http://localhost:3000/api/users/profile');
      const apiResponse = await orchestrator(apiRequest);
      expect(apiResponse.status).toBe(401);

      // Test public route
      const publicRequest = new NextRequest('http://localhost:3000/public/info');
      const publicResponse = await orchestrator(publicRequest);
      expect(publicResponse.status).toBe(200);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle middleware errors gracefully', async () => {
      const errorMiddleware: Middleware = vi.fn(async (request, context) => {
        throw new Error('Database connection failed');
      });

      const fallbackMiddleware: Middleware = vi.fn(async (request, context) => {
        return context.json({ error: 'Service temporarily unavailable' }, 503);
      });

      const routes = {
        '/api/*': [errorMiddleware, fallbackMiddleware]
      };

      const orchestrator = createMiddlewareOrchestrator(routes);

      const request = new NextRequest('http://localhost:3000/api/users');
      
      await expect(orchestrator(request)).rejects.toThrow('Database connection failed');
    });

    it('should handle async errors in middleware', async () => {
      const asyncErrorMiddleware: Middleware = vi.fn(async (request, context) => {
        await new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Async error')), 0);
        });
        return null;
      });

      const routes = {
        '/api/*': [asyncErrorMiddleware]
      };

      const orchestrator = createMiddlewareOrchestrator(routes);

      const request = new NextRequest('http://localhost:3000/api/users');
      
      await expect(orchestrator(request)).rejects.toThrow('Async error');
    });
  });

  describe('Response Modification Flow', () => {
    it('should handle complex response modifications', async () => {
      const corsMiddleware: Middleware = vi.fn(async (request, context) => {
        context.setResponseHeader('Access-Control-Allow-Origin', '*');
        context.setResponseHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        context.setResponseHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return null;
      });

      const cacheMiddleware: Middleware = vi.fn(async (request, context) => {
        context.setResponseHeader('Cache-Control', 'public, max-age=3600');
        return null;
      });

      const sessionMiddleware: Middleware = vi.fn(async (request, context) => {
        context.setResponseCookie('session', 'abc123', { 
          httpOnly: true, 
          secure: true,
          sameSite: 'strict'
        });
        return null;
      });

      const dataMiddleware: Middleware = vi.fn(async (request, context) => {
        return context.json({ data: 'response data' });
      });

      const routes = {
        '/api/data': [corsMiddleware, cacheMiddleware, sessionMiddleware, dataMiddleware]
      };

      const orchestrator = createMiddlewareOrchestrator(routes);

      const request = new NextRequest('http://localhost:3000/api/data');
      const response = await orchestrator(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.cookies.set).toHaveBeenCalledWith('session', 'abc123', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      });
    });
  });

  describe('Parameter Extraction Flow', () => {
    it('should handle complex parameter extraction scenarios', async () => {
      const parameterMiddleware: Middleware = vi.fn(async (request, context) => {
        return context.json({
          params: context.params,
          pathname: request.nextUrl.pathname
        });
      });

      const routes = {
        '/users/:id': parameterMiddleware,
        '/users/:id/posts/:postId': parameterMiddleware,
        '/users/:id/posts/:postId/comments/:commentId?': parameterMiddleware,
        '/files/**path': parameterMiddleware,
        '/api/:version/users/:userId': parameterMiddleware
      };

      const orchestrator = createMiddlewareOrchestrator(routes);

      // Test single parameter
      const singleParamRequest = new NextRequest('http://localhost:3000/users/123');
      await orchestrator(singleParamRequest);
      expect(parameterMiddleware).toHaveBeenCalledWith(
        singleParamRequest,
        expect.objectContaining({
          params: { id: '123' }
        })
      );

      // Test multiple parameters
      const multiParamRequest = new NextRequest('http://localhost:3000/users/123/posts/456');
      await orchestrator(multiParamRequest);
      expect(parameterMiddleware).toHaveBeenCalledWith(
        multiParamRequest,
        expect.objectContaining({
          params: { id: '123', postId: '456' }
        })
      );

      // Test optional parameter with value
      const optionalParamWithValueRequest = new NextRequest('http://localhost:3000/users/123/posts/456/comments/789');
      await orchestrator(optionalParamWithValueRequest);
      expect(parameterMiddleware).toHaveBeenCalledWith(
        optionalParamWithValueRequest,
        expect.objectContaining({
          params: { id: '123', postId: '456', commentId: '789' }
        })
      );

      // Test optional parameter without value
      const optionalParamWithoutValueRequest = new NextRequest('http://localhost:3000/users/123/posts/456');
      await orchestrator(optionalParamWithoutValueRequest);
      expect(parameterMiddleware).toHaveBeenCalledWith(
        optionalParamWithoutValueRequest,
        expect.objectContaining({
          params: { id: '123', postId: '456' }
        })
      );

      // Test catch-all parameter
      const catchAllRequest = new NextRequest('http://localhost:3000/files/folder/subfolder/file.txt');
      await orchestrator(catchAllRequest);
      expect(parameterMiddleware).toHaveBeenCalledWith(
        catchAllRequest,
        expect.objectContaining({
          params: { path: 'folder/subfolder/file.txt' }
        })
      );

      // Test complex parameter combination
      const complexParamRequest = new NextRequest('http://localhost:3000/api/v1/users/123');
      await orchestrator(complexParamRequest);
      expect(parameterMiddleware).toHaveBeenCalledWith(
        complexParamRequest,
        expect.objectContaining({
          params: { version: 'v1', userId: '123' }
        })
      );
    });
  });
}); 