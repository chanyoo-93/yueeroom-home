import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function makeJwt(payload: object): string {
  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${base64}.signature`;
}

function createRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe('middleware', () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  describe('공개 경로', () => {
    it.each(['/login', '/register', '/pending', '/privacy', '/terms'])(
      '%s 경로는 인증 없이 접근 가능하다',
      (pathname) => {
        const req = createRequest(pathname);
        const res = middleware(req);
        expect(res.headers.get('location')).toBeNull();
      },
    );
  });

  describe('/login 경로 - 인증 사용자', () => {
    it('APPROVED access_token이 있으면 홈으로 리다이렉트한다', () => {
      const token = makeJwt({ sub: 'user-1', status: 'APPROVED', exp: futureExp });
      const req = createRequest('/login', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toBe('http://localhost:3000/');
    });

    it('PENDING access_token이 있으면 /pending으로 리다이렉트한다', () => {
      const token = makeJwt({ sub: 'user-1', status: 'PENDING', exp: futureExp });
      const req = createRequest('/login', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toBe('http://localhost:3000/pending');
    });

    it('만료된 access_token이면 /login에 머문다', () => {
      const token = makeJwt({ sub: 'user-1', status: 'APPROVED', exp: pastExp });
      const req = createRequest('/login', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });

    it.each(['REJECTED', 'SUSPENDED'])('%s access_token이면 /login에 머문다', (status) => {
      const token = makeJwt({ sub: 'user-1', status, exp: futureExp });
      const req = createRequest('/login', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('보호 경로 - access_token 없음', () => {
    it('쿠키가 없으면 /login으로 리다이렉트한다', () => {
      const req = createRequest('/');
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/login');
    });

    it('/dashboard 접근 시 쿠키가 없으면 /login으로 리다이렉트한다', () => {
      const req = createRequest('/dashboard');
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/login');
    });
  });

  describe('보호 경로 - PENDING 사용자', () => {
    it('PENDING 상태이면 /pending으로 리다이렉트한다', () => {
      const token = makeJwt({ sub: 'user-1', status: 'PENDING' });
      const req = createRequest('/', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/pending');
    });
  });

  describe('보호 경로 - APPROVED 사용자', () => {
    it('APPROVED 상태이면 통과한다', () => {
      const token = makeJwt({ sub: 'user-1', status: 'APPROVED' });
      const req = createRequest('/', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('보호 경로 - REJECTED/SUSPENDED 사용자', () => {
    it.each(['REJECTED', 'SUSPENDED'])('%s 상태이면 /login으로 리다이렉트한다', (status) => {
      const token = makeJwt({ sub: 'user-1', status });
      const req = createRequest('/', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/login');
    });
  });

  describe('보호 경로 - 잘못된 토큰', () => {
    it('토큰을 디코딩할 수 없으면 /login으로 리다이렉트한다', () => {
      const req = createRequest('/', { access_token: 'invalid.token' });
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/login');
    });
  });

  describe('공개 경로 - 정확한 매칭', () => {
    it('/login-error는 공개 경로가 아니다', () => {
      const req = createRequest('/login-error');
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/login');
    });
  });

  describe('/admin 경로 — 관리자 전용', () => {
    it('CUSTOMER role이면 홈(/)으로 리다이렉트한다', () => {
      const token = makeJwt({ sub: 'u1', status: 'APPROVED', role: 'CUSTOMER' });
      const req = createRequest('/admin', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/');
      expect(res.headers.get('location')).not.toContain('/admin');
    });

    it('role이 없으면 홈(/)으로 리다이렉트한다', () => {
      const token = makeJwt({ sub: 'u2', status: 'APPROVED' });
      const req = createRequest('/admin/users', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/');
      expect(res.headers.get('location')).not.toContain('/admin');
    });

    it('ADMIN role이면 통과한다', () => {
      const token = makeJwt({ sub: 'u3', status: 'APPROVED', role: 'ADMIN' });
      const req = createRequest('/admin', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });

    it('/admin/users 하위 경로도 CUSTOMER이면 홈으로 리다이렉트한다', () => {
      const token = makeJwt({ sub: 'u4', status: 'APPROVED', role: 'CUSTOMER' });
      const req = createRequest('/admin/users/123', { access_token: token });
      const res = middleware(req);
      expect(res.headers.get('location')).toContain('/');
      expect(res.headers.get('location')).not.toContain('/admin');
    });
  });
});
