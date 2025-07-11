import { describe, it, expect, vi } from 'vitest';
import { parseRoutePattern } from '../../../src/utils/route-parser';
import type { Middleware } from '../../../src/types/middleware';

describe('parseRoutePattern', () => {
  const mockMiddleware: Middleware = vi.fn(async () => null);

  describe('basic patterns', () => {
    it('should parse simple static routes', () => {
      const result = parseRoutePattern('/users', mockMiddleware);
      
      expect(result.pattern).toBeInstanceOf(RegExp);
      expect(result.pattern.toString()).toBe('/^\\/users$/');
      expect(result.middleware).toEqual([mockMiddleware]);
      expect(result.paramNames).toEqual([]);
    });

    it('should parse root route', () => {
      const result = parseRoutePattern('/', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/$/');
      expect(result.paramNames).toEqual([]);
    });

    it('should parse nested static routes', () => {
      const result = parseRoutePattern('/users/profile/settings', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/users\\/profile\\/settings$/');
      expect(result.paramNames).toEqual([]);
    });
  });

  describe('parameter patterns', () => {
    it('should parse mandatory parameters', () => {
      const result = parseRoutePattern('/users/:id', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/users\\/(?<id>[^/]+)$/');
      expect(result.paramNames).toEqual(['id']);
    });

    it('should parse multiple mandatory parameters', () => {
      const result = parseRoutePattern('/users/:id/posts/:postId', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/users\\/(?<id>[^/]+)\\/posts\\/(?<postId>[^/]+)$/');
      expect(result.paramNames).toEqual(['id', 'postId']);
    });

    it('should parse optional parameters', () => {
      const result = parseRoutePattern('/users/:id?', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/users\\/(?:(?<id>[^/]+))?$/');
      expect(result.paramNames).toEqual(['id']);
    });

    it('should parse mixed mandatory and optional parameters', () => {
      const result = parseRoutePattern('/users/:id/posts/:postId?', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/users\\/(?<id>[^/]+)\\/posts\\/(?:(?<postId>[^/]+))?$/');
      // Parameter order depends on regex replacement order
      expect(result.paramNames).toContain('id');
      expect(result.paramNames).toContain('postId');
      expect(result.paramNames).toHaveLength(2);
    });
  });

  describe('catch-all patterns', () => {
    it('should parse catch-all pattern', () => {
      const result = parseRoutePattern('/files/*', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/files\\/.*$/');
      expect(result.paramNames).toEqual([]);
    });

    it('should parse named catch-all pattern', () => {
      const result = parseRoutePattern('/files/**path', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/files\\/(?<path>.*)$/');
      expect(result.paramNames).toEqual(['path']);
    });

    it('should parse root catch-all pattern', () => {
      const result = parseRoutePattern('/*', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/.*$/');
      expect(result.paramNames).toEqual([]);
    });

    it('should parse root named catch-all pattern', () => {
      const result = parseRoutePattern('/**path', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/(?<path>.*)$/');
      expect(result.paramNames).toEqual(['path']);
    });
  });

  describe('complex patterns', () => {
    it('should parse complex nested patterns with parameters', () => {
      const result = parseRoutePattern('/api/users/:userId/posts/:postId/comments/:commentId?', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/api\\/users\\/(?<userId>[^/]+)\\/posts\\/(?<postId>[^/]+)\\/comments\\/(?:(?<commentId>[^/]+))?$/');
      // Parameter order depends on regex replacement order
      expect(result.paramNames).toContain('userId');
      expect(result.paramNames).toContain('postId');
      expect(result.paramNames).toContain('commentId');
      expect(result.paramNames).toHaveLength(3);
    });

    it('should parse patterns with multiple optional parameters', () => {
      const result = parseRoutePattern('/blog/:category?/:slug?', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/blog\\/(?:(?<category>[^/]+))?\\/(?:(?<slug>[^/]+))?$/');
      expect(result.paramNames).toEqual(['category', 'slug']);
    });

    it('should parse patterns with catch-all and parameters', () => {
      const result = parseRoutePattern('/api/:version/**path', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/api\\/(?<version>[^/]+)\\/(?<path>.*)$/');
      expect(result.paramNames).toEqual(['path', 'version']);
    });
  });

  describe('middleware handling', () => {
    it('should handle single middleware', () => {
      const result = parseRoutePattern('/test', mockMiddleware);
      
      expect(result.middleware).toEqual([mockMiddleware]);
    });

    it('should handle array of middlewares', () => {
      const middlewareArray = [mockMiddleware, mockMiddleware];
      const result = parseRoutePattern('/test', middlewareArray);
      
      expect(result.middleware).toEqual(middlewareArray);
    });

    it('should convert single middleware to array', () => {
      const result = parseRoutePattern('/test', mockMiddleware);
      
      expect(Array.isArray(result.middleware)).toBe(true);
      expect(result.middleware).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle patterns with underscores in parameter names', () => {
      const result = parseRoutePattern('/users/:user_id', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/users\\/(?<user_id>[^/]+)$/');
      expect(result.paramNames).toEqual(['user_id']);
    });

    it('should handle patterns with multiple underscores', () => {
      const result = parseRoutePattern('/api/:api_version/users/:user_id', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/api\\/(?<api_version>[^/]+)\\/users\\/(?<user_id>[^/]+)$/');
      expect(result.paramNames).toEqual(['api_version', 'user_id']);
    });

    it('should handle empty pattern', () => {
      const result = parseRoutePattern('', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^$/');
      expect(result.paramNames).toEqual([]);
    });

    it('should handle pattern with only slashes', () => {
      const result = parseRoutePattern('///', mockMiddleware);
      
      expect(result.pattern.toString()).toBe('/^\\/\\/\\/$/');
      expect(result.paramNames).toEqual([]);
    });
  });

  describe('pattern matching', () => {
    it('should match exact static routes', () => {
      const result = parseRoutePattern('/users', mockMiddleware);
      const pattern = result.pattern as RegExp;
      
      expect(pattern.test('/users')).toBe(true);
      expect(pattern.test('/users/')).toBe(false);
      expect(pattern.test('/user')).toBe(false);
      expect(pattern.test('/users/123')).toBe(false);
    });

    it('should match routes with parameters', () => {
      const result = parseRoutePattern('/users/:id', mockMiddleware);
      const pattern = result.pattern as RegExp;
      
      expect(pattern.test('/users/123')).toBe(true);
      expect(pattern.test('/users/abc')).toBe(true);
      expect(pattern.test('/users/')).toBe(false);
      expect(pattern.test('/users/123/posts')).toBe(false);
    });

    it('should match routes with optional parameters', () => {
      const result = parseRoutePattern('/users/:id?', mockMiddleware);
      const pattern = result.pattern as RegExp;
      
      expect(pattern.test('/users')).toBe(false);
      expect(pattern.test('/users/123')).toBe(true);
      expect(pattern.test('/users/')).toBe(true); // Optional parameter can match empty string
    });

    it('should match catch-all patterns', () => {
      const result = parseRoutePattern('/files/*', mockMiddleware);
      const pattern = result.pattern as RegExp;
      
      expect(pattern.test('/files/')).toBe(true);
      expect(pattern.test('/files/document.pdf')).toBe(true);
      expect(pattern.test('/files/folder/subfolder/file.txt')).toBe(true);
      expect(pattern.test('/files')).toBe(false);
    });

    it('should match named catch-all patterns', () => {
      const result = parseRoutePattern('/files/**path', mockMiddleware);
      const pattern = result.pattern as RegExp;
      
      expect(pattern.test('/files/')).toBe(true);
      expect(pattern.test('/files/document.pdf')).toBe(true);
      expect(pattern.test('/files/folder/subfolder/file.txt')).toBe(true);
      expect(pattern.test('/files')).toBe(false);
    });
  });
}); 
