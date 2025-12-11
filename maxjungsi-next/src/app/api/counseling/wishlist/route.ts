import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 학생 상담 목록 (위시리스트) 조회
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

    // 상담 목록 조회
    const wishlist = await query(
      `SELECT w.*,
              u.대학명, u.학과명, u.군, u.지역, u.모집정원,
              f.수능, f.내신, f.실기, f.국어, f.수학, f.영어, f.탐구, f.한국사, f.총점
       FROM \`상담목록\` w
       LEFT JOIN \`정시기본\` u ON w.U_ID = u.U_ID AND u.학년도 = ?
       LEFT JOIN \`정시반영비율\` f ON w.U_ID = f.U_ID AND f.학년도 = ?
       WHERE w.student_id = ? AND w.학년도 = ?
       ORDER BY w.priority ASC, w.created_at DESC`,
      [year, year, studentId, year]
    );

    return NextResponse.json({
      success: true,
      wishlist,
      count: wishlist.length,
    });
  } catch (error) {
    console.error('Wishlist GET error:', error);
    return NextResponse.json(
      { success: false, message: '상담 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 상담 목록에 대학 추가
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
    const { student_id, uid, year, priority, memo, suneung_score, silgi_score } = body;

    if (!student_id || !uid) {
      return NextResponse.json(
        { success: false, message: 'student_id와 uid가 필요합니다.' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear() + 1;

    // 중복 체크
    const existing = await query(
      `SELECT id FROM \`상담목록\` WHERE student_id = ? AND U_ID = ? AND 학년도 = ?`,
      [student_id, uid, targetYear]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { success: false, message: '이미 상담 목록에 있는 대학입니다.' },
        { status: 400 }
      );
    }

    // 추가
    await query(
      `INSERT INTO \`상담목록\` (student_id, U_ID, 학년도, priority, memo, suneung_score, silgi_score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        student_id,
        uid,
        targetYear,
        priority || 99,
        memo || '',
        suneung_score || null,
        silgi_score || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: '상담 목록에 추가되었습니다.',
    });
  } catch (error) {
    console.error('Wishlist POST error:', error);
    return NextResponse.json(
      { success: false, message: '상담 목록 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 상담 목록 수정 (점수 업데이트, 우선순위 변경 등)
export async function PUT(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, priority, memo, suneung_score, silgi_score, total_score } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 업데이트
    await query(
      `UPDATE \`상담목록\`
       SET priority = COALESCE(?, priority),
           memo = COALESCE(?, memo),
           suneung_score = COALESCE(?, suneung_score),
           silgi_score = COALESCE(?, silgi_score),
           total_score = COALESCE(?, total_score),
           updated_at = NOW()
       WHERE id = ?`,
      [priority, memo, suneung_score, silgi_score, total_score, id]
    );

    return NextResponse.json({
      success: true,
      message: '수정되었습니다.',
    });
  } catch (error) {
    console.error('Wishlist PUT error:', error);
    return NextResponse.json(
      { success: false, message: '수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 상담 목록에서 삭제
export async function DELETE(request: Request) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    await query(`DELETE FROM \`상담목록\` WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: '삭제되었습니다.',
    });
  } catch (error) {
    console.error('Wishlist DELETE error:', error);
    return NextResponse.json(
      { success: false, message: '삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
