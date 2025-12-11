import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { JWTPayload, UserRole } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key!!';

/**
 * JWT 토큰 생성
 */
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * 현재 세션 가져오기 (Server Component용)
 */
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Admin 여부 확인
 */
export function isAdmin(payload: JWTPayload | null): boolean {
  return payload?.userid === 'admin';
}

/**
 * 특정 역할 확인
 */
export function hasRole(payload: JWTPayload | null, roles: UserRole[]): boolean {
  if (!payload) return false;
  return roles.includes(payload.role);
}

/**
 * 비밀번호 해시
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 비밀번호 검증
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * API Route에서 토큰 추출 및 검증
 */
export function getTokenFromRequest(request: Request): JWTPayload | null {
  // 1. Authorization 헤더에서 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyToken(token);
  }

  // 2. 쿠키에서 확인
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => c.split('='))
    );
    if (cookies.auth_token) {
      return verifyToken(cookies.auth_token);
    }
  }

  return null;
}

/**
 * 인증 필요 API용 래퍼
 */
export function withAuth<T>(
  handler: (request: Request, user: JWTPayload) => Promise<T>
) {
  return async (request: Request): Promise<Response> => {
    const user = getTokenFromRequest(request);
    if (!user) {
      return Response.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    try {
      const result = await handler(request, user);
      return Response.json(result);
    } catch (error) {
      console.error('API Error:', error);
      return Response.json(
        { success: false, message: '서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  };
}

/**
 * Admin 전용 API용 래퍼
 */
export function withAdmin<T>(
  handler: (request: Request, user: JWTPayload) => Promise<T>
) {
  return async (request: Request): Promise<Response> => {
    const user = getTokenFromRequest(request);
    if (!user) {
      return Response.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    if (!isAdmin(user)) {
      return Response.json(
        { success: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    try {
      const result = await handler(request, user);
      return Response.json(result);
    } catch (error) {
      console.error('API Error:', error);
      return Response.json(
        { success: false, message: '서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  };
}
