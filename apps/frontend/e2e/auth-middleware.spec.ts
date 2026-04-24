import { test, expect, type Page } from '@playwright/test';
import { tokens } from './helpers/jwt';

const FRONTEND_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const API_PATTERN = 'http://localhost:4000/api/**';

function accessTokenCookie(value: string) {
  return { name: 'access_token', value, url: FRONTEND_URL, path: '/' };
}

function mockApi(page: Page, status: number, body: unknown) {
  return page.route(API_PATTERN, (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  );
}

test.describe('미인증 접근 시나리오 E2E', () => {
  // ─── 1. 비로그인 상태 → 보호 페이지 /login 리다이렉트 ───────────────────────
  test.describe('비로그인 상태 → 모든 보호 페이지 /login 리다이렉트', () => {
    const protectedPaths = ['/', '/products', '/my-page', '/cart', '/checkout', '/orders'];

    for (const path of protectedPaths) {
      test(`${path} 접근 시 /login 으로 리다이렉트된다`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'commit' });
        expect(page.url()).toContain('/login');
      });
    }
  });

  // ─── 2. PENDING 상태 로그인 → /pending 리다이렉트 ───────────────────────────
  test.describe('PENDING 상태 로그인 → /pending 리다이렉트', () => {
    test('홈 접근 시 /pending 으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.pending)]);
      await page.goto('/', { waitUntil: 'commit' });
      expect(page.url()).toContain('/pending');
    });

    test('상품 목록 접근 시 /pending 으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.pending)]);
      await page.goto('/products', { waitUntil: 'commit' });
      expect(page.url()).toContain('/pending');
    });

    test('마이페이지 접근 시 /pending 으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.pending)]);
      await page.goto('/my-page', { waitUntil: 'commit' });
      expect(page.url()).toContain('/pending');
    });
  });

  // ─── 3. REJECTED 상태 로그인 → /login 리다이렉트 ────────────────────────────
  test.describe('REJECTED 상태 로그인 → 접근 거부 확인', () => {
    test('홈 접근 시 /login 으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.rejected)]);
      await page.goto('/', { waitUntil: 'commit' });
      expect(page.url()).toContain('/login');
    });

    test('상품 목록 접근 시 /login 으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.rejected)]);
      await page.goto('/products', { waitUntil: 'commit' });
      expect(page.url()).toContain('/login');
    });

    test('마이페이지 접근 시 /login 으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.rejected)]);
      await page.goto('/my-page', { waitUntil: 'commit' });
      expect(page.url()).toContain('/login');
    });
  });

  // ─── 4. 비관리자 → /admin/* 접근 시 / 리다이렉트 ───────────────────────────
  test.describe('비관리자 → /admin/* 접근 제한', () => {
    test('일반 회원이 /admin 접근 시 홈(/)으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.approvedCustomer)]);
      await page.goto('/admin', { waitUntil: 'commit' });
      expect(page.url()).not.toContain('/admin');
      expect(page.url()).toMatch(/localhost:3000\/?$/);
    });

    test('일반 회원이 /admin/users 접근 시 홈(/)으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.approvedCustomer)]);
      await page.goto('/admin/users', { waitUntil: 'commit' });
      expect(page.url()).not.toContain('/admin');
    });

    test('일반 회원이 /admin/products 접근 시 홈(/)으로 리다이렉트된다', async ({
      page,
      context,
    }) => {
      await context.addCookies([accessTokenCookie(tokens.approvedCustomer)]);
      await page.goto('/admin/products', { waitUntil: 'commit' });
      expect(page.url()).not.toContain('/admin');
    });

    test('ADMIN role 은 /admin 에 접근할 수 있다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.approvedAdmin)]);
      await page.goto('/admin', { waitUntil: 'commit' });
      expect(page.url()).toContain('/admin');
    });
  });

  // ─── 5. 만료된 토큰 → 자동 갱신 또는 로그아웃 ──────────────────────────────
  test.describe('만료된 토큰 시나리오', () => {
    test('갱신 실패 시 쿠키가 삭제되고 /login 으로 리다이렉트된다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.expiredApproved)]);

      // 모든 API 요청(갱신 포함)에 401 반환 → 갱신 실패 시나리오
      await mockApi(page, 401, { message: 'Unauthorized' });

      await page.goto('/');
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

      // access_token 쿠키가 삭제되었는지 확인
      const cookies = await context.cookies();
      const accessToken = cookies.find((c) => c.name === 'access_token');
      expect(accessToken).toBeUndefined();
    });

    test('갱신 성공 시 사용자가 보호 페이지에 머문다', async ({ page, context }) => {
      await context.addCookies([accessTokenCookie(tokens.expiredApproved)]);

      // 첫 API 호출은 401, 갱신 요청은 200, 이후 재시도는 200 반환
      const callCount = new Map<string, number>();
      await page.route(API_PATTERN, async (route) => {
        const url = route.request().url();

        if (url.includes('/auth/refresh')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
          return;
        }

        const count = callCount.get(url) ?? 0;
        callCount.set(url, count + 1);

        await route.fulfill({
          status: count === 0 ? 401 : 200,
          contentType: 'application/json',
          body: JSON.stringify(count === 0 ? { message: 'Unauthorized' } : { data: [] }),
        });
      });

      await page.goto('/');
      // networkidle 대신 load 사용: dev 서버 HMR WebSocket이 networkidle을 방해함
      await page.waitForLoadState('load', { timeout: 15000 });

      expect(page.url()).not.toContain('/login');
      expect(page.url()).toMatch(/localhost:3000\/?$/);
    });
  });
});
