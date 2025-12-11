import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 학생 목록 조회
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
    const year = searchParams.get('year') || new Date().getFullYear() + 1;

    // Admin은 전체, 일반 사용자는 자기 지점만
    const isAdmin = user.userid === 'admin';
    const condition = isAdmin ? '' : 'AND branch_name = ?';
    const params = isAdmin ? [year] : [year, user.branch];

    const students = await query(
      `SELECT student_id, student_name, school_name, gender, branch_name, 학년도, account_id
       FROM \`학생기본정보\`
       WHERE 학년도 = ? ${condition}
       ORDER BY student_name`,
      params
    );

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error('Students GET error:', error);
    return NextResponse.json(
      { success: false, message: '학생 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 학생 일괄 추가
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
    const { students, year } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, message: '추가할 학생 정보가 없습니다.' },
        { status: 400 }
      );
    }

    // Admin이 아니면 자기 지점으로 강제 설정
    const isAdmin = user.userid === 'admin';
    const targetYear = year || new Date().getFullYear() + 1;

    let insertedCount = 0;

    for (const student of students) {
      const branchName = isAdmin ? (student.branch_name || user.branch) : user.branch;

      await query(
        `INSERT INTO \`학생기본정보\` (student_name, school_name, gender, branch_name, 학년도)
         VALUES (?, ?, ?, ?, ?)`,
        [
          student.student_name,
          student.school_name || '',
          student.gender || 'M',
          branchName,
          targetYear,
        ]
      );
      insertedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${insertedCount}명의 학생이 추가되었습니다.`,
      insertedCount,
    });
  } catch (error) {
    console.error('Students POST error:', error);
    return NextResponse.json(
      { success: false, message: '학생 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
}
