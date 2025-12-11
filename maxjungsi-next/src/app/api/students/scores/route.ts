import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

// GET: 학생 성적 목록 조회
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
    const studentIds = searchParams.get('student_ids');

    // Admin은 전체, 일반 사용자는 자기 지점만
    const isAdmin = user.userid === 'admin';

    let sql = `
      SELECT s.student_id, s.student_name, s.school_name, s.gender, s.branch_name,
             sc.국어_표점, sc.국어_백분, sc.국어_원점,
             sc.수학_표점, sc.수학_백분, sc.수학_원점,
             sc.영어_등급, sc.영어_원점,
             sc.탐구1_과목, sc.탐구1_표점, sc.탐구1_백분, sc.탐구1_원점,
             sc.탐구2_과목, sc.탐구2_표점, sc.탐구2_백분, sc.탐구2_원점,
             sc.한국사_등급, sc.한국사_원점,
             sc.is_official
      FROM \`학생기본정보\` s
      LEFT JOIN \`학생수능성적\` sc ON s.student_id = sc.student_id AND sc.학년도 = ?
      WHERE s.학년도 = ?
    `;

    const params: any[] = [year, year];

    if (!isAdmin) {
      sql += ' AND s.branch_name = ?';
      params.push(user.branch);
    }

    if (studentIds) {
      const ids = studentIds.split(',').map((id) => parseInt(id, 10));
      sql += ` AND s.student_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }

    sql += ' ORDER BY s.student_name';

    const students = await query(sql, params);

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error('Scores GET error:', error);
    return NextResponse.json(
      { success: false, message: '성적 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 학생 성적 일괄 저장
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
    const { scores, year, is_official } = body;

    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { success: false, message: '저장할 성적 정보가 없습니다.' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear() + 1;
    let savedCount = 0;

    for (const score of scores) {
      // UPSERT (INSERT ON DUPLICATE KEY UPDATE)
      await query(
        `INSERT INTO \`학생수능성적\` (
          student_id, 학년도,
          국어_표점, 국어_백분, 국어_원점,
          수학_표점, 수학_백분, 수학_원점,
          영어_등급, 영어_원점,
          탐구1_과목, 탐구1_표점, 탐구1_백분, 탐구1_원점,
          탐구2_과목, 탐구2_표점, 탐구2_백분, 탐구2_원점,
          한국사_등급, 한국사_원점,
          is_official
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          국어_표점 = VALUES(국어_표점),
          국어_백분 = VALUES(국어_백분),
          국어_원점 = VALUES(국어_원점),
          수학_표점 = VALUES(수학_표점),
          수학_백분 = VALUES(수학_백분),
          수학_원점 = VALUES(수학_원점),
          영어_등급 = VALUES(영어_등급),
          영어_원점 = VALUES(영어_원점),
          탐구1_과목 = VALUES(탐구1_과목),
          탐구1_표점 = VALUES(탐구1_표점),
          탐구1_백분 = VALUES(탐구1_백분),
          탐구1_원점 = VALUES(탐구1_원점),
          탐구2_과목 = VALUES(탐구2_과목),
          탐구2_표점 = VALUES(탐구2_표점),
          탐구2_백분 = VALUES(탐구2_백분),
          탐구2_원점 = VALUES(탐구2_원점),
          한국사_등급 = VALUES(한국사_등급),
          한국사_원점 = VALUES(한국사_원점),
          is_official = VALUES(is_official)`,
        [
          score.student_id,
          targetYear,
          score.국어_표점 || null,
          score.국어_백분 || null,
          score.국어_원점 || null,
          score.수학_표점 || null,
          score.수학_백분 || null,
          score.수학_원점 || null,
          score.영어_등급 || null,
          score.영어_원점 || null,
          score.탐구1_과목 || null,
          score.탐구1_표점 || null,
          score.탐구1_백분 || null,
          score.탐구1_원점 || null,
          score.탐구2_과목 || null,
          score.탐구2_표점 || null,
          score.탐구2_백분 || null,
          score.탐구2_원점 || null,
          score.한국사_등급 || null,
          score.한국사_원점 || null,
          is_official ? 1 : 0,
        ]
      );
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${savedCount}명의 성적이 저장되었습니다.`,
      savedCount,
    });
  } catch (error) {
    console.error('Scores POST error:', error);
    return NextResponse.json(
      { success: false, message: '성적 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
