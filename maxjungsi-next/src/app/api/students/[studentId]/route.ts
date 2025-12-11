import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 학생 상세 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { studentId } = await params;

    const student = await queryOne(
      `SELECT * FROM \`학생기본정보\` WHERE student_id = ?`,
      [studentId]
    );

    if (!student) {
      return NextResponse.json(
        { success: false, message: '학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Student GET error:', error);
    return NextResponse.json(
      { success: false, message: '학생 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 학생 정보 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { studentId } = await params;
    const body = await request.json();
    const { student_name, school_name, gender, branch_name } = body;

    // Admin 아니면 지점 변경 불가
    const isAdmin = user.userid === 'admin';
    const updates: string[] = [];
    const values: any[] = [];

    if (student_name) {
      updates.push('student_name = ?');
      values.push(student_name);
    }
    if (school_name !== undefined) {
      updates.push('school_name = ?');
      values.push(school_name);
    }
    if (gender) {
      updates.push('gender = ?');
      values.push(gender);
    }
    if (isAdmin && branch_name) {
      updates.push('branch_name = ?');
      values.push(branch_name);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: '수정할 항목이 없습니다.' },
        { status: 400 }
      );
    }

    values.push(studentId);

    await query(
      `UPDATE \`학생기본정보\` SET ${updates.join(', ')} WHERE student_id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '학생 정보가 수정되었습니다.',
    });
  } catch (error) {
    console.error('Student PUT error:', error);
    return NextResponse.json(
      { success: false, message: '학생 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 학생 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = getTokenFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { studentId } = await params;

    // 관련 데이터도 삭제
    await query('DELETE FROM `정시_상담목록` WHERE `학생_ID` = ?', [studentId]);
    await query('DELETE FROM `정시_최종지원` WHERE `학생_ID` = ?', [studentId]);
    await query('DELETE FROM `학생기본정보` WHERE student_id = ?', [studentId]);

    return NextResponse.json({
      success: true,
      message: '학생이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Student DELETE error:', error);
    return NextResponse.json(
      { success: false, message: '학생 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
