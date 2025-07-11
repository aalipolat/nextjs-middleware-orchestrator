import { vi } from 'vitest';

// Mock Next.js server components
vi.mock('next/server', () => {
  const createMockResponse = (status = 200, redirected = false) => {
    const headers = new Map();
    return {
      status,
      statusText: redirected ? 'Redirect' : 'OK',
      redirected,
      headers: {
        get: vi.fn((name: string) => headers.get(name) || null),
        set: vi.fn((name: string, value: string) => headers.set(name, value))
      },
      cookies: {
        set: vi.fn(),
        delete: vi.fn()
      }
    };
  };

  const MockNextResponse = function(body: string, init?: any) {
    return createMockResponse(init?.status || 200);
  };

  return {
    NextRequest: class MockNextRequest {
      url: string;
      nextUrl: { pathname: string };
      private _headers: Map<string, string>;

      constructor(url: string = 'http://localhost:3000') {
        this.url = url;
        this.nextUrl = { pathname: new URL(url).pathname };
        this._headers = new Map();
      }

      get headers() {
        return {
          get: vi.fn((name: string) => this._headers.get(name)),
          set: vi.fn((name: string, value: string) => this._headers.set(name, value))
        };
      }
    },
    NextResponse: Object.assign(MockNextResponse, {
      next: vi.fn(() => createMockResponse()),
      redirect: vi.fn((url: string, status = 307) => ({
        ...createMockResponse(status, true),
        url
      })),
      rewrite: vi.fn((url: string) => ({
        ...createMockResponse(),
        url
      }))
    })
  };
});

// Mock console methods
vi.stubGlobal('console', {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
});
