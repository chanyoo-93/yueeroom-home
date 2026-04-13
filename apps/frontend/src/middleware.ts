import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/pending'];

/**
 * JWT payload를 서명 검증 없이 디코딩한다.
 * Edge Runtime 호환을 위해 atob 사용.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 변환 후 패딩 추가
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 인증 없이 통과
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
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

  return NextResponse.next();
}

export const config = {
  // _next 정적 파일, 이미지 최적화, favicon 제외
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico)$).*)'],
};
