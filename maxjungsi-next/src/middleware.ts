import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
];

// Admin만 접근 가능한 경로
const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일, Next.js 내부 경로는 통과
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public 경로는 통과
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 토큰 확인
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // API 요청은 401 응답
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    // 페이지 요청은 로그인으로 리다이렉트
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 토큰 검증
  const payload = verifyToken(token);

  if (!payload) {
    // 유효하지 않은 토큰
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, message: '인증이 만료되었습니다.' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    // 잘못된 토큰 쿠키 삭제
    response.cookies.delete('auth_token');
    return response;
  }

  // Admin 경로 권한 체크
  if (ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    if (payload.userid !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, message: '관리자 권한이 필요합니다.' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
