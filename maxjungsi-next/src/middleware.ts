import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// middleware는 Edge Runtime에서 실행되므로 jsonwebtoken을 사용할 수 없음
// API 인증은 각 Route Handler에서 직접 처리

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

  // 모든 요청 통과 (인증은 각 API Route에서 처리)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
