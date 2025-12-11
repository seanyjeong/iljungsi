import { NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { query, queryOne } from '@/lib/db';
import { signToken, comparePassword } from '@/lib/auth';
import type { LoginRequest } from '@/types/auth';

interface DBUser {
  원장ID: number;
  아이디: string;
  비밀번호: string;
  이름: string;
  직급: string;
  지점명: string;
  전화번호: string;
  승인여부: number;
}

export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json();
    const { userid, password } = body;

    if (!userid || !password) {
      return NextResponse.json(
        { success: false, message: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // DB에서 사용자 조회 (26susi DB의 원장회원 테이블)
    const user = await queryOne<DBUser>(
      'SELECT * FROM `26susi`.`원장회원` WHERE `아이디` = ?',
      [userid]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 승인 여부 확인
    if (!user.승인여부) {
      return NextResponse.json(
        { success: false, message: '승인 대기 중인 계정입니다.' },
        { status: 403 }
      );
    }

    // 비밀번호 확인 (bcrypt 해시 또는 평문)
    let isValidPassword = false;
    if (user.비밀번호.startsWith('$2')) {
      // bcrypt 해시
      isValidPassword = await comparePassword(password, user.비밀번호);
    } else {
      // 평문 비밀번호 (레거시)
      isValidPassword = user.비밀번호 === password;
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 역할 결정
    const role = userid === 'admin' ? 'admin' : 'owner';

    // JWT 토큰 생성
    const token = signToken({
      userid: user.아이디,
      branch: user.지점명,
      role,
    });

    // cookie 패키지로 직접 Set-Cookie 헤더 생성
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieValue = serialize('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    });

    // Response에 직접 Set-Cookie 헤더 추가
    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          userid: user.아이디,
          name: user.이름,
          branch: user.지점명,
          role,
          position: user.직급,
          phone: user.전화번호,
          approved: Boolean(user.승인여부),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieValue,
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
