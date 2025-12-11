import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 최종 지원 목록 조회
export async function GET(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const year = searchParams.get('year') || new Date().getFullYear() + 1;

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'student_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 최종 지원 목록 조회
    const finalApplies = await query(
      `SELECT fa.*,
              u.대학명, u.학과명, u.군, u.지역, u.모집정원,
              f.수능, f.실기, f.총점
       FROM \`정시_최종지원\` fa
       LEFT JOIN \`정시기본\` u ON fa.U_ID = u.U_ID AND u.학년도 = ?
       LEFT JOIN \`정시반영비율\` f ON fa.U_ID = f.U_ID AND f.학년도 = ?
       WHERE fa.학생_ID = ? AND fa.학년도 = ?
       ORDER BY fa.군 ASC`,
      [year, year, studentId, year]
    );

    return NextResponse.json({
      success: true,
      finalApplies,
    });
  } catch (error) {
    console.error('Final apply GET error:', error);
    return NextResponse.json(
      { success: false, message: '최종 지원 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 최종 지원 저장
export async function POST(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { student_id, year, applies } = body;

    if (!student_id) {
      return NextResponse.json(
        { success: false, message: 'student_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear() + 1;

    // 트랜잭션으로 처리
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // 기존 최종 지원 삭제
      await connection.query(
        'DELETE FROM `정시_최종지원` WHERE 학생_ID = ? AND 학년도 = ?',
        [student_id, targetYear]
      );

      // 새로운 최종 지원 추가
      if (applies && applies.length > 0) {
        for (const apply of applies) {
          if (!apply.uid) continue;

          await connection.query(
            `INSERT INTO \`정시_최종지원\` (학생_ID, 학년도, U_ID, 군, 메모, suneung_score, silgi_score, total_score, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              student_id,
              targetYear,
              apply.uid,
              apply.군 || '',
              apply.메모 || '',
              apply.suneung_score || null,
              apply.silgi_score || null,
              apply.total_score || null,
            ]
          );
        }
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '최종 지원이 저장되었습니다.',
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Final apply POST error:', error);
    return NextResponse.json(
      { success: false, message: '최종 지원 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
