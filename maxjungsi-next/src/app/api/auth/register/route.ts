import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import type { RegisterRequest } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json();
    const { userid, password, name, position, branch, phone } = body;

    // 필수 필드 검증
    if (!userid || !password || !name || !branch) {
      return NextResponse.json(
        { success: false, message: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 아이디 중복 확인
    const existing = await queryOne(
      'SELECT `아이디` FROM `원장회원` WHERE `아이디` = ?',
      [userid]
    );

    if (existing) {
      return NextResponse.json(
        { success: false, message: '이미 사용 중인 아이디입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password);

    // 회원 등록 (승인 대기 상태)
    await query(
      `INSERT INTO \`원장회원\` (\`아이디\`, \`비밀번호\`, \`이름\`, \`직급\`, \`지점명\`, \`전화번호\`, \`승인여부\`)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [userid, hashedPassword, name, position || '', branch, phone || '']
    );

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
