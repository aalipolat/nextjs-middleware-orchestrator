import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import createMiddlewareOrchestrator from '../../src/main';
import type { Middleware } from '../../src/types/middleware';
import type { IMiddlewareContext } from '../../src/interfaces/middleware';

describe('createMiddlewareOrchestrator', () => {
  let mockRequest: NextRequest;
  let mockMiddleware: any;
  let mockBeforeMiddleware: any;
  let mockAfterMiddleware: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = new NextRequest('http://localhost:3000/users/123');
    mockMiddleware = vi.fn(async () => null);
    mockBeforeMiddleware = vi.fn(async () => null);
    mockAfterMiddleware = vi.fn(async () => null);
  });

  describe('basic functionality', () => {
    it('should create a middleware function', () => {
      const routes = { '/users': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      expect(typeof orchestrator).toBe('function');
    });

    it('should return NextResponse.next() when no route matches', async () => {
      const routes = { '/users': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(mockMiddleware).not.toHaveBeenCalled();
    });

    it('should execute middleware when route matches', async () => {
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      expect(mockMiddleware).toHaveBeenCalledWith(mockRequest, expect.any(Object));
    });

    it('should provide context with correct properties', async () => {
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      const context = mockMiddleware.mock.calls[0][1] as IMiddlewareContext;
      expect(context).toHaveProperty('params');
      expect(context).toHaveProperty('storage');
      expect(context).toHaveProperty('log');
      expect(context).toHaveProperty('error');
      expect(context).toHaveProperty('warn');
      expect(context).toHaveProperty('redirect');
      expect(context).toHaveProperty('rewrite');
      expect(context).toHaveProperty('json');
      expect(context).toHaveProperty('setResponseHeader');
      expect(context).toHaveProperty('setResponseCookie');
      expect(context).toHaveProperty('deleteResponseCookie');
    });
  });

  describe('route parameter extraction', () => {
    it('should extract parameters from URL', async () => {
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      const context = mockMiddleware.mock.calls[0][1] as IMiddlewareContext;
      expect(context.params).toEqual({ id: '123' });
    });

    it('should extract multiple parameters', async () => {
      const request = new NextRequest('http://localhost:3000/users/123/posts/456');
      const routes = { '/users/:id/posts/:postId': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(request);
      
      const context = mockMiddleware.mock.calls[0][1] as IMiddlewareContext;
      expect(context.params).toEqual({ id: '123', postId: '456' });
    });

    it('should handle optional parameters', async () => {
      const routes = { '/users/:id?': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      // Test with parameter
      const requestWithParam = new NextRequest('http://localhost:3000/users/123');
      await orchestrator(requestWithParam);
      
      let context = mockMiddleware.mock.calls[0][1] as IMiddlewareContext;
      expect(context.params).toEqual({ id: '123' });
      
      // Test without parameter - optional parameters still require the slash
      const requestWithoutParam = new NextRequest('http://localhost:3000/users/');
      await orchestrator(requestWithoutParam);
      
      context = mockMiddleware.mock.calls[1][1] as IMiddlewareContext;
      expect(context.params).toEqual({});
    });

    it('should handle catch-all parameters', async () => {
      const request = new NextRequest('http://localhost:3000/files/folder/subfolder/file.txt');
      const routes = { '/files/**path': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(request);
      
      const context = mockMiddleware.mock.calls[0][1] as IMiddlewareContext;
      expect(context.params).toEqual({ path: 'folder/subfolder/file.txt' });
    });
  });

  describe('middleware execution order', () => {
    it('should execute multiple middlewares in order', async () => {
      const middleware1 = vi.fn(async () => null);
      const middleware2 = vi.fn(async () => null);
      const routes = { '/users/:id': [middleware1, middleware2] };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      expect(middleware1).toHaveBeenCalledBefore(middleware2);
    });

    it('should stop execution when middleware returns response', async () => {
      const middleware1 = vi.fn(async () => NextResponse.redirect('/login'));
      const middleware2 = vi.fn(async () => null);
      const routes = { '/users/:id': [middleware1, middleware2] };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).not.toHaveBeenCalled();
    });
  });

  describe('global middleware configuration', () => {
    it('should execute before middlewares', async () => {
      const globalConfig = { before: [mockBeforeMiddleware] };
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes, globalConfig);
      
      await orchestrator(mockRequest);
      
      expect(mockBeforeMiddleware).toHaveBeenCalled();
      expect(mockMiddleware).toHaveBeenCalled();
      expect(mockBeforeMiddleware).toHaveBeenCalledBefore(mockMiddleware);
    });

    it('should execute after middlewares', async () => {
      const globalConfig = { after: [mockAfterMiddleware] };
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes, globalConfig);
      
      await orchestrator(mockRequest);
      
      expect(mockAfterMiddleware).toHaveBeenCalled();
      expect(mockMiddleware).toHaveBeenCalled();
      expect(mockMiddleware).toHaveBeenCalledBefore(mockAfterMiddleware);
    });

    it('should execute both before and after middlewares', async () => {
      const globalConfig = { 
        before: [mockBeforeMiddleware], 
        after: [mockAfterMiddleware] 
      };
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes, globalConfig);
      
      await orchestrator(mockRequest);
      
      expect(mockBeforeMiddleware).toHaveBeenCalled();
      expect(mockMiddleware).toHaveBeenCalled();
      expect(mockAfterMiddleware).toHaveBeenCalled();
      expect(mockBeforeMiddleware).toHaveBeenCalledBefore(mockMiddleware);
      expect(mockMiddleware).toHaveBeenCalledBefore(mockAfterMiddleware);
    });

    it('should stop execution when before middleware returns response', async () => {
      const beforeMiddleware = vi.fn(async () => NextResponse.redirect('/login'));
      const globalConfig = { before: [beforeMiddleware] };
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes, globalConfig);
      
      await orchestrator(mockRequest);
      
      expect(beforeMiddleware).toHaveBeenCalled();
      expect(mockMiddleware).not.toHaveBeenCalled();
    });
  });

  describe('context helper methods', () => {
    it('should handle redirect method', async () => {
      const middleware = vi.fn(async (request, context) => {
        return context.redirect('/login');
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', mockRequest.url),
        307
      );
    });

    it('should handle rewrite method', async () => {
      const middleware = vi.fn(async (request, context) => {
        return context.rewrite('/api/users');
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      expect(NextResponse.rewrite).toHaveBeenCalledWith(
        new URL('/api/users', mockRequest.url)
      );
    });

    it('should handle json method', async () => {
      const middleware = vi.fn(async (request, context) => {
        return context.json({ error: 'Unauthorized' }, 401);
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      expect(middleware).toHaveBeenCalled();
    });

    it('should handle setResponseHeader method', async () => {
      const middleware = vi.fn(async (request, context) => {
        context.setResponseHeader('X-Custom-Header', 'value');
        return null;
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(response.headers.get('X-Custom-Header')).toBe('value');
    });

    it('should handle setResponseCookie method', async () => {
      const middleware = vi.fn(async (request, context) => {
        context.setResponseCookie('session', 'abc123', { httpOnly: true });
        return null;
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(response.cookies.set).toHaveBeenCalledWith('session', 'abc123', { httpOnly: true });
    });

    it('should handle deleteResponseCookie method', async () => {
      const middleware = vi.fn(async (request, context) => {
        context.deleteResponseCookie('session');
        return null;
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(response.cookies.set).toHaveBeenCalledWith('session', '', { maxAge: 0 });
    });
  });

  describe('response handling', () => {
    it('should return direct response from middleware', async () => {
      const redirectResponse = NextResponse.redirect('/login');
      const middleware = vi.fn(async () => redirectResponse);
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(response).toBe(redirectResponse);
    });

    it('should return NextResponse.next() when no middleware returns response', async () => {
      const middleware = vi.fn(async () => null);
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should apply headers and cookies to response', async () => {
      const middleware = vi.fn(async (request, context) => {
        context.setResponseHeader('X-Test', 'value');
        context.setResponseCookie('test', 'cookie');
        return null;
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(response.headers.get('X-Test')).toBe('value');
      expect(response.cookies.set).toHaveBeenCalledWith('test', 'cookie', undefined);
    });

    it('should not apply headers/cookies to redirect/rewrite responses', async () => {
      const middleware = vi.fn(async (request, context) => {
        context.setResponseHeader('X-Test', 'value');
        return context.redirect('/login');
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const response = await orchestrator(mockRequest);
      
      expect(response.headers.get('X-Test')).toBeNull();
    });
  });

  describe('route matching', () => {
    it('should match exact routes', async () => {
      const routes = { '/users': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const request = new NextRequest('http://localhost:3000/users');
      await orchestrator(request);
      
      expect(mockMiddleware).toHaveBeenCalled();
    });

    it('should match parameterized routes', async () => {
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const request = new NextRequest('http://localhost:3000/users/123');
      await orchestrator(request);
      
      expect(mockMiddleware).toHaveBeenCalled();
    });

    it('should not match non-matching routes', async () => {
      const routes = { '/users/:id': mockMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const request = new NextRequest('http://localhost:3000/posts/123');
      await orchestrator(request);
      
      expect(mockMiddleware).not.toHaveBeenCalled();
    });

    it('should match first route when multiple routes could match', async () => {
      const middleware1 = vi.fn(async () => null);
      const middleware2 = vi.fn(async () => null);
      const routes = {
        '/users/:id': middleware1,
        '/users/:id/posts': middleware2
      };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      const request = new NextRequest('http://localhost:3000/users/123');
      await orchestrator(request);
      
      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle middleware errors gracefully', async () => {
      const errorMiddleware = vi.fn(async () => {
        throw new Error('Middleware error');
      });
      const routes = { '/users/:id': errorMiddleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await expect(orchestrator(mockRequest)).rejects.toThrow('Middleware error');
    });

    it('should provide logging methods in context', async () => {
      const middleware = vi.fn(async (request, context) => {
        context.log('Test log');
        context.warn('Test warning');
        context.error('Test error', new Error('Test'));
        return null;
      });
      const routes = { '/users/:id': middleware };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      expect(console.log).toHaveBeenCalledWith('[Middleware] Test log');
      expect(console.warn).toHaveBeenCalledWith('[Middleware Warning] Test warning');
      expect(console.error).toHaveBeenCalledWith('[Middleware Error] Test error', expect.any(Error));
    });
  });

  describe('storage functionality', () => {
    it('should provide shared storage between middlewares', async () => {
      const middleware1 = vi.fn(async (request, context) => {
        context.storage.set('user', { id: '123' });
        return null;
      });
      const middleware2 = vi.fn(async (request, context) => {
        const user = context.storage.get('user');
        expect(user).toEqual({ id: '123' });
        return null;
      });
      const routes = { '/users/:id': [middleware1, middleware2] };
      const orchestrator = createMiddlewareOrchestrator(routes);
      
      await orchestrator(mockRequest);
      
      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
    });
  });
});
