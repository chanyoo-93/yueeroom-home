import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/pending', '/privacy'];

/**
 * JWT payload를 서명 검증 없이 디코딩한다.
 * TextDecoder를 사용해 Edge Runtime에서 UTF-8 멀티바이트 문자(한글 등)를 올바르게 처리한다.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadPart = parts[1];
    if (!payloadPart) return null;

    // base64url → base64 변환 후 패딩 추가
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    // TextDecoder로 UTF-8 멀티바이트 문자 안전하게 처리
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 인증 없이 통과 (정확한 경로 또는 하위 경로만 허용)
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  );
  if (isPublicPath) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;

  // 토큰 없음 → 로그인 페이지로 리다이렉트
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = decodeJwtPayload(accessToken);

  // 토큰 디코딩 실패 → 로그인 페이지로 리다이렉트
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // PENDING 상태 사용자 → 대기 안내 페이지로 리다이렉트
  if (payload.status === 'PENDING') {
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  // APPROVED가 아닌 상태(REJECTED, SUSPENDED 등) → 로그인 페이지로 리다이렉트
  if (payload.status !== 'APPROVED') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // /admin/* 경로는 ADMIN role만 접근 가능 — 비관리자는 홈으로 리다이렉트
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // _next 정적 파일, 이미지 최적화, favicon 제외
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico)$).*)'],
};
