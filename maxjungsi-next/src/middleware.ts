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

  // 페이지 요청은 클라이언트 사이드에서 인증 체크 (middleware 통과)
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // API 요청만 서버에서 인증 체크
  // 토큰 확인 (쿠키 또는 Authorization 헤더)
  let token = request.cookies.get('auth_token')?.value;

  // 쿠키에 없으면 Authorization 헤더 확인
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return NextResponse.json(
      { success: false, message: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  // 토큰 검증
  const payload = verifyToken(token);

  if (!payload) {
    const response = NextResponse.json(
      { success: false, message: '인증이 만료되었습니다.' },
      { status: 401 }
    );
    response.cookies.delete('auth_token');
    return response;
  }

  // Admin API 권한 체크
  if (ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    if (payload.userid !== 'admin') {
      return NextResponse.json(
        { success: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
