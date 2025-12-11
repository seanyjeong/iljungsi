import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 디버그 메모 조회 (학년도별)
export async function GET(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user || user.userid !== 'admin') {
      return NextResponse.json(
        { success: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear() + 1;

    const rows = await query(
      `SELECT dm.U_ID, dm.학년도, dm.is_correct, dm.memo, dm.updated_at,
              jb.대학명, jb.학과명
       FROM \`정시디버그메모\` dm
       LEFT JOIN \`정시기본\` jb ON dm.U_ID = jb.U_ID AND dm.학년도 = jb.학년도
       WHERE dm.학년도 = ?
       ORDER BY dm.updated_at DESC`,
      [year]
    );

    // Map 형태로 변환
    const notesMap: Record<number, { is_correct: string; memo: string; updated_at: string; 대학명?: string; 학과명?: string }> = {};
    for (const row of rows as any[]) {
      notesMap[row.U_ID] = {
        is_correct: row.is_correct,
        memo: row.memo || '',
        updated_at: row.updated_at,
        대학명: row.대학명,
        학과명: row.학과명,
      };
    }

    return NextResponse.json({
      success: true,
      notes: notesMap,
      list: rows, // 리스트 형태도 함께 제공
    });
  } catch (error) {
    console.error('Debug notes GET error:', error);
    return NextResponse.json(
      { success: false, message: '디버그 메모 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 디버그 메모 저장/업데이트
export async function POST(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user || user.userid !== 'admin') {
      return NextResponse.json(
        { success: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { U_ID, year, is_correct, memo } = body;

    if (!U_ID || !year) {
      return NextResponse.json(
        { success: false, message: 'U_ID와 year가 필요합니다.' },
        { status: 400 }
      );
    }

    // 상태 검증
    const status = ['Y', 'N', '?'].includes(is_correct) ? is_correct : '?';
    const text = typeof memo === 'string' ? memo : '';

    await query(
      `INSERT INTO \`정시디버그메모\` (U_ID, 학년도, is_correct, memo)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_correct = VALUES(is_correct), memo = VALUES(memo)`,
      [U_ID, year, status, text]
    );

    return NextResponse.json({
      success: true,
      message: '디버그 메모가 저장되었습니다.',
    });
  } catch (error) {
    console.error('Debug notes POST error:', error);
    return NextResponse.json(
      { success: false, message: '디버그 메모 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
