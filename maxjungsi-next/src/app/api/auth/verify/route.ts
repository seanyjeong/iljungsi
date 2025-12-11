import { NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getTokenFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        userid: user.userid,
        branch: user.branch,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { success: false, message: '토큰 검증에 실패했습니다.' },
      { status: 401 }
    );
  }
}
